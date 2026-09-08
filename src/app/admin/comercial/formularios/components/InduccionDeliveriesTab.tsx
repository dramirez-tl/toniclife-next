'use client';

// InduccionDeliveriesTab - Seccion "Envios": metricas por tipo de campana
// (invitacion / recordatorio / monitoreo / manual) desde
// /whatsapp/messages/stats y tabla paginada de /whatsapp/messages con filtros
// (tipo, estado, busqueda) y export CSV con neutralizacion de formulas. Las
// copias de monitoreo (kind 'induccion_monitor') no tienen cliente: se
// etiquetan con el nombre del monitor ({{1}} de la copia).

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useWhatsAppMessages,
  useWhatsAppMessageStats,
} from '@/hooks/useInduction';
import {
  inductionService,
  WHATSAPP_MESSAGE_STATUSES,
  type WhatsAppMessage,
  type WhatsAppMessageStats,
} from '@/services/induction.service';
import {
  apiErrorInfo,
  apiErrorMessage,
  CAMPAIGN_KIND_LABELS,
  csvCell,
  downloadCsvFile,
  formatDateTimeCdmx,
  MONITOR_KIND,
  statusMeta,
  todayCdmx,
} from './induccion-utils';

const ALL = 'all';
const PAGE_SIZE = 20;

const STATS_KINDS: Array<{ kind: string; label: string }> = [
  { kind: 'induccion_invitacion', label: 'Invitaciones' },
  { kind: 'induccion_recordatorio', label: 'Recordatorios' },
  { kind: MONITOR_KIND, label: 'Monitoreo' },
  { kind: 'manual', label: 'Manuales' },
];

/** Nombre del monitor en una copia de monitoreo ({{1}} del body). */
const monitorNameOf = (m: WhatsAppMessage): string =>
  m.campaignKind === MONITOR_KIND ? (m.bodyParams?.[0] ?? '').trim() : '';

export default function InduccionDeliveriesTab() {
  const [kind, setKind] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(
    () => ({
      campaignKind: kind === ALL ? undefined : kind,
      status: status === ALL ? undefined : status,
      search: appliedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [kind, status, appliedSearch, page],
  );
  const messagesQuery = useWhatsAppMessages(params);
  const messages = messagesQuery.data;

  const applyFilters = () => {
    setAppliedSearch(search.trim());
    setPage(1);
  };

  async function handleExport() {
    setExporting(true);
    try {
      const all = await inductionService.getMessages({
        ...params,
        page: 1,
        limit: 500,
      });
      const header = [
        'Fecha (CDMX)',
        'Tipo',
        'Campaña',
        'Dirección',
        'Distribuidor (número)',
        'Distribuidor (nombre)',
        'Teléfono',
        'Plantilla',
        'Estado',
        'Enviado',
        'Entregado',
        'Leído',
        'Falló',
        'Código de error',
        'Error',
        'Texto entrante',
        'wamid',
      ];
      const lines = [
        header.join(','),
        ...all.data.map((m) =>
          [
            csvCell(formatDateTimeCdmx(m.createdAt)),
            csvCell(CAMPAIGN_KIND_LABELS[m.campaignKind] ?? m.campaignKind),
            csvCell(m.campaignKey),
            csvCell(m.direction === 'in' ? 'Entrante' : 'Saliente'),
            csvCell(m.customerNumber),
            csvCell(
              m.customerName ??
                (m.campaignKind === MONITOR_KIND
                  ? `Monitoreo: ${monitorNameOf(m)}`
                  : null),
            ),
            csvCell(m.phoneE164),
            csvCell(m.templateName),
            csvCell(statusMeta(m.status).label),
            csvCell(formatDateTimeCdmx(m.sentAt)),
            csvCell(formatDateTimeCdmx(m.deliveredAt)),
            csvCell(formatDateTimeCdmx(m.readAt)),
            csvCell(formatDateTimeCdmx(m.failedAt)),
            csvCell(m.errorCode),
            csvCell(m.errorDetail ?? m.errorTitle),
            csvCell(m.textBody),
            csvCell(m.wamid),
          ].join(','),
        ),
      ];
      downloadCsvFile(`whatsapp-envios-${todayCdmx()}.csv`, lines);
      toast.success(`Exportados ${all.data.length} mensajes`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo exportar'));
    } finally {
      setExporting(false);
    }
  }

  const errorInfo = messagesQuery.isError
    ? apiErrorInfo(messagesQuery.error, 'No se pudo cargar el historial.')
    : null;

  return (
    <div className="space-y-4">
      {/* Metricas por tipo */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STATS_KINDS.map((s) => (
          <StatsCard key={s.kind} kind={s.kind} label={s.label} />
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Label className="mb-1 text-xs text-muted-foreground">
            Buscar (nombre, número o teléfono)
          </Label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="Ej. 12345, García, +5255…"
              className="pl-8"
            />
          </div>
        </div>
        <div>
          <Label className="mb-1 text-xs text-muted-foreground">Tipo</Label>
          <Select
            value={kind}
            onValueChange={(v) => {
              setKind(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {Object.entries(CAMPAIGN_KIND_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 text-xs text-muted-foreground">Estado</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {WHATSAPP_MESSAGE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusMeta(s).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={applyFilters}>Buscar</Button>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting || !messages || messages.total === 0}
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </Button>
      </div>

      {/* Tabla */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            Mensajes{' '}
            <span className="font-normal text-muted-foreground">
              ({messages?.total ?? 0})
            </span>
          </p>
          {messages && messages.totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <span>
                {page} / {messages.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= messages.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>

        {messagesQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : errorInfo ? (
          <p className="py-8 text-center text-sm font-medium text-red-600">
            {errorInfo.message}
          </p>
        ) : !messages || messages.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Sin mensajes con estos filtros.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Plantilla / texto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Entregado</TableHead>
                  <TableHead>Leído</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.data.map((m) => (
                  <MessageRow key={m.id} m={m} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageRow({ m }: { m: WhatsAppMessage }) {
  const meta = statusMeta(m.status);
  const error = m.errorDetail ?? m.errorTitle;
  const isMonitor = m.campaignKind === MONITOR_KIND;
  const monitorName = monitorNameOf(m);
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDateTimeCdmx(m.createdAt)}
      </TableCell>
      <TableCell className="text-xs">
        <div>{CAMPAIGN_KIND_LABELS[m.campaignKind] ?? m.campaignKind}</div>
        {m.campaignKey && (
          <div className="font-mono text-[11px] text-muted-foreground">
            {m.campaignKey}
          </div>
        )}
      </TableCell>
      <TableCell className="text-sm">
        {m.customerNumber || m.customerName ? (
          <span className="inline-flex flex-wrap items-baseline gap-x-2">
            {m.customerNumber && (
              <span className="font-mono text-xs font-semibold text-gray-900">
                {m.customerNumber}
              </span>
            )}
            {m.customerName && (
              <span className="text-muted-foreground">{m.customerName}</span>
            )}
          </span>
        ) : isMonitor ? (
          <span className="inline-flex flex-wrap items-center gap-x-1.5">
            <Badge variant="info">Monitoreo</Badge>
            {monitorName && (
              <span className="text-muted-foreground">{monitorName}</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm">{m.phoneE164}</TableCell>
      <TableCell className="max-w-64 text-xs">
        {m.direction === 'in' ? (
          <span className="line-clamp-2 text-gray-800" title={m.textBody ?? ''}>
            {m.textBody || '(sin texto)'}
          </span>
        ) : (
          <span className="font-mono">{m.templateName || '-'}</span>
        )}
      </TableCell>
      <TableCell>
        <Badge className={meta.className}>{meta.label}</Badge>
        {m.status === 'failed' && error && (
          <p className="mt-0.5 max-w-56 truncate text-[11px] text-red-700" title={error}>
            {m.errorCode ? `[${m.errorCode}] ` : ''}
            {error}
          </p>
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDateTimeCdmx(m.deliveredAt)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
        {formatDateTimeCdmx(m.readAt)}
      </TableCell>
    </TableRow>
  );
}

function StatsCard({ kind, label }: { kind: string; label: string }) {
  const q = useWhatsAppMessageStats({ campaignKind: kind });
  const s: WhatsAppMessageStats | undefined = q.data;
  if (q.isLoading) return <Skeleton className="h-28 w-full" />;
  if (q.isError) {
    return (
      <div className="rounded-md border p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xs text-red-600">
          {apiErrorMessage(q.error, 'Sin datos')}
        </p>
      </div>
    );
  }
  // total = suma de los seis desgloses (incluye 'En cola': filas sin respuesta
  // de Meta o atoradas, que el cron barre a fallidas a los 10 min).
  const items: Array<[string, number | undefined, string]> = [
    ['En cola', s?.queued, 'text-gray-700'],
    ['Aceptados', s?.accepted, 'text-sky-700'],
    ['Enviados', s?.sent, 'text-blue-700'],
    ['Entregados', s?.delivered, 'text-emerald-700'],
    ['Leídos', s?.read, 'text-emerald-800'],
    ['Fallidos', s?.failed, 'text-red-700'],
  ];
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-gray-900">{s?.total ?? 0}</p>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1 text-center">
        {items.map(([l, v, tone]) => (
          <div key={l}>
            <p className={`text-sm font-semibold ${tone}`}>{v ?? 0}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
      {s && s.byError?.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t pt-2 text-[11px] text-muted-foreground">
          {s.byError.slice(0, 3).map((e, i) => (
            <li key={`${e.code ?? 'x'}-${i}`} className="truncate" title={e.title ?? ''}>
              <span className="font-mono">{e.code ?? '?'}</span> {e.title ?? ''}{' '}
              <span className="text-gray-900">({e.count})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
