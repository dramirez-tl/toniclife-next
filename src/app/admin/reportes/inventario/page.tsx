'use client';

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useInventoryReport, useLowStockReport, useExpiringProductsReport } from '@/hooks/useReports';
import { useActiveBranches } from '@/hooks/useBranches';
import { useQueryFilters } from '@/hooks/useQueryFilters';

type ViewMode = 'stock' | 'low-stock' | 'expiring';

export default function InventarioReportesPage() {
  return (
    <Suspense>
      <InventarioReportesContent />
    </Suspense>
  );
}

function InventarioReportesContent() {
  const { get, setParams } = useQueryFilters({
    viewMode: 'stock',
    branch: 'all',
  });

  const viewMode = get('viewMode') as ViewMode;
  const selectedBranch = get('branch');

  const [searchTerm, setSearchTerm] = useState('');

  // Query parameters
  const queryParams = {
    branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
    expiringDays: 60, // Products expiring within 60 days
  };

  // API hooks
  const { data: inventoryData, isLoading: loadingInventory } = useInventoryReport(queryParams);
  const { data: lowStockData, isLoading: loadingLowStock } = useLowStockReport(queryParams);
  const { data: expiringData, isLoading: loadingExpiring } = useExpiringProductsReport(queryParams);
  const { data: branchesData } = useActiveBranches();

  const isLoading = loadingInventory || loadingLowStock || loadingExpiring;

  // Summary stats
  const totalProducts = inventoryData?.totalProducts ?? 0;
  const lowStockCount = lowStockData?.count ?? 0;
  const expiringProducts = expiringData?.items ?? [];
  const expiringCount = expiringProducts.filter((item) => item.daysUntilExpiration <= 30).length;
  const criticalExpiring = expiringProducts.filter((item) => item.daysUntilExpiration <= 14).length;

  // Branch list for filter
  const branches = branchesData ?? [];

  // Filtered data based on search term
  const inventoryItems = inventoryData?.items ?? [];
  const lowStockItems = lowStockData?.items ?? [];

  const filteredItems = useMemo(() => {
    const sourceItems = viewMode === 'low-stock' ? lowStockItems : inventoryItems;
    return sourceItems.filter((item) => {
      const matchesSearch =
        searchTerm === '' ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [viewMode, inventoryItems, lowStockItems, searchTerm]);

  const filteredExpiring = useMemo(() => {
    return expiringProducts.filter((item) => {
      const matchesSearch =
        searchTerm === '' ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [expiringProducts, searchTerm]);

  const getStockStatusColor = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    if (current <= min) return 'bg-red-500';
    if (percentage <= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getExpirationColor = (days: number) => {
    if (days <= 14) return 'text-red-600 bg-red-50';
    if (days <= 30) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/reportes" className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes de Inventario</h1>
            <p className="mt-1 text-sm text-gray-500">
              Existencias actuales, productos con bajo inventario y próximos a vencer
            </p>
          </div>
        </div>
        <button className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500">
          <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
          Exportar Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-blue-100 p-3">
                <CubeIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Productos</p>
                <p className="text-2xl font-semibold text-gray-900">{totalProducts}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-yellow-100 p-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Existencias Bajas</p>
                <p className="text-2xl font-semibold text-yellow-600">{lowStockCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-orange-100 p-3">
                <ClockIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Por Vencer (30 días)</p>
                <p className="text-2xl font-semibold text-orange-600">{expiringCount}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-lg bg-red-100 p-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Crítico (14 días)</p>
                <p className="text-2xl font-semibold text-red-600">{criticalExpiring}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border-gray-300 pl-10 text-sm focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <SearchableSelect
                options={branches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={selectedBranch}
                onChange={(val) => setParams({ branch: val })}
                allLabel="Todas las sucursales"
                allValue="all"
              />
            </div>

            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setParams({ viewMode: 'stock' })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'stock'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CubeIcon className="mr-1 inline h-4 w-4" />
                Existencias Actuales
              </button>
              <button
                onClick={() => setParams({ viewMode: 'low-stock' })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'low-stock'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ExclamationTriangleIcon className="mr-1 inline h-4 w-4" />
                Existencias Bajas
              </button>
              <button
                onClick={() => setParams({ viewMode: 'expiring' })}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  viewMode === 'expiring'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ClockIcon className="mr-1 inline h-4 w-4" />
                Por Vencer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Cargando datos...</p>
            </div>
          </div>
        ) : (viewMode === 'stock' || viewMode === 'low-stock') ? (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {viewMode === 'stock' ? 'Inventario Actual' : 'Productos con Existencias Bajas'}
              </h3>
            </div>
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center">
                <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  {viewMode === 'low-stock'
                    ? 'No hay productos con bajo stock'
                    : 'No se encontraron productos'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Sucursal
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Existencias Actuales
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Mín / Máx
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredItems.map((item) => (
                      <tr key={item.productId} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {item.productName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {item.code}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {item.branchName || '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <span className="text-sm font-medium text-gray-900">{item.currentStock}</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getStockStatusColor(item.currentStock, item.minStock, item.maxStock)}`}
                                style={{ width: `${Math.min((item.currentStock / item.maxStock) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                          {item.minStock} / {item.maxStock}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          {item.isLowStock ? (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              <ExclamationTriangleIcon className="mr-1 h-3 w-3" />
                              Existencias Bajas
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              <CheckCircleIcon className="mr-1 h-3 w-3" />
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}

        {viewMode === 'expiring' && !isLoading && (
          <>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Productos Próximos a Vencer</h3>
            </div>
            {filteredExpiring.length === 0 ? (
              <div className="py-12 text-center">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No hay productos próximos a vencer</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Producto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Lote
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Sucursal
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Cantidad
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Vencimiento
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        Días Restantes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredExpiring
                      .sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration)
                      .map((item) => (
                        <tr key={item.lotId} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                              <p className="text-xs text-gray-500">{item.code}</p>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {item.lotNumber}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {item.branchName || '-'}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-gray-500">
                            {new Date(item.expirationDate).toLocaleDateString('es-MX')}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getExpirationColor(item.daysUntilExpiration)}`}
                            >
                              {item.daysUntilExpiration} días
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
