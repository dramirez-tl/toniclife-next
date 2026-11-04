'use client';

// JourneySendsDialog - "Ver envíos" de un recorrido: bitácora de
// whatsapp_messages (GET /whatsapp/messages, tipo 'journey') con export CSV.
// La clave del mensaje cambia por ola o por evento ('j3-cierre-p75#1',
// 'j11-compra-p75#<folio>', 'j1-bienvenida'), así que se filtra por la
// plantilla del recorrido (el buscador del API compara template_name); solo
// sin plantilla se cae a la clave de la campaña. CONTIENE DATOS PERSONALES
// (número, nombre y teléfono), como Inducción › Envíos. El CSV pagina hasta
// 10 páginas de 500 y avisa si quedó algo fuera.

import { useMemo, useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWhatsAppMessages } from '@/hooks/useInduction';
import { apiErrorMessage } from '@/lib/api-error';
import { n } from '@/lib/whatsapp-campaign/format';
import {
  csvCell,
  downloadCsvFile,
  formatDateTimeCdmx,
  statusMeta,
  todayCdmx,
} from '@/app/admin/comercial/formularios/components/induccion-utils';
import { inductionService, type WhatsAppMessageQueryParams } from '@/services/induction.service';
import type { JourneyItem } from '@/types/whatsappJourneys';

const PAGE_SIZE = 20;
const JOURNEY_KIND = 'journey';
/** Export CSV: hasta 10 páginas de 500 (5,000 mensajes); más allá se avisa. */
const EXPORT_PAGE_SIZE = 500;
const EXPORT_MAX_PAGES = 10;

/** Filtro de la bitácora: por plantilla si se conoce; si no, por clave de campaña. */
export function filtroEnvios(item: Pick<JourneyItem, 'templateName' | 'campaignKey'>): WhatsAppMessageQueryParams {
  if (item.templateName) return { campaignKind: JOURNEY_KIND, search: item.templateName };
  if (item.campaignKey) return { campaignKind: JOURNEY_KIND, campaignKey: item.campaignKey };
  return { campaignKind: JOURNEY_KIND };
}

export function JourneySendsDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Pick<JourneyItem, 'code' | 'name' | 'templateName' | 'campaignKey'>;
}) {
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const base = useMemo(() => filtroEnvios(item), [item]);
  const params = useMemo(() => ({ ...base, page, limit: PAGE_SIZE }), [base, page]);
  const q = useWhatsAppMessages(params, open);
  const list = q.data;

  const exportar = async () => {
    setExporting(true);
    try {
      // Paginado: la bitácora puede pasar de 500 filas (J11/J1 mandan por evento).
      const primera = await inductionService.getMessages({ ...base, page: 1, limit: EXPORT_PAGE_SIZE });
      const filas = [...primera.data];
      const total = Math.max(primera.total ?? 0, filas.length);
      const paginas = Math.min(primera.totalPages ?? 1, EXPORT_MAX_PAGES);
      for (let p = 2; p <= paginas; p++) {
        const r = await inductionService.getMessages({ ...base, page: p, limit: EXPORT_PAGE_SIZE });
        if (r.data.length === 0) break;
        filas.push(...r.data);
      }
      const header = [
        'Fecha (CDMX)',
        'Recorrido',
        'Clave',
        'Distribuidor (número)',
        'Distribuidor (nombre)',
        'Teléfono',
        'Plantilla',
        'Estado',
        'Enviado',
        'Entregado',
        'Leído',
        'Código de error',
        'Error',
      ];
      const lines = [
        header.join(','),
        ...filas.map((m) =>
          [
            csvCell(formatDateTimeCdmx(m.createdAt)),
            csvCell(item.code),
            csvCell(m.campaignKey),
            csvCell(m.customerNumber),
            csvCell(m.customerName),
            csvCell(m.phoneE164),
            csvCell(m.templateName),
            csvCell(statusMeta(m.status).label),
            csvCell(formatDateTimeCdmx(m.sentAt)),
            csvCell(formatDateTimeCdmx(m.deliveredAt)),
            csvCell(formatDateTimeCdmx(m.readAt)),
            csvCell(m.errorCode),
            csvCell(m.errorDetail ?? m.errorTitle),
          ].join(','),
        ),
      ];
      downloadCsvFile(`whatsapp-${item.code.toLowerCase()}-envios-${todayCdmx()}.csv`, lines);
      if (filas.length < total) {
        toast.warning(
          `Se exportaron ${n(filas.length)} de ${n(total)} mensajes (tope de ${n(EXPORT_PAGE_SIZE * EXPORT_MAX_PAGES)} por archivo). Los demás están en Comercial › Formularios › Taller de Inducción › Envíos.`,
          { duration: 10_000 },
        );
      } else {
        toast.success(`Exportados ${n(filas.length)} mensajes`);
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo exportar'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Envíos · {item.code} {item.name}
          </DialogTitle>
          <DialogDescription>
            Bitácora de mensajes del recorrido
            {item.templateName ? (
              <>
                {' '}
                (plantilla <span className="font-mono">{item.templateName}</span>)
              </>
            ) : null}
            . Contiene datos personales. La bitácora completa de todos los tipos está en Comercial ›
            Formularios › Taller de Inducción › Envíos (tipo &ldquo;Recorrido&rdquo;).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            Mensajes <span className="font-normal text-muted-foreground">({list?.total ?? 0})</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {list && list.totalPages > 1 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <span>
                  {page} / {list.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= list.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={exportar} disabled={exporting || !list || list.total === 0}>
              <ArrowDownTrayIcon className="h-4 w-4" />
              {exporting ? 'Exportando…' : 'Exportar CSV'}
            </Button>
          </div>
        </div>

        {q.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : q.isError ? (
          <p className="py-6 text-center text-sm font-medium text-destructive">
            {apiErrorMessage(q.error, 'No se pudo cargar la bitácora.')}
          </p>
        ) : !list || list.data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin envíos de este recorrido todavía.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Entregado</TableHead>
                  <TableHead>Leído</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((m) => {
                  const meta = statusMeta(m.status);
                  const error = m.errorDetail ?? m.errorTitle;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTimeCdmx(m.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{m.campaignKey ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {m.customerNumber || m.customerName ? (
                          <span className="inline-flex flex-wrap items-baseline gap-x-2">
                            {m.customerNumber && <span className="font-mono text-xs font-semibold">{m.customerNumber}</span>}
                            {m.customerName && <span className="text-muted-foreground">{m.customerName}</span>}
                          </span>
                        ) : (
                          <Badge variant="info">Monitoreo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{m.phoneE164}</TableCell>
                      <TableCell>
                        <Badge className={meta.className}>{meta.label}</Badge>
                        {m.status === 'failed' && error && (
                          <p className="mt-0.5 max-w-56 truncate text-[11px] text-destructive" title={error}>
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
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
