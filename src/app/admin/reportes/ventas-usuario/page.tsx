'use client';

// Reportes › Ventas por Usuario — ventas del POS por vendedor y por distribuidor,
// con detalle de cada venta. La usan Reportes (reports:read) y Call Center
// (reports:sales_lookup, mig 163) para consultar las compras de un cliente.
//
// - Distribuidor: buscador de 2 modos como el del POS (abierto o número EXACTO);
//   elegir uno consulta al instante. Sin filtro por vendedor (se quitó el 20-oct;
//   el vendedor sigue visible en cada renglón).
// - Detalle: clic en el renglón despliega la venta en acordeón (productos,
//   precios, pagos, puntos) sin salir de la página.
// - El selector de periodo usa GET mlm/periods, que acepta reports:sales_lookup.

import { Fragment, useState, useMemo, useCallback } from 'react';
import { useSalesByUser } from '@/hooks/useReports';
import { usePeriods, useCurrentPeriod } from '@/hooks/useMlmPeriods';
import { toast } from 'sonner';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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
import { DistributorPicker, type PickedDistributor } from './DistributorPicker';
import { SaleDetailInline } from './SaleDetailInline';

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
  // Distribuidor: elegido del buscador (número exacto) o texto libre tecleado.
  const [picked, setPicked] = useState<PickedDistributor | null>(null);
  const [customerText, setCustomerText] = useState('');
  const customerInput = picked ? picked.customerNumber : customerText;

  // Consulta aplicada (cambia al presionar Consultar o al elegir un distribuidor).
  const [applied, setApplied] = useState<{ start: string; end: string; customer: string } | null>(null);

  const { data, isLoading, error, isFetching } = useSalesByUser({
    startDate: applied?.start ?? '',
    endDate: applied?.end ?? '',
    customer: applied?.customer || undefined,
  });

  const applyFilters = useCallback(
    (customer: string) => {
      if (!selectedPeriod) {
        toast.error('Selecciona un periodo');
        return;
      }
      setApplied({
        start: toDateOnly(selectedPeriod.startDate),
        end: toDateOnly(selectedPeriod.endDate),
        customer: customer.trim(),
      });
    },
    [selectedPeriod],
  );
  const handleApply = useCallback(() => applyFilters(customerInput), [applyFilters, customerInput]);

  // Elegir un distribuidor en el buscador consulta al instante (como en el POS);
  // quitarlo vuelve a consultar sin filtro si ya había una consulta aplicada.
  const handlePick = (p: PickedDistributor | null) => {
    setPicked(p);
    if (p) applyFilters(p.customerNumber);
    else if (applied?.customer) applyFilters('');
  };

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

  // Acordeón: ventas desplegadas en línea (varias a la vez).
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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
              Ventas del POS con el detalle de cada venta; busca por distribuidor
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
        <div className="grid grid-cols-1 gap-4 items-end lg:grid-cols-12">
          <div className="lg:col-span-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Periodo</label>
            <SearchableSelect
              options={sortedPeriods.map((p) => ({
                value: p.id,
                label: `${p.name} (${formatDateDisplay(p.startDate)} - ${formatDateDisplay(p.endDate)})${p.isCurrent ? ' — Actual' : ''}`,
              }))}
              value={selectedPeriodId}
              onChange={setChosenPeriodId}
              disabled={periodsLoading}
              showAllOption={false}
              allLabel="Selecciona un periodo"
              placeholder="Buscar periodo..."
              className="w-full"
            />
          </div>

          <div className="lg:col-span-6">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Distribuidor</label>
            <DistributorPicker
              value={picked}
              onChange={handlePick}
              onFreeTextChange={setCustomerText}
              onSubmit={handleApply}
            />
          </div>

          <Button onClick={handleApply} disabled={isFetching || !selectedPeriodId} className="whitespace-nowrap active:scale-[0.98] lg:col-span-2">
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

        {applied?.customer && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-gray-500">Filtros:</span>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Distribuidor: {picked && picked.customerNumber === applied.customer ? `#${picked.customerNumber} ${picked.name}` : applied.customer}
            </span>
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
            <p className="text-sm text-gray-400">Elige el periodo y, si quieres, un distribuidor; luego presiona Consultar</p>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <p className="text-sm text-gray-400">No se encontraron ventas con esos filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/50 px-6 py-3">
              <span className="text-sm font-medium text-gray-700">Detalle de ventas · clic en un renglón para desplegar lo que compró</span>
              <span className="text-xs text-gray-400">{rows.length.toLocaleString()} registros</span>
            </div>
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                  <TableHead className={`${TH} w-8 text-left`} aria-label="Desplegar" />
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
                {rows.map((row, idx) => {
                  const rowKey = row.saleId || `${row.saleNumber}-${idx}`;
                  const isOpen = !!row.saleId && expanded.has(row.saleId);
                  return (
                  <Fragment key={rowKey}>
                  <TableRow
                    className={`cursor-pointer border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.04] ${isOpen ? 'bg-[#3E667D]/[0.06]' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    onClick={() => row.saleId && toggleExpanded(row.saleId)}
                    aria-expanded={isOpen}
                  >
                    <TableCell className="px-2 py-3 text-gray-400">
                      {isOpen ? <ChevronDownIcon className="h-4 w-4 text-[#3E667D]" /> : <ChevronRightIcon className="h-4 w-4" />}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">{formatDateTimeLocal(row.date, DEFAULT_TIMEZONE)}</TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 font-mono text-sm font-medium text-[#3E667D]">{row.saleNumber}</TableCell>
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
                  {isOpen && (
                    <TableRow className="bg-[#3E667D]/[0.03] hover:bg-[#3E667D]/[0.03]">
                      <TableCell colSpan={10} className="px-4 py-3 sm:px-8">
                        <SaleDetailInline saleId={row.saleId} />
                      </TableCell>
                    </TableRow>
                  )}
                  </Fragment>
                  );
                })}
              </TableBody>
              <TableFooter className="bg-transparent">
                <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
                  <TableCell colSpan={7} className="px-4 py-4 text-sm font-bold text-[#3E667D]">TOTAL</TableCell>
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

    </div>
  );
}
