'use client';

// Ventas por producto con folio (CEDEAS, 21-oct-2026): el reporte del sistema
// anterior con el que las tiendas resurtían "lo mismo que vendí ayer". Cada
// producto vendido con la venta a la que pertenece (folio, fecha, hora,
// cliente, cantidad, importe, pago, vendedor), agrupado por producto con
// subtotales; día local de la sucursal; Excel VENTAS_POR_PRODUCTO.

import { Fragment, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useSalesByProductDetail } from '@/hooks/useReports';
import { useActiveBranches } from '@/hooks/useBranches';
import { reportsService } from '@/services/reports.service';
import { PermissionGuard } from '@/components/auth';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import type { ProductSalesSummary, SalesByProductDetailQuery } from '@/types/reports';

/** Mismo tope que el API. */
const MAX_RANGE_DAYS = 366;
const ALL_BRANCHES = '';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  credit: 'Tarjeta de crédito',
  transfer: 'Transferencia',
  deposit: 'Depósito',
  mixed: 'Mixto',
  usd_cash: 'Efectivo USD',
  mercado_pago: 'Mercado Pago',
  promotion: 'Promoción',
  cashback: 'Cashback',
  undefined: 'Sin definir',
};

const pad = (n: number) => String(n).padStart(2, '0');
const toInputDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toInputDate(d);
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatAmount(value: number): string {
  return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUnits(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('es-MX', { maximumFractionDigits: 2 });
}

export default function VentasProductoPage() {
  const { data: branches, isLoading: branchesLoading } = useActiveBranches();
  const [branchId, setBranchId] = useState(ALL_BRANCHES);
  // Por defecto AYER: lo que la tienda vendió el día anterior es lo que resurte hoy.
  const [dateFrom, setDateFrom] = useState(() => daysAgo(1));
  const [dateTo, setDateTo] = useState(() => daysAgo(1));
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState<SalesByProductDetailQuery>(() => ({
    startDate: daysAgo(1),
    endDate: daysAgo(1),
  }));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const branchOptions = useMemo(
    () => [
      { value: ALL_BRANCHES, label: 'Todas las sucursales' },
      ...(branches ?? []).map((b) => ({
        value: b.id,
        label: `${b.code} - ${b.name}${b.currencyCode ? ` (${b.currencyCode})` : ''}`,
      })),
    ],
    [branches],
  );

  const { data, isLoading, isFetching, error, refetch } = useSalesByProductDetail(applied);

  const applyFilter = useCallback(
    (nextBranchId: string, from: string, to: string, nextSearch: string) => {
      if (!from || !to) {
        toast.error('Captura las fechas De y Hasta');
        return;
      }
      if (from > to) {
        toast.error('La fecha "De" no puede ser mayor que "Hasta"');
        return;
      }
      const days = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;
      if (days > MAX_RANGE_DAYS) {
        toast.error(`El rango no puede exceder ${MAX_RANGE_DAYS} días`);
        return;
      }
      setDateFrom(from);
      setDateTo(to);
      setExpanded(new Set());
      setApplied({
        startDate: from,
        endDate: to,
        ...(nextBranchId ? { branchId: nextBranchId } : {}),
        ...(nextSearch.trim() ? { search: nextSearch.trim() } : {}),
      });
    },
    [],
  );

  const handleDownload = async () => {
    if (!applied.startDate || !applied.endDate) {
      toast.error('Aplica un rango de fechas');
      return;
    }
    setDownloading(true);
    try {
      await reportsService.downloadSalesByProductDetailXlsx(applied);
      toast.success('Excel generado');
    } catch {
      toast.error('No se pudo generar el Excel');
    } finally {
      setDownloading(false);
    }
  };

  const toggle = (productId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });

  const products: ProductSalesSummary[] = data?.products ?? [];
  const totals = data?.totals;
  const hasData = products.length > 0;
  const allBranches = !applied.branchId;
  const rangeLabel =
    applied.startDate === applied.endDate
      ? formatDateDisplay(applied.startDate)
      : `${formatDateDisplay(applied.startDate)} - ${formatDateDisplay(applied.endDate)}`;

  return (
    <PermissionGuard permissions={['reports:read', 'reports:*']}>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Ventas por Producto</h1>
              <p className="text-sm text-white/70 mt-1">
                Cada producto vendido con el folio de su venta (como el reporte del sistema anterior), para resurtir
                lo mismo que se vendió
              </p>
            </div>
            <button
              onClick={handleDownload}
              disabled={!applied.startDate || isFetching || downloading}
              title="VENTAS_POR_PRODUCTO: hoja POR PRODUCTO (un renglón por venta con subtotales por producto) + RESUMEN"
              className="inline-flex items-center gap-2 rounded-lg bg-white text-[#2f5165] px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {downloading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2f5165] border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              )}
              Excel
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#3E667D]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Sucursal y fecha de venta</h2>
          </div>
          <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
            <div className="lg:w-80">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Sucursal</label>
              <SearchableSelect
                options={branchOptions}
                value={branchId}
                onChange={setBranchId}
                showAllOption={false}
                placeholder={branchesLoading ? 'Cargando...' : 'Todas las sucursales'}
                disabled={branchesLoading}
              />
            </div>
            <div>
              <label htmlFor="vp-de" className="block text-xs font-medium text-gray-500 mb-1.5">De</label>
              <Input id="vp-de" type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
            </div>
            <div>
              <label htmlFor="vp-hasta" className="block text-xs font-medium text-gray-500 mb-1.5">Hasta</label>
              <Input id="vp-hasta" type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
            </div>
            <div className="lg:w-64">
              <label htmlFor="vp-busca" className="block text-xs font-medium text-gray-500 mb-1.5">Producto</label>
              <Input
                id="vp-busca"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyFilter(branchId, dateFrom, dateTo, search);
                }}
                placeholder="Clave o nombre (opcional)"
                maxLength={100}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <button type="button" onClick={() => applyFilter(branchId, daysAgo(1), daysAgo(1), search)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Ayer
              </button>
              <button type="button" onClick={() => applyFilter(branchId, daysAgo(0), daysAgo(0), search)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Hoy
              </button>
              <button type="button" onClick={() => applyFilter(branchId, daysAgo(6), daysAgo(0), search)} className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Últimos 7 días
              </button>
            </div>
            <button
              onClick={() => applyFilter(branchId, dateFrom, dateTo, search)}
              disabled={isFetching || !dateFrom || !dateTo}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E667D] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2f5165] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {isFetching ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Cargando...
                </>
              ) : (
                'Aplicar'
              )}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Ventas del POS completadas (no canceladas), día y hora locales de la sucursal.
          </p>
        </div>

        {/* Resumen */}
        {data && totals && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Productos</p>
              <p className="text-lg font-bold text-gray-900">{products.length}</p>
              <p className="text-xs text-gray-400 mt-1">{data.branchLabel} · {rangeLabel}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Ventas (folios)</p>
              <p className="text-lg font-bold text-gray-900">{totals.sales}</p>
              <p className="text-xs text-gray-400 mt-1">{totals.lines} renglones</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Piezas</p>
              <p className="text-lg font-bold text-gray-900">{formatUnits(totals.units)}</p>
              <p className="text-xs text-gray-400 mt-1">{formatUnits(totals.points)} puntos</p>
            </div>
            <div className="rounded-xl border border-[#3E667D]/30 bg-[#3E667D] p-4 shadow-sm">
              <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-2">Importe</p>
              <p className="text-lg font-bold text-white">{formatAmount(totals.amount)}</p>
              <p className="text-xs text-white/70 mt-1">{allBranches ? 'en la moneda de cada sucursal' : 'moneda de la sucursal'}</p>
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isLoading || isFetching ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#3E667D]" />
              <span className="text-sm text-gray-400">Cargando ventas...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm text-red-500 font-medium">Error al cargar el reporte</p>
              <button onClick={() => refetch()} className="text-xs text-[#3E667D] hover:underline">
                Reintentar
              </button>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm text-gray-400">No hay ventas en el rango seleccionado</p>
              <p className="text-xs text-gray-300">Prueba con otras fechas, sucursal o producto</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                    {['Clave', 'Producto'].map((h) => (
                      <TableHead key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                    {['Ventas', 'Piezas', 'Importe', 'Puntos'].map((h) => (
                      <TableHead key={h} className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                    <TableHead className="px-4 py-3.5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p, idx) => {
                    const open = expanded.has(p.productId);
                    return (
                      <Fragment key={p.productId}>
                        <TableRow
                          className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                          onClick={() => toggle(p.productId)}
                        >
                          <TableCell className="px-4 py-3 text-sm font-mono font-medium text-gray-900 whitespace-nowrap">{p.productSku}</TableCell>
                          <TableCell className="px-4 py-3 text-sm text-gray-700">{p.productName}</TableCell>
                          <TableCell className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums">{p.salesCount}</TableCell>
                          <TableCell className="px-4 py-3 text-sm text-right font-semibold text-gray-900 tabular-nums">{formatUnits(p.units)}</TableCell>
                          <TableCell className="px-4 py-3 text-sm text-right text-gray-900 tabular-nums">{formatAmount(p.amount)}</TableCell>
                          <TableCell className="px-4 py-3 text-sm text-right text-gray-600 tabular-nums">{formatUnits(p.points)}</TableCell>
                          <TableCell className="px-4 py-3 whitespace-nowrap text-right">
                            <span className="text-xs text-[#3E667D] hover:underline">{open ? 'Ocultar' : 'Ver ventas'}</span>
                          </TableCell>
                        </TableRow>
                        {open && (
                          <TableRow className="bg-[#3E667D]/[0.03] hover:bg-[#3E667D]/[0.03]">
                            <TableCell colSpan={7} className="px-6 py-2">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-gray-500">
                                    <th className="py-1 pr-3 text-left font-medium">Folio</th>
                                    <th className="py-1 pr-3 text-left font-medium">Fecha</th>
                                    <th className="py-1 pr-3 text-left font-medium">Hora</th>
                                    <th className="py-1 pr-3 text-left font-medium">Cliente</th>
                                    <th className="py-1 pr-3 text-right font-medium">Cant</th>
                                    <th className="py-1 pr-3 text-right font-medium">Precio</th>
                                    <th className="py-1 pr-3 text-right font-medium">Importe</th>
                                    <th className="py-1 pr-3 text-left font-medium">Pago</th>
                                    <th className="py-1 pr-3 text-left font-medium">Vendedor</th>
                                    {allBranches && <th className="py-1 text-left font-medium">Sucursal</th>}
                                  </tr>
                                </thead>
                                <tbody className="text-gray-700">
                                  {p.lines.map((l, i) => (
                                    <tr key={`${l.saleId}-${i}`} className="border-t border-gray-100">
                                      <td className="py-1 pr-3 font-mono text-gray-900 whitespace-nowrap">{l.saleNumber}</td>
                                      <td className="py-1 pr-3 whitespace-nowrap">{formatDateDisplay(l.saleDate)}</td>
                                      <td className="py-1 pr-3 whitespace-nowrap">{l.saleTime}</td>
                                      <td className="py-1 pr-3">
                                        {l.customerNumber ? <span className="font-mono text-gray-500">{l.customerNumber} </span> : null}
                                        {l.customerName}
                                      </td>
                                      <td className="py-1 pr-3 text-right tabular-nums">{formatUnits(l.quantity)}</td>
                                      <td className="py-1 pr-3 text-right tabular-nums">{formatAmount(l.unitPrice)}</td>
                                      <td className="py-1 pr-3 text-right tabular-nums font-medium">{formatAmount(l.total)}</td>
                                      <td className="py-1 pr-3 whitespace-nowrap">{PAYMENT_LABELS[l.paymentMethod] ?? l.paymentMethod ?? '—'}</td>
                                      <td className="py-1 pr-3 whitespace-nowrap">{l.sellerName || '—'}</td>
                                      {allBranches && <td className="py-1 whitespace-nowrap">{l.branchCode} {l.branchName}</td>}
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
                {totals && (
                  <TableFooter className="bg-transparent">
                    <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
                      <TableCell colSpan={2} className="px-4 py-4 text-sm font-bold text-[#3E667D]">
                        TOTAL ({products.length} {products.length === 1 ? 'producto' : 'productos'})
                      </TableCell>
                      <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{totals.sales}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatUnits(totals.units)}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatAmount(totals.amount)}</TableCell>
                      <TableCell className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatUnits(totals.points)}</TableCell>
                      <TableCell className="px-4 py-4" />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
