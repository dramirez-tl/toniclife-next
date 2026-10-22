'use client';

// ReconciliationSection - CUADRE vendido vs facturado por sucursal y día
// (Contabilidad, 22-oct-2026), como el "Reporte folio Facturama" del sistema
// anterior: por sucursal (todas las que facturan en v2 o una), sus CFDI
// (globales y nominativas), total facturado, total vendido y la diferencia
// explicada: lo que NO se factura (cashback, promoción, dólares, $0, crédito)
// y lo PENDIENTE por facturar (sin global o bloqueado, p. ej. forma de pago
// "por definir"), con la lista de esos tickets para facturarlos a mano.
// Lee GET /billing/reports/folios/cuadre; Excel con el formato anterior.

import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFoliosCuadre } from '@/hooks/useBilling';
import { billingErrorMessage } from '@/lib/billing-error';
import { billingService } from '@/services/billing.service';
import {
  CUADRE_MAX_DAYS_ALL_BRANCHES,
  CUADRE_MAX_DAYS_ONE_BRANCH,
  getPaymentFormName,
} from '@/types/billing';
import type { FoliosCuadreBranch, FoliosCuadreDay, FoliosCuadreTotals } from '@/types/billing';

const money = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(v);
const fmtDay = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

const DAY_STATE_LABELS: Record<string, string> = {
  not_eligible: 'No facturable',
  no_sales: 'Sin ventas',
  ready: 'Global pendiente',
  blocked: 'Bloqueado',
  open: 'Día abierto',
  emitted: 'Global emitida',
  cancelled: 'Global cancelada',
  pending_reissue: 'Reexpedir',
};

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
const posMethodLabel = (m: string | null) => (m ? (POS_METHOD_LABELS[m] ?? m) : '—');

export function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
}

/** ¿Cuadra? diferencia = no facturable + pendiente (tolerancia de centavos). */
function squares(t: FoliosCuadreTotals): number {
  return round2(t.difference - t.notInvoiceableTotal - t.pendingTotal);
}

interface Props {
  branchId: string | undefined;
  branchLabel: string | null;
  from: string;
  to: string;
}

export function ReconciliationSection({ branchId, branchLabel, from, to }: Props) {
  const maxDays = branchId ? CUADRE_MAX_DAYS_ONE_BRANCH : CUADRE_MAX_DAYS_ALL_BRANCHES;
  const tooLong = daysBetween(from, to) > maxDays;
  const query = !tooLong ? { startDate: from, endDate: to, branchId } : null;
  const cuadre = useFoliosCuadre(query);
  const [openBranch, setOpenBranch] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const branches = cuadre.data?.branches ?? [];
  const totals = cuadre.data?.totals;
  // Una sola sucursal: su bloque abierto de entrada.
  const expandedBranch = branches.length === 1 ? branches[0].branchId : openBranch;

  const download = async () => {
    if (!query) return;
    setDownloading(true);
    try {
      await billingService.downloadFoliosCuadreXlsx(query);
      toast.success('Excel del cuadre generado');
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo generar el Excel del cuadre'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
            <ScaleIcon className="h-4 w-4 text-[#3E667D]" />
            Cuadre: vendido vs facturado
            <span className="normal-case tracking-normal text-gray-400">· {branchLabel ?? 'todas las sucursales'}</span>
          </h2>
          <div className="flex items-center gap-3">
            {query && (
              <span className="text-xs text-gray-400">
                {fmtDay(from)} – {fmtDay(to)} · día local de cada sucursal
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => void download()}
              disabled={downloading || !query || branches.length === 0}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {downloading ? 'Generando…' : 'Excel cuadre (formato anterior)'}
            </Button>
          </div>
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Vendido − facturado (globales vigentes + nominativas) = no facturable (cashback, promoción, dólares, $0, crédito) + pendiente por facturar. Lo pendiente es lo que se factura a mano (Facturación libre).
        </p>

        {tooLong ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            El cuadre cubre hasta {maxDays} días{branchId ? '' : ' para todas las sucursales (62 con una sucursal)'}; acorta el rango.
          </p>
        ) : cuadre.isLoading ? (
          <p className="py-6 text-center text-sm text-gray-400">
            Calculando el cuadre{branchId ? '' : ' de todas las sucursales'}… puede tardar unos segundos.
          </p>
        ) : cuadre.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {billingErrorMessage(cuadre.error, 'No se pudo calcular el cuadre')}
          </p>
        ) : !totals || branches.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            Sin ventas ni CFDI en el rango (o días todavía abiertos){branchId ? '' : ' en las sucursales que facturan en v2'}.
          </p>
        ) : (
          <>
            <TotalsStrip totals={totals} />

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={TH}>Sucursal</th>
                    <th className={`${TH} text-right`}>Vendido</th>
                    <th className={`${TH} text-right`}>Facturado</th>
                    <th className={`${TH} text-right`}>No facturable</th>
                    <th className={`${TH} text-right`}>Pendiente</th>
                    <th className={`${TH} text-right`}>Diferencia</th>
                    <th className={`${TH} text-center`}>Cuadra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {branches.map((b) => {
                    const open = expandedBranch === b.branchId;
                    const gap = squares(b.totals);
                    return (
                      <Fragment key={b.branchId}>
                        <tr
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setOpenBranch(open && branches.length > 1 ? null : b.branchId)}
                        >
                          <td className={`${TD} font-medium`}>
                            <span className="inline-flex items-center gap-1.5">
                              {open ? <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />}
                              {b.branchCode ? `${b.branchCode} - ${b.branchName ?? ''}` : (b.branchName ?? b.branchId)}
                              <span className="text-xs font-normal text-gray-400">({b.days.length} días)</span>
                            </span>
                          </td>
                          <td className={`${TD} text-right tabular-nums`}>{money(b.totals.salesTotal)}</td>
                          <td className={`${TD} text-right tabular-nums`}>{money(b.totals.invoicedTotal)}</td>
                          <td className={`${TD} text-right tabular-nums text-gray-500`} title={b.totals.notInvoiceable.map((x) => `${x.label}: ${money(x.total)}`).join('\n')}>
                            {money(b.totals.notInvoiceableTotal)}
                          </td>
                          <td className={`${TD} text-right tabular-nums font-semibold ${b.totals.pendingTotal > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                            {money(b.totals.pendingTotal)}
                            {b.totals.pendingCount > 0 && <span className="ml-1 text-xs font-normal text-amber-700/70">({b.totals.pendingCount})</span>}
                          </td>
                          <td className={`${TD} text-right tabular-nums`}>{money(b.totals.difference)}</td>
                          <td className={`${TD} text-center`}>
                            {Math.abs(gap) <= 0.05 ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">Sí</span>
                            ) : (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700" title="Diferencia no explicada por no facturable + pendiente">
                                {money(gap)}
                              </span>
                            )}
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-gray-50/60">
                            <td colSpan={7} className="px-4 py-3">
                              <BranchDays branch={b} openDay={openDay} setOpenDay={setOpenDay} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className={TD}>Total ({branches.length} sucursales)</td>
                    <td className={`${TD} text-right tabular-nums`}>{money(totals.salesTotal)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{money(totals.invoicedTotal)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{money(totals.notInvoiceableTotal)}</td>
                    <td className={`${TD} text-right tabular-nums text-amber-700`}>{money(totals.pendingTotal)}</td>
                    <td className={`${TD} text-right tabular-nums`}>{money(totals.difference)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const TH = 'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2 text-sm whitespace-nowrap';

function TotalsStrip({ totals }: { totals: FoliosCuadreTotals }) {
  const gap = squares(totals);
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Kpi label="Vendido" value={money(totals.salesTotal)} sub={`${totals.salesCount.toLocaleString()} tickets`} />
      <Kpi
        label="Facturado"
        value={money(totals.invoicedTotal)}
        sub={`globales ${money(totals.inGlobalTotal)} · nominativas ${money(totals.nominativeTotal)}`}
      />
      <Kpi
        label="No facturable"
        value={money(totals.notInvoiceableTotal)}
        sub={totals.notInvoiceable.map((b) => `${b.label} ${money(b.total)}`).join(' · ') || '—'}
      />
      <Kpi
        label="Pendiente por facturar"
        value={money(totals.pendingTotal)}
        sub={`${totals.pendingCount.toLocaleString()} tickets · facturación manual`}
        tone={totals.pendingTotal > 0 ? 'amber' : 'green'}
      />
      <Kpi
        label="Diferencia (vendido − facturado)"
        value={money(totals.difference)}
        sub={Math.abs(gap) <= 0.05 ? 'cuadra: no facturable + pendiente' : `no cuadra por ${money(gap)}`}
        tone={Math.abs(gap) <= 0.05 ? 'green' : 'red'}
      />
    </div>
  );
}

function BranchDays({
  branch,
  openDay,
  setOpenDay,
}: {
  branch: FoliosCuadreBranch;
  openDay: string | null;
  setOpenDay: (v: string | null) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className={TH}>Día</th>
            <th className={TH}>Estado</th>
            <th className={TH}>Folios (globales y nominativas)</th>
            <th className={`${TH} text-right`}>Vendido</th>
            <th className={`${TH} text-right`}>Facturado</th>
            <th className={`${TH} text-right`}>No facturable</th>
            <th className={`${TH} text-right`}>Pendiente</th>
            <th className={`${TH} text-right`}>Diferencia</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {branch.days.map((d) => {
            const key = `${branch.branchId}:${d.localDate}`;
            const open = openDay === key;
            const r = d.reconciliation;
            const canOpen = !!r && r.pendingCount > 0;
            const invoiced = d.invoices.reduce((acc, i) => acc + i.total, 0);
            return (
              <Fragment key={d.localDate}>
                <tr className={canOpen ? 'cursor-pointer hover:bg-amber-50/40' : undefined} onClick={() => canOpen && setOpenDay(open ? null : key)}>
                  <td className={`${TD} font-medium`}>
                    <span className="inline-flex items-center gap-1.5">
                      {canOpen ? (open ? <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />) : <span className="inline-block w-3.5" />}
                      {fmtDay(d.localDate)}
                    </span>
                  </td>
                  <td className={`${TD} text-gray-500`}>{DAY_STATE_LABELS[d.status] ?? d.status}</td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {d.invoices.length === 0 ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {d.invoices.map((i) => (
                          <span
                            key={i.id}
                            className={`rounded-full px-2 py-0.5 ${i.invoiceType === 'global' ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-700'}`}
                            title={`${i.satUuid}${i.saleNumber ? ` · ticket ${i.saleNumber}` : ''}`}
                          >
                            {i.invoiceType === 'global' ? 'Global' : 'Nominativa'} {i.folioDisplay}
                            {i.paymentFormCode && i.invoiceType === 'global' ? ` · ${getPaymentFormName(i.paymentFormCode)}` : ''} · {money(i.total)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>
                    {r ? money(r.salesTotal) : '—'}
                    {r && <span className="ml-1 text-xs text-gray-400">({r.salesCount})</span>}
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{money(invoiced)}</td>
                  <td className={`${TD} text-right tabular-nums text-gray-500`} title={r?.notInvoiceable.map((b) => `${b.label}: ${money(b.total)}`).join('\n')}>
                    {r ? money(r.notInvoiceableTotal) : '—'}
                  </td>
                  <td className={`${TD} text-right tabular-nums font-semibold ${r && r.pendingTotal > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                    {r ? money(r.pendingTotal) : '—'}
                    {r && r.pendingCount > 0 && <span className="ml-1 text-xs font-normal text-amber-700/70">({r.pendingCount})</span>}
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{r ? money(round2(r.salesTotal - invoiced)) : '—'}</td>
                </tr>
                {open && r && <PendingRow day={d} />}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PendingRow({ day }: { day: FoliosCuadreDay }) {
  const r = day.reconciliation!;
  return (
    <tr className="bg-amber-50/30">
      <td colSpan={8} className="px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
          Pendiente por facturar · {fmtDay(day.localDate)}
          {r.pendingTruncated && <span className="ml-2 font-normal normal-case text-amber-700">(se muestran los primeros {r.pending.length})</span>}
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-2 py-1">Ticket</th>
              <th className="px-2 py-1">Hora</th>
              <th className="px-2 py-1">Cliente</th>
              <th className="px-2 py-1">Cobro</th>
              <th className="px-2 py-1">Motivo</th>
              <th className="px-2 py-1 text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100">
            {r.pending.map((p) => (
              <tr key={`${p.kind}-${p.id}`}>
                <td className="px-2 py-1 font-mono text-xs">{p.folio}</td>
                <td className="px-2 py-1 text-gray-500">{p.time || '—'}</td>
                <td className="px-2 py-1">{p.customerName ?? '—'}</td>
                <td className="px-2 py-1 text-gray-600">
                  {posMethodLabel(p.paymentMethod)}
                  {p.paymentForm && <span className="ml-1 text-xs text-gray-400">({p.paymentForm})</span>}
                </td>
                <td className="px-2 py-1">
                  <span className="font-medium text-amber-800">{p.label}</span>
                  <span className="ml-1 text-xs text-gray-500">{p.detail}</span>
                </td>
                <td className="px-2 py-1 text-right tabular-nums">{money(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'amber' | 'green' | 'red';
}) {
  const tones: Record<typeof tone, string> = {
    default: 'border-gray-200 bg-white',
    amber: 'border-amber-200 bg-amber-50',
    green: 'border-emerald-200 bg-emerald-50',
    red: 'border-red-200 bg-red-50',
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-gray-500" title={sub}>{sub}</p>}
    </div>
  );
}
