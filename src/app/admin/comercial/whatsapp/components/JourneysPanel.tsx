'use client';

// JourneysPanel - Pestaña "Recorridos": los 12 recorridos automáticos de
// WhatsApp (GET /whatsapp/journeys), con el estado del maestro, los avisos
// que importan antes de encender (WhatsApp deshabilitado en el servidor, cron
// apagado en este entorno, maestro apagado, 0 consentimientos para Marketing,
// Marketing en pausa, migración 185 pendiente), una tarjeta por recorrido, la
// configuración global y las corridas recientes (fallidos = fallos reales de
// Meta; "sin WhatsApp" 131026 aparte; omitidos netos de fallido/sin_whatsapp/
// detenido).
//
// Escrituras (encender, correr, probar, configurar) gateadas con el permiso
// `whatsapp:manage` vía hasAnyPermission: nunca con listas de roles.

import { useState } from 'react';
import { Cog6ToothIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useJourneyRuns, useWhatsAppJourneys } from '@/hooks/useWhatsAppJourneys';
import { useWhatsAppChannelStatus } from '@/hooks/useWhatsAppChannel';
import { hasAnyPermission } from '@/lib/admin-nav-filter';
import { apiErrorMessage, type ApiErrorMessages } from '@/lib/api-error';
import { badgeContraste, n } from '@/lib/whatsapp-campaign/format';
import {
  PERMISO_RECORRIDOS,
  etiquetaEstadoCorrida,
  etiquetaFuente,
  omitidosNetos,
  plantillaDeCanal,
  sinWhatsAppDe,
  toneEstadoCorrida,
} from '@/lib/whatsapp-campaign/recorridos';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions } from '@/store/slices/authSlice';
import { ErrorState } from './ErrorState';
import { JourneyCard } from './JourneyCard';
import { JourneyTestDialog } from './JourneyTestDialog';
import { JourneysSettingsDialog } from './JourneysSettingsDialog';
import { EmptyNote, Panel } from './Panel';

const JOURNEY_ERROR_MESSAGES: ApiErrorMessages = {
  forbidden: 'Tu rol no tiene acceso a los recorridos de WhatsApp. Pide a Sistemas que habilite el permiso Comercial.',
  unavailable: 'Los recorridos aún no están habilitados en el servidor (migración 185 pendiente).',
  notFound: 'El API todavía no expone los recorridos de WhatsApp (despliegue pendiente).',
};

function RunsTable({ periodNumber, enabled }: { periodNumber: number | null; enabled: boolean }) {
  const q = useJourneyRuns({ periodNumber }, enabled);
  if (!enabled) return null;
  if (q.isLoading) return <Skeleton className="h-32 w-full" />;
  if (q.isError) {
    return <p className="text-sm text-destructive">{apiErrorMessage(q.error, 'No se pudieron cargar las corridas.')}</p>;
  }
  const runs = q.data ?? [];
  if (runs.length === 0) return <EmptyNote>Sin corridas en este periodo todavía.</EmptyNote>;
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Inicio</TableHead>
            <TableHead>Recorrido</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Enviados</TableHead>
            <TableHead className="text-right" title="Fallos reales de Meta (sin 131026)">
              Fallidos
            </TableHead>
            <TableHead className="text-right" title="Números sin WhatsApp (Meta 131026); no son fallos">
              Sin WhatsApp
            </TableHead>
            <TableHead className="text-right" title="Omitidos por candados y topes (sin fallidos, sin WhatsApp ni los que quedaron sin intentar)">
              Omitidos
            </TableHead>
            <TableHead>Fin</TableHead>
            <TableHead>Nota</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="tabular-nums">
          {runs.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap font-mono text-xs">{r.startedCdmx ?? '—'}</TableCell>
              <TableCell className="font-medium">{r.code}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{etiquetaFuente(r.source)}</TableCell>
              <TableCell>
                <Badge variant={toneEstadoCorrida(r.status)} className={badgeContraste(toneEstadoCorrida(r.status))}>
                  {etiquetaEstadoCorrida(r.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{n(r.counts.sent)}</TableCell>
              <TableCell className="text-right">{n(r.counts.failed)}</TableCell>
              <TableCell className="text-right">{n(sinWhatsAppDe(r.counts.byError))}</TableCell>
              <TableCell className="text-right">
                {n(omitidosNetos(r.counts.skipped))}
                {(r.counts.skipped.detenido ?? 0) > 0 && (
                  <span className="block text-xs text-muted-foreground">
                    {n(r.counts.skipped.detenido)} sin intentar
                  </span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap font-mono text-xs">{r.finishedCdmx ?? '—'}</TableCell>
              <TableCell className="max-w-64 whitespace-normal text-xs text-muted-foreground">{r.error ?? ''}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function JourneysPanel({ periodNumber }: { periodNumber: number | null }) {
  const overview = useWhatsAppJourneys();
  const channel = useWhatsAppChannelStatus();
  const permissions = useAppSelector(selectUserPermissions);
  const canManage = hasAnyPermission(permissions, [PERMISO_RECORRIDOS]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [test, setTest] = useState<{ code: string | null; phone: string | null } | null>(null);
  const [runsOpen, setRunsOpen] = useState(false);

  if (overview.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }
  const data = overview.data;
  if (!data) {
    return (
      <ErrorState
        error={overview.error}
        fallback="No se pudieron cargar los recorridos."
        onRetry={() => void overview.refetch()}
        retrying={overview.isFetching}
        messages={JOURNEY_ERROR_MESSAGES}
        unavailableTitle="Recorridos aún no habilitados"
      />
    );
  }

  const encendidos = data.journeys.filter((j) => j.enabled).length;
  const marketingConOptIn = data.journeys.some((j) => j.category === 'MARKETING');

  return (
    <Panel
      id="t-recorridos"
      title="Recorridos automáticos"
      aside={
        <span className="flex flex-wrap items-center gap-2">
          {data.period && <span>Periodo {data.period.name}</span>}
          <Badge variant={data.settings.enabled ? 'success' : 'warning'} className={badgeContraste(data.settings.enabled ? 'success' : 'warning')}>
            {data.settings.enabled ? 'Maestro encendido' : 'Maestro apagado'}
          </Badge>
          <Badge variant="outline">
            {encendidos} de {data.journeys.length} encendidos
          </Badge>
          <Button variant="outline" size="sm" className="h-7" onClick={() => setSettingsOpen(true)}>
            <Cog6ToothIcon className="h-4 w-4" />
            Configuración
          </Button>
        </span>
      }
    >
      <div className="grid gap-4">
        {overview.isError && (
          <ErrorState
            error={overview.error}
            fallback="No se pudo actualizar la lista de recorridos."
            onRetry={() => void overview.refetch()}
            retrying={overview.isFetching}
            staleAt="la última lectura"
            messages={JOURNEY_ERROR_MESSAGES}
          />
        )}

        {!data.whatsappEnabled && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>WhatsApp Cloud API deshabilitado en el servidor</AlertTitle>
            <AlertDescription>
              Ningún recorrido ni prueba puede salir (WHATSAPP_ENABLED apagado en el API). Los
              interruptores de aquí no lo cambian: pide a Sistemas que lo habilite.
            </AlertDescription>
          </Alert>
        )}
        {data.migrationPending && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Falta la migración 185</AlertTitle>
            <AlertDescription>
              Los recorridos se muestran apagados y no se pueden encender ni configurar hasta que
              Sistemas aplique la migración en la base. Los envíos del canal no se afectan.
            </AlertDescription>
          </Alert>
        )}
        {!data.cronEnabled && (
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>El cron de recorridos no corre en este entorno</AlertTitle>
            <AlertDescription>
              Las corridas automáticas solo corren en producción. Aquí los recorridos no salen solos;
              únicamente con &ldquo;Correr ahora&rdquo; (con el maestro y el recorrido encendidos).
            </AlertDescription>
          </Alert>
        )}
        {!data.migrationPending && !data.settings.enabled && (
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Interruptor maestro apagado</AlertTitle>
            <AlertDescription>
              Ningún recorrido manda mensajes aunque esté encendido: ni en automático ni con
              &ldquo;Correr ahora&rdquo; (el API rechaza la corrida manual con el maestro apagado). Solo
              salen las pruebas a monitores. Se enciende en &ldquo;Configuración&rdquo;; antes conviene
              mandar pruebas a los monitores.
            </AlertDescription>
          </Alert>
        )}
        {data.marketingPaused && (
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Marketing en pausa</AlertTitle>
            <AlertDescription>
              La salud del canal tiene pausadas las promociones: los recorridos de Marketing no salen;
              los avisos de cuenta (Utilidad) sí.
            </AlertDescription>
          </Alert>
        )}
        {data.optInCount === 0 && marketingConOptIn && (
          <Alert>
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Sin consentimientos de promociones registrados (0 opt-in)</AlertTitle>
            <AlertDescription>
              Las promociones (Marketing) solo salen a quien aceptó recibirlas. Hasta que corra J12
              Preferencias o se capture el consentimiento en el POS, el panel del distribuidor o la
              ficha del admin, los recorridos de Marketing no tienen a quién escribir.
            </AlertDescription>
          </Alert>
        )}

        {data.journeys.length === 0 ? (
          <EmptyNote>El API no devolvió recorridos (falta la semilla de la migración 185).</EmptyNote>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.journeys.map((j) => (
              <JourneyCard
                key={j.code}
                item={j}
                canManage={canManage}
                masterEnabled={data.settings.enabled}
                marketingPaused={data.marketingPaused}
                optInCount={data.optInCount}
                migrationPending={data.migrationPending}
                channelTemplate={plantillaDeCanal(channel.data, j.templateName ?? j.template?.name)}
                periodNumber={periodNumber ?? data.period?.number ?? null}
                onTest={(code) => setTest({ code, phone: null })}
              />
            ))}
          </div>
        )}

        <details
          className="group rounded-md border p-3 text-sm"
          onToggle={(e) => setRunsOpen((e.currentTarget as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer font-medium">
            Corridas recientes{' '}
            <span className="font-normal text-muted-foreground">
              (últimas 50{periodNumber != null ? `, periodo ${periodNumber}` : ''})
            </span>
          </summary>
          <div className="mt-3">
            <RunsTable periodNumber={periodNumber ?? data.period?.number ?? null} enabled={runsOpen} />
          </div>
        </details>

        <p className="text-xs text-muted-foreground">
          Las horas son del centro de México; cada recorrido corre en el horario local de la sucursal
          de la persona ({data.settings.quietStart}–{data.settings.quietEnd}). Los topes por persona
          (2 promociones en 7 días, 4 por periodo, 48 h entre dos, 1 aviso de cuenta al día) los aplica
          el motor en cada corrida.
        </p>
      </div>

      {settingsOpen && (
        <JourneysSettingsDialog
          open
          onOpenChange={(o) => !o && setSettingsOpen(false)}
          saved={data.settings}
          canManage={canManage}
          onTest={(phone) => setTest({ code: null, phone })}
        />
      )}
      {test && (
        <JourneyTestDialog
          open
          onOpenChange={(o) => !o && setTest(null)}
          journeys={data.journeys}
          monitors={data.settings.monitorRecipients}
          initialCode={test.code}
          initialPhone={test.phone}
        />
      )}
    </Panel>
  );
}
