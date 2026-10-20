'use client';

// Reportes › Ventas por Usuario — ventas del POS por vendedor y por distribuidor,
// con detalle de cada venta. La usan Reportes (reports:read) y Call Center
// (reports:sales_lookup, mig 163) para consultar las compras de un cliente.
//
// - Vendedores: salen de las ventas reales del periodo (GET sales/by-user/sellers),
//   no de los roles: aparecen CEDEAS, Operaciones o la terminal cuando vendieron.
// - Distribuidor: número (v2 o legacy) o parte del nombre; el API filtra.
// - Detalle: clic en el folio abre la venta (productos, precios, pagos, puntos).

import { useState, useMemo, useCallback } from 'react';
import { useSalesByUser, useSalesByUserSellers } from '@/hooks/useReports';
import { usePeriods, useCurrentPeriod } from '@/hooks/useMlmPeriods';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { PermissionGuard } from '@/components/auth';
import { paymentMethodLabel } from '@/lib/delivery-print';
import { DEFAULT_TIMEZONE, formatDateTimeLocal } from '@/lib/timezone-utils';
import type { SaleByUserRow } from '@/types/reports';
import { SaleQuickDetail } from './SaleQuickDetail';

function toDateOnly(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, day] = toDateOnly(dateStr).split('-');
  return `${day}/${m}/${y}`;
}

function formatCurrency(value: number, currency: string = 'MXN'): string {
  const localeMap: Record<string, string> = { MXN: 'es-MX', USD: 'en-US', COP: 'es-CO', GTQ: 'es-GT' };
  return new Intl.NumberFormat(localeMap[currency] ?? 'es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
    minimumFractionDigits: 2,
  }).format(value);
}

const num = (v: number) => v.toLocaleString('es-MX', { maximumFractionDigits: 2 });

const TH = 'px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap';

export default function VentasUsuarioPage() {
  return (
    <PermissionGuard permissions={['reports:read', 'reports:sales_lookup']}>
      <VentasUsuarioContent />
    </PermissionGuard>
  );
}

function VentasUsuarioContent() {
  const { data: periods, isLoading: periodsLoading } = usePeriods();
  const { data: currentPeriod } = useCurrentPeriod();

  // Periodo elegido (sin elegir = el actual, sin efectos).
  const [chosenPeriodId, setChosenPeriodId] = useState('');
  const selectedPeriodId = chosenPeriodId || currentPeriod?.id || '';
  const sortedPeriods = useMemo(
    () => (periods ? [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate)) : []),
    [periods],
  );
  const selectedPeriod = useMemo(
    () => periods?.find((p) => p.id === selectedPeriodId),
    [periods, selectedPeriodId],
  );
  const periodStart = selectedPeriod ? toDateOnly(selectedPeriod.startDate) : '';
  const periodEnd = selectedPeriod ? toDateOnly(selectedPeriod.endDate) : '';

  // Vendedores con ventas en el periodo elegido.
  const { data: sellers = [], isLoading: sellersLoading } = useSalesByUserSellers(periodStart, periodEnd);
  const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([]);
  const [sellerDropdownOpen, setSellerDropdownOpen] = useState(false);
  const sellerName = (id: string) => sellers.find((s) => s.id === id)?.name ?? id;

  // Distribuidor (número o nombre).
  const [customerInput, setCustomerInput] = useState('');

  // Consulta aplicada (solo cambia al presionar Consultar).
  const [applied, setApplied] = useState<{ start: string; end: string; sellerIds: string[]; customer: string } | null>(null);

  const { data, isLoading, error, isFetching } = useSalesByUser({
    startDate: applied?.start ?? '',
    endDate: applied?.end ?? '',
    sellerIds: applied && applied.sellerIds.length > 0 ? applied.sellerIds : undefined,
    customer: applied?.customer || undefined,
  });

  const handleApply = useCallback(() => {
    if (!selectedPeriod) {
      toast.error('Selecciona un periodo');
      return;
    }
    setSellerDropdownOpen(false);
    setApplied({
      start: toDateOnly(selectedPeriod.startDate),
      end: toDateOnly(selectedPeriod.endDate),
      sellerIds: [...selectedSellerIds],
      customer: customerInput.trim(),
    });
  }, [selectedPeriod, selectedSellerIds, customerInput]);

  const toggleSeller = (id: string) =>
    setSelectedSellerIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const hasData = rows.length > 0;
  const totals = useMemo(
    () => ({
      units: rows.reduce((s, r) => s + (r.units ?? 0), 0),
      points: rows.reduce((s, r) => s + (r.points ?? 0), 0),
      customers: new Set(rows.map((r) => r.customerId).filter(Boolean)).size,
    }),
    [rows],
  );

  const [detailSaleId, setDetailSaleId] = useState<string | null>(null);

  const handleExportCSV = () => {
    if (!hasData || !applied) return;
    const headers = ['Fecha', 'Folio', 'Sucursal', 'No. Distribuidor', 'Distribuidor', 'Vendedor', 'Canal', 'Pago', 'Piezas', 'Puntos', 'Moneda', 'Total'];
    const csvRows = rows.map((row: SaleByUserRow) => [
      formatDateTimeLocal(row.date, DEFAULT_TIMEZONE),
      row.saleNumber,
      row.branchName,
      row.customerId,
      row.customerName,
      row.sellerName || row.sellerUsername,
      row.capturedVia === 'usuario' ? 'Call center' : 'Terminal',
      paymentMethodLabel(row.paymentMethod),
      String(row.units ?? 0),
      String(row.points ?? 0),
      row.currencyCode,
      row.total.toFixed(2),
    ]);
    const csvContent = [headers.join(','), ...csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventas_usuario_${applied.start}_${applied.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte exportado');
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Ventas por Usuario</h1>
            <p className="text-sm text-white/70 mt-1">
              Ventas del POS por vendedor o por distribuidor, con el detalle de cada venta
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={handleExportCSV}
            disabled={!hasData}
            className="gap-2 bg-white/15 backdrop-blur-sm border border-white/20 text-white hover:bg-white/25 hover:text-white disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">Filtros de búsqueda</h2>
        <div className="grid grid-cols-1 gap-4 items-end md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Periodo</label>
            <SearchableSelect
              options={sortedPeriods.map((p) => ({
                value: p.id,
                label: `${p.name} (${formatDateDisplay(p.startDate)} - ${formatDateDisplay(p.endDate)})${p.isCurrent ? ' — Actual' : ''}`,
              }))}
              value={selectedPeriodId}
              onChange={(v) => {
                setChosenPeriodId(v);
                setSelectedSellerIds([]);
              }}
              disabled={periodsLoading}
              showAllOption={false}
              allLabel="Selecciona un periodo"
              placeholder="Buscar periodo..."
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Distribuidor</label>
            <Input
              value={customerInput}
              onChange={(e) => setCustomerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApply();
              }}
              placeholder="Número o nombre del distribuidor"
              className="bg-gray-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">
              Vendedores
              {selectedSellerIds.length > 0 && <span className="ml-1 text-[#3E667D]">({selectedSellerIds.length})</span>}
            </label>
            <Popover open={sellerDropdownOpen} onOpenChange={setSellerDropdownOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between bg-gray-50 text-left font-normal text-gray-900">
                  <span className="truncate">
                    {selectedSellerIds.length === 0
                      ? 'Todos los vendedores'
                      : selectedSellerIds.length === 1
                        ? sellerName(selectedSellerIds[0])
                        : `${selectedSellerIds.length} seleccionados`}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="ml-2 h-4 w-4 shrink-0 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-[280px] max-h-80 overflow-y-auto p-0">
                <div className="sticky top-0 z-10 flex gap-2 border-b border-gray-100 bg-white px-3 py-2">
                  <Button type="button" variant="link" size="sm" onClick={() => setSelectedSellerIds(sellers.map((s) => s.id))} className="h-auto p-0 text-xs text-[#3E667D]">
                    Seleccionar todos
                  </Button>
                  <span className="text-gray-300">|</span>
                  <Button type="button" variant="link" size="sm" onClick={() => setSelectedSellerIds([])} className="h-auto p-0 text-xs text-gray-500">
                    Limpiar
                  </Button>
                </div>
                {sellersLoading ? (
                  <div className="px-3 py-4 text-center text-xs text-gray-400">Cargando vendedores…</div>
                ) : sellers.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-gray-400">
                    {periodStart ? 'Nadie ha vendido en este periodo' : 'Elige un periodo'}
                  </div>
                ) : (
                  sellers.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                      <Checkbox checked={selectedSellerIds.includes(s.id)} onCheckedChange={() => toggleSeller(s.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-gray-900">{s.name}</span>
                        <span className="block truncate text-[11px] text-gray-400">
                          {s.username}
                          {s.roleName ? ` · ${s.roleName}` : ''}
                        </span>
                      </span>
                      <span className="text-xs tabular-nums text-gray-500">{s.sales}</span>
                    </label>
                  ))
                )}
              </PopoverContent>
            </Popover>
          </div>

          <Button onClick={handleApply} disabled={isFetching || !selectedPeriodId} className="whitespace-nowrap active:scale-[0.98]">
            {isFetching ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Cargando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
                Consultar
              </>
            )}
          </Button>
        </div>

        {applied && (applied.sellerIds.length > 0 || applied.customer) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500">Filtros:</span>
            {applied.customer && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Distribuidor: {applied.customer}
              </span>
            )}
            {applied.sellerIds.map((sid) => (
              <span key={sid} className="inline-flex items-center rounded-full bg-[#3E667D]/10 px-2.5 py-0.5 text-xs font-medium text-[#3E667D]">
                {sellerName(sid)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Resumen */}
      {data && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {[
            { label: 'Total MXN', value: formatCurrency(data.summary.totalSales, 'MXN') },
            { label: 'Total USD', value: formatCurrency(data.summary.totalUsd, 'USD') },
            { label: 'Ventas', value: data.summary.totalDocuments.toLocaleString() },
            { label: 'Distribuidores', value: totals.customers.toLocaleString() },
            { label: 'Piezas', value: num(totals.units) },
            { label: 'Puntos', value: num(totals.points) },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">{c.label}</p>
              <p className="text-lg font-bold text-gray-900">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading || isFetching ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#3E667D]" />
            <span className="text-sm text-gray-400">Generando reporte...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <p className="text-sm font-medium text-red-500">Error al cargar el reporte</p>
            <Button variant="link" size="sm" onClick={handleApply} className="text-xs text-[#3E667D]">Reintentar</Button>
          </div>
        ) : !applied ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <p className="text-sm text-gray-400">Elige el periodo, opcionalmente un distribuidor o vendedores, y presiona Consultar</p>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <p className="text-sm text-gray-400">No se encontraron ventas con esos filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/50 px-6 py-3">
              <span className="text-sm font-medium text-gray-700">Detalle de ventas · clic en el folio para ver la venta</span>
              <span className="text-xs text-gray-400">{rows.length.toLocaleString()} registros</span>
            </div>
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                  <TableHead className={`${TH} text-left`}>Fecha</TableHead>
                  <TableHead className={`${TH} text-left`}>Folio</TableHead>
                  <TableHead className={`${TH} text-left`}>Sucursal</TableHead>
                  <TableHead className={`${TH} text-left`}>Distribuidor</TableHead>
                  <TableHead className={`${TH} text-left`}>Vendedor</TableHead>
                  <TableHead className={`${TH} text-left`}>Pago</TableHead>
                  <TableHead className={`${TH} text-right`}>Piezas</TableHead>
                  <TableHead className={`${TH} text-right`}>Puntos</TableHead>
                  <TableHead className={`${TH} text-right`}>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow
                    key={row.saleId || `${row.saleNumber}-${idx}`}
                    className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.04] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    onClick={() => row.saleId && setDetailSaleId(row.saleId)}
                  >
                    <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDateTimeLocal(row.date, DEFAULT_TIMEZONE)}</TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-[#3E667D] underline-offset-2 hover:underline">{row.saleNumber}</TableCell>
                    <TableCell className="max-w-[200px] truncate whitespace-nowrap px-4 py-3 text-sm text-gray-600" title={row.branchName}>{row.branchName}</TableCell>
                    <TableCell className="max-w-[260px] truncate whitespace-nowrap px-4 py-3 text-sm text-gray-700" title={`${row.customerId} ${row.customerName}`}>
                      {row.customerId ? <span className="font-mono text-gray-500">{row.customerId} </span> : null}
                      {row.customerName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
                      {row.sellerName || row.sellerUsername}
                      <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${row.capturedVia === 'usuario' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>
                        {row.capturedVia === 'usuario' ? 'CC' : 'Terminal'}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{paymentMethodLabel(row.paymentMethod)}</TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-700">{row.units ?? 0}</TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-700">{num(row.points ?? 0)}</TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium tabular-nums text-gray-900">
                      {formatCurrency(row.total, row.currencyCode === 'USD' ? 'USD' : 'MXN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-transparent">
                <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
                  <TableCell colSpan={6} className="px-4 py-4 text-sm font-bold text-[#3E667D]">TOTAL</TableCell>
                  <TableCell className="px-4 py-4 text-right text-sm font-bold tabular-nums text-[#3E667D]">{num(totals.units)}</TableCell>
                  <TableCell className="px-4 py-4 text-right text-sm font-bold tabular-nums text-[#3E667D]">{num(totals.points)}</TableCell>
                  <TableCell className="px-4 py-4 text-right text-sm font-bold tabular-nums text-[#3E667D]">
                    {formatCurrency(data?.summary.totalSales ?? 0, 'MXN')}
                    {(data?.summary.totalUsd ?? 0) > 0 ? <span className="block text-xs font-semibold">{formatCurrency(data?.summary.totalUsd ?? 0, 'USD')}</span> : null}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>

      <SaleQuickDetail saleId={detailSaleId} onClose={() => setDetailSaleId(null)} />
    </div>
  );
}
