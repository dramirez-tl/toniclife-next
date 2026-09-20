'use client';

// Detalle de lote de dispersión (contrato §4.2 GET /:id, §5.3): cabecera con
// número, estado, periodo, moneda, formato, totales congelados y hash;
// línea de tiempo (generado → enviado → resultado → conciliado / cancelado);
// acciones por estado; tabla de ítems (secuencia, distribuidor, banco,
// ****últimos 4, importe, estado de fila, referencia, clave de rastreo,
// motivo) paginada con filtro por estado y export CSV.

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDownTrayIcon, ArrowLeftIcon, BanknotesIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { usePayoutBatchDetail } from '@/hooks/useTreasury';
import { payoutBatchesService } from '@/services/treasury.service';
import { exportToCsv } from '@/lib/csv-export';
import {
  TreasuryHeader,
  TreasuryTabs,
  actorName,
  csvSafe,
  formatDateOnly,
  formatDateTime,
  formatInt,
  formatMoney,
  toNumber,
  treasuryErrorMessage,
} from '@/components/admin/treasury';
import {
  BatchActionButtons,
  BatchActionDialogs,
  BatchStatusBadge,
  ROW_STATUS_LABELS,
  RowStatusBadge,
  layoutFormatLabel,
  payoutExportFilename,
  rowStatusLabel,
  type BatchActionTarget,
} from '@/components/admin/treasury/payouts';
import type { PayoutBatchFull, PayoutBatchItem, PayoutItemRowStatus } from '@/types/treasury';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const ROW_STATUS_OPTIONS = (Object.keys(ROW_STATUS_LABELS) as PayoutItemRowStatus[]).map((value) => ({
  value,
  label: ROW_STATUS_LABELS[value],
}));

export default function BatchDetailPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BatchDetailContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

interface TimelineStep {
  key: string;
  label: string;
  at: string | null;
  who?: string;
  extra?: string;
}

function timeline(batch: PayoutBatchFull): TimelineStep[] {
  const out: TimelineStep[] = [
    { key: 'generated', label: 'Generado (layout + hash)', at: batch.layoutGeneratedAt ?? batch.createdAt, who: actorName(batch.createdBy) },
  ];
  if (batch.sentAt || batch.status === 'sent' || batch.status === 'reconciled') {
    out.push({ key: 'sent', label: 'Enviado al banco', at: batch.sentAt ?? null, who: actorName(batch.sentBy), ...(batch.bankReference ? { extra: `Ref. ${batch.bankReference}` } : {}) });
  }
  if (batch.resultSummary?.appliedAt) {
    const s = batch.resultSummary;
    out.push({
      key: 'result',
      label: 'Resultado del banco aplicado',
      at: s.appliedAt ?? null,
      who: actorName(typeof s.appliedBy === 'string' ? s.appliedBy : s.appliedBy ?? null),
      extra: `${formatInt(s.paid ?? 0)} pagadas · ${formatInt(s.failed ?? 0)} rechazadas${s.mismatched ? ` · ${formatInt(s.mismatched)} sin cuadrar` : ''}`,
    });
  }
  if (batch.status === 'reconciled') out.push({ key: 'reconciled', label: 'Conciliado', at: batch.reconciledAt ?? null, who: actorName(batch.reconciledBy) });
  if (batch.status === 'cancelled') out.push({ key: 'cancelled', label: 'Cancelado', at: batch.cancelledAt ?? null, who: actorName(batch.cancelledBy), ...(batch.cancelReason ? { extra: batch.cancelReason } : {}) });
  return out;
}

function BatchDetailContent() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : null;
  const { get, getNumber, setParams } = useQueryFilters({ page: '1', limit: '50' });
  const rowStatusParam = get('rowStatus');
  const rowStatus = (Object.keys(ROW_STATUS_LABELS) as string[]).includes(rowStatusParam) ? (rowStatusParam as PayoutItemRowStatus) : undefined;
  const page = getNumber('page') || 1;
  const limit = PAGE_SIZE_OPTIONS.includes(getNumber('limit')) ? getNumber('limit') : 50;

  const detail = usePayoutBatchDetail(id, { page, limit, rowStatus });
  const batch = detail.data?.batch ?? null;
  const items = useMemo(() => detail.data?.items ?? [], [detail.data]);
  const meta = detail.data?.meta;
  const summary = detail.data?.summary ?? null;
  const total = meta?.total ?? items.length;

  const [actionTarget, setActionTarget] = useState<BatchActionTarget | null>(null);
  const [exporting, setExporting] = useState(false);

  const copyHash = async () => {
    if (!batch?.layoutSha256) return;
    try {
      await navigator.clipboard.writeText(batch.layoutSha256);
      toast.success('Hash copiado');
    } catch {
      toast.error('No se pudo copiar el hash');
    }
  };

  const handleExport = async () => {
    if (!batch) return;
    setExporting(true);
    try {
      const all = await payoutBatchesService.allItems(batch.id);
      exportToCsv(
        payoutExportFilename(batch.batchNumber),
        ['Secuencia', 'Nº distribuidor', 'Beneficiario', 'Banco', 'Cuenta', 'Importe', 'Moneda', 'Retenido', 'Neto MXN', 'Estado', 'Referencia', 'Clave de rastreo', 'Motivo'],
        all.map((it) => [
          it.sequence,
          csvSafe(it.customerNumber ?? ''),
          csvSafe(it.name),
          csvSafe(it.bankName ?? ''),
          it.accountLast4 ? `****${it.accountLast4}` : '',
          toNumber(it.payoutAmount),
          batch.currencyCode,
          it.payoutWithheld === null || it.payoutWithheld === undefined ? '' : toNumber(it.payoutWithheld),
          toNumber(it.amountMxn),
          rowStatusLabel(it.rowStatus),
          csvSafe(it.reference ?? ''),
          csvSafe(it.trackingKey ?? ''),
          csvSafe(it.failureReason ?? ''),
        ]),
      );
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo exportar el lote'));
    } finally {
      setExporting(false);
    }
  };

  const columns: DataTableColumn<PayoutBatchItem>[] = [
    { key: 'sequence', header: '#', cellClassName: 'tabular-nums text-muted-foreground', render: (it) => it.sequence },
    {
      key: 'customer',
      header: 'Distribuidor',
      render: (it) => (
        <div className="min-w-[10rem]">
          {it.customerId ? (
            <Link href={`/admin/distribuidores/${it.customerId}`} className="font-medium text-primary hover:underline">
              {it.name}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{it.name}</span>
          )}
          <p className="text-xs text-muted-foreground">{it.customerNumber ? `#${it.customerNumber}` : 'Sin número'}</p>
        </div>
      ),
    },
    {
      key: 'bank',
      header: 'Cuenta',
      cellClassName: 'text-xs',
      render: (it) => (
        <>
          <p>{it.bankName ?? '—'}</p>
          <p className="font-mono text-muted-foreground">{it.accountLast4 ? `****${it.accountLast4}` : '—'}</p>
        </>
      ),
    },
    {
      key: 'amount',
      header: 'Importe',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (it) => (
        <>
          <p className="font-semibold">{formatMoney(it.payoutAmount, batch?.currencyCode)}</p>
          {it.payoutWithheld !== null && it.payoutWithheld !== undefined && toNumber(it.payoutWithheld) > 0 && (
            <p className="text-xs text-muted-foreground">convenios {formatMoney(it.payoutWithheld, batch?.currencyCode)}</p>
          )}
          {batch?.currencyCode !== 'MXN' && <p className="text-xs text-muted-foreground">= {formatMoney(it.amountMxn, 'MXN')}</p>}
        </>
      ),
    },
    { key: 'rowStatus', header: 'Estado', render: (it) => <RowStatusBadge status={it.rowStatus} /> },
    {
      key: 'reference',
      header: 'Referencia / rastreo',
      cellClassName: 'font-mono text-xs',
      render: (it) => (
        <>
          <p>{it.reference ?? '—'}</p>
          {it.trackingKey && <p className="text-muted-foreground">{it.trackingKey}</p>}
        </>
      ),
    },
    {
      key: 'failure',
      header: 'Motivo',
      cellClassName: 'text-xs text-destructive',
      render: (it) => it.failureReason ?? '',
    },
  ];

  return (
    <div className="p-6">
      <TreasuryHeader
        icon={BanknotesIcon}
        title={batch ? `Lote ${batch.batchNumber}` : 'Lote de dispersión'}
        subtitle={batch ? `${batch.period?.name ?? batch.periodId} · ${batch.currencyCode} · ${layoutFormatLabel(batch.layoutFormat)}` : 'Detalle del lote, ítems y resultado del banco.'}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href="/admin/tesoreria/dispersion">
                <ArrowLeftIcon className="mr-2 h-4 w-4" aria-hidden /> Lotes
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleExport()} disabled={!batch || exporting || total === 0}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <ArrowDownTrayIcon className="mr-2 h-4 w-4" aria-hidden />}
              Exportar ítems
            </Button>
          </>
        }
      />

      <div className="mb-6">
        <TreasuryTabs active="dispersion" periodId={batch?.periodId} />
      </div>

      {detail.isLoading && !batch ? (
        <Skeleton className="mb-6 h-40 w-full" />
      ) : detail.isError ? (
        <Card className="mb-6 border-destructive/30">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-destructive">{treasuryErrorMessage(detail.error, 'No se pudo cargar el lote')}</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void detail.refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : batch ? (
        <>
          <Card className="mb-6 border-border shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <BatchStatusBadge status={batch.status} />
                  <Badge variant="outline" className="font-mono">
                    {batch.currencyCode}
                  </Badge>
                  {batch.fxRateToMxn !== null && batch.fxRateToMxn !== undefined && batch.currencyCode !== 'MXN' && (
                    <span className="text-xs text-muted-foreground">FX congelado {String(batch.fxRateToMxn)} MXN</span>
                  )}
                </div>
                <BatchActionButtons batch={batch} onAction={setActionTarget} />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Filas" value={formatInt(batch.itemsCount)} />
                <Stat label="Total del layout" value={formatMoney(batch.totalNetPayout, batch.currencyCode)} />
                <Stat label="Convenios retenidos" value={formatMoney(batch.totalWithheld, batch.currencyCode)} />
                <Stat label="Neto fiscal (MXN)" value={formatMoney(batch.totalGrossMxn, 'MXN')} />
                <Stat label="Fecha valor" value={formatDateOnly(batch.paymentDate)} />
                <Stat
                  label="Resultado de filas"
                  value={
                    summary
                      ? `${formatInt(summary.paid)} pagadas · ${formatInt(summary.failed)} rechazadas · ${formatInt(summary.pending)} pendientes`
                      : '—'
                  }
                />
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hash del layout (sha256)</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <code className="truncate font-mono text-xs text-foreground" title={batch.layoutSha256 ?? undefined}>
                      {batch.layoutSha256 ?? '—'}
                    </code>
                    {batch.layoutSha256 && (
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => void copyHash()} aria-label="Copiar hash">
                        <ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                  </div>
                  {batch.resultSha256 && (
                    <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground" title={batch.resultSha256}>
                      resultado: {batch.resultSha256}
                    </p>
                  )}
                </div>
              </div>

              {batch.notes && <p className="mt-4 text-sm text-muted-foreground">Notas: {batch.notes}</p>}

              <ol className="mt-5 space-y-2 border-l border-border pl-4 text-sm">
                {timeline(batch).map((e) => (
                  <li key={e.key} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                    <p className="font-medium text-foreground">{e.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.at ? formatDateTime(e.at) : 'sin fecha'}
                      {e.who ? ` · ${e.who}` : ''}
                      {e.extra ? ` · ${e.extra}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {formatInt(total)} ítem(s){detail.isFetching && !detail.isLoading ? ' · actualizando…' : ''}
                </p>
                <div className="w-48 space-y-1.5">
                  <Label htmlFor="batch-row-status">Estado de fila</Label>
                  <SearchableSelect id="batch-row-status" options={ROW_STATUS_OPTIONS} value={rowStatus ?? ''} onChange={(v) => setParams({ rowStatus: v || null, page: null })} allLabel="Todas" />
                </div>
              </div>
              <DataTable columns={columns} data={items} getRowKey={(it) => it.commissionId} isLoading={detail.isLoading} minWidthClassName="min-w-[56rem]" emptyMessage="Sin ítems con este filtro." />
              {total > limit && (
                <DataTablePagination
                  currentPage={meta?.page ?? page}
                  pageSize={limit}
                  totalItems={total}
                  onPageChange={(p) => setParams({ page: String(p) })}
                  onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  isLoading={detail.isFetching}
                />
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <BatchActionDialogs target={actionTarget} onClose={() => setActionTarget(null)} />
    </div>
  );
}
