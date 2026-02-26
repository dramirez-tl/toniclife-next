// app/admin/inventario/page.tsx - Inventory Stock Management
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  ChartBarIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useBranchStock } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import type { BranchStockQueryDto, ProductStockDto } from '@/types/inventory';
import { PermissionGuard } from '@/components/auth';

export default function InventarioPage() {
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showOutOfStock, setShowOutOfStock] = useState(false);
  const [sortBy, setSortBy] = useState<BranchStockQueryDto['sortBy']>('productName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  // Fetch branches for the selector
  const { data: branches, isLoading: branchesLoading } = useActiveBranches();

  // Set initial branch when branches load
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].id);
    }
  }, [branches, selectedBranch]);

  const query: BranchStockQueryDto = {
    search: searchQuery || undefined,
    lowStock: showLowStock || undefined,
    outOfStock: showOutOfStock || undefined,
    sortBy,
    sortOrder,
    page,
    limit: 20,
  };

  const { data: stockData, isLoading, error } = useBranchStock(selectedBranch, query);

  const handleExport = () => {
    toast.success('Exportando inventario...');
  };

  const getStockStatusBadge = (item: ProductStockDto) => {
    if (item.quantityAvailable === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <XCircleIcon className="h-3 w-3" />
          Sin Existencias
        </span>
      );
    }
    if (item.isLowStock) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
          <ExclamationTriangleIcon className="h-3 w-3" />
          Existencias Bajas
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <CheckCircleIcon className="h-3 w-3" />
        Normal
      </span>
    );
  };

  // Calculate stats from data
  const stats = {
    totalProducts: stockData?.total || 0,
    normalStock: stockData?.data.filter(p => !p.isLowStock && p.quantityAvailable > 0).length || 0,
    lowStock: stockData?.data.filter(p => p.isLowStock && p.quantityAvailable > 0).length || 0,
    outOfStock: stockData?.data.filter(p => p.quantityAvailable === 0).length || 0,
  };

  return (
    <PermissionGuard permissions={['inventory:read', 'inventory:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CubeIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Inventario</h1>
              </div>
              <p className="text-white/80 text-lg">
                Control de existencias, traspasos y ajustes de inventario
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Link href="/admin/inventario/traspasos">
                <Button
                  variant="outline"
                  leftIcon={<ArrowsRightLeftIcon className="h-5 w-5" />}
                  className="border-white text-white hover:bg-white/10"
                >
                  Traspasos
                </Button>
              </Link>
              <Link href="/admin/inventario/ajustes">
                <Button
                  variant="primary"
                  leftIcon={<ClipboardDocumentCheckIcon className="h-5 w-5" />}
                >
                  Ajustes
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Productos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CubeIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Existencias Normales</p>
                  <p className="text-3xl font-bold text-green-600">{stats.normalStock}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Existencias Bajas</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.lowStock}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sin Existencias</p>
                  <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BuildingStorefrontIcon className="h-8 w-8 text-[#3E667D]" />
                <div>
                  <p className="text-sm text-gray-600">Sucursal Seleccionada</p>
                  {branchesLoading ? (
                    <p className="text-xl font-bold text-gray-400">Cargando sucursales...</p>
                  ) : (
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      className="text-xl font-bold text-[#3E667D] bg-transparent border-none focus:ring-0 cursor-pointer"
                    >
                      {branches?.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} ({branch.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                  onClick={handleExport}
                >
                  Exportar Existencias
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Stock Filters */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLowStock}
                    onChange={(e) => setShowLowStock(e.target.checked)}
                    className="rounded border-gray-300 text-[#3E667D] focus:ring-[#3E667D]"
                  />
                  <span className="text-sm text-gray-600">Existencias Bajas</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOutOfStock}
                    onChange={(e) => setShowOutOfStock(e.target.checked)}
                    className="rounded border-gray-300 text-[#3E667D] focus:ring-[#3E667D]"
                  />
                  <span className="text-sm text-gray-600">Sin Existencias</span>
                </label>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as BranchStockQueryDto['sortBy'])}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                >
                  <option value="productName">Nombre</option>
                  <option value="quantityOnHand">Cantidad Total</option>
                  <option value="quantityAvailable">Disponible</option>
                  <option value="lastMovementAt">Ultimo Movimiento</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stock Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando inventario...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Error al cargar inventario</h3>
                <p className="text-gray-600">Por favor, intenta nuevamente</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Producto
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          SKU
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Total
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Reservado
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Disponible
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Mín. Existencias
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Estado
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Última Actualización
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockData?.data.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                <CubeIcon className="h-5 w-5 text-gray-500" />
                              </div>
                              <span className="font-medium text-gray-900">{item.productName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 font-mono">
                            {item.productCode}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-semibold text-gray-900">
                              {item.quantityOnHand}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-gray-600">{item.quantityReserved}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`font-bold ${
                                item.quantityAvailable === 0
                                  ? 'text-red-600'
                                  : item.isLowStock
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {item.quantityAvailable}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-gray-600">{item.isLowStock ? 'Bajo' : 'OK'}</span>
                          </td>
                          <td className="py-4 px-4">{getStockStatusBadge(item)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {item.lastMovementAt ? inventoryService.formatDateTime(item.lastMovementAt) : '-'}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/inventario/kardex/${item.productId}`}>
                                <button
                                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Ver Kardex"
                                >
                                  <ChartBarIcon className="h-4 w-4 text-blue-600" />
                                </button>
                              </Link>
                              <Link href={`/admin/inventario/lotes/${item.productId}`}>
                                <button
                                  className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Ver Lotes"
                                >
                                  <EyeIcon className="h-4 w-4 text-purple-600" />
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(!stockData?.data || stockData.data.length === 0) && (
                  <div className="text-center py-12">
                    <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No se encontraron productos
                    </h3>
                    <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
                  </div>
                )}

                {/* Pagination */}
                {stockData && stockData.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Página {stockData.page} de {stockData.totalPages} ({stockData.total} productos)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= stockData.totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </PermissionGuard>
  );
}
