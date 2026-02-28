// app/admin/inventario/page.tsx - Inventory Stock Management
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
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
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useBranchStock } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import type { BranchStockQueryDto, ProductStockDto } from '@/types/inventory';
import { PermissionGuard } from '@/components/auth';

export default function InventarioPage() {
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch branches for the selector
  const { data: branches, isLoading: branchesLoading } = useActiveBranches();

  // Set initial branch when branches load
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranch) {
      setSelectedBranch(branches[0].id);
    }
  }, [branches, selectedBranch]);

  const query: BranchStockQueryDto = useMemo(() => ({
    search: searchQuery || undefined,
    lowStock: filterStock === 'low' || undefined,
    outOfStock: filterStock === 'out' || undefined,
    page: currentPage,
    limit: pageSize,
  }), [searchQuery, filterStock, currentPage, pageSize]);

  const { data: stockData, isLoading, isFetching, error, refetch } = useBranchStock(selectedBranch, query);

  const stockItems = stockData?.data ?? [];
  const totalItems = stockData?.total ?? 0;
  const backendTotalPages = stockData?.totalPages;

  // Handlers
  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterStock(value as 'all' | 'low' | 'out');
    setCurrentPage(1);
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranch(branchId);
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSearchInput('');
    setFilterStock('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchQuery || filterStock !== 'all');

  useEffect(() => {
    if (backendTotalPages && currentPage > backendTotalPages) {
      setCurrentPage(backendTotalPages);
    }
  }, [backendTotalPages, currentPage]);

  const handleExport = () => {
    toast.success('Exportando inventario...');
  };

  // Stats from current page data
  const stats = useMemo(() => ({
    totalProducts: totalItems,
    normalStock: stockItems.filter(p => !p.isLowStock && p.quantityAvailable > 0).length,
    lowStock: stockItems.filter(p => p.isLowStock && p.quantityAvailable > 0).length,
    outOfStock: stockItems.filter(p => p.quantityAvailable === 0).length,
  }), [totalItems, stockItems]);

  const formatDateTime = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (isLoading && !stockData && branchesLoading) {
    return (
      <PermissionGuard permissions={['inventory:read', 'inventory:*']}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <div className="flex items-center gap-3 mb-2">
                <CubeIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Inventario</h1>
              </div>
              <p className="text-white/80 text-lg">Cargando inventario...</p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                      <div className="h-8 w-16 bg-gray-200 rounded" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  // Table columns
  const columns: DataTableColumn<ProductStockDto>[] = [
    {
      key: 'product',
      header: 'Producto',
      sortable: true,
      sortValue: (item) => item.productName,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[#3E667D]/10 flex items-center justify-center">
            <CubeIcon className="h-5 w-5 text-[#3E667D]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{item.productName}</p>
            <p className="text-sm text-gray-500 font-mono">{item.productCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      sortable: true,
      sortValue: (item) => item.quantityOnHand,
      render: (item) => (
        <span className="font-semibold text-gray-900">{item.quantityOnHand}</span>
      ),
    },
    {
      key: 'reserved',
      header: 'Reservado',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (item) => (
        <span className="text-gray-600">{item.quantityReserved}</span>
      ),
    },
    {
      key: 'available',
      header: 'Disponible',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      sortable: true,
      sortValue: (item) => item.quantityAvailable,
      render: (item) => (
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
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (item) => item.quantityAvailable === 0 ? 0 : item.isLowStock ? 1 : 2,
      render: (item) => {
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
      },
    },
    {
      key: 'lastUpdate',
      header: 'Última Actualización',
      sortable: true,
      sortValue: (item) => item.lastMovementAt || '',
      render: (item) => (
        <span className="text-sm text-gray-600">{formatDateTime(item.lastMovementAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/inventario/kardex/${item.productId}`}>
            <button
              className="rounded-lg p-2 transition-colors hover:bg-blue-50"
              title="Ver Kardex"
            >
              <ChartBarIcon className="h-4 w-4 text-blue-600" />
            </button>
          </Link>
          <Link href={`/admin/inventario/lotes/${item.productId}`}>
            <button
              className="rounded-lg p-2 transition-colors hover:bg-purple-50"
              title="Ver Lotes"
            >
              <EyeIcon className="h-4 w-4 text-purple-600" />
            </button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <PermissionGuard permissions={['inventory:read', 'inventory:*']}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <CubeIcon className="h-9 w-9" />
                  <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Inventario</h1>
                </div>
                <p className="text-base text-white/80 sm:text-lg">
                  Control de existencias, traspasos y ajustes de inventario
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Stats Cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Productos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalProducts.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <CubeIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
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

            <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
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

            <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
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

          {/* Branch Selector */}
          <Card className="mb-6 border-gray-100 shadow-sm">
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
                        onChange={(e) => handleBranchChange(e.target.value)}
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
                    Exportar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters and Search */}
          <Card className="mb-6 border-gray-100 shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-gray-700">Búsqueda y filtros</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-gray-600"
                    onClick={handleRefresh}
                    disabled={isFetching}
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    {isFetching ? 'Actualizando...' : 'Actualizar'}
                  </Button>
                  {hasActiveFilters && (
                    <Button variant="outline" size="sm" onClick={resetFilters}>
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-4">
                {/* Search */}
                <div className="lg:col-span-8">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearch();
                          }
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                      />
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="h-10 px-4 sm:min-w-[96px]"
                      onClick={handleSearch}
                    >
                      Buscar
                    </Button>
                  </div>
                </div>

                {/* Stock Filter */}
                <div className="lg:col-span-4">
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
                    <FunnelIcon className="h-4 w-4 text-gray-400" />
                    <select
                      value={filterStock}
                      onChange={(e) => handleFilterChange(e.target.value)}
                      className="w-full bg-transparent py-2.5 text-sm focus:outline-none"
                    >
                      <option value="all">Todas las Existencias</option>
                      <option value="low">Existencias Bajas</option>
                      <option value="out">Sin Existencias</option>
                    </select>
                  </div>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                    Filtros activos
                  </span>
                  {searchQuery && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                      Búsqueda: {searchQuery}
                    </span>
                  )}
                  {filterStock !== 'all' && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                      Stock: {filterStock === 'low' ? 'Existencias Bajas' : 'Sin Existencias'}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Table */}
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">
                  Inventario {stockData?.branch ? `- ${stockData.branch.name}` : ''}
                </h2>
                <p className="text-sm text-gray-600">
                  Mostrando {stockItems.length} de {totalItems.toLocaleString()}
                </p>
              </div>
              {isFetching && (
                <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                  Actualizando resultados...
                </div>
              )}
              {error ? (
                <div className="text-center py-12">
                  <ExclamationTriangleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Error al cargar inventario</h3>
                  <p className="text-gray-600 mb-4">Por favor, intenta nuevamente</p>
                  <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
                </div>
              ) : (
                <>
                  <DataTable
                    columns={columns}
                    data={stockItems}
                    isLoading={isLoading && !stockData}
                    getRowKey={(item) => item.id}
                    minWidthClassName="min-w-[920px]"
                    emptyState={
                      <div className="py-2 text-center">
                        <CubeIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                        <h3 className="mb-2 text-xl font-bold text-gray-900">
                          No se encontraron productos
                        </h3>
                        <p className="text-gray-600">Intenta ajustar los filtros de búsqueda.</p>
                        {hasActiveFilters && (
                          <div className="mt-4">
                            <Button variant="outline" onClick={resetFilters}>
                              Limpiar filtros
                            </Button>
                          </div>
                        )}
                      </div>
                    }
                  />

                  {/* Pagination */}
                  {stockItems.length > 0 && (
                    <DataTablePagination
                      currentPage={currentPage}
                      pageSize={pageSize}
                      totalItems={totalItems}
                      isLoading={isLoading || isFetching}
                      onPageChange={setCurrentPage}
                      onPageSizeChange={(size) => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      pageSizeOptions={[10, 20, 50, 100]}
                    />
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
