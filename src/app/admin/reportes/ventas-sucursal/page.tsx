'use client';

import Link from 'next/link';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSalesByBranch } from '@/hooks/useReports';
import { usePeriods, useCurrentPeriod } from '@/hooks/useMlmPeriods';
import { reportsService } from '@/services/reports.service';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { MlmPeriod } from '@/types/mlm-periods';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

type CurrencyCode = 'MXN' | 'USD' | 'COP' | 'GTQ';

const CURRENCY_CONFIG: { key: CurrencyCode; label: string; flag: string }[] = [
  { key: 'MXN', label: 'Pesos MXN', flag: '🇲🇽' },
  { key: 'USD', label: 'Dólares USD', flag: '🇺🇸' },
  { key: 'COP', label: 'Pesos COP', flag: '🇨🇴' },
  { key: 'GTQ', label: 'Quetzales GTQ', flag: '🇬🇹' },
];

function formatCurrency(value: number, currency: CurrencyCode = 'MXN'): string {
  const localeMap: Record<string, string> = { MXN: 'es-MX', USD: 'en-US', COP: 'es-CO', GTQ: 'es-GT' };
  return new Intl.NumberFormat(localeMap[currency] ?? 'es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

/** Extract YYYY-MM-DD from any date string (ISO or plain) */
function toDateOnly(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/** YYYY-MM-DD de hace `n` días en la hora local del navegador (inputs de fecha). */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Periodo de negocio (26→25) o día/rango de fechas, como el reporte diario del sistema anterior. */
type FilterMode = 'period' | 'dates';

/** Mismo tope que el API para el Excel por rango. */
const MAX_RANGE_DAYS = 366;

function getCurrencyTotal(branch: Record<string, unknown>, key: CurrencyCode): number {
  const map: Record<CurrencyCode, string> = { MXN: 'totalMxn', USD: 'totalUsd', COP: 'totalCop', GTQ: 'totalGtq' };
  return Number(branch[map[key]] ?? 0);
}

/** Moneda de la sucursal para mostrar su parte en línea (MXN si el API no la manda). */
function branchCurrency(code: string | undefined): CurrencyCode {
  return CURRENCY_CONFIG.some((c) => c.key === code) ? (code as CurrencyCode) : 'MXN';
}

export default function VentasSucursalPage() {
  const { data: periods, isLoading: periodsLoading } = usePeriods();
  const { data: currentPeriod } = useCurrentPeriod();

  // Selected period ID
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  // Applied state (what triggers the query)
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');

  // Filtro por día / rango de fechas (día local de cada sucursal). Por
  // defecto hoy, que es lo que Contabilidad baja cada mañana.
  const [mode, setMode] = useState<FilterMode>('period');
  const [dateFrom, setDateFrom] = useState(() => daysAgo(0));
  const [dateTo, setDateTo] = useState(() => daysAgo(0));
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);

  // Auto-select current period once loaded
  useEffect(() => {
    if (currentPeriod && !selectedPeriodId) {
      setSelectedPeriodId(currentPeriod.id);
      setAppliedStart(toDateOnly(currentPeriod.startDate));
      setAppliedEnd(toDateOnly(currentPeriod.endDate));
    }
  }, [currentPeriod, selectedPeriodId]);

  const selectedPeriod = useMemo<MlmPeriod | undefined>(
    () => periods?.find((p) => p.id === selectedPeriodId),
    [periods, selectedPeriodId],
  );

  const { data, isLoading, error, isFetching } = useSalesByBranch({
    startDate: appliedStart,
    endDate: appliedEnd,
  });

  const applyDates = useCallback((from: string, to: string) => {
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
    setAppliedStart(from);
    setAppliedEnd(to);
  }, []);

  const handleApply = useCallback(() => {
    if (mode === 'dates') {
      applyDates(dateFrom, dateTo);
      return;
    }
    if (!selectedPeriod) {
      toast.error('Selecciona un periodo');
      return;
    }
    setAppliedStart(toDateOnly(selectedPeriod.startDate));
    setAppliedEnd(toDateOnly(selectedPeriod.endDate));
  }, [mode, dateFrom, dateTo, applyDates, selectedPeriod]);

  // Excel con la estructura del sistema anterior (lo arma el API con el
  // mismo rango aplicado: un día o varios, día local de cada sucursal).
  const handleDownloadLegacyXlsx = async () => {
    if (!appliedStart || !appliedEnd) {
      toast.error('Aplica un periodo o un rango de fechas');
      return;
    }
    setDownloadingXlsx(true);
    try {
      await reportsService.downloadSalesByBranchLegacyXlsx({
        startDate: appliedStart,
        endDate: appliedEnd,
      });
      toast.success('Excel generado');
    } catch {
      toast.error('No se pudo generar el Excel');
    } finally {
      setDownloadingXlsx(false);
    }
  };

  const totals = useMemo(() => {
    if (!data?.branches) return { totalMxn: 0, totalUsd: 0, totalCop: 0, totalGtq: 0, orderCount: 0, onlineCount: 0 };
    return data.branches.reduce(
      (acc, b) => ({
        totalMxn: acc.totalMxn + (b.totalMxn ?? 0),
        totalUsd: acc.totalUsd + (b.totalUsd ?? 0),
        totalCop: acc.totalCop + (b.totalCop ?? 0),
        totalGtq: acc.totalGtq + (b.totalGtq ?? 0),
        orderCount: acc.orderCount + b.orderCount,
        onlineCount: acc.onlineCount + (b.onlineCount ?? 0),
      }),
      { totalMxn: 0, totalUsd: 0, totalCop: 0, totalGtq: 0, orderCount: 0, onlineCount: 0 }
    );
  }, [data]);

  const totalsByKey: Record<CurrencyCode, number> = {
    MXN: totals.totalMxn,
    USD: totals.totalUsd,
    COP: totals.totalCop,
    GTQ: totals.totalGtq,
  };

  const handleExportCSV = () => {
    if (!data?.branches?.length) {
      toast.error('No hay datos para exportar');
      return;
    }

    const periodLabel = `${formatDateDisplay(appliedStart)} - ${formatDateDisplay(appliedEnd)}`;
    const headers = [
      'Sucursal',
      ...CURRENCY_CONFIG.map((c) => `Total ${c.key}`),
      'Incluye tienda en línea (moneda de la sucursal)',
      'Pedidos en línea',
      'Ventas/Documentos',
      'Período',
    ];
    const rows = data.branches.map((b) => [
      b.branchName,
      ...CURRENCY_CONFIG.map((c) => getCurrencyTotal(b as unknown as Record<string, unknown>, c.key).toFixed(2)),
      (b.onlineTotal ?? 0).toFixed(2),
      (b.onlineCount ?? 0).toString(),
      b.orderCount.toString(),
      periodLabel,
    ]);
    rows.push([
      'TOTAL',
      ...CURRENCY_CONFIG.map((c) => totalsByKey[c.key].toFixed(2)),
      '',
      totals.onlineCount.toString(),
      totals.orderCount.toString(),
      periodLabel,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventas_sucursal_${appliedStart}_${appliedEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte exportado exitosamente');
  };

  const hasData = !!data?.branches?.length;
  const appliedPeriod = periods?.find((p) => p.startDate === appliedStart && p.endDate === appliedEnd);
  const periodLabel = appliedPeriod
    ? `${appliedPeriod.name} (${formatDateDisplay(appliedStart)} - ${formatDateDisplay(appliedEnd)})`
    : appliedStart === appliedEnd
      ? formatDateDisplay(appliedStart)
      : `${formatDateDisplay(appliedStart)} - ${formatDateDisplay(appliedEnd)}`;

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Ventas por Sucursal</h1>
            <p className="text-sm text-white/70 mt-1">
              Ventas del POS + pedidos de la tienda en línea pagados que tiene asignados cada sucursal (como el
              sistema anterior), con desglose por moneda
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadLegacyXlsx}
              disabled={!appliedStart || !appliedEnd || isFetching || downloadingXlsx}
              title="Una fila por sucursal: SUCURSAL | TOTAL NETO | IVA | TOTAL MX | TOTAL DLL | PERIÓDO (estructura del sistema anterior)"
              className="inline-flex items-center gap-2 rounded-lg bg-white text-[#2f5165] px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {downloadingXlsx ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2f5165] border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              )}
              Excel (formato anterior)
            </button>
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
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#3E667D]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filtros de búsqueda</h2>
        </div>
        <div className="mb-4 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs font-medium" role="tablist" aria-label="Tipo de filtro">
          {(
            [
              { key: 'period', label: 'Periodo de negocio' },
              { key: 'dates', label: 'Por día / rango de fechas' },
            ] as { key: FilterMode; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="tab"
              aria-selected={mode === opt.key}
              onClick={() => setMode(opt.key)}
              className={`rounded-md px-3 py-1.5 transition-colors ${
                mode === opt.key
                  ? 'bg-white text-[#3E667D] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          {mode === 'period' ? (
            <>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Periodo</label>
                <SearchableSelect
                  options={(periods ?? []).map((p) => ({
                    value: p.id,
                    label: `${p.name} (${formatDateDisplay(toDateOnly(p.startDate))} - ${formatDateDisplay(toDateOnly(p.endDate))})${p.isCurrent ? ' — Actual' : ''}`,
                  }))}
                  value={selectedPeriodId}
                  onChange={setSelectedPeriodId}
                  showAllOption={false}
                  placeholder={periodsLoading ? 'Cargando...' : 'Selecciona un periodo'}
                  disabled={periodsLoading}
                />
              </div>
              {selectedPeriod && (
                <div className="flex items-center gap-3 text-xs text-gray-500 pb-1">
                  <span>Inicio: <strong className="text-gray-700">{formatDateDisplay(toDateOnly(selectedPeriod.startDate))}</strong></span>
                  <span>Fin: <strong className="text-gray-700">{formatDateDisplay(toDateOnly(selectedPeriod.endDate))}</strong></span>
                  {selectedPeriod.isCurrent && (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Periodo actual
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label htmlFor="ventas-sucursal-de" className="block text-xs font-medium text-gray-500 mb-1.5">De</label>
                <Input
                  id="ventas-sucursal-de"
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div>
                <label htmlFor="ventas-sucursal-hasta" className="block text-xs font-medium text-gray-500 mb-1.5">Hasta</label>
                <Input
                  id="ventas-sucursal-hasta"
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => applyDates(daysAgo(0), daysAgo(0))}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => applyDates(daysAgo(1), daysAgo(1))}
                  className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Ayer
                </button>
                <span className="text-xs text-gray-400">Día local de cada sucursal</span>
              </div>
            </>
          )}
          <button
            onClick={handleApply}
            disabled={isFetching || (mode === 'period' ? !selectedPeriodId : !dateFrom || !dateTo)}
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
                Aplicar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {CURRENCY_CONFIG.map((c) => (
            <div
              key={c.key}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{c.flag}</span>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{c.label}</p>
              </div>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalsByKey[c.key], c.key)}</p>
            </div>
          ))}
          <div className="rounded-xl border border-[#3E667D]/30 bg-[#3E667D] p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🌎</span>
              <p className="text-xs font-medium text-white/70 uppercase tracking-wide">
                Total consolidado (MXN)
              </p>
            </div>
            <p
              className="text-lg font-bold text-white"
              title={
                data.fx
                  ? `Convertido con la tasa congelada del periodo ${data.fx.periodName}`
                  : 'El rango no corresponde a un periodo; sin conversión'
              }
            >
              {data.fx ? formatCurrency(data.fx.totalMxn, 'MXN') : '—'}
            </p>
            <p className="text-xs text-white/70 mt-1">
              {totals.orderCount.toLocaleString()} ventas/documentos
              {data.fx && data.fx.missing.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-200">
                  sin tasa: {data.fx.missing.join(', ')}
                </span>
              )}
            </p>
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
            <button
              onClick={handleApply}
              className="text-xs text-[#3E667D] hover:underline"
            >
              Reintentar
            </button>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No se encontraron ventas en el período seleccionado</p>
            <p className="text-xs text-gray-300">Intenta con un rango de fechas diferente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                  <TableHead className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Sucursal
                  </TableHead>
                  {CURRENCY_CONFIG.map((c) => (
                    <TableHead key={c.key} className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {c.flag} {c.key}
                    </TableHead>
                  ))}
                  <TableHead
                    className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    title="Parte del total que viene de pedidos de la tienda en línea pagados (ya incluida en las columnas de moneda)"
                  >
                    Incluye en línea
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Ventas/Documentos
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Período
                  </TableHead>
                  <TableHead className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Corte
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.branches.map((branch, idx) => (
                  <TableRow
                    key={branch.branchId}
                    className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <TableCell className="px-6 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {branch.branchName}
                    </TableCell>
                    {CURRENCY_CONFIG.map((c) => (
                      <TableCell key={c.key} className="px-6 py-3.5 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">
                        {formatCurrency(getCurrencyTotal(branch as unknown as Record<string, unknown>, c.key), c.key)}
                      </TableCell>
                    ))}
                    <TableCell className="px-6 py-3.5 text-sm text-right text-gray-500 whitespace-nowrap tabular-nums">
                      {branch.onlineCount ? (
                        <>
                          {formatCurrency(branch.onlineTotal ?? 0, branchCurrency(branch.currencyCode))}
                          <span className="ml-1.5 text-xs text-gray-400">
                            ({branch.onlineCount} {branch.onlineCount === 1 ? 'pedido' : 'pedidos'})
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-sm text-right text-gray-600 whitespace-nowrap tabular-nums">
                      {branch.orderCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-6 py-3.5 text-xs text-center text-gray-400 whitespace-nowrap">
                      {periodLabel}
                    </TableCell>
                    {/* Corte de caja de esa sucursal con el mismo rango (Contabilidad, 20-oct-2026). */}
                    <TableCell className="px-6 py-3.5 text-center whitespace-nowrap">
                      <Link
                        href={`/admin/reportes/corte-caja?branchId=${encodeURIComponent(branch.branchId)}&from=${appliedStart}&to=${appliedEnd}`}
                        className="text-xs font-medium text-[#3E667D] underline-offset-2 hover:underline"
                        title="Abrir el corte de caja de esta sucursal con el mismo rango"
                      >
                        Ver corte
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-transparent">
                <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
                  <TableCell className="px-6 py-4 text-sm font-bold text-[#3E667D]">TOTAL</TableCell>
                  {CURRENCY_CONFIG.map((c) => (
                    <TableCell key={c.key} className="px-6 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">
                      {formatCurrency(totalsByKey[c.key], c.key)}
                    </TableCell>
                  ))}
                  <TableCell className="px-6 py-4 text-xs text-right font-semibold text-[#3E667D] tabular-nums whitespace-nowrap">
                    {totals.onlineCount
                      ? `${totals.onlineCount.toLocaleString()} ${totals.onlineCount === 1 ? 'pedido' : 'pedidos'}`
                      : '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">
                    {totals.orderCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-6 py-4" />
                  <TableCell className="px-6 py-4" />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
