'use client';

// Reporte de folios (Contabilidad, 20-oct-2026). Pestañas:
//  - Conciliación: CFDI timbrados en el rango desde NUESTRA base
//    (GET /billing/reports/folios): sucursal, forma de pago, totales, estatus
//    SAT, tickets dentro de cada global y Excel de 3 hojas.
//  - Facturama (PAC): lo que devuelve el PAC, para cruzar.
// Filtros en la URL (?tab&from&to&basis&branch&type&pf&status&q) para
// compartir el enlace y sobrevivir a recargar.

import { Fragment, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { PermissionGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useActiveBranches } from '@/hooks/useBranches';
import { useFoliosReport, useInvoice } from '@/hooks/useBilling';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { billingErrorMessage } from '@/lib/billing-error';
import { billingService } from '@/services/billing.service';
import { getPaymentFormName } from '@/types/billing';
import type {
  FoliosDateBasis,
  FoliosInvoiceType,
  FoliosReportQuery,
  FoliosRowStatus,
  FoliosStatusFilter,
} from '@/types/billing';
import { FacturamaCfdisTab } from './FacturamaCfdisTab';

const TABS = ['conciliacion', 'pac'] as const;
type Tab = (typeof TABS)[number];
const isTab = (v: string): v is Tab => (TABS as readonly string[]).includes(v);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, '0');
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** Primer día del mes en curso: Contabilidad concilia por mes calendario (fiscal), no por periodo 26→25. */
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

const money = (v: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(v);
const fmtDay = (s: string | null) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—');
/** Comprobante.Fecha viene en hora local sin zona ('YYYY-MM-DDTHH:mm:ss'). */
const fmtCfdiDate = (s: string | null) => (s ? `${fmtDay(s)} ${s.slice(11, 16)}` : '—');

const TYPE_OPTIONS: Array<{ value: '' | FoliosInvoiceType; label: string }> = [
  { value: '', label: 'Todos los tipos' },
  { value: 'sale', label: 'Nominativas (venta y pedido)' },
  { value: 'global', label: 'Globales' },
  { value: 'payment', label: 'Complementos de pago' },
];
const PF_OPTIONS = ['01', '28', '04', '03', '06', '99'].map((code) => ({
  value: code,
  label: `${code} · ${getPaymentFormName(code)}`,
}));
const STATUS_OPTIONS: Array<{ value: FoliosStatusFilter; label: string }> = [
  { value: 'vigentes', label: 'Vigentes' },
  { value: 'canceladas', label: 'Canceladas' },
  { value: 'todas', label: 'Todas' },
];
const STATUS_BADGE: Record<FoliosRowStatus, { label: string; cls: string }> = {
  vigente: { label: 'Vigente', cls: 'bg-emerald-100 text-emerald-800' },
  cancelacion_en_proceso: { label: 'Cancelación en proceso', cls: 'bg-amber-100 text-amber-800' },
  cancelada: { label: 'Cancelada', cls: 'bg-red-100 text-red-700' },
};
const TYPE_BADGE: Record<string, string> = {
  global: 'bg-violet-100 text-violet-800',
  payment: 'bg-sky-100 text-sky-800',
  sale: 'bg-gray-100 text-gray-700',
};

const TH = 'px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2 text-sm whitespace-nowrap';

export default function ReporteFoliosPage() {
  return (
    <PermissionGuard permissions={['billing:read', 'reports:read']}>
      <Suspense>
        <ReporteFoliosContent />
      </Suspense>
    </PermissionGuard>
  );
}

function ReporteFoliosContent() {
  const { get, getNumber, setParams } = useQueryFilters({});
  const defaults = useMemo(() => ({ from: firstOfMonth(), to: todayLocal() }), []);
  const tabParam = get('tab');
  const activeTab: Tab = isTab(tabParam) ? tabParam : 'conciliacion';

  // Lo APLICADO vive en la URL; los inputs son borrador hasta "Consultar".
  const applied = useMemo<FoliosReportQuery>(() => {
    const from = get('from');
    const to = get('to');
    const basis = get('basis');
    const type = get('type');
    const status = get('status');
    return {
      startDate: DATE_RE.test(from) ? from : defaults.from,
      endDate: DATE_RE.test(to) ? to : defaults.to,
      dateBasis: basis === 'operacion' ? 'operacion' : 'emision',
      branchId: get('branch') || undefined,
      invoiceType: type === 'sale' || type === 'global' || type === 'payment' ? type : undefined,
      paymentForm: /^\d{2}$/.test(get('pf')) ? get('pf') : undefined,
      status: status === 'canceladas' || status === 'todas' ? status : 'vigentes',
      search: get('q') || undefined,
    };
  }, [get, defaults]);

  const [draft, setDraft] = useState<FoliosReportQuery>(applied);
  const [downloading, setDownloading] = useState(false);
  const [expandedGlobalId, setExpandedGlobalId] = useState<string | null>(null);

  const { data: branches } = useActiveBranches();
  const branchOptions = useMemo(
    () => [
      { value: '', label: 'Todas las sucursales' },
      ...(branches ?? []).map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` })),
    ],
    [branches],
  );

  const report = useFoliosReport(activeTab === 'conciliacion' ? applied : null);
  const rows = useMemo(() => report.data?.rows ?? [], [report.data]);
  const totals = report.data?.totals;

  const apply = () => {
    if (!DATE_RE.test(draft.startDate) || !DATE_RE.test(draft.endDate)) {
      toast.error('Captura las fechas De y Hasta');
      return;
    }
    if (draft.startDate > draft.endDate) {
      toast.error('La fecha "De" no puede ser mayor que "Hasta"');
      return;
    }
    setExpandedGlobalId(null);
    setParams({
      tab: 'conciliacion',
      from: draft.startDate,
      to: draft.endDate,
      basis: draft.dateBasis === 'operacion' ? 'operacion' : null,
      branch: draft.branchId || null,
      type: draft.invoiceType || null,
      pf: draft.paymentForm || null,
      status: draft.status && draft.status !== 'vigentes' ? draft.status : null,
      q: draft.search?.trim() || null,
      page: null,
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await billingService.downloadFoliosReportXlsx(applied);
      toast.success('Excel generado');
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo generar el Excel'));
    } finally {
      setDownloading(false);
    }
  };

  const pacPage = Math.max(0, getNumber('page'));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-3">
                <DocumentTextIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold">Reporte de folios</h1>
              </div>
              <p className="text-white/80">
                CFDI timbrados por día, sucursal y forma de pago, con los tickets de cada global — para conciliar
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => void handleDownload()}
                disabled={downloading || activeTab !== 'conciliacion' || rows.length === 0}
                className="gap-2 border border-white/20 bg-white/15 text-white hover:bg-white/25 hover:text-white disabled:opacity-40"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {downloading ? 'Generando…' : 'Excel (3 hojas)'}
              </Button>
              <Link href="/admin/facturacion">
                <Button variant="secondary">Volver a Facturación</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={(v) => setParams({ tab: v === 'conciliacion' ? null : v, page: null })}>
          <TabsList>
            <TabsTrigger value="conciliacion">Conciliación (sistema)</TabsTrigger>
            <TabsTrigger value="pac">Facturama (PAC)</TabsTrigger>
          </TabsList>

          <TabsContent value="conciliacion" className="mt-4 space-y-6">
            {/* Filtros */}
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">Filtros</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6 items-end">
                  <div className="xl:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Sucursal</label>
                    <SearchableSelect
                      options={branchOptions}
                      value={draft.branchId ?? ''}
                      onChange={(v) => setDraft((d) => ({ ...d, branchId: v || undefined }))}
                      showAllOption={false}
                      placeholder="Buscar sucursal..."
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">De</label>
                    <Input type="date" value={draft.startDate} max={draft.endDate} onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))} className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Hasta</label>
                    <Input type="date" value={draft.endDate} min={draft.startDate} onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))} className="bg-gray-50" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Fecha contada</label>
                    <select
                      value={draft.dateBasis ?? 'emision'}
                      onChange={(e) => setDraft((d) => ({ ...d, dateBasis: e.target.value as FoliosDateBasis }))}
                      className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm"
                    >
                      <option value="emision">Día de emisión</option>
                      <option value="operacion">Día de operación (global)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Estatus</label>
                    <select
                      value={draft.status ?? 'vigentes'}
                      onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as FoliosStatusFilter }))}
                      className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm"
                    >
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Tipo</label>
                    <select
                      value={draft.invoiceType ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, invoiceType: (e.target.value || undefined) as FoliosInvoiceType | undefined }))}
                      className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm"
                    >
                      {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="xl:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Forma de pago</label>
                    <select
                      value={draft.paymentForm ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, paymentForm: e.target.value || undefined }))}
                      className="h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm"
                    >
                      <option value="">Todas las formas de pago</option>
                      {PF_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-500">Buscar</label>
                    <Input
                      value={draft.search ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
                      placeholder="UUID, folio, RFC, ticket…"
                      className="bg-gray-50"
                    />
                  </div>
                  <Button onClick={apply} disabled={report.isFetching} className="gap-2">
                    <MagnifyingGlassIcon className="h-4 w-4" />
                    {report.isFetching ? 'Consultando…' : 'Consultar'}
                  </Button>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  Día de emisión = fecha del timbrado en la zona de la sucursal. Día de operación = el día que cubre la global (para nominativas y complementos es el de emisión). Máximo 92 días.
                </p>
              </CardContent>
            </Card>

            {report.isError && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <span>{billingErrorMessage(report.error, 'No se pudo generar el reporte')}</span>
                <Button variant="outline" size="sm" onClick={() => void report.refetch()}>Reintentar</Button>
              </div>
            )}

            {/* Resumen */}
            {totals && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                  <SummaryCard label="CFDI vigentes" value={totals.live.count.toLocaleString()} sub={money(totals.live.total)} />
                  <SummaryCard label="Subtotal vigente" value={money(totals.live.subtotal)} sub={`IVA ${money(totals.live.taxAmount)}`} />
                  <SummaryCard label="Canceladas" value={totals.cancelled.count.toLocaleString()} sub={money(totals.cancelled.total)} tone="red" />
                  <SummaryCard
                    label="Globales"
                    value={(totals.byType.find((b) => b.key === 'global')?.count ?? 0).toLocaleString()}
                    sub={`${totals.globalDocumentsLive.toLocaleString()} tickets dentro · ${money(totals.globalDocumentsLiveTotal)}`}
                  />
                  <SummaryCard
                    label="Nominativas / Complementos"
                    value={`${(totals.byType.find((b) => b.key === 'sale')?.count ?? 0).toLocaleString()} / ${(totals.byType.find((b) => b.key === 'payment')?.count ?? 0).toLocaleString()}`}
                    sub={`${totals.replacements} sustituciones`}
                  />
                </div>
                {totals.byPaymentForm.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-gray-500">Vigentes por forma de pago:</span>
                    {totals.byPaymentForm.map((b) => (
                      <span key={b.key} className="rounded-full bg-[#3E667D]/10 px-2.5 py-1 font-medium text-[#3E667D]">
                        {b.label}: {b.count} · {money(b.total)}
                      </span>
                    ))}
                  </div>
                )}
                {report.data?.truncated && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    Se alcanzó el tope de {report.data.limit.toLocaleString()} CFDI: el reporte está incompleto. Acota el rango o filtra por sucursal.
                  </p>
                )}
              </div>
            )}

            {/* Tabla */}
            <Card>
              <CardContent className="p-0">
                {report.isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-24">
                    <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#3E667D]" />
                    <span className="text-sm text-gray-400">Generando reporte...</span>
                  </div>
                ) : rows.length === 0 ? (
                  <div className="py-20 text-center">
                    <DocumentTextIcon className="mx-auto mb-3 h-14 w-14 text-gray-300" />
                    <p className="text-sm text-gray-500">No hay CFDI con esos filtros</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/50 px-4 py-2.5">
                      <span className="text-sm font-medium text-gray-700">
                        {rows.length.toLocaleString()} CFDI · {fmtDay(applied.startDate)} – {fmtDay(applied.endDate)} · clic en una global para ver sus tickets
                      </span>
                    </div>
                    <Table className="min-w-[1500px]">
                      <TableHeader>
                        <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                          <TableHead className={`${TH} w-6`} />
                          <TableHead className={TH}>Fecha emisión</TableHead>
                          <TableHead className={TH}>Día op.</TableHead>
                          <TableHead className={TH}>Sucursal</TableHead>
                          <TableHead className={TH}>Tipo</TableHead>
                          <TableHead className={TH}>Serie-Folio</TableHead>
                          <TableHead className={TH}>UUID</TableHead>
                          <TableHead className={TH}>Receptor</TableHead>
                          <TableHead className={TH}>Ticket / Pedido</TableHead>
                          <TableHead className={TH}>Forma de pago</TableHead>
                          <TableHead className={`${TH} text-right`}>Subtotal</TableHead>
                          <TableHead className={`${TH} text-right`}>IVA</TableHead>
                          <TableHead className={`${TH} text-right`}>Total</TableHead>
                          <TableHead className={TH}>Estatus</TableHead>
                          <TableHead className={`${TH} text-right`}>Tickets</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r, idx) => {
                          const isGlobal = r.invoiceType === 'global';
                          const isOpen = isGlobal && expandedGlobalId === r.id;
                          const badge = STATUS_BADGE[r.status];
                          return (
                            <Fragment key={r.id}>
                              <TableRow
                                className={`border-b border-gray-100 ${isGlobal ? 'cursor-pointer' : ''} ${isOpen ? 'bg-[#3E667D]/[0.06]' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${r.status === 'cancelada' ? 'text-red-700/80' : ''}`}
                                onClick={() => isGlobal && setExpandedGlobalId(isOpen ? null : r.id)}
                              >
                                <TableCell className="px-2 py-2 text-gray-400">
                                  {isGlobal ? (isOpen ? <ChevronDownIcon className="h-4 w-4 text-[#3E667D]" /> : <ChevronRightIcon className="h-4 w-4" />) : null}
                                </TableCell>
                                <TableCell className={`${TD} text-gray-600`}>{fmtCfdiDate(r.cfdiDate ?? r.stampedAt)}</TableCell>
                                <TableCell className={`${TD} text-gray-600`}>{fmtDay(r.globalLocalDate ?? r.localDate)}</TableCell>
                                <TableCell className={`${TD} max-w-[220px] truncate text-gray-700`} title={r.branchName ?? ''}>
                                  {r.branchCode ? <span className="font-mono text-xs text-gray-500">{r.branchCode} </span> : null}
                                  {r.branchName ?? '—'}
                                </TableCell>
                                <TableCell className={TD}>
                                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${TYPE_BADGE[r.invoiceType] ?? 'bg-gray-100 text-gray-700'}`}>{r.typeLabel}</span>
                                  {r.isReplacement && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800" title={r.relatedUuid ? `Sustituye a ${r.relatedUuid}` : 'Sustitución'}>Sust.</span>}
                                </TableCell>
                                <TableCell className={`${TD} font-mono font-medium`}>
                                  <Link href={`/admin/facturacion/${r.id}`} className="text-[#3E667D] underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
                                    {r.folioDisplay}
                                  </Link>
                                </TableCell>
                                <TableCell className={`${TD} font-mono text-xs text-gray-500`} title={r.satUuid}>{r.satUuid}</TableCell>
                                <TableCell className={`${TD} max-w-[260px]`}>
                                  <p className="truncate text-gray-900" title={r.receiverName}>{r.receiverName}</p>
                                  <p className="text-xs text-gray-500">{r.receiverRfc ?? ''}{r.customerNumber ? ` · #${r.customerNumber}` : ''}</p>
                                </TableCell>
                                <TableCell className={`${TD} font-mono text-xs text-gray-600`}>{r.saleNumber ?? r.orderNumber ?? '—'}</TableCell>
                                <TableCell className={`${TD} text-gray-700`}>
                                  {r.paymentFormCode ? `${r.paymentFormCode} · ${r.paymentFormName ?? ''}` : '—'}
                                  {r.paymentMethodCode ? <span className="ml-1 text-xs text-gray-400">{r.paymentMethodCode}</span> : null}
                                </TableCell>
                                <TableCell className={`${TD} text-right tabular-nums`}>{money(r.subtotal, r.currencyCode)}</TableCell>
                                <TableCell className={`${TD} text-right tabular-nums`}>{money(r.taxAmount, r.currencyCode)}</TableCell>
                                <TableCell className={`${TD} text-right font-medium tabular-nums`}>{money(r.total, r.currencyCode)}</TableCell>
                                <TableCell className={TD}>
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span>
                                  {r.status === 'cancelada' && r.cancelledAt ? <span className="ml-1 text-xs text-gray-400">{fmtDay(r.cancelledAt)}</span> : null}
                                </TableCell>
                                <TableCell className={`${TD} text-right tabular-nums text-gray-700`}>
                                  {isGlobal ? (
                                    <>
                                      {r.globalDocumentsLive ?? 0}
                                      {r.globalDocumentsReleased ? <span className="ml-1 text-xs text-gray-400" title="Salieron de la global (nominativa posterior o global cancelada)">(−{r.globalDocumentsReleased})</span> : null}
                                    </>
                                  ) : '—'}
                                </TableCell>
                              </TableRow>
                              {isOpen && (
                                <TableRow className="bg-[#3E667D]/[0.03] hover:bg-[#3E667D]/[0.03]">
                                  <TableCell colSpan={15} className="px-4 py-3 sm:px-8">
                                    <GlobalDocumentsPanel invoiceId={r.id} />
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                      {totals && (
                        <TableFooter className="bg-transparent">
                          <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
                            <TableCell colSpan={10} className="px-3 py-3 text-sm font-bold text-[#3E667D]">
                              TOTAL VIGENTES ({totals.live.count.toLocaleString()} CFDI)
                            </TableCell>
                            <TableCell className="px-3 py-3 text-right text-sm font-bold tabular-nums text-[#3E667D]">{money(totals.live.subtotal)}</TableCell>
                            <TableCell className="px-3 py-3 text-right text-sm font-bold tabular-nums text-[#3E667D]">{money(totals.live.taxAmount)}</TableCell>
                            <TableCell className="px-3 py-3 text-right text-sm font-bold tabular-nums text-[#3E667D]">{money(totals.live.total)}</TableCell>
                            <TableCell className="px-3 py-3" />
                            <TableCell className="px-3 py-3 text-right text-sm font-bold tabular-nums text-[#3E667D]">{totals.globalDocumentsLive.toLocaleString()}</TableCell>
                          </TableRow>
                        </TableFooter>
                      )}
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pac" className="mt-4">
            <FacturamaCfdisTab
              dateFrom={applied.startDate}
              dateTo={applied.endDate}
              page={pacPage}
              onPageChange={(next) => setParams({ page: next > 0 ? String(next) : null })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'red' }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${tone === 'red' ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
      {sub ? <p className="text-xs text-gray-500">{sub}</p> : null}
    </div>
  );
}

/** Tickets/pedidos de una global (los que siguen dentro y los que salieron), vía GET /billing/invoices/:id. */
function GlobalDocumentsPanel({ invoiceId }: { invoiceId: string }) {
  const { data, isLoading, isError } = useInvoice(invoiceId);
  if (isLoading) return <p className="py-3 text-center text-sm text-gray-500">Cargando tickets…</p>;
  if (isError || !data?.global) return <p className="py-3 text-center text-sm text-red-600">No se pudieron cargar los tickets de esta global.</p>;
  const docs = [...data.global.documents, ...data.global.released];
  if (docs.length === 0) return <p className="py-3 text-center text-sm text-gray-500">Esta global no tiene tickets registrados.</p>;
  const liveTotal = data.global.documents.reduce((s, d) => s + (d.total ?? 0), 0);
  return (
    <div className="rounded-lg border border-[#3E667D]/20 bg-white p-3 shadow-inner">
      <p className="mb-2 text-xs text-gray-600">
        <span className="font-semibold text-gray-900">{data.global.documents.length}</span> dentro · {money(liveTotal)}
        {data.global.released.length > 0 ? <> · <span className="font-semibold">{data.global.released.length}</span> salieron</> : null}
        {typeof data.global.uncoveredCount === 'number' && data.global.uncoveredCount > 0 ? (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
            {data.global.uncoveredCount} venta(s) del día no cubiertas · {money(data.global.uncoveredTotal ?? 0)}
          </span>
        ) : null}
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-left uppercase text-gray-500">
            <th className="py-1 pr-2">Ticket / Pedido</th>
            <th className="py-1 pr-2">Día</th>
            <th className="py-1 pr-2">Forma de pago</th>
            <th className="py-1 pr-2 text-right">Subtotal</th>
            <th className="py-1 pr-2 text-right">IVA</th>
            <th className="py-1 pr-2 text-right">Total</th>
            <th className="py-1">Estado en la global</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className={`border-b border-gray-100 ${d.releasedAt ? 'text-gray-400' : 'text-gray-800'}`}>
              <td className="py-1 pr-2 font-mono">{d.documentNumber}</td>
              <td className="py-1 pr-2">{fmtDay(d.localDate)}</td>
              <td className="py-1 pr-2">{d.paymentFormCode ? `${d.paymentFormCode} · ${getPaymentFormName(d.paymentFormCode)}` : '—'}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{money(d.subtotal)}</td>
              <td className="py-1 pr-2 text-right tabular-nums">{money(d.taxAmount)}</td>
              <td className="py-1 pr-2 text-right font-medium tabular-nums">{money(d.total)}</td>
              <td className="py-1">
                {d.releasedAt
                  ? d.releasedReason === 'nominative_issued'
                    ? 'Salió: se emitió nominativa'
                    : d.releasedReason === 'global_cancelled'
                      ? 'Salió: global cancelada'
                      : 'Salió'
                  : 'Dentro'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
