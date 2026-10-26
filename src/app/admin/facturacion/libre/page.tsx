'use client';

// Facturación libre (Contabilidad, 22-oct-2026): los tickets que el cuadre
// deja "pendientes por facturar" (sin global o bloqueados, ventas de otro
// mes…) se facturan A MANO: un CFDI por ticket (default) o todos en uno, a
// público en general o a un cliente con datos fiscales, PPD por defecto
// (forma 99; el dinero entró otro mes) con conceptos = productos del ticket.
// Flujo: sucursal + rango → pendientes (GET reports/folios/cuadre) → elegir →
// opciones → vista previa (POST manual-invoices/preview) → timbrar
// (POST manual-invoices) → resultados con folio y liga a la factura.
// Permiso billing:manual (mig 169): solo Contabilidad, Super admin y Administrador.

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DocumentPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { PermissionGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveBranches } from '@/hooks/useBranches';
import { useCreateManualInvoices, useFoliosCuadre, usePreviewManualInvoices } from '@/hooks/useBilling';
import { ManualFreeInvoiceForm } from '@/components/admin/billing/ManualFreeInvoiceForm';
import { billingErrorMessage } from '@/lib/billing-error';
import { billingService, type FiscalDataItem } from '@/services/billing.service';
import { CUADRE_MAX_DAYS_ONE_BRANCH, getPaymentFormName } from '@/types/billing';
import type {
  GlobalReconciliationPending,
  ManualInvoiceCreateResponse,
  ManualInvoicePreviewResponse,
  ManualInvoiceRequest,
} from '@/types/billing';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayLocal = () => isoOf(new Date());
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoOf(d);
};
const money = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(v);
const fmtDay = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

const POS_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta de débito',
  credit: 'Tarjeta de crédito',
  transfer: 'Transferencia',
  deposit: 'Depósito',
  mercado_pago: 'Mercado Pago',
  cashback: 'Cashback',
  promotion: 'Promoción',
  usd_cash: 'Dólares',
  undefined: 'Por definir',
  mixed: 'Mixto',
};
const PUE_FORMS = ['01', '03', '04', '28', '06'];

type PendingTicket = GlobalReconciliationPending & { localDate: string };

const TH = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2 text-sm whitespace-nowrap';

export default function FacturacionLibrePage() {
  return (
    <PermissionGuard permissions={['billing:manual']}>
      <Suspense>
        <FacturacionLibreContent />
      </Suspense>
    </PermissionGuard>
  );
}

function FacturacionLibreContent() {
  const params = useSearchParams();
  const initialBranch = params.get('branch') ?? '';
  const initialFrom = params.get('from') ?? '';
  const initialTo = params.get('to') ?? '';
  // Dos maneras de facturar a mano: tickets pendientes del cuadre, o una
  // captura libre sin ticket (como en el punto de venta, solo el CFDI).
  const [mode, setMode] = useState<'tickets' | 'free'>(params.get('modo') === 'libre' ? 'free' : 'tickets');

  // Filtros (borrador) y lo aplicado.
  const [branchId, setBranchId] = useState(initialBranch);
  const [from, setFrom] = useState(DATE_RE.test(initialFrom) ? initialFrom : daysAgo(30));
  const [to, setTo] = useState(DATE_RE.test(initialTo) ? initialTo : todayLocal());
  const [applied, setApplied] = useState<{ branchId: string; from: string; to: string } | null>(
    initialBranch ? { branchId: initialBranch, from: DATE_RE.test(initialFrom) ? initialFrom : daysAgo(30), to: DATE_RE.test(initialTo) ? initialTo : todayLocal() } : null,
  );

  const { data: branches } = useActiveBranches();
  const branchOptions = useMemo(
    () => (branches ?? []).map((b) => ({ value: b.id, label: `${b.code} - ${b.name}` })),
    [branches],
  );

  const cuadre = useFoliosCuadre(applied ? { startDate: applied.from, endDate: applied.to, branchId: applied.branchId } : null);
  const pending = useMemo<PendingTicket[]>(() => {
    const out: PendingTicket[] = [];
    for (const b of cuadre.data?.branches ?? []) {
      for (const d of b.days) {
        for (const p of d.reconciliation?.pending ?? []) {
          if (p.kind === 'pos_sale') out.push({ ...p, localDate: d.localDate });
        }
      }
    }
    return out;
  }, [cuadre.data]);

  // Selección y opciones.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [receiverMode, setReceiverMode] = useState<'public' | 'customer'>('public');
  const [customer, setCustomer] = useState<FiscalDataItem | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PPD' | 'PUE'>('PPD');
  const [paymentForm, setPaymentForm] = useState('01');
  const [groupTickets, setGroupTickets] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  const [preview, setPreview] = useState<ManualInvoicePreviewResponse | null>(null);
  const [result, setResult] = useState<ManualInvoiceCreateResponse | null>(null);
  const previewMutation = usePreviewManualInvoices();
  const createMutation = useCreateManualInvoices();

  const customers = useQuery({
    queryKey: ['billing', 'fiscal-data', 'search', customerSearch],
    queryFn: () => billingService.listFiscalData({ search: customerSearch.trim(), limit: 10 }),
    enabled: receiverMode === 'customer' && customerSearch.trim().length >= 3,
    staleTime: 60 * 1000,
  });

  const selectedTickets = pending.filter((p) => selected.has(p.id));
  const selectedTotal = selectedTickets.reduce((acc, p) => acc + p.total, 0);

  const applyFilters = () => {
    if (!branchId) {
      toast.error('Elige la sucursal');
      return;
    }
    if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
      toast.error('Revisa las fechas');
      return;
    }
    setSelected(new Set());
    setPreview(null);
    setResult(null);
    setApplied({ branchId, from, to });
  };

  const request = (): ManualInvoiceRequest | null => {
    if (selected.size === 0) {
      toast.error('Elige al menos un ticket');
      return null;
    }
    if (receiverMode === 'customer' && !customer) {
      toast.error('Elige el cliente con datos fiscales');
      return null;
    }
    return {
      saleIds: selectedTickets.map((p) => p.id),
      receiverCustomerId: receiverMode === 'customer' ? customer!.customerId : null,
      paymentMethod,
      paymentForm: paymentMethod === 'PUE' ? paymentForm : undefined,
      groupTickets,
      sendEmail: receiverMode === 'customer' ? sendEmail : false,
    };
  };

  const runPreview = async () => {
    const dto = request();
    if (!dto) return;
    setResult(null);
    try {
      setPreview(await previewMutation.mutateAsync(dto));
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo generar la vista previa'));
    }
  };

  const runCreate = async () => {
    const dto = request();
    if (!dto) return;
    const count = dto.groupTickets ? 1 : dto.saleIds.length;
    if (!window.confirm(`Se timbrarán ${count} CFDI (${dto.paymentMethod}) por ${money(selectedTotal)}. ¿Continuar?`)) return;
    try {
      const r = await createMutation.mutateAsync(dto);
      setResult(r);
      setPreview(null);
      setSelected(new Set());
      if (r.failed === 0) toast.success(`${r.stamped} CFDI timbrados`);
      else toast.warning(`${r.stamped} timbrados · ${r.failed} con error`);
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo timbrar'));
    }
  };

  const tooLong = applied ? Math.round((Date.parse(applied.to) - Date.parse(applied.from)) / 86_400_000) + 1 > CUADRE_MAX_DAYS_ONE_BRANCH : false;
  const previewReady = !!preview && preview.errors.length === 0 && preview.invoices.every((i) => i.warnings.length === 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-3">
                <DocumentPlusIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold">Facturación libre</h1>
              </div>
              <p className="text-white/80">
                Tickets pendientes por facturar (sin global o bloqueados) timbrados a mano: uno por ticket o agrupados, a público en general o a un cliente, PPD por defecto
              </p>
            </div>
            <Link href="/admin/facturacion/reporte-folios">
              <Button variant="secondary">Ver cuadre</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Qué se va a facturar */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-sm">
          <button
            type="button"
            onClick={() => setMode('tickets')}
            className={`rounded-md px-4 py-2 font-medium transition-colors ${mode === 'tickets' ? 'bg-[#3E667D] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Tickets pendientes
          </button>
          <button
            type="button"
            onClick={() => setMode('free')}
            className={`rounded-md px-4 py-2 font-medium transition-colors ${mode === 'free' ? 'bg-[#3E667D] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Factura sin ticket (captura libre)
          </button>
        </div>

        {mode === 'free' && <ManualFreeInvoiceForm />}

        {mode === 'tickets' && (
        <>
        {/* 1. Pendientes */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">1 · Tickets pendientes</h2>
            <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-gray-500">Sucursal</label>
                <SearchableSelect options={branchOptions} value={branchId} onChange={(v) => setBranchId(v)} showAllOption={false} placeholder="Buscar sucursal..." className="w-full" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">De</label>
                <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="bg-gray-50" />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500">Hasta</label>
                  <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="bg-gray-50" />
                </div>
                <Button onClick={applyFilters} disabled={cuadre.isFetching} className="gap-2">
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  {cuadre.isFetching ? 'Buscando…' : 'Buscar'}
                </Button>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">Día local de la sucursal; hasta {CUADRE_MAX_DAYS_ONE_BRANCH} días. Los tickets con cobro en dólares, cashback o promoción no se facturan.</p>

            <div className="mt-4">
              {!applied ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">Elige sucursal y rango.</p>
              ) : tooLong ? (
                <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">Acorta el rango (máximo {CUADRE_MAX_DAYS_ONE_BRANCH} días).</p>
              ) : cuadre.isLoading ? (
                <p className="py-6 text-center text-sm text-gray-400">Buscando pendientes…</p>
              ) : cuadre.isError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{billingErrorMessage(cuadre.error, 'No se pudieron leer los pendientes')}</p>
              ) : pending.length === 0 ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">Sin tickets pendientes por facturar en el rango.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={`${TH} w-8`}>
                          <input
                            type="checkbox"
                            aria-label="Seleccionar todos"
                            checked={selected.size > 0 && selected.size === pending.length}
                            onChange={(e) => setSelected(e.target.checked ? new Set(pending.map((p) => p.id)) : new Set())}
                          />
                        </th>
                        <th className={TH}>Día</th>
                        <th className={TH}>Ticket</th>
                        <th className={TH}>Hora</th>
                        <th className={TH}>Cliente</th>
                        <th className={TH}>Cobro</th>
                        <th className={TH}>Motivo</th>
                        <th className={`${TH} text-right`}>Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pending.map((p) => {
                        const on = selected.has(p.id);
                        return (
                          <tr
                            key={p.id}
                            className={`cursor-pointer ${on ? 'bg-amber-50/60' : 'hover:bg-gray-50'}`}
                            onClick={() => {
                              const next = new Set(selected);
                              if (on) next.delete(p.id);
                              else next.add(p.id);
                              setSelected(next);
                              setPreview(null);
                            }}
                          >
                            <td className={TD}>
                              <input type="checkbox" checked={on} readOnly aria-label={`Seleccionar ${p.folio}`} />
                            </td>
                            <td className={TD}>{fmtDay(p.localDate)}</td>
                            <td className={`${TD} font-mono text-xs`}>{p.folio}</td>
                            <td className={`${TD} text-gray-500`}>{p.time || '—'}</td>
                            <td className={TD}>{p.customerName ?? '—'}</td>
                            <td className={`${TD} text-gray-600`}>{p.paymentMethod ? (POS_METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod) : '—'}</td>
                            <td className="px-3 py-2 text-sm">
                              <span className="font-medium text-amber-800">{p.label}</span>
                              <span className="ml-1 text-xs text-gray-500">{p.detail}</span>
                            </td>
                            <td className={`${TD} text-right tabular-nums`}>{money(p.total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-semibold">
                        <td className={TD} colSpan={7}>
                          {selected.size} de {pending.length} tickets seleccionados
                        </td>
                        <td className={`${TD} text-right tabular-nums`}>{money(selectedTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Opciones */}
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">2 · Cómo facturar</h2>
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Receptor</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="receiver" checked={receiverMode === 'public'} onChange={() => { setReceiverMode('public'); setPreview(null); }} />
                  Público en general (XAXX010101000)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="receiver" checked={receiverMode === 'customer'} onChange={() => { setReceiverMode('customer'); setPreview(null); }} />
                  Cliente con datos fiscales
                </label>
                {receiverMode === 'customer' && (
                  <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {customer ? (
                      <div className="flex items-start justify-between gap-2 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{customer.legalName}</p>
                          <p className="text-xs text-gray-500">{customer.rfc}{customer.customerNumber ? ` · #${customer.customerNumber}` : ''}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setCustomer(null); setPreview(null); }}>Cambiar</Button>
                      </div>
                    ) : (
                      <>
                        <Input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="RFC, razón social o número…" className="bg-white" />
                        {customers.isFetching && <p className="text-xs text-gray-400">Buscando…</p>}
                        {(customers.data?.data ?? []).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-white"
                            onClick={() => { setCustomer(c); setPreview(null); }}
                          >
                            <span className="font-medium text-gray-900">{c.legalName}</span>
                            <span className="ml-2 text-xs text-gray-500">{c.rfc}{c.customerNumber ? ` · #${c.customerNumber}` : ''}</span>
                          </button>
                        ))}
                        {customers.data && customers.data.data.length === 0 && <p className="text-xs text-gray-400">Sin datos fiscales con ese texto. Se capturan en Datos Fiscales.</p>}
                      </>
                    )}
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
                      Enviar el CFDI por correo al cliente
                    </label>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Método de pago</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="method" checked={paymentMethod === 'PPD'} onChange={() => { setPaymentMethod('PPD'); setPreview(null); }} />
                  PPD · pago en parcialidades o diferido (forma 99) — <span className="text-xs text-gray-500">el dinero entró otro mes; después su complemento</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="method" checked={paymentMethod === 'PUE'} onChange={() => { setPaymentMethod('PUE'); setPreview(null); }} />
                  PUE · pago en una sola exhibición
                </label>
                {paymentMethod === 'PUE' && (
                  <select value={paymentForm} onChange={(e) => { setPaymentForm(e.target.value); setPreview(null); }} className="h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm">
                    {PUE_FORMS.map((code) => (
                      <option key={code} value={code}>{code} · {getPaymentFormName(code)}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Agrupación</p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="group" checked={!groupTickets} onChange={() => { setGroupTickets(false); setPreview(null); }} />
                  Un CFDI por ticket <span className="text-xs text-gray-500">(recomendado: se concilia y cancela por ticket)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="group" checked={groupTickets} onChange={() => { setGroupTickets(true); setPreview(null); }} />
                  Agrupar los seleccionados en una sola factura
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={() => void runPreview()} disabled={selected.size === 0 || previewMutation.isPending}>
                {previewMutation.isPending ? 'Calculando…' : 'Vista previa'}
              </Button>
              <Button onClick={() => void runCreate()} disabled={!previewReady || createMutation.isPending} className="gap-2">
                <DocumentPlusIcon className="h-4 w-4" />
                {createMutation.isPending ? 'Timbrando…' : `Timbrar ${groupTickets ? '1 CFDI' : `${selected.size} CFDI`}`}
              </Button>
              {preview && !previewReady && <span className="text-xs text-amber-700">Corrige los avisos de la vista previa antes de timbrar.</span>}
            </div>
          </CardContent>
        </Card>

        {/* 3. Vista previa */}
        {preview && (
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
                3 · Vista previa · {preview.invoices.length} CFDI · {money(preview.total)}
              </h2>
              {preview.errors.length > 0 && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p className="mb-1 font-medium">No se pueden facturar:</p>
                  <ul className="list-disc pl-5">
                    {preview.errors.map((e, i) => (
                      <li key={i}><span className="font-mono text-xs">{e.saleNumbers.join(', ')}</span> — {e.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={TH}>Tickets</th>
                      <th className={TH}>Receptor</th>
                      <th className={TH}>Método · forma</th>
                      <th className={`${TH} text-right`}>Conceptos</th>
                      <th className={`${TH} text-right`}>Subtotal</th>
                      <th className={`${TH} text-right`}>IVA</th>
                      <th className={`${TH} text-right`}>Total</th>
                      <th className={TH}>Avisos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.invoices.map((inv, i) => (
                      <tr key={i}>
                        <td className={`${TD} font-mono text-xs`}>{inv.saleNumbers.join(', ')}</td>
                        <td className={TD}>{inv.receiverName} <span className="text-xs text-gray-500">{inv.receiverRfc}</span></td>
                        <td className={TD}>{inv.paymentMethod} · {inv.paymentForm} {getPaymentFormName(inv.paymentForm)}</td>
                        <td className={`${TD} text-right`}>{inv.itemCount}</td>
                        <td className={`${TD} text-right tabular-nums`}>{money(inv.subtotal)}</td>
                        <td className={`${TD} text-right tabular-nums`}>{money(inv.taxes)}</td>
                        <td className={`${TD} text-right tabular-nums font-semibold`}>{money(inv.total)}</td>
                        <td className="px-3 py-2 text-xs text-amber-700">{inv.warnings.join(' · ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 4. Resultado */}
        {result && (
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
                4 · Resultado · {result.stamped} timbrados{result.failed > 0 ? ` · ${result.failed} con error` : ''}
              </h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className={TH}>Tickets</th>
                      <th className={TH}>Folio</th>
                      <th className={TH}>UUID</th>
                      <th className={`${TH} text-right`}>Total</th>
                      <th className={TH}>Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.results.map((r, i) => (
                      <tr key={i} className={r.error ? 'bg-red-50/50' : undefined}>
                        <td className={`${TD} font-mono text-xs`}>{r.saleNumbers.join(', ')}</td>
                        <td className={TD}>
                          {r.invoiceId ? (
                            <Link href={`/admin/facturacion/${r.invoiceId}`} className="font-medium text-[#3E667D] underline-offset-2 hover:underline">
                              {r.folioDisplay ?? 'ver intento'}
                            </Link>
                          ) : '—'}
                        </td>
                        <td className={`${TD} font-mono text-xs text-gray-500`}>{r.satUuid ?? '—'}</td>
                        <td className={`${TD} text-right tabular-nums`}>{r.total != null ? money(r.total) : '—'}</td>
                        <td className="px-3 py-2 text-sm">
                          {r.error ? <span className="text-red-700">{r.error}</span> : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Timbrada</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
        </>
        )}
      </div>
    </div>
  );
}
