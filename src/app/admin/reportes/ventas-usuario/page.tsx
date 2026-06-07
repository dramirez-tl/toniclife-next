'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSalesByUser } from '@/hooks/useReports';
import { usePeriods, useCurrentPeriod } from '@/hooks/useMlmPeriods';
import { useUsers } from '@/hooks/useUsers';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { User } from '@/types/user';

function toDateOnly(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function formatDateDisplay(dateStr: string): string {
  const d = toDateOnly(dateStr);
  const [y, m, day] = d.split('-');
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

function formatSaleDate(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function VentasUsuarioPage() {
  // Periods for date range
  const { data: periods, isLoading: periodsLoading } = usePeriods();
  const { data: currentPeriod } = useCurrentPeriod();

  // Users for seller filter (call_center + sucursales roles)
  const { data: callCenterUsers } = useUsers({ role: 'call_center', limit: 200 });
  const { data: sucursalesUsers } = useUsers({ role: 'sucursales', limit: 200 });

  const sellerOptions = useMemo<User[]>(() => {
    const users: User[] = [];
    if (callCenterUsers?.data) users.push(...callCenterUsers.data);
    if (sucursalesUsers?.data) users.push(...sucursalesUsers.data);
    return users.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [callCenterUsers, sucursalesUsers]);

  // Period selector
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

  // Seller filter (multi-select)
  const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([]);

  // Applied query state
  const [appliedStart, setAppliedStart] = useState('');
  const [appliedEnd, setAppliedEnd] = useState('');
  const [appliedSellerIds, setAppliedSellerIds] = useState<string[]>([]);

  const sortedPeriods = useMemo(() => {
    if (!periods) return [];
    return [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [periods]);

  // Auto-select current period
  useEffect(() => {
    if (currentPeriod && !selectedPeriodId) {
      setSelectedPeriodId(currentPeriod.id);
    }
  }, [currentPeriod, selectedPeriodId]);

  const selectedPeriod = useMemo(
    () => periods?.find((p) => p.id === selectedPeriodId),
    [periods, selectedPeriodId],
  );

  const { data, isLoading, error, isFetching } = useSalesByUser({
    startDate: appliedStart,
    endDate: appliedEnd,
    sellerIds: appliedSellerIds.length > 0 ? appliedSellerIds : undefined,
  });

  const handleApply = useCallback(() => {
    if (!selectedPeriod) {
      toast.error('Selecciona un periodo');
      return;
    }
    setAppliedStart(toDateOnly(selectedPeriod.startDate));
    setAppliedEnd(toDateOnly(selectedPeriod.endDate));
    setAppliedSellerIds([...selectedSellerIds]);
  }, [selectedPeriod, selectedSellerIds]);

  const toggleSeller = (id: string) => {
    setSelectedSellerIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const clearSellers = () => setSelectedSellerIds([]);
  const selectAllSellers = () => setSelectedSellerIds(sellerOptions.map((u) => u.id));

  const hasData = !!data?.rows?.length;

  // CSV Export
  const handleExportCSV = () => {
    if (!hasData || !data) return;

    const headers = ['Fecha', 'No. Documento', 'Sucursal', 'ID Cliente', 'Cliente', 'Usuario', 'Venta Total', 'Venta USD'];
    const csvRows = data.rows.map((row) => [
      formatSaleDate(row.date),
      row.saleNumber,
      row.branchName,
      row.customerId,
      row.customerName,
      row.sellerUsername,
      row.total.toFixed(2),
      row.totalUsd.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvRows.map((r) => r.map((c) => `"${c}"`).join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventas_usuario_${appliedStart}_${appliedEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte exportado exitosamente');
  };

  // Seller dropdown open state
  const [sellerDropdownOpen, setSellerDropdownOpen] = useState(false);

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
              Detalle de ventas por vendedor (Call Center / Sucursales)
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

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#3E667D]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filtros de busqueda</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          {/* Period selector */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Periodo</label>
            <SearchableSelect
              options={sortedPeriods.map((p) => ({
                value: p.id,
                label: `${p.name} (${formatDateDisplay(p.startDate)} - ${formatDateDisplay(p.endDate)})${p.isCurrent ? ' — Actual' : ''}`,
              }))}
              value={selectedPeriodId}
              onChange={(v) => setSelectedPeriodId(v)}
              disabled={periodsLoading}
              showAllOption={false}
              allLabel="Selecciona un periodo"
              placeholder="Buscar periodo..."
              className="w-full"
            />
          </div>

          {/* Seller multi-select */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Usuarios vendedores
              {selectedSellerIds.length > 0 && (
                <span className="ml-1 text-[#3E667D]">({selectedSellerIds.length})</span>
              )}
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSellerDropdownOpen(!sellerDropdownOpen)}
              className="w-full h-auto justify-between px-3 py-2.5 bg-gray-50 text-gray-900 text-left font-normal"
            >
              {selectedSellerIds.length === 0
                ? 'Todos los usuarios'
                : selectedSellerIds.length === 1
                  ? sellerOptions.find((u) => u.id === selectedSellerIds[0])?.firstName || '1 seleccionado'
                  : `${selectedSellerIds.length} seleccionados`}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 float-right mt-0.5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </Button>
            {sellerDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 px-3 py-2 flex gap-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={selectAllSellers}
                    className="h-auto p-0 text-xs text-[#3E667D]"
                  >
                    Seleccionar todos
                  </Button>
                  <span className="text-gray-300">|</span>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={clearSellers}
                    className="h-auto p-0 text-xs text-gray-500"
                  >
                    Limpiar
                  </Button>
                </div>
                {sellerOptions.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-gray-400 text-center">No se encontraron usuarios</div>
                ) : (
                  sellerOptions.map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSellerIds.includes(u.id)}
                        onChange={() => toggleSeller(u.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#3E667D] focus:ring-[#3E667D]"
                      />
                      <span className="text-gray-900">{u.firstName} {u.lastName}</span>
                      <span className="ml-auto text-xs text-gray-400">{u.role.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Apply button */}
          <Button
            onClick={() => { handleApply(); setSellerDropdownOpen(false); }}
            disabled={isFetching || !selectedPeriodId}
            className="active:scale-[0.98] whitespace-nowrap"
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
          </Button>
        </div>

        {/* Active filters chips */}
        {appliedSellerIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-xs text-gray-500">Filtros:</span>
            {appliedSellerIds.map((sid) => {
              const u = sellerOptions.find((s) => s.id === sid);
              return (
                <span key={sid} className="inline-flex items-center rounded-full bg-[#3E667D]/10 px-2.5 py-0.5 text-xs font-medium text-[#3E667D]">
                  {u ? `${u.firstName} ${u.lastName}` : sid}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Total Ventas MXN</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(data.summary.totalSales, 'MXN')}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Total Ventas USD</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(data.summary.totalUsd, 'USD')}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Documentos</p>
            <p className="text-lg font-bold text-gray-900">{data.summary.totalDocuments.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Ticket Promedio</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(data.summary.averageTicket, 'MXN')}</p>
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
            <Button variant="link" size="sm" onClick={handleApply} className="text-xs text-[#3E667D]">Reintentar</Button>
          </div>
        ) : !appliedStart ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Selecciona un periodo y presiona Consultar</p>
          </div>
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">No se encontraron ventas en el periodo seleccionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Detalle de ventas</span>
              <span className="text-xs text-gray-400">{data.rows.length.toLocaleString()} registros</span>
            </div>
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">No. Documento</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Sucursal</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">ID Cliente</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Cliente</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Usuario</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Venta Total</th>
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Venta USD</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, idx) => (
                  <tr
                    key={`${row.saleNumber}-${idx}`}
                    className={`border-b border-gray-100 transition-colors hover:bg-[#3E667D]/[0.03] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatSaleDate(row.date)}</td>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900 whitespace-nowrap">{row.saleNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap max-w-[200px] truncate" title={row.branchName}>{row.branchName}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500 whitespace-nowrap">{row.customerId}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-[220px] truncate" title={row.customerName}>{row.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.sellerUsername}</td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums whitespace-nowrap font-medium text-gray-900">
                      {row.total > 0 ? formatCurrency(row.total, row.currencyCode === 'USD' ? 'USD' : 'MXN') : formatCurrency(0, 'MXN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right tabular-nums whitespace-nowrap text-gray-600">
                      {row.totalUsd > 0 ? formatCurrency(row.totalUsd, 'USD') : formatCurrency(0, 'USD')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#3E667D]/20 bg-[#3E667D]/[0.04]">
                  <td colSpan={6} className="px-4 py-4 text-sm font-bold text-[#3E667D]">TOTAL</td>
                  <td className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">
                    {formatCurrency(data.summary.totalSales, 'MXN')}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-bold text-[#3E667D] tabular-nums">
                    {formatCurrency(data.summary.totalUsd, 'USD')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
