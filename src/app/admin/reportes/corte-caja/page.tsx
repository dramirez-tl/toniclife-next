'use client';

// Corte de caja por sucursal con la hoja del sistema anterior (REPORTE DE CAJA
// POR SUCURSAL): ventas POS completadas de un día o rango (día local de la
// sucursal), una fila por venta con su forma de pago (los pagos mixtos se
// abren por parte) y totales por forma de pago. El Excel lo arma el API.

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCashCutByBranch } from '@/hooks/useReports';
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

/** Mismo tope que el API para el rango. */
const MAX_RANGE_DAYS = 366;

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD de hace `n` días en la hora local del navegador. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/** Fecha y hora de la venta en la zona del navegador. */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface AppliedFilter {
  branchId: string;
  startDate: string;
  endDate: string;
}

export default function CorteCajaPage() {
  const { data: branches, isLoading: branchesLoading } = useActiveBranches();
  const [branchId, setBranchId] = useState('');
  // Por defecto hoy: el corte se baja al cerrar el día.
  const [dateFrom, setDateFrom] = useState(() => daysAgo(0));
  const [dateTo, setDateTo] = useState(() => daysAgo(0));
  const [applied, setApplied] = useState<AppliedFilter>({ branchId: '', startDate: '', endDate: '' });
  const [downloading, setDownloading] = useState(false);

  const branchOptions = useMemo(
    () =>
      (branches ?? []).map((b) => ({
        value: b.id,
        label: `${b.code} - ${b.name}${b.currencyCode ? ` (${b.currencyCode})` : ''}`,
      })),
    [branches],
  );

  const { data, isLoading, isFetching, error, refetch } = useCashCutByBranch(applied);

  const applyFilter = useCallback(
    (nextBranchId: string, from: string, to: string) => {
      if (!nextBranchId) {
        toast.error('Selecciona una sucursal');
        return;
      }
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
      setApplied({ branchId: nextBranchId, startDate: from, endDate: to });
    },
    [],
  );

  const handleDownload = async () => {
    if (!applied.branchId || !applied.startDate || !applied.endDate) {
      toast.error('Aplica una sucursal y un rango de fechas');
      return;
    }
    setDownloading(true);
    try {
      await reportsService.downloadCashCutLegacyXlsx(applied);
      toast.success('Excel generado');
    } catch {
      toast.error('No se pudo generar el Excel');
    } finally {
      setDownloading(false);
    }
  };

  const rows = data?.rows ?? [];
  const hasData = rows.length > 0;
  const currency = data?.currencyCode ?? 'MXN';
  const rangeLabel = applied.startDate
    ? applied.startDate === applied.endDate
      ? formatDateDisplay(applied.startDate)
      : `${formatDateDisplay(applied.startDate)} - ${formatDateDisplay(applied.endDate)}`
    : '';

  return (
    <PermissionGuard permissions={['reports:read', 'reports:*']}>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 pb-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#3E667D] to-[#2f5165] px-6 py-6 shadow-lg">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Corte de Caja por Sucursal</h1>
              <p className="text-sm text-white/70 mt-1">
                Ventas del POS de una sucursal en un día o rango, con forma de pago y totales por forma de pago
                (como el sistema anterior)
              </p>
            </div>
            <button
              onClick={handleDownload}
              disabled={!applied.branchId || isFetching || downloading}
              title="REPORTE DE CAJA POR SUCURSAL: TRANSACCIÓN | CONSULTOR | TOTAL | MONEDA | FORMA DE PAGO + totales por forma de pago"
              className="inline-flex items-center gap-2 rounded-lg bg-white text-[#2f5165] px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            >
              {downloading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2f5165] border-t-transparent" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              )}
              Excel (formato anterior)
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#3E667D]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filtros</h2>
          </div>
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 min-w-0 w-full lg:w-auto">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Sucursal</label>
              <SearchableSelect
                options={branchOptions}
                value={branchId}
                onChange={setBranchId}
                showAllOption={false}
                placeholder={branchesLoading ? 'Cargando...' : 'Selecciona una sucursal'}
                disabled={branchesLoading}
              />
            </div>
            <div>
              <label htmlFor="corte-de" className="block text-xs font-medium text-gray-500 mb-1.5">De</label>
              <Input
                id="corte-de"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-auto"
              />
            </div>
            <div>
              <label htmlFor="corte-hasta" className="block text-xs font-medium text-gray-500 mb-1.5">Hasta</label>
              <Input
                id="corte-hasta"
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
                onClick={() => applyFilter(branchId, daysAgo(0), daysAgo(0))}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => applyFilter(branchId, daysAgo(1), daysAgo(1))}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Ayer
              </button>
              <span className="text-xs text-gray-400">Día local de la sucursal</span>
            </div>
            <button
              onClick={() => applyFilter(branchId, dateFrom, dateTo)}
              disabled={isFetching || !branchId || !dateFrom || !dateTo}
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
        </div>

        {/* Resumen */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#3E667D]/30 bg-[#3E667D] p-4 shadow-sm">
              <p className="text-xs font-medium text-white/70 uppercase tracking-wide mb-2">Total del corte</p>
              <p className="text-2xl font-bold text-white">{formatMoney(data.total, currency)}</p>
              <p className="text-xs text-white/70 mt-1">
                {data.branchName} · {rangeLabel} · {data.salesCount.toLocaleString()}{' '}
                {data.salesCount === 1 ? 'venta' : 'ventas'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Totales por forma de pago</p>
              {data.summary.length === 0 ? (
                <p className="text-sm text-gray-400">Sin movimientos</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.summary.map((s) => (
                    <div key={s.paymentLabel} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                      <p className="text-xs text-gray-500">{s.paymentLabel}</p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatMoney(s.total, currency)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabla */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {!applied.branchId ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm text-gray-400">Selecciona una sucursal y aplica un día o rango de fechas</p>
            </div>
          ) : isLoading || isFetching ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#3E667D]" />
              <span className="text-sm text-gray-400">Generando corte...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm text-red-500 font-medium">Error al cargar el corte</p>
              <button onClick={() => refetch()} className="text-xs text-[#3E667D] hover:underline">
                Reintentar
              </button>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <p className="text-sm text-gray-400">No hay ventas POS completadas en el rango seleccionado</p>
              <p className="text-xs text-gray-300">Intenta con otra fecha o sucursal</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
                    <TableHead className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Transacción</TableHead>
                    <TableHead className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Consultor</TableHead>
                    <TableHead className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</TableHead>
                    <TableHead className="px-6 py-3.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Moneda</TableHead>
                    <TableHead className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Forma de pago</TableHead>
                    <TableHead className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha y hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => (
                    <TableRow
                      key={`${r.documentId}-${r.paymentMethod}-${idx}`}
                      className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <TableCell className="px-6 py-3.5 text-sm font-medium text-gray-900 whitespace-nowrap">{r.documentId}</TableCell>
                      <TableCell className="px-6 py-3.5 text-sm text-gray-700">{r.customerName}</TableCell>
                      <TableCell className="px-6 py-3.5 text-sm text-right text-gray-900 whitespace-nowrap tabular-nums">{formatMoney(r.total, r.currencyCode)}</TableCell>
                      <TableCell className="px-6 py-3.5 text-sm text-center text-gray-500 whitespace-nowrap">{r.currencyCode}</TableCell>
                      <TableCell className="px-6 py-3.5 text-sm text-gray-700 whitespace-nowrap">{r.paymentLabel}</TableCell>
                      <TableCell className="px-6 py-3.5 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(r.saleDateTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter className="bg-transparent">
                  <TableRow className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04] hover:bg-[#3E667D]/[0.04]">
                    <TableCell colSpan={2} className="px-6 py-4 text-sm font-bold text-[#3E667D]">
                      TOTAL ({data?.salesCount ?? rows.length} {(data?.salesCount ?? rows.length) === 1 ? 'venta' : 'ventas'})
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">{formatMoney(data?.total ?? 0, currency)}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-center font-semibold text-[#3E667D]">{currency}</TableCell>
                    <TableCell colSpan={2} className="px-6 py-4" />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
