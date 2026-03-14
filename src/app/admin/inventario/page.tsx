// app/admin/inventario/page.tsx - Inventory Stock Management
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { inventoryService } from '@/services/inventory.service';
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
  ChartBarIcon,
  BuildingStorefrontIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useBranchStock } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { BranchStockQueryDto, ProductStockDto } from '@/types/inventory';
import { PermissionGuard } from '@/components/auth';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { DEFAULT_TIMEZONE } from '@/lib/timezone-utils';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

export default function InventarioPage() {
  return <Suspense><InventarioContent /></Suspense>;
}

function InventarioContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    stock: 'all',
    page: '1',
    limit: '20',
  });

  const selectedBranch = get('branch');
  const searchQuery = get('search');
  const skuQuery = get('sku');
  const filterStock = get('stock') as 'all' | 'low' | 'out';
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [skuInput, setSkuInput] = useState(skuQuery || '');

  // Fetch branches for the selector
  const { data: branches, isLoading: branchesLoading } = useActiveBranches();
  const branchTimezone = branches?.find((b) => b.id === selectedBranch)?.timezone || DEFAULT_TIMEZONE;

  // Set initial branch when branches load
  useEffect(() => {
    if (branches && branches.length > 0 && !selectedBranch) {
      setParams({ branch: branches[0].id, page: '1' });
    }
  }, [branches, selectedBranch, setParams]);

  const query: BranchStockQueryDto = useMemo(() => ({
    search: searchQuery || undefined,
    code: skuQuery || undefined,
    lowStock: filterStock === 'low' || undefined,
    outOfStock: filterStock === 'out' || undefined,
    page: currentPage,
    limit: pageSize,
  }), [searchQuery, skuQuery, filterStock, currentPage, pageSize]);

  // Lightweight stats queries (limit:1 → server returns accurate .total)
  const baseStatsQuery: BranchStockQueryDto = useMemo(() => ({
    search: searchQuery || undefined,
    code: skuQuery || undefined,
    limit: 1,
    page: 1,
  }), [searchQuery, skuQuery]);

  const lowStatsQuery: BranchStockQueryDto = useMemo(() => ({
    search: searchQuery || undefined,
    code: skuQuery || undefined,
    lowStock: true,
    limit: 1,
    page: 1,
  }), [searchQuery, skuQuery]);

  const outStatsQuery: BranchStockQueryDto = useMemo(() => ({
    search: searchQuery || undefined,
    code: skuQuery || undefined,
    outOfStock: true,
    limit: 1,
    page: 1,
  }), [searchQuery, skuQuery]);

  const { data: stockData, isLoading, isFetching, error, refetch } = useBranchStock(selectedBranch, query);
  const { data: baseStatsData } = useBranchStock(selectedBranch, baseStatsQuery);
  const { data: lowStatsData } = useBranchStock(selectedBranch, lowStatsQuery);
  const { data: outStatsData } = useBranchStock(selectedBranch, outStatsQuery);

  const stockItems = stockData?.data ?? [];
  const totalItems = stockData?.total ?? 0;
  const backendTotalPages = stockData?.totalPages;

  // Handlers
  const handleSearch = () => {
    setSkuInput('');
    setParams({ search: searchInput.trim(), sku: null, page: '1' });
  };

  const handleSkuSearch = () => {
    const code = skuInput.trim();
    if (!code) return;
    setSearchInput('');
    setParams({ sku: code, search: null, page: '1' });
  };

  const handleFilterChange = (value: string) => {
    setParams({ stock: value });
  };

  const handleBranchChange = (branchId: string) => {
    setParams({ branch: branchId });
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const resetFilters = () => {
    setSearchInput('');
    setSkuInput('');
    setParams({ search: null, sku: null, stock: 'all', page: null });
  };

  const hasActiveFilters = Boolean(searchQuery || skuQuery || filterStock !== 'all');

  useEffect(() => {
    if (backendTotalPages && currentPage > backendTotalPages) {
      setParams({ page: String(backendTotalPages) });
    }
  }, [backendTotalPages, currentPage, setParams]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!selectedBranch) {
      toast.error('Selecciona una sucursal primero');
      return;
    }

    setIsExporting(true);
    const toastId = toast.loading('Preparando exportación de inventario...');
    try {
      const baseQuery = {
        search: searchQuery || undefined,
        code: skuQuery || undefined,
        lowStock: filterStock === 'low' || undefined,
        outOfStock: filterStock === 'out' || undefined,
      };

      // Backend max limit is 100, so paginate through all pages
      const PAGE_SIZE = 100;
      const firstPage = await inventoryService.getBranchStock(selectedBranch, {
        ...baseQuery,
        limit: PAGE_SIZE,
        page: 1,
      });

      const allItems = [...firstPage.data];
      const totalPages = firstPage.totalPages;

      if (totalPages > 1) {
        const promises = [];
        for (let p = 2; p <= totalPages; p++) {
          promises.push(
            inventoryService.getBranchStock(selectedBranch, { ...baseQuery, limit: PAGE_SIZE, page: p })
          );
        }
        const results = await Promise.all(promises);
        for (const result of results) {
          allItems.push(...result.data);
        }
      }

      if (allItems.length === 0) {
        toast.error('No hay datos para exportar', { id: toastId });
        setIsExporting(false);
        return;
      }

      const branchName = firstPage.branch?.name ?? 'sucursal';

      // Build CSV
      const headers = ['Código', 'Producto', 'Total', 'Reservado', 'En Tránsito', 'Disponible', 'Estado', 'Stock Mínimo', 'Última Actualización'];
      const rows = allItems.map((item) => {
        const status = item.quantityAvailable === 0
          ? 'Sin Existencias'
          : item.isLowStock
            ? 'Existencias Bajas'
            : 'Normal';
        const itemTz = branches?.find(b => b.name === item.branchName)?.timezone || DEFAULT_TIMEZONE;
        const lastUpdate = item.lastMovementAt
          ? new Date(item.lastMovementAt).toLocaleString('es-MX', { timeZone: itemTz })
          : '';
        return [
          item.productCode,
          `"${(item.productName ?? '').replace(/"/g, '""')}"`,
          item.quantityOnHand,
          item.quantityReserved,
          item.quantityInTransit,
          item.quantityAvailable,
          status,
          item.minStockAlertEffective ?? '',
          lastUpdate,
        ].join(',');
      });

      const bom = '\uFEFF';
      const csv = bom + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventario_${branchName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${allItems.length} productos exportados`, { id: toastId });
    } catch {
      toast.error('Error al exportar inventario', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }, [selectedBranch, searchQuery, skuQuery, filterStock]);

  // Stats using server-side totals from lightweight queries (independent of stock filter/pagination)
  const stats = useMemo(() => {
    const total = baseStatsData?.total ?? 0;
    const low = lowStatsData?.total ?? 0;
    const out = outStatsData?.total ?? 0;
    return {
      totalProducts: total,
      lowStock: low,
      outOfStock: out,
      normalStock: Math.max(0, total - low - out),
    };
  }, [baseStatsData, lowStatsData, outStatsData]);

  const formatDateTime = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: branchTimezone,
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
      render: (item) => {
        const tz = branches?.find(b => b.name === item.branchName)?.timezone || DEFAULT_TIMEZONE;
        return (
          <span className="text-sm text-gray-600">
            {item.lastMovementAt
              ? new Date(item.lastMovementAt).toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: tz })
              : '-'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/inventario/kardex/${item.productId}${selectedBranch ? `?branch=${selectedBranch}` : ''}`}>
            <button
              className="rounded-lg p-2 transition-colors hover:bg-blue-50"
              title="Ver Kardex"
            >
              <ChartBarIcon className="h-4 w-4 text-blue-600" />
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
                    <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalProducts)}</p>
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
                    <p className="text-3xl font-bold text-green-600">{formatNumber(stats.normalStock)}</p>
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
                    <p className="text-3xl font-bold text-yellow-600">{formatNumber(stats.lowStock)}</p>
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
                    <p className="text-3xl font-bold text-red-600">{formatNumber(stats.outOfStock)}</p>
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 mb-1">Sucursal Seleccionada</p>
                    {branchesLoading ? (
                      <p className="text-xl font-bold text-gray-400">Cargando sucursales...</p>
                    ) : (
                      <SearchableSelect
                        options={(branches ?? []).map((b) => ({
                          value: b.id,
                          label: `${b.name} (${b.code})`,
                        }))}
                        value={selectedBranch}
                        onChange={handleBranchChange}
                        placeholder="Buscar sucursal..."
                        showAllOption={false}
                        className="max-w-sm"
                      />
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                    onClick={handleExport}
                    disabled={isExporting || !selectedBranch}
                  >
                    {isExporting ? 'Exportando...' : 'Exportar'}
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
                {/* Search by name */}
                <div className="lg:col-span-5">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Buscar por nombre</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Nombre del producto..."
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
                      className="h-10 px-4 sm:min-w-[80px]"
                      onClick={handleSearch}
                    >
                      Buscar
                    </Button>
                  </div>
                </div>

                {/* SKU exact search */}
                <div className="lg:col-span-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">SKU exacto</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">#</span>
                      <input
                        type="text"
                        placeholder="Ej: 9019"
                        value={skuInput}
                        onChange={(e) => setSkuInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSkuSearch();
                          }
                        }}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent font-mono"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-4 sm:min-w-[80px]"
                      onClick={handleSkuSearch}
                    >
                      SKU
                    </Button>
                  </div>
                </div>

                {/* Stock Filter */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Existencias</label>
                  <SearchableSelect
                    options={[
                      { value: 'low', label: 'Existencias Bajas' },
                      { value: 'out', label: 'Sin Existencias' },
                    ]}
                    value={filterStock}
                    onChange={handleFilterChange}
                    allLabel="Todas las Existencias"
                    allValue="all"
                  />
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
                  {skuQuery && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 font-mono">
                      SKU: {skuQuery}
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
                      onPageChange={(p) => setParams({ page: String(p) })}
                      onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
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
