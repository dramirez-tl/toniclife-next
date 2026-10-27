'use client';

// ChannelHealthCard - "Salud del canal" (Comercial → WhatsApp): semáforo,
// calidad y límite del número, verificación, cuenta oficial, pausa de
// marketing (pausar/reanudar), requisitos de la palomita azul, plantillas
// con su calidad y últimos eventos de Meta. Lee GET /whatsapp/account-status.

import { useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useRefreshWhatsAppChannel,
  useSetMarketingPause,
  useWhatsAppChannelStatus,
} from '@/hooks/useWhatsAppChannel';
import { apiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import type {
  ChannelStatus,
  ChecklistStatus,
  EventSeverity,
  SemaforoColor,
} from '@/types/whatsappChannel';

const SEMAFORO: Record<SemaforoColor, { label: string; className: string; dot: string }> = {
  verde: {
    label: 'Canal sano',
    className: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  amarillo: {
    label: 'Con avisos',
    className: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  rojo: {
    label: 'En riesgo',
    className: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300',
    dot: 'bg-red-500',
  },
  gris: {
    label: 'Sin lectura',
    className: 'bg-muted text-muted-foreground',
    dot: 'bg-gray-400',
  },
};

const SEVERITY_DOT: Record<EventSeverity, string> = {
  info: 'bg-sky-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

const QUALITY_CLASS: Record<string, string> = {
  GREEN: 'text-emerald-700 dark:text-emerald-400',
  YELLOW: 'text-amber-700 dark:text-amber-400',
  RED: 'text-red-700 dark:text-red-400',
};

function qualityText(q: string): string {
  switch (q) {
    case 'GREEN':
      return 'Alta';
    case 'YELLOW':
      return 'Media';
    case 'RED':
      return 'Baja';
    default:
      return 'Sin calificar';
  }
}

function templateStatusText(s: string): string {
  switch (s) {
    case 'APPROVED':
      return 'Aprobada';
    case 'PENDING':
      return 'En revisión';
    case 'REJECTED':
      return 'Rechazada';
    case 'PAUSED':
      return 'Pausada';
    case 'DISABLED':
      return 'Inhabilitada';
    default:
      return s;
  }
}

function fmtCdmx(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ChecklistIcon({ status }: { status: ChecklistStatus }) {
  const cls = 'h-4 w-4 shrink-0';
  switch (status) {
    case 'ok':
      return <CheckCircleIcon className={cn(cls, 'text-emerald-600')} />;
    case 'falla':
      return <XCircleIcon className={cn(cls, 'text-red-600')} />;
    case 'pendiente':
      return <MinusCircleIcon className={cn(cls, 'text-amber-600')} />;
    default:
      return <QuestionMarkCircleIcon className={cn(cls, 'text-muted-foreground')} />;
  }
}

function Fact({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function verificationText(v: string | null): string {
  if (!v) return 'Sin lectura';
  const l = v.toLowerCase();
  if (l === 'verified') return 'Verificado';
  if (l === 'pending' || l.includes('review')) return 'En revisión';
  if (l === 'not_verified') return 'No verificado';
  return v;
}

export function ChannelHealthCard() {
  const status = useWhatsAppChannelStatus();
  const refresh = useRefreshWhatsAppChannel();
  const pause = useSetMarketingPause();
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  if (status.isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }
  if (status.isError) {
    return (
      <Alert>
        <ExclamationTriangleIcon className="h-4 w-4" />
        <AlertTitle>Salud del canal no disponible</AlertTitle>
        <AlertDescription>
          {apiErrorMessage(status.error, 'No se pudo leer el estado del canal.', {
            forbidden: 'Tu rol no tiene el permiso Comercial para ver la salud del canal.',
            notFound: 'El API todavía no expone la salud del canal (despliegue pendiente).',
          })}
        </AlertDescription>
      </Alert>
    );
  }
  const data = status.data as ChannelStatus;
  const sem = SEMAFORO[data.semaforo.color] ?? SEMAFORO.gris;
  const paused = data.marketingPause.paused;

  const togglePause = async () => {
    try {
      await pause.mutateAsync({
        paused: !paused,
        reason: paused ? 'Reanudado desde el admin' : 'Pausado desde el admin',
      });
      toast.success(paused ? 'Marketing reanudado' : 'Marketing pausado');
    } catch (e) {
      toast.error(
        apiErrorMessage(e, 'No se pudo cambiar la pausa de marketing.', {
          forbidden: 'Solo un administrador puede pausar o reanudar el marketing.',
        }),
      );
    }
  };

  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Salud del canal</h2>
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
                sem.className,
              )}
            >
              <span className={cn('h-2.5 w-2.5 rounded-full', sem.dot)} />
              {sem.label}
            </span>
            {paused && (
              <Badge variant="warning" title={data.marketingPause.reason ?? undefined}>
                Marketing pausado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Leído {fmtCdmx(data.readAt)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              title="Volver a leer en Meta"
            >
              <ArrowPathIcon className={cn('h-4 w-4', refresh.isPending && 'animate-spin')} />
            </Button>
            <Button
              variant={paused ? 'default' : 'outline'}
              size="sm"
              onClick={togglePause}
              disabled={pause.isPending}
            >
              {pause.isPending ? 'Guardando…' : paused ? 'Reanudar marketing' : 'Pausar marketing'}
            </Button>
          </div>
        </div>

        {!data.configured && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Canal sin configurar</AlertTitle>
            <AlertDescription>{data.errors.join(' · ')}</AlertDescription>
          </Alert>
        )}

        {data.semaforo.reasons.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-foreground">
            {data.semaforo.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}

        {paused && data.marketingPause.reason && (
          <p className="text-sm text-muted-foreground">
            Motivo de la pausa: {data.marketingPause.reason} ({fmtCdmx(data.marketingPause.at)}
            {data.marketingPause.by === 'meta' ? ', automática por Meta' : ''}). Mientras dure, las
            plantillas de Marketing no salen; los avisos de Utilidad sí.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact
            label="Calidad del número"
            value={
              <span className={QUALITY_CLASS[data.phone.qualityRating ?? ''] ?? ''}>
                {data.phone.qualityLabel}
              </span>
            }
            hint={data.phone.displayPhoneNumber ?? undefined}
          />
          <Fact
            label="Límite de mensajes"
            value={data.phone.messagingLimitLabel ? `${data.phone.messagingLimitLabel} / 24 h` : '—'}
            hint="Conversaciones iniciadas por la empresa"
          />
          <Fact
            label="Nombre visible"
            value={data.phone.verifiedName ?? '—'}
            hint={data.phone.nameStatus ? `Estado: ${data.phone.nameStatus}` : undefined}
          />
          <Fact
            label="Cuenta oficial (palomita)"
            value={
              data.phone.isOfficialBusinessAccount === true
                ? 'Sí'
                : data.phone.isOfficialBusinessAccount === false
                  ? 'Todavía no'
                  : '—'
            }
            hint={`Verificación del negocio: ${verificationText(data.business.verificationStatus)}`}
          />
        </div>

        {data.account.healthErrors.length > 0 && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Meta reporta problemas en la cuenta</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5">
                {data.account.healthErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-semibold text-foreground">Requisitos de la cuenta oficial</p>
            <ul className="space-y-1.5 text-sm">
              {data.oba.map((item) => (
                <li key={item.key} className="flex items-start gap-2">
                  <ChecklistIcon status={item.status} />
                  <div>
                    <span className="text-foreground">{item.label}</span>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
            {data.business.note && (
              <p className="mt-2 text-xs text-muted-foreground">{data.business.note}</p>
            )}
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                Plantillas: {data.templates.approved} aprobadas · {data.templates.pending} en revisión ·{' '}
                {data.templates.rejected + data.templates.blocked} con problema
              </p>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowTemplates((v) => !v)}>
                {showTemplates ? 'Ocultar' : 'Ver todas'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Calidad: {Object.entries(data.templates.byQuality)
                .map(([q, n]) => `${qualityText(q)} ${n}`)
                .join(' · ') || '—'}
            </p>
            {showTemplates && (
              <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs">
                {data.templates.items.map((t) => (
                  <li key={`${t.name}-${t.language}`} className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-foreground">{t.name}</span>
                    <Badge variant="outline">{t.category === 'MARKETING' ? 'Marketing' : t.category === 'UTILITY' ? 'Utilidad' : t.category}</Badge>
                    <span className="text-muted-foreground">{templateStatusText(t.status)}</span>
                    <span className={QUALITY_CLASS[t.quality] ?? 'text-muted-foreground'}>
                      {qualityText(t.quality)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              Avisos de Meta{data.recentEvents.length ? ` (${data.recentEvents.length})` : ''}
            </p>
            {data.recentEvents.length > 3 && (
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowEvents((v) => !v)}>
                {showEvents ? 'Ver menos' : 'Ver todos'}
              </Button>
            )}
          </div>
          {data.recentEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Sin eventos registrados. Si Meta cambia la calidad del número, el estado de una plantilla o
              la cuenta, aparece aquí (y pausa el marketing si hace falta).
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {(showEvents ? data.recentEvents : data.recentEvents.slice(0, 3)).map((ev) => (
                <li key={ev.id} className="flex items-start gap-2">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', SEVERITY_DOT[ev.severity])} />
                  <div>
                    <span className="text-foreground">{ev.summary}</span>
                    <p className="text-xs text-muted-foreground">
                      {fmtCdmx(ev.createdAt)} · {ev.field}
                      {ev.pausedMarketing ? ' · pausó el marketing' : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data.errors.length > 0 && data.configured && (
          <p className="text-xs text-muted-foreground">Lectura parcial: {data.errors.join(' · ')}</p>
        )}
      </CardContent>
    </Card>
  );
}
