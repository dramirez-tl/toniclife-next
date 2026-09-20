'use client';

// PaymentsLedger — ledger inmutable `commission_payments` (contrato §4.1
// GET /payments): filtros en URL (prefijo `p`: lote, estado, moneda,
// distribuidor, desde/hasta), DataTable paginada en servidor, export CSV del
// API (@AuditLogExport) y recibo PDF por fila (solo `completed`, cuando el
// API expone el id de la comisión). El periodo lo da la página.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useExportPayments, useTreasuryPayments } from '@/hooks/useTreasury';
import { treasuryService } from '@/services/treasury.service';
import { saveBlob } from '@/lib/download';
import { generateCommissionStatementPdf } from '@/lib/generate-commission-statement-pdf';
import { PAYOUT_CURRENCIES, type PaymentLedgerRow, type PaymentLedgerRowExt, type PaymentsLedgerFilters } from '@/types/treasury';
import { DistributorSearchSelect, type DistributorOption } from '../withholdings/DistributorSearchSelect';
import { treasuryErrorMessage } from '../treasury-error';
import { actorName, filenameFromDisposition, formatDateOnly, formatInt, formatMoney } from '../treasury-format';
import { LEDGER_STATUS_TONES, ledgerStatusLabel, paymentMethodLabel, payoutExportFilename } from './payout-format';

interface PaymentsLedgerProps {
  periodId: string | undefined;
  get: (key: string) => string;
  getNumber: (key: string) => number;
  setParams: (updates: Record<string, string | null>) => void;
  /** Lotes del periodo para el filtro por lote (id → número). */
  batchOptions: Array<{ value: string; label: string }>;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const STATUS_OPTIONS = [
  { value: 'completed', label: 'Completado' },
  { value: 'failed', label: 'Rechazado' },
  { value: 'reversed', label: 'Revertido' },
];
const CURRENCY_OPTIONS = PAYOUT_CURRENCIES.map((c) => ({ value: c, label: c }));

function commissionIdOf(row: PaymentLedgerRow): string | null {
  const ext = row as PaymentLedgerRowExt;
  return ext.commissionId ?? ext.commissionCalculationId ?? null;
}

export function PaymentsLedger({ periodId, get, getNumber, setParams, batchOptions }: PaymentsLedgerProps) {
  const status = get('pstatus');
  const currency = get('pcurrency');
  const batchId = get('pbatch');
  const customerId = get('pcustomer');
  const from = get('pfrom');
  const to = get('pto');
  const page = getNumber('ppage') || 1;
  const limit = PAGE_SIZE_OPTIONS.includes(getNumber('plimit')) ? getNumber('plimit') : 20;

  const filters = useMemo<PaymentsLedgerFilters>(
    () => ({
      periodId,
      batchId: batchId || undefined,
      customerId: customerId || undefined,
      status: status || undefined,
      currencyCode: currency || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      limit,
    }),
    [periodId, batchId, customerId, status, currency, from, to, page, limit],
  );

  const ledger = useTreasuryPayments(filters);
  const rows = useMemo(() => ledger.data?.data ?? [], [ledger.data]);
  const total = ledger.data?.meta?.total ?? ledger.data?.total ?? rows.length;
  const totalPages = ledger.data?.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit));
  const exportMutation = useExportPayments();
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const [customerOption, setCustomerOption] = useState<DistributorOption | null>(null);

  const customerFilterOption: DistributorOption | null = customerId
    ? customerOption?.id === customerId
      ? customerOption
      : {
          id: customerId,
          name: rows[0]?.customer?.id === customerId ? rows[0].customer.name : 'Distribuidor',
          number: rows[0]?.customer?.id === customerId ? (rows[0].customer.number ?? null) : null,
        }
    : null;

  const handleExport = async () => {
    try {
      const { blob, disposition } = await exportMutation.mutateAsync(filters);
      saveBlob(blob, filenameFromDisposition(disposition, payoutExportFilename('pagos')), blob.type || undefined);
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo exportar el ledger'));
    }
  };

  const handleReceipt = async (row: PaymentLedgerRow) => {
    const commissionId = commissionIdOf(row);
    if (!commissionId) return;
    setReceiptFor(row.id);
    try {
      const model = await treasuryService.getReceipt(commissionId);
      generateCommissionStatementPdf({
        distributorName: model.distributorName,
        distributorCode: model.distributorCode ?? row.customer?.number ?? null,
        periodName: model.periodName,
        currencyCode: model.currencyCode || row.currencyCode || 'MXN',
        summary: model.summary,
        commissions: model.commissions,
        generatedAt: model.generatedAt ? new Date(model.generatedAt) : new Date(),
      });
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo generar el recibo'));
    } finally {
      setReceiptFor(null);
    }
  };

  const columns: DataTableColumn<PaymentLedgerRow>[] = [
    {
      key: 'customer',
      header: 'Distribuidor',
      render: (r) => (
        <div className="min-w-[10rem]">
          {r.customer?.id ? (
            <Link href={`/admin/distribuidores/${r.customer.id}`} className="font-medium text-primary hover:underline">
              {r.customer.name}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{r.customer?.name ?? '—'}</span>
          )}
          <p className="text-xs text-muted-foreground">
            {r.customer?.number ? `#${r.customer.number}` : ''}
            {r.customer?.country ? ` · ${r.customer.country}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Periodo / lote',
      render: (r) => (
        <div className="text-sm">
          <p>{r.period?.name ?? r.period?.code ?? '—'}</p>
          {r.batch?.id ? (
            <Link href={`/admin/tesoreria/dispersion/${r.batch.id}`} className="font-mono text-xs text-primary hover:underline">
              {r.batch.number}
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">{paymentMethodLabel(r.paymentMethod)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Importe',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (r) => (
        <>
          <p className="font-semibold">{formatMoney(r.amount, r.currencyCode)}</p>
          {r.withheldAmount !== null && r.withheldAmount !== undefined && Number(r.withheldAmount) > 0 && (
            <p className="text-xs text-muted-foreground">convenios {formatMoney(r.withheldAmount, r.currencyCode)}</p>
          )}
          {r.currencyCode !== 'MXN' && r.amountMxn !== null && r.amountMxn !== undefined && (
            <p className="text-xs text-muted-foreground">= {formatMoney(r.amountMxn, 'MXN')}</p>
          )}
        </>
      ),
    },
    {
      key: 'reference',
      header: 'Referencia',
      render: (r) => (
        <div className="text-xs">
          <p className="font-mono">{r.reference ?? '—'}</p>
          {r.trackingKey && <p className="font-mono text-muted-foreground">{r.trackingKey}</p>}
          {(r.bankName || r.accountLast4) && (
            <p className="text-muted-foreground">
              {r.bankName ?? ''}
              {r.accountLast4 ? ` ****${r.accountLast4}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      cellClassName: 'text-xs',
      render: (r) => (
        <>
          <p>{formatDateOnly(r.paymentDate)}</p>
          {r.paidBy && <p className="text-muted-foreground">{actorName(r.paidBy)}</p>}
        </>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (r) => (
        <div className="space-y-0.5">
          <Badge variant={LEDGER_STATUS_TONES[r.status] ?? 'secondary'}>{ledgerStatusLabel(r.status)}</Badge>
          {r.reconciledAt && <p className="text-xs text-muted-foreground">Conciliado {formatDateOnly(r.reconciledAt)}</p>}
          {r.failureReason && (
            <p className="max-w-48 truncate text-xs text-destructive" title={r.failureReason}>
              {r.failureReason}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Recibo',
      headerClassName: 'text-right',
      render: (r) =>
        r.status === 'completed' && commissionIdOf(r) ? (
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" title="Descargar recibo (PDF)" aria-label="Descargar recibo" disabled={receiptFor === r.id} onClick={() => void handleReceipt(r)}>
              {receiptFor === r.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <DocumentArrowDownIcon className="h-4 w-4" aria-hidden />}
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1.5">
              <Label htmlFor="ledger-batch">Lote</Label>
              <SearchableSelect id="ledger-batch" options={batchOptions} value={batchId} onChange={(v) => setParams({ pbatch: v || null, ppage: null })} allLabel="Todos" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ledger-status">Estado</Label>
              <SearchableSelect id="ledger-status" options={STATUS_OPTIONS} value={status} onChange={(v) => setParams({ pstatus: v || null, ppage: null })} allLabel="Todos" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ledger-currency">Moneda</Label>
              <SearchableSelect id="ledger-currency" options={CURRENCY_OPTIONS} value={currency} onChange={(v) => setParams({ pcurrency: v || null, ppage: null })} allLabel="Todas" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ledger-customer">Distribuidor</Label>
              <DistributorSearchSelect
                id="ledger-customer"
                value={customerFilterOption}
                onChange={(opt) => {
                  setCustomerOption(opt);
                  setParams({ pcustomer: opt?.id ?? null, ppage: null });
                }}
                placeholder="Todos"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ledger-from">Desde</Label>
              <Input id="ledger-from" type="date" value={from} onChange={(e) => setParams({ pfrom: e.target.value || null, ppage: null })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ledger-to">Hasta</Label>
              <Input id="ledger-to" type="date" value={to} onChange={(e) => setParams({ pto: e.target.value || null, ppage: null })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {formatInt(total)} pago(s){ledger.isFetching && !ledger.isLoading ? ' · actualizando…' : ''}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleExport()} disabled={exportMutation.isPending || rows.length === 0}>
              {exportMutation.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <ArrowDownTrayIcon className="mr-1.5 h-4 w-4" aria-hidden />}
              Exportar CSV
            </Button>
          </div>
          {ledger.isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">{treasuryErrorMessage(ledger.error, 'No se pudo cargar el ledger')}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void ledger.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={rows} getRowKey={(r) => r.id} isLoading={ledger.isLoading} minWidthClassName="min-w-[56rem]" emptyMessage="Sin pagos con estos filtros." />
              {totalPages > 1 || total > limit ? (
                <DataTablePagination
                  currentPage={page}
                  pageSize={limit}
                  totalItems={total}
                  onPageChange={(p) => setParams({ ppage: String(p) })}
                  onPageSizeChange={(size) => setParams({ plimit: String(size), ppage: null })}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  isLoading={ledger.isFetching}
                />
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
