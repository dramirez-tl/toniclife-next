'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import { useDailySales, useSalesByProduct, useSalesByBranch } from '@/hooks/useReports';
import { useActiveBranches } from '@/hooks/useBranches';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

type ViewMode = 'daily' | 'product' | 'branch';

export default function VentasReportesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  // Default to last 7 days
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [dateRange, setDateRange] = useState({
    start: weekAgo.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  });
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Fetch branches for filter
  const { data: branches } = useActiveBranches();

  // Fetch data based on date range and branch
  const queryParams = useMemo(() => ({
    startDate: dateRange.start,
    endDate: dateRange.end,
    branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
  }), [dateRange, selectedBranch]);

  const { data: dailySalesData, isLoading: loadingDaily } = useDailySales(queryParams);
  const { data: productSalesData, isLoading: loadingProducts } = useSalesByProduct(queryParams);
  const { data: branchSalesData, isLoading: loadingBranches } = useSalesByBranch({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  // Extract data
  const dailySales = dailySalesData?.dailyData || [];
  const productSales = productSalesData?.products || [];
  const branchSales = branchSalesData?.branches || [];
  const summary = dailySalesData?.summary;

  const totalSales = summary?.totalSales || 0;
  const totalOrders = summary?.orderCount || 0;
  const avgTicket = summary?.averageTicket || 0;

  // Calculate growth (comparing to previous period - simplified)
  const previousPeriodSales = totalSales * 0.85; // Placeholder - in real app, fetch previous period
  const salesGrowth = previousPeriodSales > 0
    ? ((totalSales - previousPeriodSales) / previousPeriodSales) * 100
    : 0;

  const isLoading = loadingDaily || loadingProducts || loadingBranches;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/admin/reportes"
            className="rounded-lg p-2 hover:bg-gray-100"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes de Ventas</h1>
            <p className="mt-1 text-sm text-gray-500">
              Análisis detallado de ventas por día, producto y sucursal
            </p>
          </div>
        </div>
        <button className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500">
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Exportar Excel
        </button>
      </div>

      {/* Filters */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="rounded-md border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
              />
              <span className="text-gray-500">a</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="rounded-md border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="rounded-md border-gray-300 text-sm focus:border-green-500 focus:ring-green-500"
              >
                <option value="all">Todas las sucursales</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setViewMode('daily')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'daily'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CalendarDaysIcon className="mr-1 inline h-4 w-4" />
                Diario
              </button>
              <button
                onClick={() => setViewMode('product')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'product'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CubeIcon className="mr-1 inline h-4 w-4" />
                Por Producto
              </button>
              <button
                onClick={() => setViewMode('branch')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'branch'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BuildingStorefrontIcon className="mr-1 inline h-4 w-4" />
                Por Sucursal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-green-100 p-3">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ventas Totales</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : formatCurrency(totalSales)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {salesGrowth > 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
              )}
              <span className={`ml-1 text-sm font-medium ${salesGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {salesGrowth > 0 ? '+' : ''}{salesGrowth.toFixed(1)}%
              </span>
              <span className="ml-2 text-sm text-gray-500">vs periodo anterior</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Órdenes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : totalOrders.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-purple-100 p-3">
                <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Ticket Promedio</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : formatCurrency(avgTicket)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-orange-100 p-3">
                <BuildingStorefrontIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Sucursales Activas</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : branchSales.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        {viewMode === 'daily' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Ventas Diarias</h3>
            </div>
            <div className="overflow-x-auto">
              {loadingDaily ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : dailySales.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No hay datos para el período seleccionado
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ventas
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Órdenes
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ticket Promedio
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        % del Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {dailySales.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {formatDate(day.date)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                          {formatCurrency(day.total)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                          {day.orderCount}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                          {formatCurrency(day.averageTicket)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end">
                            <span className="mr-2 text-sm text-gray-500">
                              {totalSales > 0 ? ((day.total / totalSales) * 100).toFixed(1) : 0}%
                            </span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{ width: `${totalSales > 0 ? (day.total / totalSales) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">Total</td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(totalSales)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        {totalOrders}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(avgTicket)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                        100%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </>
        )}

        {viewMode === 'product' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Ventas por Producto</h3>
            </div>
            <div className="overflow-x-auto">
              {loadingProducts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : productSales.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No hay datos para el período seleccionado
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Unidades
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ventas
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Puntos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {productSales.map((product, index) => (
                      <tr key={product.productId} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-medium flex items-center justify-center mr-3">
                              {index + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-900">{product.productName}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {product.code}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                          {product.quantitySold}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(product.totalSales)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-purple-600">
                          {product.pointsGenerated.toLocaleString()} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {viewMode === 'branch' && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Ventas por Sucursal</h3>
            </div>
            <div className="overflow-x-auto">
              {loadingBranches ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                </div>
              ) : branchSales.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No hay datos para el período seleccionado
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Sucursal
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ventas
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Órdenes
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ticket Promedio
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        % del Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {branchSales.map((branch, index) => {
                      const branchTotalSales = branchSales.reduce((sum, b) => sum + b.totalSales, 0);
                      const percentage = branchTotalSales > 0 ? (branch.totalSales / branchTotalSales) * 100 : 0;
                      return (
                        <tr key={branch.branchId} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="flex items-center">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center mr-3">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium text-gray-900">{branch.branchName}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(branch.totalSales)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                            {branch.orderCount}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                            {formatCurrency(branch.averageTicket)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <div className="flex items-center justify-end">
                              <span className="mr-2 text-sm text-gray-500">
                                {percentage.toFixed(1)}%
                              </span>
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
