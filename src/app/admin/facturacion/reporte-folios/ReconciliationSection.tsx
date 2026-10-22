'use client';

// ReconciliationSection - CUADRE vendido vs facturado por día de una sucursal
// (Contabilidad, 22-oct-2026), como el "Reporte folio Facturama" del sistema
// anterior: total vendido − total facturado (globales vivas + nominativas) =
// diferencia, explicada por lo que NO se factura (cashback, promoción,
// dólares, $0, crédito) y lo que sigue PENDIENTE por facturar (sin global o
// bloqueado, p. ej. forma de pago "por definir"), con la lista de esos tickets
// para facturarlos a mano. Lee GET /billing/global-invoices/days (máx. 62 días).

import { Fragment, useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGlobalDays } from '@/hooks/useBilling';
import { billingErrorMessage } from '@/lib/billing-error';
import { getPaymentFormName } from '@/types/billing';
import type { GlobalDayReconciliation, GlobalDayStatus } from '@/types/billing';

/** Mismo tope que GET /billing/global-invoices/days. */
export const RECONCILIATION_MAX_DAYS = 62;

const money = (v: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(v);
const fmtDay = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

const TH = 'px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2 text-sm whitespace-nowrap';

const DAY_STATE_LABELS: Record<GlobalDayStatus['status'], string> = {
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

interface Props {
  branchId: string | undefined;
  branchLabel: string | null;
  from: string;
  to: string;
}

export function ReconciliationSection({ branchId, branchLabel, from, to }: Props) {
  const tooLong = daysBetween(from, to) > RECONCILIATION_MAX_DAYS;
  const query = branchId && !tooLong ? { branchId, from, to } : null;
  const days = useGlobalDays(query);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const rows = useMemo(
    () => (days.data ?? []).filter((d) => d.reconciliation && d.reconciliation.salesCount > 0),
    [days.data],
  );
  const sum = useMemo(() => {
    const acc = {
      sales: 0, invoiced: 0, inGlobal: 0, nominative: 0, notInvoiceable: 0, pending: 0, pendingCount: 0, difference: 0,
    };
    const buckets = new Map<string, { label: string; total: number; count: number }>();
    for (const d of rows) {
      const r = d.reconciliation as GlobalDayReconciliation;
      acc.sales += r.salesTotal;
      acc.invoiced += r.invoicedTotal;
      acc.inGlobal += r.inGlobalTotal;
      acc.nominative += r.nominativeTotal;
      acc.notInvoiceable += r.notInvoiceableTotal;
      acc.pending += r.pendingTotal;
      acc.pendingCount += r.pendingCount;
      acc.difference += r.difference;
      for (const b of r.notInvoiceable) {
        const cur = buckets.get(b.reason) ?? { label: b.label, total: 0, count: 0 };
        cur.total += b.total;
        cur.count += b.count;
        buckets.set(b.reason, cur);
      }
    }
    return { ...acc, buckets: Array.from(buckets.values()).sort((a, b) => b.total - a.total) };
  }, [rows]);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-700">
            <ScaleIcon className="h-4 w-4 text-[#3E667D]" />
            Cuadre: vendido vs facturado
            {branchLabel && <span className="normal-case tracking-normal text-gray-400">· {branchLabel}</span>}
          </h2>
          {query && (
            <span className="text-xs text-gray-400">
              {fmtDay(from)} – {fmtDay(to)} · día local de la sucursal
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-gray-400">
          Vendido − facturado (globales vigentes + nominativas) = no facturable (cashback, promoción, dólares, $0, crédito) + pendiente por facturar. Lo pendiente es lo que se factura a mano.
        </p>

        {!branchId ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            Elige una sucursal en los filtros para ver el cuadre por día.
          </p>
        ) : tooLong ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            El cuadre se calcula hasta para {RECONCILIATION_MAX_DAYS} días; acorta el rango.
          </p>
        ) : days.isLoading ? (
          <p className="py-6 text-center text-sm text-gray-400">Calculando el cuadre…</p>
        ) : days.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {billingErrorMessage(days.error, 'No se pudo calcular el cuadre')}
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            Sin ventas en el rango (o días todavía abiertos).
          </p>
        ) : (
          <>
            {/* Totales del rango */}
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Kpi label="Vendido" value={money(sum.sales)} />
              <Kpi
                label="Facturado"
                value={money(sum.invoiced)}
                sub={`globales ${money(sum.inGlobal)} · nominativas ${money(sum.nominative)}`}
              />
              <Kpi
                label="No facturable"
                value={money(sum.notInvoiceable)}
                sub={sum.buckets.map((b) => `${b.label} ${money(b.total)}`).join(' · ') || '—'}
              />
              <Kpi
                label="Pendiente por facturar"
                value={money(sum.pending)}
                sub={`${sum.pendingCount.toLocaleString()} tickets · facturación manual`}
                tone={sum.pending > 0 ? 'amber' : 'green'}
              />
              <Kpi
                label="Diferencia (vendido − facturado)"
                value={money(sum.difference)}
                sub={
                  Math.abs(round2(sum.difference - sum.notInvoiceable - sum.pending)) <= 0.05
                    ? 'cuadra: no facturable + pendiente'
                    : `no cuadra por ${money(round2(sum.difference - sum.notInvoiceable - sum.pending))}`
                }
                tone={Math.abs(round2(sum.difference - sum.notInvoiceable - sum.pending)) <= 0.05 ? 'green' : 'red'}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className={TH}>Día</TableHead>
                    <TableHead className={TH}>Estado</TableHead>
                    <TableHead className={`${TH} text-right`}>Vendido</TableHead>
                    <TableHead className={`${TH} text-right`}>En globales</TableHead>
                    <TableHead className={`${TH} text-right`}>Nominativas</TableHead>
                    <TableHead className={`${TH} text-right`}>No facturable</TableHead>
                    <TableHead className={`${TH} text-right`}>Pendiente</TableHead>
                    <TableHead className={`${TH} text-right`}>Diferencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((d) => {
                    const r = d.reconciliation as GlobalDayReconciliation;
                    const open = openDay === d.localDate;
                    const canOpen = r.pendingCount > 0;
                    return (
                      <Fragment key={d.localDate}>
                        <TableRow
                          className={canOpen ? 'cursor-pointer hover:bg-amber-50/40' : undefined}
                          onClick={() => canOpen && setOpenDay(open ? null : d.localDate)}
                        >
                          <TableCell className={`${TD} font-medium`}>
                            <span className="inline-flex items-center gap-1.5">
                              {canOpen ? (
                                open ? <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRightIcon className="h-3.5 w-3.5 text-gray-400" />
                              ) : (
                                <span className="inline-block w-3.5" />
                              )}
                              {fmtDay(d.localDate)}
                            </span>
                          </TableCell>
                          <TableCell className={`${TD} text-gray-500`}>
                            {DAY_STATE_LABELS[d.status] ?? d.status}
                            {d.emittedForms && d.emittedForms.length > 0 && (
                              <span className="ml-1 text-xs text-gray-400">
                                ({d.emittedForms.map((f) => `${f.folioDisplay} · ${getPaymentFormName(f.paymentForm)}`).join(', ')})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={`${TD} text-right tabular-nums`}>
                            {money(r.salesTotal)}
                            <span className="ml-1 text-xs text-gray-400">({r.salesCount})</span>
                          </TableCell>
                          <TableCell className={`${TD} text-right tabular-nums`}>{money(r.inGlobalTotal)}</TableCell>
                          <TableCell className={`${TD} text-right tabular-nums`}>{money(r.nominativeTotal)}</TableCell>
                          <TableCell className={`${TD} text-right tabular-nums text-gray-500`} title={r.notInvoiceable.map((b) => `${b.label}: ${money(b.total)}`).join('\n')}>
                            {money(r.notInvoiceableTotal)}
                          </TableCell>
                          <TableCell className={`${TD} text-right tabular-nums font-semibold ${r.pendingTotal > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                            {money(r.pendingTotal)}
                            {r.pendingCount > 0 && <span className="ml-1 text-xs font-normal text-amber-700/70">({r.pendingCount})</span>}
                          </TableCell>
                          <TableCell className={`${TD} text-right tabular-nums`}>{money(r.difference)}</TableCell>
                        </TableRow>
                        {open && (
                          <TableRow className="bg-amber-50/30 hover:bg-amber-50/30">
                            <TableCell colSpan={8} className="px-4 py-3">
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                                Pendiente por facturar · {fmtDay(d.localDate)}
                                {r.pendingTruncated && (
                                  <span className="ml-2 font-normal normal-case text-amber-700">(se muestran los primeros {r.pending.length})</span>
                                )}
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
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell className={TD} colSpan={2}>Total del rango</TableCell>
                    <TableCell className={`${TD} text-right tabular-nums`}>{money(sum.sales)}</TableCell>
                    <TableCell className={`${TD} text-right tabular-nums`}>{money(sum.inGlobal)}</TableCell>
                    <TableCell className={`${TD} text-right tabular-nums`}>{money(sum.nominative)}</TableCell>
                    <TableCell className={`${TD} text-right tabular-nums`}>{money(sum.notInvoiceable)}</TableCell>
                    <TableCell className={`${TD} text-right tabular-nums text-amber-700`}>{money(sum.pending)}</TableCell>
                    <TableCell className={`${TD} text-right tabular-nums`}>{money(sum.difference)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
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
