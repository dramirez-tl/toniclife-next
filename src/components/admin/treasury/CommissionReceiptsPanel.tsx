'use client';

// CommissionReceiptsPanel — vista "Pagos y recibos" de Tesorería › Comisiones
// (Diego, 28-nov-2026): "lo de octubre ya lo pagamos y timbramos algunos, y aún
// dicen todos Calculada; quiero buscar y filtrar como en bonos, actualizar
// datos desde esta misma pantalla e intentar timbrar manualmente de nuevo".
//
// Las comisiones de asimilados se depositaron FUERA de los lotes de dispersión
// y su pago se registró aparte para emitir el recibo de nómina (mig 220). La
// etapa del flujo de dispersión no cambió, por eso el embudo dice "Calculada".
// Aquí se ve lo que pasó con cada una (pagada, con recibo, faltan datos,
// rechazada por el SAT) y se trabaja renglón por renglón: completar sus datos
// en el panel lateral, timbrar o reintentar y bajar el PDF/XML.
//
// La lista del periodo llega completa en una llamada (miles de renglones): el
// buscador, los filtros y la paginación son del navegador, y sus valores viven
// en la URL (los maneja la página: search, recibo, page, limit).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { UseQueryResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ExclamationTriangleIcon, MagnifyingGlassIcon, ReceiptPercentIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable, DataTablePagination } from '@/components/ui/DataTable';
import type { DataTableColumn } from '@/components/ui/DataTable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStampCommissionReceipt } from '@/hooks/useCommissionReceipts';
import { apiErrorMessage } from '@/lib/api-error';
import type { SettlementProgress } from '@/lib/treasury/external-settlement';
import { satRejectionHint } from '@/lib/treasury/payroll-receiver';
import {
  MAX_CONSECUTIVE_REJECTIONS,
  RECEIPT_FILTERS,
  RECEIPT_FILTER_LABEL,
  canStampReceipt,
  matchesReceiptFilter,
  receiptAmounts,
  receiptBucket,
  receiptCounts,
  receiptRowMatches,
  stampBatchSummary,
  stampLabel,
  stampNotice,
  stampSucceeded,
  type ReceiptCounts,
  type ReceiptFilter,
} from '@/lib/treasury/commission-receipts';
import { commissionReceiptsService } from '@/services/commission-receipts.service';
import type { CommissionReceiptRow, CommissionReceiptsList } from '@/types/commission-receipts';
import type { PayrollReceiverStampContext } from './PayrollReceiverPanel';
import { PayrollReceiverSheet } from './PayrollReceiverSheet';
import { SettlePaidButton } from './SettlePaidDialog';
import { formatDateOnly, formatInt, formatMoney } from './treasury-format';

const money = (n: number) => formatMoney(n, 'MXN');
const who = (row: CommissionReceiptRow) => `#${row.customerNumber ?? '—'} ${row.customerName}`.trim();
const shortUuid = (uuid: string | null) => (uuid ? `${uuid.slice(0, 8)}…` : '');

const LOAD_ERRORS = {
  forbidden: 'Tu cuenta no tiene permiso para ver los pagos y recibos de comisiones (commissions:validate).',
  notFound: 'El servidor todavía no trae esta función. Avisa a Sistemas.',
};

// ──────────────────────────────────────────────────────────────────────────
// Resumen + cambio de vista (va arriba de los filtros de la página)
// ──────────────────────────────────────────────────────────────────────────

export type CommissionsView = 'dispersion' | 'recibos';

interface CommissionReceiptsSwitchProps {
  view: CommissionsView;
  onView: (view: CommissionsView) => void;
  /** Conteos de TODO el periodo (sin búsqueda); undefined mientras carga o si no hay permiso. */
  counts: ReceiptCounts | undefined;
  isLoading: boolean;
  activeFilter: ReceiptFilter;
  onFilter: (filter: ReceiptFilter) => void;
  periodName: string;
  /** Cuántas de las depositadas ya pasaron a «Pagada» en el embudo y cuántas faltan. */
  settlement?: SettlementProgress;
  /** Periodo (id) y permiso para pasarlas a «Pagada» (mlm:pay); sin ellos no sale el botón. */
  periodId?: string | null;
  canSettle?: boolean;
}

/** Selector de vista y, si el periodo tiene pagos registrados fuera de lote, el aviso con sus conteos. */
export function CommissionReceiptsSwitch({
  view,
  onView,
  counts,
  isLoading,
  activeFilter,
  onFilter,
  periodName,
  settlement,
  periodId,
  canSettle = false,
}: CommissionReceiptsSwitchProps) {
  const tab = (key: CommissionsView, label: string, hint: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === key}
      onClick={() => onView(key)}
      title={hint}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === key ? 'bg-white text-[#3E667D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
    >
      {label}
    </button>
  );
  const paid = counts?.pagadas ?? 0;
  // Sin la etapa de cada comisión (servidor anterior) se asume lo de antes: ninguna asentada.
  const pendingSettle = settlement?.known ? settlement.pending : paid;
  const allSettled = settlement?.known === true && settlement.pending === 0;
  return (
    <Card className="mb-6 border-border shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Vista de comisiones">
            {tab('dispersion', 'Dispersión · etapas y lotes', 'El flujo de siempre: calcular, aprobar, mandar a un lote y conciliar')}
            {tab('recibos', 'Pagos y recibos de nómina', 'Comisiones de asimilados ya depositadas: completar datos y timbrar su recibo')}
          </div>
          {isLoading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Revisando pagos y recibos…
            </span>
          )}
        </div>

        {counts && paid > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
            <p>
              <strong>
                {formatInt(paid)} {paid === 1 ? 'comisión' : 'comisiones'} de asimilados de {periodName} ya {paid === 1 ? 'se depositó' : 'se depositaron'} fuera de
                los lotes
              </strong>{' '}
              y {counts.con_recibo === 1 ? '1 ya tiene' : `${formatInt(counts.con_recibo)} ya tienen`} su recibo de nómina.{' '}
              {allSettled
                ? 'Ya cuentan como «Pagada» en el embudo y en el panel de cada distribuidor.'
                : settlement?.known && settlement.settled > 0
                  ? `${formatInt(settlement.settled)} ya ${settlement.settled === 1 ? 'cuenta' : 'cuentan'} como «Pagada»; ${formatInt(pendingSettle)} ${pendingSettle === 1 ? 'sigue' : 'siguen'} como «Calculada» en el embudo.`
                  : 'En el embudo siguen como «Calculada» porque no pasaron por dispersión.'}
            </p>
            {!allSettled && (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-start gap-1.5 text-xs text-amber-900">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>No las apruebes ni las mandes a un lote de dispersión: se pagarían dos veces.</span>
                </p>
                {canSettle && periodId && settlement?.known && pendingSettle > 0 && (
                  <SettlePaidButton periodId={periodId} periodName={periodName} pending={pendingSettle} />
                )}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {(['con_recibo', 'listas', 'faltan_datos', 'rechazadas', 'sin_pago'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => onFilter(f)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    view === 'recibos' && activeFilter === f
                      ? 'border-[#3E667D] bg-[#3E667D] text-white'
                      : 'border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100'
                  }`}
                  title={`Ver ${RECEIPT_FILTER_LABEL[f].toLowerCase()}`}
                >
                  {RECEIPT_FILTER_LABEL[f]} <span className="tabular-nums opacity-80">{formatInt(counts[f])}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// La vista
// ──────────────────────────────────────────────────────────────────────────

interface CommissionReceiptsPanelProps {
  query: UseQueryResult<CommissionReceiptsList>;
  periodNumber: number | undefined;
  periodName: string;
  /** Puede timbrar y completar datos (commissions:validate). */
  canValidate: boolean;
  /** Lo tecleado en el buscador (la página lo pasa a la URL con una pausa). */
  searchDraft: string;
  onSearchDraft: (value: string) => void;
  /** La búsqueda ya aplicada (URL ?search=). */
  search: string;
  filter: ReceiptFilter;
  page: number;
  limit: number;
  pageSizeOptions: number[];
  /** Cambia parámetros de la URL (los de la página). */
  onParams: (updates: Record<string, string | null>) => void;
}

interface FiscalTarget {
  commissionId: string;
  customerId: string;
  customerNumber: string | null;
  customerName: string;
}

type ConfirmState = { kind: 'one'; row: CommissionReceiptRow } | { kind: 'batch'; rows: CommissionReceiptRow[] } | null;

export function CommissionReceiptsPanel({
  query,
  periodNumber,
  periodName,
  canValidate,
  searchDraft,
  onSearchDraft,
  search,
  filter,
  page,
  limit,
  pageSizeOptions,
  onParams,
}: CommissionReceiptsPanelProps) {
  const stampMutation = useStampCommissionReceipt(periodNumber);
  const [busyPaymentId, setBusyPaymentId] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [fiscalTarget, setFiscalTarget] = useState<FiscalTarget | null>(null);

  const allRows = useMemo(() => query.data?.rows ?? [], [query.data]);
  const searched = useMemo(() => (search ? allRows.filter((r) => receiptRowMatches(search, r)) : allRows), [allRows, search]);
  const counts = useMemo(() => receiptCounts(searched), [searched]);
  const filtered = useMemo(() => searched.filter((r) => matchesReceiptFilter(r, filter)), [searched, filter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageRows = useMemo(() => filtered.slice((safePage - 1) * limit, safePage * limit), [filtered, safePage, limit]);
  // "Timbrar listos": los que se ven con la búsqueda y el filtro actuales, nunca todo el periodo a ciegas.
  const readyRows = useMemo(() => filtered.filter((r) => receiptBucket(r) === 'ready'), [filtered]);
  const visibleTotals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => {
          const a = receiptAmounts(r);
          return { subtotal: acc.subtotal + a.subtotal, isr: acc.isr + a.isr, total: acc.total + a.total };
        },
        { subtotal: 0, isr: 0, total: 0 },
      ),
    [filtered],
  );

  const busy = busyPaymentId !== null || batchProgress !== null;

  /** Timbra el recibo de un renglón. true = quedó timbrado. */
  const stampRow = async (row: CommissionReceiptRow, email: boolean, quiet = false): Promise<boolean> => {
    if (!row.payment) return false;
    setBusyPaymentId(row.payment.id);
    try {
      const result = await stampMutation.mutateAsync({ paymentId: row.payment.id, sendEmail: email });
      const notice = stampNotice(who(row), result);
      if (notice.tone === 'error') toast.error(notice.text, { duration: 10000 });
      else if (!quiet && notice.tone === 'success') toast.success(notice.text);
      else if (!quiet) toast.info(notice.text);
      return stampSucceeded(result);
    } catch (err) {
      toast.error(apiErrorMessage(err, `No se pudo timbrar el recibo de ${who(row)}.`), { duration: 10000 });
      return false;
    } finally {
      setBusyPaymentId(null);
    }
  };

  const runOne = async (row: CommissionReceiptRow, email: boolean) => {
    await stampRow(row, email);
    void query.refetch();
  };

  // Uno por uno (cada recibo es una llamada al PAC). Un rechazo casi siempre es
  // un dato de ESE distribuidor, así que la tanda sigue; solo se detiene tras
  // varios rechazos seguidos, señal de un problema general.
  const runBatch = async (rows: CommissionReceiptRow[], email: boolean) => {
    let ok = 0;
    let failed = 0;
    let streak = 0;
    let stoppedEarly = false;
    for (let i = 0; i < rows.length; i++) {
      setBatchProgress(`${i + 1}/${rows.length}`);
      const done = await stampRow(rows[i], email, true);
      if (done) {
        ok++;
        streak = 0;
        continue;
      }
      failed++;
      streak++;
      if (streak >= MAX_CONSECUTIVE_REJECTIONS) {
        stoppedEarly = true;
        break;
      }
    }
    setBatchProgress(null);
    const summary = stampBatchSummary({ ok, failed, pending: rows.length - ok - failed, stoppedEarly });
    if (summary.tone === 'success') toast.success(summary.text, { duration: 12000 });
    else if (summary.tone === 'warning') toast.warning(summary.text, { duration: 12000 });
    else toast.error(summary.text, { duration: 12000 });
    void query.refetch();
  };

  const submitConfirm = () => {
    const current = confirm;
    if (!current) return;
    setConfirm(null);
    if (current.kind === 'one') void runOne(current.row, sendEmail);
    else void runBatch(current.rows, sendEmail);
  };

  const openConfirm = (state: ConfirmState) => {
    setSendEmail(false);
    setConfirm(state);
  };

  const download = async (row: CommissionReceiptRow, ext: 'pdf' | 'xml') => {
    const v = row.voucher;
    if (!v?.invoiceId) return;
    try {
      await commissionReceiptsService.download(v.invoiceId, ext, `NOMINA_COMISION_P${periodNumber ?? ''}_${row.customerNumber ?? ''}_${(v.uuid ?? v.invoiceId).slice(0, 8)}.${ext}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, `No se pudo descargar el ${ext.toUpperCase()}.`));
    }
  };

  const openFiscal = (row: CommissionReceiptRow) =>
    setFiscalTarget({ commissionId: row.commissionId, customerId: row.customerId, customerNumber: row.customerNumber, customerName: row.customerName });

  // Panel lateral: el renglón se toma SIEMPRE de la lista vigente (tras guardar
  // datos o timbrar cambian sus faltantes y su estatus).
  const fiscalRow = fiscalTarget ? (allRows.find((r) => r.commissionId === fiscalTarget.commissionId) ?? null) : null;
  const fiscalBucket = fiscalRow ? receiptBucket(fiscalRow) : null;
  const fiscalStamp: PayrollReceiverStampContext | null =
    fiscalRow && fiscalRow.payment && fiscalRow.voucher
      ? {
          canStamp: canValidate && (fiscalBucket === 'ready' || fiscalBucket === 'rejected' || fiscalBucket === 'missing_data'),
          label: stampLabel(fiscalRow),
          lastError: fiscalBucket === 'rejected' ? fiscalRow.voucher.error : null,
          facts: [
            { label: 'Comisión de', value: periodName },
            { label: 'Pagada el', value: formatDateOnly(fiscalRow.payment.paidAt) },
            { label: 'Comisión', value: money(fiscalRow.payment.subtotal) },
            { label: 'ISR retenido', value: money(fiscalRow.payment.isr) },
            { label: 'Neto depositado', value: money(fiscalRow.payment.total) },
          ],
          onStamp: async () => {
            const done = await stampRow(fiscalRow, false);
            void query.refetch();
            return done;
          },
        }
      : null;

  const link = 'text-xs font-medium text-[#3E667D] hover:underline disabled:opacity-50';
  const pill = (cls: string, text: string, title?: string) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`} title={title}>
      {text}
    </span>
  );

  const columns: DataTableColumn<CommissionReceiptRow>[] = [
    {
      key: 'customer',
      header: 'Distribuidor',
      render: (r) => (
        <div className="min-w-[200px]">
          <Link href={`/admin/distribuidores/${r.customerId}`} className="text-sm font-semibold text-foreground hover:text-primary hover:underline">
            {r.customerName || '—'}
          </Link>
          <p className="text-xs text-muted-foreground">{r.customerNumber ? `#${r.customerNumber}` : ''}</p>
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Pago',
      render: (r) =>
        r.payment ? (
          <div className="text-sm">
            <p className="font-medium text-foreground">{formatDateOnly(r.payment.paidAt)}</p>
            {r.payment.reference && (
              <p className="max-w-[200px] truncate text-xs text-muted-foreground" title={r.payment.reference}>
                {r.payment.reference}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs italic text-muted-foreground">Sin pago registrado</span>
        ),
    },
    {
      key: 'voucher',
      header: 'Comprobante',
      render: (r) => {
        const bucket = receiptBucket(r);
        const v = r.voucher;
        const rowBusy = busy || !canValidate;
        if (bucket === 'unpaid' || !v) return <span className="text-xs text-muted-foreground/60">—</span>;
        if (bucket === 'stamped') {
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {pill('bg-green-50 text-green-700 ring-green-600/20', `Nómina ${shortUuid(v.uuid)}`, v.uuid ?? undefined)}
              <button type="button" onClick={() => void download(r, 'pdf')} className={link}>
                PDF
              </button>
              <button type="button" onClick={() => void download(r, 'xml')} className={link}>
                XML
              </button>
            </div>
          );
        }
        if (bucket === 'in_progress') {
          return pill('bg-blue-50 text-blue-700 ring-blue-600/20', 'Timbrando…', 'El recibo se está timbrando; actualiza en unos segundos');
        }
        const issues = v.issues.join(' · ');
        const stamping = busyPaymentId === r.payment?.id;
        return (
          <div className="max-w-[420px] space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {bucket === 'rejected' && pill('bg-red-50 text-red-700 ring-red-600/20', 'Rechazó el SAT', v.error ?? undefined)}
              {bucket === 'missing_data' && pill('bg-red-50 text-red-700 ring-red-600/20', 'Faltan datos', issues)}
              {bucket === 'ready' && pill('bg-amber-50 text-amber-700 ring-amber-600/20', 'Sin recibo')}
              {bucket === 'rejected' && v.issues.length > 0 && pill('bg-red-50 text-red-700 ring-red-600/20', 'Faltan datos', issues)}
              {canValidate && (
                <button
                  type="button"
                  onClick={() => openFiscal(r)}
                  disabled={busy}
                  className={bucket === 'ready' ? link : 'text-xs font-semibold text-[#3E667D] hover:underline disabled:opacity-50'}
                  title="Ver, completar o corregir el RFC, la CURP y el código postal con que sale su recibo"
                >
                  {bucket === 'missing_data' ? 'Completar datos' : bucket === 'rejected' ? 'Corregir datos' : 'Ver datos'}
                </button>
              )}
              {canStampReceipt(r) && (
                <button
                  type="button"
                  onClick={() => openConfirm({ kind: 'one', row: r })}
                  disabled={rowBusy}
                  className={link}
                  title="Emitir el recibo de nómina (CFDI) de este pago"
                >
                  {stamping ? 'Timbrando…' : stampLabel(r)}
                </button>
              )}
            </div>
            {bucket === 'rejected' && v.error && (
              <p className="line-clamp-2 text-xs text-red-700" title={v.error}>
                {satRejectionHint(v.error)?.text ?? v.error}
              </p>
            )}
            {bucket === 'missing_data' && (
              <p className="truncate text-xs text-muted-foreground" title={issues}>
                {issues}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'subtotal',
      header: 'Comisión',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => <span className="text-sm tabular-nums text-foreground">{money(receiptAmounts(r).subtotal)}</span>,
    },
    {
      key: 'isr',
      header: 'ISR',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => {
        const isr = receiptAmounts(r).isr;
        return isr > 0 ? <span className="text-sm tabular-nums text-destructive">− {money(isr)}</span> : <span className="text-xs text-muted-foreground/60">—</span>;
      },
    },
    {
      key: 'total',
      header: 'Neto',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (r) => <span className="text-sm font-bold tabular-nums text-primary">{money(receiptAmounts(r).total)}</span>,
    },
  ];

  if (!periodNumber) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="p-6 text-sm text-muted-foreground">Elige un periodo para ver sus pagos y recibos de nómina.</CardContent>
      </Card>
    );
  }

  const confirmRows = confirm ? (confirm.kind === 'one' ? [confirm.row] : confirm.rows) : [];
  const confirmTotals = confirmRows.reduce(
    (acc, r) => {
      const a = receiptAmounts(r);
      return { subtotal: acc.subtotal + a.subtotal, isr: acc.isr + a.isr, total: acc.total + a.total };
    },
    { subtotal: 0, isr: 0, total: 0 },
  );

  return (
    <>
      {/* Buscador y filtros (URL) */}
      <Card className="mb-4 border-border shadow-sm">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full space-y-1.5 lg:max-w-md">
              <Label htmlFor="receipts-search">Buscar</Label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="receipts-search"
                  type="search"
                  className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
                  placeholder="Nº o nombre del distribuidor, referencia o folio fiscal"
                  value={searchDraft}
                  onChange={(e) => onSearchDraft(e.target.value)}
                />
                {searchDraft && (
                  <button
                    type="button"
                    onClick={() => onSearchDraft('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label="Quitar la búsqueda"
                  >
                    <XMarkIcon className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
            {canValidate && (
              <Button
                onClick={() => openConfirm({ kind: 'batch', rows: readyRows })}
                disabled={busy || readyRows.length === 0}
                title="Emite, uno por uno, los recibos de las comisiones pagadas con datos completos que se ven con la búsqueda y el filtro actuales"
              >
                {batchProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <ReceiptPercentIcon className="mr-2 h-4 w-4" aria-hidden />}
                {batchProgress ? `Timbrando ${batchProgress}…` : `Timbrar las listas (${formatInt(readyRows.length)})`}
              </Button>
            )}
          </div>
          <div className="inline-flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium" role="tablist" aria-label="Situación del recibo">
            {RECEIPT_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => onParams({ recibo: f === 'todas' ? null : f, page: null })}
                className={`rounded-md px-3 py-1.5 transition-colors ${filter === f ? 'bg-white text-[#3E667D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {RECEIPT_FILTER_LABEL[f]} <span className="text-gray-400">({formatInt(counts[f])})</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-foreground">Pagos y recibos de nómina · asimilados · {periodName}</h2>
            <p className="text-sm text-muted-foreground">
              {query.isError
                ? apiErrorMessage(query.error, 'No se pudieron cargar los pagos y recibos.', LOAD_ERRORS)
                : `${formatInt(filtered.length)} ${filtered.length === 1 ? 'comisión' : 'comisiones'} · comisión ${money(visibleTotals.subtotal)} · ISR ${money(visibleTotals.isr)} · neto ${money(visibleTotals.total)}${query.isFetching && !query.isLoading ? ' · actualizando…' : ''}`}
            </p>
          </div>
          {query.isError && (
            <div className="mb-4">
              <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
                Reintentar
              </Button>
            </div>
          )}
          <DataTable
            columns={columns}
            data={pageRows}
            isLoading={query.isLoading}
            getRowKey={(r) => r.commissionId}
            minWidthClassName="min-w-[1080px]"
            emptyState={
              <div className="py-4 text-center">
                <ReceiptPercentIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" aria-hidden />
                <p className="text-sm font-medium text-foreground">Ninguna comisión con esa búsqueda y ese filtro</p>
                <p className="mt-1 text-xs text-muted-foreground">Aquí salen las comisiones de asimilados del periodo, con su pago registrado y su recibo.</p>
              </div>
            }
          />
          {filtered.length > 0 && (
            <DataTablePagination
              currentPage={safePage}
              pageSize={limit}
              totalItems={filtered.length}
              isLoading={query.isFetching}
              pageSizeOptions={pageSizeOptions}
              onPageChange={(p) => onParams({ page: String(p) })}
              onPageSizeChange={(size) => onParams({ limit: String(size), page: null })}
            />
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Solo comisiones en régimen de asimilados y en pesos: los demás regímenes emiten su propio CFDI. Los importes de un pago registrado son los que se congelaron al
            registrarlo.
          </p>
        </CardContent>
      </Card>

      {/* Confirmar el timbrado */}
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === 'batch' ? `Timbrar ${formatInt(confirmRows.length)} ${confirmRows.length === 1 ? 'recibo' : 'recibos'} de nómina` : 'Timbrar el recibo de nómina'}
            </DialogTitle>
            <DialogDescription>
              {confirm?.kind === 'one' ? who(confirm.row) : `Comisiones de ${periodName} pagadas y con datos completos que se ven con la búsqueda y el filtro actuales.`}
            </DialogDescription>
          </DialogHeader>
          <dl className="divide-y divide-border rounded-lg border border-border px-3 text-sm">
            <div className="flex justify-between py-2">
              <dt className="text-muted-foreground">Comisión</dt>
              <dd className="font-medium tabular-nums">{money(confirmTotals.subtotal)}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-muted-foreground">ISR retenido</dt>
              <dd className="font-medium tabular-nums">{money(confirmTotals.isr)}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-muted-foreground">Neto depositado</dt>
              <dd className="font-semibold tabular-nums">{money(confirmTotals.total)}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            Cada recibo es un CFDI real ante el SAT.
            {confirm?.kind === 'batch' ? ` Se timbran uno por uno; si hay ${MAX_CONSECUTIVE_REJECTIONS} rechazos seguidos, la tanda se detiene.` : ''}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} className="mt-0.5" aria-label="Enviar el recibo por correo" />
            <span>
              Enviar el PDF por correo {confirm?.kind === 'batch' ? 'a cada distribuidor' : 'al distribuidor'}.
              <span className="block text-xs text-muted-foreground">Apagado: los recibos de octubre se timbraron sin enviar correo.</span>
            </span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button onClick={submitConfirm} disabled={confirmRows.length === 0}>
              {confirm?.kind === 'batch' ? `Timbrar ${formatInt(confirmRows.length)}` : 'Timbrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PayrollReceiverSheet
        customerId={fiscalTarget?.customerId ?? null}
        customerNumber={fiscalTarget?.customerNumber}
        customerName={fiscalTarget?.customerName}
        stamp={fiscalStamp}
        readOnly={!canValidate}
        onOpenChange={(open) => {
          if (!open) setFiscalTarget(null);
        }}
      />
    </>
  );
}
