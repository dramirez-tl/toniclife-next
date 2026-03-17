'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSalesByProductPeriod } from '@/hooks/useReports';
import { usePeriods } from '@/hooks/useMlmPeriods';
import { toast } from 'sonner';
import type { MlmPeriod } from '@/types/mlm-periods';

type CurrencyFilter = 'ALL' | 'MXN' | 'USD' | 'COP' | 'GTQ';

const CURRENCY_TABS: { key: CurrencyFilter; label: string; flag: string }[] = [
  { key: 'ALL', label: 'Todas', flag: '' },
  { key: 'MXN', label: 'Mexico', flag: 'MX' },
  { key: 'USD', label: 'USA', flag: 'US' },
  { key: 'COP', label: 'Colombia', flag: 'CO' },
  { key: 'GTQ', label: 'Guatemala', flag: 'GT' },
];

function toDateOnly(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function formatDateDisplay(dateStr: string): string {
  const d = toDateOnly(dateStr);
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function PiezasProductoPage() {
  const { data: periods, isLoading: periodsLoading } = usePeriods();

  // Period range selection
  const [fromPeriodId, setFromPeriodId] = useState('');
  const [toPeriodId, setToPeriodId] = useState('');
  const [appliedPeriodIds, setAppliedPeriodIds] = useState<string[]>([]);
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>('ALL');

  // Sort periods by start_date desc for the dropdown
  const sortedPeriods = useMemo(() => {
    if (!periods) return [];
    return [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [periods]);

  // Compute selected period IDs from range
  const computePeriodIdsInRange = useCallback(
    (fromId: string, toId: string): string[] => {
      if (!periods?.length || !fromId || !toId) return [];
      const fromP = periods.find((p) => p.id === fromId);
      const toP = periods.find((p) => p.id === toId);
      if (!fromP || !toP) return [];

      // Ensure from <= to by start date
      const minDate = fromP.startDate < toP.startDate ? fromP.startDate : toP.startDate;
      const maxDate = fromP.startDate > toP.startDate ? fromP.startDate : toP.startDate;

      return periods
        .filter((p) => p.startDate >= minDate && p.startDate <= maxDate)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .map((p) => p.id);
    },
    [periods],
  );

  const handleApply = useCallback(() => {
    if (!fromPeriodId || !toPeriodId) {
      toast.error('Selecciona un rango de periodos');
      return;
    }
    const ids = computePeriodIdsInRange(fromPeriodId, toPeriodId);
    if (!ids.length) {
      toast.error('No se encontraron periodos en el rango seleccionado');
      return;
    }
    setAppliedPeriodIds(ids);
  }, [fromPeriodId, toPeriodId, computePeriodIdsInRange]);

  const { data, isLoading, error, isFetching } = useSalesByProductPeriod({
    periodIds: appliedPeriodIds,
  });

  // Filter rows by currency
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (currencyFilter === 'ALL') return data.rows;
    return data.rows.filter((r) => r.currencyCode === currencyFilter);
  }, [data, currencyFilter]);

  // Count rows with actual sales (any quantity > 0)
  const rowsWithSales = useMemo(
    () => filteredRows.filter((r) => r.periods.some((p) => p.quantity > 0)),
    [filteredRows],
  );

  const hasData = rowsWithSales.length > 0;

  // Period name lookup
  const periodNameById = useMemo(() => {
    const map = new Map<string, MlmPeriod>();
    periods?.forEach((p) => map.set(p.id, p));
    return map;
  }, [periods]);

  // CSV export
  const handleExportCSV = () => {
    if (!hasData || !data) return;

    const headers = [
      'Producto',
      'Nombre',
      'Sucursal',
      'Region',
      ...data.periodColumns.map((pc) => pc.name),
    ];
    const rows = rowsWithSales.map((row) => [
      row.sku,
      row.productName,
      row.branchName,
      row.currencyCode,
      ...row.periods.map((p) => (p.quantity > 0 ? String(p.quantity) : '')),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `piezas_producto_${currencyFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte exportado exitosamente');
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Piezas por Producto</h1>
            <p className="text-sm text-white/70 mt-1">
              Unidades vendidas por producto, sucursal y periodo MLM
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={!hasData}
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#3E667D]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Rango de periodos</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Desde periodo</label>
            <select
              value={fromPeriodId}
              onChange={(e) => setFromPeriodId(e.target.value)}
              disabled={periodsLoading}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#3E667D] focus:ring-2 focus:ring-[#3E667D]/20 focus:bg-white focus:outline-none transition-all"
            >
              <option value="">Selecciona periodo inicio</option>
              {sortedPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatDateDisplay(p.startDate)} - {formatDateDisplay(p.endDate)})
                  {p.isCurrent ? ' — Actual' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Hasta periodo</label>
            <select
              value={toPeriodId}
              onChange={(e) => setToPeriodId(e.target.value)}
              disabled={periodsLoading}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:border-[#3E667D] focus:ring-2 focus:ring-[#3E667D]/20 focus:bg-white focus:outline-none transition-all"
            >
              <option value="">Selecciona periodo fin</option>
              {sortedPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatDateDisplay(p.startDate)} - {formatDateDisplay(p.endDate)})
                  {p.isCurrent ? ' — Actual' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleApply}
            disabled={isFetching || !fromPeriodId || !toPeriodId}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E667D] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2f5165] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all whitespace-nowrap"
          >
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
          </button>
        </div>

        {/* Period count info */}
        {fromPeriodId && toPeriodId && (
          <div className="mt-3 text-xs text-gray-500">
            {computePeriodIdsInRange(fromPeriodId, toPeriodId).length} periodo(s) en el rango seleccionado
          </div>
        )}
      </div>

      {/* Currency filter tabs */}
      {data && (
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {CURRENCY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCurrencyFilter(tab.key)}
              className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-all ${
                currencyFilter === tab.key
                  ? 'bg-white text-[#3E667D] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.flag ? `${tab.flag} ` : ''}{tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Productos</p>
            <p className="text-lg font-bold text-gray-900">
              {new Set(rowsWithSales.map((r) => r.sku)).size}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Sucursales</p>
            <p className="text-lg font-bold text-gray-900">
              {new Set(rowsWithSales.map((r) => r.branchName)).size}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Periodos</p>
            <p className="text-lg font-bold text-gray-900">{data.periodColumns.length}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading || isFetching ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#3E667D]" />
            <span className="text-sm text-gray-400">Generando reporte...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="text-sm text-red-500 font-medium">Error al cargar el reporte</p>
            <button onClick={handleApply} className="text-xs text-[#3E667D] hover:underline">
              Reintentar
            </button>
          </div>
        ) : !appliedPeriodIds.length ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Selecciona un rango de periodos y presiona Consultar</p>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No se encontraron ventas en los periodos seleccionados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="sticky left-0 bg-gray-50 px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap z-10">
                    Producto
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Nombre
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Sucursal
                  </th>
                  {data!.periodColumns.map((pc) => (
                    <th
                      key={pc.id}
                      className="px-4 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {pc.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsWithSales.map((row, idx) => (
                  <tr
                    key={`${row.sku}-${row.branchName}`}
                    className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="sticky left-0 bg-inherit px-4 py-3 text-sm font-mono font-medium text-gray-900 whitespace-nowrap z-10">
                      {row.sku}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[250px] truncate" title={row.productName}>
                      {row.productName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap max-w-[200px] truncate" title={row.branchName}>
                      {row.branchName}
                    </td>
                    {row.periods.map((p) => (
                      <td
                        key={p.periodId}
                        className={`px-4 py-3 text-sm text-center tabular-nums whitespace-nowrap ${
                          p.quantity > 0 ? 'text-gray-900 font-medium' : 'text-gray-300'
                        }`}
                      >
                        {p.quantity > 0 ? p.quantity.toLocaleString() : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
