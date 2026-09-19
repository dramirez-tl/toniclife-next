// app/admin/facturacion/global/page.tsx — Factura global por sucursal y día
// natural LOCAL (contrato §5.3, NUNCA periodo 26→25 ni mes calendario).
// Sucursal + día (tira de días con estados) → vista previa (incluidos,
// excluidos con motivo, bloqueadores en rojo, totales por tasa, conceptos) →
// confirmación con `previewHash` → POST /billing/global-invoices → detalle.
'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  ArrowLeftIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PermissionGuard } from '@/components/auth';
import {
  useBillingStatus,
  useCreateGlobalInvoice,
  useDiscardGlobalInvoice,
  useGlobalDays,
  useGlobalPreview,
  useInvoices,
  useReadinessBranches,
  useReissueGlobalInvoice,
} from '@/hooks/useBilling';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { billingErrorMessage, isBillingErrorCode, isBillingFlowDisabled } from '@/lib/billing-error';
import { DEFAULT_TIMEZONE } from '@/lib/timezone-utils';
import {
  formatCurrency,
  getPaymentFormName,
  type GlobalConceptMode,
  type GlobalDayStatus,
  type GlobalPreview,
  type InvoiceSummary,
} from '@/types/billing';
import { useCanManageBilling } from '@/components/admin/billing/readiness/useCanManageBilling';
import { InvoiceStatusBadge } from '@/components/admin/billing/invoices/InvoiceBadges';
import { V2FlowsBanner } from '@/components/admin/billing/invoices/BillingStatusCards';
import {
  CONCEPT_MODE_OPTIONS,
  GLOBAL_DAY_STATUS_INFO,
  GLOBAL_DAY_UNCOVERED_INFO,
  INVOICE_STATUS_OPTIONS,
  globalBlockerLabel,
  globalDayBlockReasonLabel,
  globalExclusionLabel,
} from '@/components/admin/billing/invoices/labels';
import { formatIsoDate, localDateInZone, useBranchTimezone } from '@/components/admin/billing/invoices/useBranchTimezone';

const DAYS_STRIP = 14;

/**
 * Día YA emitido con tickets incluibles fuera de su global (ingreso sin declarar).
 * El API lo manda como `emitted` + `blockReason: 'uncovered_tickets'` + `uncoveredCount`.
 */
function dayHasUncovered(d: GlobalDayStatus): boolean {
  return d.blockReason === 'uncovered_tickets' || (d.uncoveredCount ?? 0) > 0;
}

function dayInfo(d: GlobalDayStatus) {
  if (dayHasUncovered(d)) return GLOBAL_DAY_UNCOVERED_INFO;
  return GLOBAL_DAY_STATUS_INFO[d.status] ?? GLOBAL_DAY_STATUS_INFO.not_eligible;
}

function providerStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  return INVOICE_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export default function GlobalInvoicePage() {
  return (
    <PermissionGuard permissions={['billing:read', 'billing:*']}>
      <Suspense fallback={<div className="p-6"><Skeleton className="h-64 w-full" /></div>}>
        <GlobalInvoiceContent />
      </Suspense>
    </PermissionGuard>
  );
}

function GlobalInvoiceContent() {
  const router = useRouter();
  const canManage = useCanManageBilling();
  const { get, setParams } = useQueryFilters({});
  const branchId = get('branchId');
  const dateParam = get('date');
  const modeParam = get('mode');

  const { data: status } = useBillingStatus();
  const { data: readinessBranches, isLoading: loadingBranches } = useReadinessBranches();
  const { timezoneOf } = useBranchTimezone();

  const branchTz = branchId ? timezoneOf(branchId) : DEFAULT_TIMEZONE;
  const yesterday = localDateInZone(branchTz, -1);
  const date = dateParam || yesterday;
  const conceptMode: GlobalConceptMode =
    modeParam === 'product' || modeParam === 'ticket' ? modeParam : (status?.globalConceptMode ?? 'ticket');

  const branchOptions = useMemo(
    () =>
      (readinessBranches ?? []).map((b) => ({
        value: b.id,
        label: b.v2InvoicingSince ? `${b.name} · v2 desde ${formatIsoDate(b.v2InvoicingSince)}` : `${b.name} · sin arranque en v2`,
        hint: b.code,
      })),
    [readinessBranches],
  );
  const selectedBranch = (readinessBranches ?? []).find((b) => b.id === branchId);

  // Tira de días: últimos 14 hasta ayer (o alrededor de la fecha elegida).
  const stripTo = date > yesterday ? yesterday : date;
  const stripFrom = addDays(stripTo, -(DAYS_STRIP - 1));
  const days = useGlobalDays(branchId ? { branchId, from: stripFrom, to: stripTo } : null);

  // La vista previa se pide a mano; al cambiar sucursal/fecha/modo la llave deja
  // de coincidir y hay que volver a pedirla (sin efecto que reinicie estado).
  const previewKey = `${branchId}|${date}|${conceptMode}`;
  const [requestedKey, setRequestedKey] = useState<string | null>(null);
  const previewRequested = requestedKey === previewKey;

  const preview = useGlobalPreview(branchId ? { branchId, date, conceptMode } : null, previewRequested);
  const create = useCreateGlobalInvoice();
  const discard = useDiscardGlobalInvoice();
  const reissue = useReissueGlobalInvoice();
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Global viva (día ya emitido) que se va a reexpedir porque no declara todos sus tickets.
  const [reissueTarget, setReissueTarget] = useState<{
    invoiceId: string;
    localDate: string;
    uncoveredCount: number;
    uncoveredTotal: number | null;
  } | null>(null);
  const [flowDisabled, setFlowDisabled] = useState(false);
  // Intento (sin UUID) que se va a descartar, desde la tira de días o la vista previa.
  const [discardTarget, setDiscardTarget] = useState<{ invoiceId: string; localDate: string } | null>(null);

  const selectedDay = (days.data ?? []).find((d) => d.localDate === date);

  const confirmDiscard = async () => {
    if (!discardTarget) return;
    try {
      await discard.mutateAsync(discardTarget.invoiceId);
      setDiscardTarget(null);
      if (previewRequested) void preview.refetch();
    } catch {
      // El hook ya avisó.
    }
  };

  const confirmReissue = async () => {
    if (!reissueTarget) return;
    try {
      const result = await reissue.mutateAsync(reissueTarget.invoiceId);
      setReissueTarget(null);
      // Solo `reissued` trae una global nueva; con `waiting_sat` o
      // `nothing_to_reissue` el hook avisa y la tira de días se refresca.
      if (result.state === 'reissued' && result.invoice) {
        router.push(`/admin/facturacion/${result.invoice.id}`);
      } else if (previewRequested) {
        void preview.refetch();
      }
    } catch (err) {
      if (isBillingFlowDisabled(err)) setFlowDisabled(true);
      // El hook ya avisó.
    }
  };

  const globals = useInvoices({ invoiceType: 'global', branchId: branchId || undefined, limit: 10, sort: 'createdAt:desc' }, !!branchId);

  const handleEmit = async () => {
    const p = preview.data;
    if (!p) return;
    try {
      const invoice = await create.mutateAsync({ branchId, date, conceptMode, previewHash: p.previewHash });
      setConfirmOpen(false);
      router.push(`/admin/facturacion/${invoice.id}`);
    } catch (err) {
      if (isBillingFlowDisabled(err)) setFlowDisabled(true);
      if (isBillingErrorCode(err, 'CFDI_GLOBAL_PREVIEW_STALE')) {
        setConfirmOpen(false);
        void preview.refetch();
      }
    }
  };

  const dayColumns: DataTableColumn<GlobalPreview['included'][number]>[] = [
    { key: 'folio', header: 'Folio', render: (r) => <span className="font-mono text-sm">{r.folio}<span className="ml-1 text-xs text-gray-500">{r.kind === 'order' ? 'pedido' : 'ticket'}</span></span> },
    { key: 'time', header: 'Hora', render: (r) => <span className="text-sm">{r.time}</span> },
    { key: 'customer', header: 'Cliente', render: (r) => <span className="text-sm text-gray-700">{r.customerName ?? 'Público en general'}</span> },
    { key: 'pf', header: 'Forma de pago', render: (r) => <span className="text-sm">{r.paymentFormCode ? `${r.paymentFormCode} · ${getPaymentFormName(r.paymentFormCode)}` : '—'}</span> },
    { key: 'subtotal', header: 'Base', headerClassName: 'text-right', cellClassName: 'text-right', render: (r) => formatCurrency(r.subtotal) },
    { key: 'tax', header: 'IVA', headerClassName: 'text-right', cellClassName: 'text-right', render: (r) => formatCurrency(r.taxAmount) },
    { key: 'total', header: 'Total', headerClassName: 'text-right', cellClassName: 'text-right', render: (r) => <span className="font-medium">{formatCurrency(r.total)}</span> },
  ];

  const excludedColumns: DataTableColumn<GlobalPreview['excluded'][number]>[] = [
    { key: 'folio', header: 'Folio', render: (r) => <span className="font-mono text-sm">{r.folio}</span> },
    { key: 'reason', header: 'Motivo', render: (r) => <span className="text-sm">{globalExclusionLabel(r.reason)}{r.detail ? ` — ${r.detail}` : ''}</span> },
    { key: 'total', header: 'Total', headerClassName: 'text-right', cellClassName: 'text-right', render: (r) => formatCurrency(r.total) },
  ];

  const globalColumns: DataTableColumn<InvoiceSummary>[] = [
    { key: 'day', header: 'Día', render: (inv) => <span className="text-sm">{formatIsoDate(inv.globalLocalDate)}</span> },
    { key: 'folio', header: 'Folio', render: (inv) => <Link href={`/admin/facturacion/${inv.id}`} className="font-mono text-sm text-[#3E667D] hover:underline">{inv.folioDisplay}</Link> },
    { key: 'total', header: 'Total', headerClassName: 'text-right', cellClassName: 'text-right', render: (inv) => formatCurrency(inv.total) },
    { key: 'status', header: 'Estado', render: (inv) => <InvoiceStatusBadge status={inv.providerStatus} satCancellationStatus={inv.satCancellationStatus} /> },
    { key: 'reissue', header: 'Reexpedición', render: (inv) => inv.globalReissueState && inv.globalReissueState !== 'none' ? <Badge variant="warning">{inv.globalReissueState === 'pending_reissue' ? 'Por reexpedir' : 'Reexpedida'}</Badge> : <span className="text-xs text-gray-400">—</span> },
  ];

  const p = previewRequested ? preview.data : undefined;
  // Global VIVA del día = la que cuenta para `uq_invoices_global_branch_day` (más la
  // cancelación en proceso). Un intento en `error` se reutiliza al emitir (§5.3.5).
  const existingLive =
    !!p?.existingGlobal && !['error', 'cancelled'].includes(p.existingGlobal.providerStatus);
  const canEmit = !!p && p.canStamp && !existingLive && p.blockers.length === 0 && canManage && !flowDisabled;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white">
              <Link href="/admin/facturacion" aria-label="Volver a facturas"><ArrowLeftIcon className="h-6 w-6" /></Link>
            </Button>
            <div>
              <div className="mb-1 flex items-center gap-3">
                <GlobeAltIcon className="h-10 w-10" aria-hidden />
                <h1 className="text-4xl font-bold">Factura global</h1>
              </div>
              <p className="text-lg text-white/80">Por sucursal y día natural (zona de la sucursal), a PÚBLICO EN GENERAL</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <V2FlowsBanner status={status} />
        {flowDisabled && status?.v2FlowsEnabled !== false && (
          <Card className="border-amber-200 bg-amber-50" role="status">
            <CardContent className="p-4 text-sm text-amber-900">Los flujos de v2 están cerrados; el sistema anterior sigue facturando.</CardContent>
          </Card>
        )}

        {/* Selector */}
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-4 md:grid-cols-12 md:items-end">
              <div className="md:col-span-5">
                <Label htmlFor="g-branch">Sucursal</Label>
                <SearchableSelect
                  id="g-branch"
                  options={branchOptions}
                  value={branchId}
                  onChange={(v) => setParams({ branchId: v, date: null })}
                  showAllOption={false}
                  placeholder={loadingBranches ? 'Cargando sucursales…' : 'Elige la sucursal'}
                />
                {selectedBranch && !selectedBranch.v2InvoicingSince && (
                  <p className="mt-1 text-xs text-amber-700">Esta sucursal no tiene fecha de arranque en v2: no es elegible (Preparación fiscal → Sucursales).</p>
                )}
              </div>
              <div className="md:col-span-3">
                <Label htmlFor="g-date">Día (máximo ayer)</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
                  <Input id="g-date" type="date" className="pl-10" value={date} max={yesterday} onChange={(e) => setParams({ date: e.target.value })} />
                </div>
              </div>
              <div className="md:col-span-4">
                <Label htmlFor="g-mode">Conceptos</Label>
                <SearchableSelect id="g-mode" options={CONCEPT_MODE_OPTIONS} value={conceptMode} onChange={(v) => setParams({ mode: v })} showAllOption={false} />
              </div>
            </div>

            {/* Tira de días */}
            {branchId && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-medium text-gray-600">Últimos {DAYS_STRIP} días (zona {branchTz})</p>
                {days.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : days.isError ? (
                  <p className="text-xs text-red-700">{billingErrorMessage(days.error, 'No se pudieron cargar los días')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2" role="listbox" aria-label="Días">
                    {(days.data ?? []).map((d: GlobalDayStatus) => {
                      const info = dayInfo(d);
                      const active = d.localDate === date;
                      const attempt = providerStatusLabel(d.providerStatus);
                      const reason = d.status === 'blocked' ? globalDayBlockReasonLabel(d.blockReason) : null;
                      return (
                        <button
                          key={d.localDate}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => setParams({ date: d.localDate })}
                          title={`${info.label} · ${d.ticketCount} tickets · ${formatCurrency(d.total)}${d.blockers ? ` · ${d.blockers} bloqueador(es)` : ''}${reason ? ` · ${reason}` : ''}${attempt ? ` · Intento/global: ${attempt}` : ''}${dayHasUncovered(d) && d.uncoveredCount ? ` · ${d.uncoveredCount} ticket(s) sin declarar` : ''}${d.lateEmission ? ' · emisión tardía' : ''}`}
                          className={`min-w-[84px] rounded-lg border px-2 py-1.5 text-left text-xs transition-colors ${info.className} ${active ? 'ring-2 ring-[#3E667D]' : ''}`}
                        >
                          <span className="block font-semibold">{formatIsoDate(d.localDate).slice(0, 5)}</span>
                          <span className="block">{info.label}</span>
                          <span className="block text-[10px] opacity-80">{d.ticketCount} · {formatCurrency(d.total)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Estado del día elegido: motivo del bloqueo, intento viejo y tickets sin declarar */}
                {selectedDay && selectedDay.status === 'blocked' && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="status">
                    <span>
                      <span className="font-semibold">{formatIsoDate(selectedDay.localDate)} bloqueado.</span>{' '}
                      {globalDayBlockReasonLabel(selectedDay.blockReason) ?? 'Abre la vista previa para ver el motivo.'}
                      {providerStatusLabel(selectedDay.providerStatus) && (
                        <> Estado del intento: {providerStatusLabel(selectedDay.providerStatus)}.</>
                      )}
                    </span>
                    <div className="flex gap-2">
                      {selectedDay.invoiceId && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/facturacion/${selectedDay.invoiceId}`}>Ver intento</Link>
                        </Button>
                      )}
                      {canManage && selectedDay.blockReason === 'stale_error' && selectedDay.invoiceId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-700 hover:bg-red-100 hover:text-red-800"
                          disabled={discard.isPending}
                          onClick={() => setDiscardTarget({ invoiceId: selectedDay.invoiceId as string, localDate: selectedDay.localDate })}
                        >
                          Descartar intento
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {selectedDay && dayHasUncovered(selectedDay) && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900" role="alert">
                    <span>
                      <span className="font-semibold">
                        El {formatIsoDate(selectedDay.localDate)} ya tiene global, pero
                        {selectedDay.uncoveredCount ? ` ${selectedDay.uncoveredCount} ticket(s)` : ' hay tickets'}
                        {selectedDay.uncoveredTotal ? ` por ${formatCurrency(selectedDay.uncoveredTotal)}` : ''}
                        {selectedDay.uncoveredCount ? ' quedaron' : ''} sin declarar.
                      </span>{' '}
                      Pasa cuando una venta del día se completa o se libera después de emitir la global (por ejemplo, al
                      cancelar su factura nominativa). Hay que reexpedir la global del día para incluirlos.
                    </span>
                    {selectedDay.invoiceId && (
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/facturacion/${selectedDay.invoiceId}`}>Ver la global</Link>
                        </Button>
                        {canManage ? (
                          <Button
                            size="sm"
                            disabled={reissue.isPending || flowDisabled}
                            onClick={() =>
                              setReissueTarget({
                                invoiceId: selectedDay.invoiceId as string,
                                localDate: selectedDay.localDate,
                                uncoveredCount: selectedDay.uncoveredCount ?? 0,
                                uncoveredTotal: selectedDay.uncoveredTotal ?? null,
                              })
                            }
                          >
                            {reissue.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                            Reexpedir global
                          </Button>
                        ) : (
                          <span className="self-center text-xs">Solo lectura: necesitas billing:manage para reexpedir.</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setRequestedKey(previewKey)} disabled={!branchId || !date || preview.isFetching}>
                {preview.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <MagnifyingGlassIcon className="h-5 w-5" aria-hidden />}
                Vista previa
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Vista previa */}
        {previewRequested && preview.isError && (
          <Card className="border-red-200 bg-red-50" role="alert">
            <CardContent className="p-4 text-sm text-red-800">{billingErrorMessage(preview.error, 'No se pudo generar la vista previa')}</CardContent>
          </Card>
        )}

        {p && (
          <>
            {(!p.eligible || p.blockers.length > 0 || p.existingGlobal || p.lateEmission || p.branch.terminalsOff.length > 0) && (
              <div className="space-y-3">
                {p.eligibilityErrors.map((e) => (
                  <div key={e.code} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                    <span className="font-mono text-xs">{e.code}</span> · {e.message}
                  </div>
                ))}
                {p.branch.terminalsOff.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                    Terminales con Facturación apagada (el sistema anterior sigue globalizando esas cajas): {p.branch.terminalsOff.join(', ')}
                  </div>
                )}
                {p.existingGlobal && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status">
                    <span>
                      Ya existe una global de este día: <span className="font-mono">{p.existingGlobal.folioDisplay}</span>{' '}
                      <InvoiceStatusBadge status={p.existingGlobal.providerStatus} />
                    </span>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline"><Link href={`/admin/facturacion/${p.existingGlobal.invoiceId}`}>Ver global</Link></Button>
                      {canManage && !p.existingGlobal.satUuid && (p.existingGlobal.providerStatus === 'error' || p.existingGlobal.providerStatus === 'pending') && (
                        <Button size="sm" variant="ghost" className="text-red-600" disabled={discard.isPending} onClick={() => setDiscardTarget({ invoiceId: p.existingGlobal!.invoiceId, localDate: p.localDate })}>
                          Descartar intento
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {p.lateEmission && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
                    Emisión tardía: el día ya no es ayer. Se permite, pero revisa que el sistema anterior no haya emitido la global de esa fecha.
                  </div>
                )}
                {p.blockers.length > 0 && (
                  <Card className="border-red-300" role="alert">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2 text-red-800">
                        <ExclamationTriangleIcon className="h-5 w-5" aria-hidden />
                        <h3 className="font-semibold">Bloqueadores: no se puede emitir el día (excluir el ticket dejaría ingreso sin declarar)</h3>
                      </div>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-red-800">
                        {p.blockers.map((b, i) => (
                          <li key={i}>
                            <span className="font-medium">{globalBlockerLabel(b.code)}</span>
                            {b.folio ? ` · ${b.folio}` : ''}{b.sku ? ` · SKU ${b.sku}` : ''}{b.method ? ` · ${b.method}` : ''} — {b.message}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Totales */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Documentos</p><p className="text-2xl font-bold text-gray-900">{p.totals.documents}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Base</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(p.totals.subtotal)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-gray-500">IVA</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(p.totals.taxes)}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-[#3E667D]">{formatCurrency(p.totals.total)}</p></CardContent></Card>
            </div>
            <Card>
              <CardContent className="grid gap-4 p-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">Forma de pago dominante</p>
                  <p className="font-medium">{p.totals.paymentForm ? `${p.totals.paymentForm} · ${getPaymentFormName(p.totals.paymentForm)}` : '—'} · PUE</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Por tasa</p>
                  <ul>
                    {p.totals.byRate.map((r, i) => (
                      <li key={i}>{r.factor === 'Exento' ? 'Exento' : `${Math.round(r.rate * 100)}%`}: base {formatCurrency(r.base)} · IVA {formatCurrency(r.tax)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Sucursal</p>
                  <p className="font-medium">{p.branch.name} ({p.branch.code}) · CP {p.branch.expeditionZip ?? '—'} · {p.branch.timezone}</p>
                </div>
              </CardContent>
            </Card>

            {/* Incluidos / excluidos / conceptos */}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Incluidos ({p.included.length})</h2>
                <DataTable columns={dayColumns} data={p.included} getRowKey={(r) => `${r.kind}:${r.id}`} emptyMessage="Ningún documento entra a la global." minWidthClassName="min-w-[800px]" />
              </CardContent>
            </Card>
            {p.excluded.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-3 text-lg font-semibold text-gray-900">Excluidos ({p.excluded.length})</h2>
                  <DataTable columns={excludedColumns} data={p.excluded} getRowKey={(r) => `${r.kind}:${r.id}`} />
                </CardContent>
              </Card>
            )}
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Conceptos que se enviarán ({p.items.length})</h2>
                <div className="max-h-96 overflow-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="sticky top-0 bg-white text-left text-xs text-gray-500">
                      <tr><th className="py-1 pr-3">#</th><th className="py-1 pr-3">Clave / unidad</th><th className="py-1 pr-3">No. identificación</th><th className="py-1 pr-3">Descripción</th><th className="py-1 pr-3 text-right">Cant.</th><th className="py-1 pr-3 text-right">Importe</th><th className="py-1 pr-3 text-right">IVA</th><th className="py-1 text-right">Total</th></tr>
                    </thead>
                    <tbody>
                      {p.items.map((it) => (
                        <tr key={it.lineNumber} className="border-t">
                          <td className="py-1 pr-3">{it.lineNumber}</td>
                          <td className="py-1 pr-3 font-mono text-xs">{it.satProductCode} / {it.satUnitCode}</td>
                          <td className="py-1 pr-3 font-mono text-xs">{it.identificationNumber ?? '—'}</td>
                          <td className="py-1 pr-3">{it.description}</td>
                          <td className="py-1 pr-3 text-right">{it.quantity}</td>
                          <td className="py-1 pr-3 text-right">{formatCurrency(it.amount)}</td>
                          <td className="py-1 pr-3 text-right">{formatCurrency(it.taxes.reduce((s, t) => s + t.amount, 0))}</td>
                          <td className="py-1 text-right font-medium">{formatCurrency(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {!canManage && <p className="text-sm text-gray-500">Solo lectura: necesitas billing:manage para emitir.</p>}
              <Button size="lg" disabled={!canEmit || create.isPending} onClick={() => setConfirmOpen(true)}>
                <GlobeAltIcon className="h-5 w-5" aria-hidden />
                Emitir factura global
              </Button>
            </div>

            <ConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              title="Emitir factura global"
              description="Es un CFDI ante el SAT: una vez timbrado solo se puede cancelar, no borrar."
              confirmLabel="Timbrar global"
              confirmText="EMITIR"
              cancelLabel="Volver"
              isPending={create.isPending}
              onConfirm={handleEmit}
            >
              <p>
                Se timbrará <strong>1 CFDI</strong> con <strong>{p.totals.documents}</strong> documento(s) por{' '}
                <strong>{formatCurrency(p.totals.total)}</strong> a <strong>PÚBLICO EN GENERAL</strong> para{' '}
                <strong>{p.branch.name}</strong> del <strong>{formatIsoDate(p.localDate)}</strong> ({p.conceptMode === 'ticket' ? 'un concepto por ticket' : 'agrupada por producto'}).
              </p>
              <p className="mt-2 text-xs text-gray-500">Si la selección cambió desde la vista previa, el API la rechazará y se recargará la vista previa.</p>
            </ConfirmDialog>
          </>
        )}

        {discardTarget && (
          <ConfirmDialog
            open={!!discardTarget}
            onOpenChange={(open) => {
              if (!open) setDiscardTarget(null);
            }}
            title={`Descartar el intento de global del ${formatIsoDate(discardTarget.localDate)}`}
            description="Solo aplica a intentos sin UUID (pendientes o con error): nunca se timbraron, así que no hay nada que cancelar ante el SAT."
            confirmLabel="Descartar intento"
            cancelLabel="Volver"
            destructive
            isPending={discard.isPending}
            onConfirm={confirmDiscard}
          >
            <p>Los tickets del día quedan libres y el día vuelve a estar disponible para emitir su factura global.</p>
          </ConfirmDialog>
        )}

        {reissueTarget && (
          <ConfirmDialog
            open={!!reissueTarget}
            onOpenChange={(open) => {
              if (!open) setReissueTarget(null);
            }}
            title={`Reexpedir la factura global del ${formatIsoDate(reissueTarget.localDate)}`}
            description="Se cancela la global del día con el motivo 04 y se timbra una nueva del mismo día con todas las ventas vigentes, con relación 04 a la cancelada. Son CFDI ante el SAT: no se pueden borrar."
            confirmLabel="Reexpedir"
            confirmText="REEXPEDIR"
            cancelLabel="Volver"
            destructive
            isPending={reissue.isPending}
            onConfirm={confirmReissue}
          >
            <p>
              {reissueTarget.uncoveredCount > 0 ? (
                <>
                  La nueva global dejará declarados <strong>{reissueTarget.uncoveredCount}</strong> ticket(s)
                  {reissueTarget.uncoveredTotal !== null && (
                    <> por <strong>{formatCurrency(reissueTarget.uncoveredTotal)}</strong></>
                  )}{' '}
                  que hoy están fuera de la global de este día.
                </>
              ) : (
                <>La nueva global dejará declarados los tickets que hoy están fuera de la global de este día.</>
              )}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Si la cancelación queda en proceso ante el SAT, todavía NO se emite la nueva: abre la global, usa &quot;Actualizar estatus SAT&quot; y, cuando quede cancelada, vuelve a pulsar Reexpedir.</li>
              <li>Si el PAC rechaza la relación 04, la nueva global se emite sin ella y se te avisa.</li>
            </ul>
          </ConfirmDialog>
        )}

        {/* Globales de la sucursal */}
        {branchId && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Globales de la sucursal</h2>
              {globals.isError ? (
                <p className="text-sm text-red-700">{billingErrorMessage(globals.error, 'No se pudieron cargar las globales')}</p>
              ) : (
                <DataTable columns={globalColumns} data={globals.data?.data ?? []} isLoading={globals.isLoading} getRowKey={(inv) => inv.id} emptyMessage="Esta sucursal no tiene globales en v2." />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
