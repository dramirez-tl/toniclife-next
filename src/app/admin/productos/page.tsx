'use client';

import { Suspense, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { productsService } from '@/services/products.service';
import {
  ShoppingBagIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CubeIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useProducts, useCategories, useDeleteProduct } from '@/hooks/useProducts';
import type { Product, ProductQueryParams } from '@/types/product';
import { PermissionGuard } from '@/components/auth';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';

export default function ProductosPage() {
  return (
    <Suspense fallback={<ProductosSkeleton />}>
      <ProductosContent />
    </Suspense>
  );
}

function ProductosSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBagIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Productos</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Administra el catálogo de productos y el inventario
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded mb-3" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductosContent() {
  const router = useRouter();

  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    page: '1',
    limit: '20',
  });

  const searchQuery = get('search');
  const filterCode = get('sku');
  const filterCategoryId = get('categoryId');
  const filterStatus = get('status') as 'all' | 'active' | 'inactive';
  const currentPage = getNumber('page') || 1;
  const pageSize = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [codeInput, setCodeInput] = useState(filterCode);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Build query params
  const queryParams: ProductQueryParams = useMemo(() => {
    const params: ProductQueryParams = {
      page: currentPage,
      limit: pageSize,
      sortBy: 'createdAt',
      sortDir: 'desc',
    };
    if (searchQuery) params.search = searchQuery;
    if (filterCode) params.sku = filterCode;
    if (filterCategoryId) params.categoryId = filterCategoryId;
    if (filterStatus === 'active') params.isActive = true;
    if (filterStatus === 'inactive') params.isActive = false;
    return params;
  }, [searchQuery, filterCode, filterCategoryId, filterStatus, currentPage, pageSize]);

  // Fetch products and categories
  const { data: productsData, isLoading, isFetching, isError, refetch } = useProducts(queryParams);
  const { data: categories } = useCategories({ isActive: true });
  const deleteProduct = useDeleteProduct();

  const products = productsData?.data ?? [];
  const total = productsData?.total ?? 0;

  // Calculate stats
  const stats = useMemo(() => ({
    total,
    active: products.filter(p => p.isActive).length,
    featured: products.filter(p => p.isFeatured).length,
    categories: categories?.length ?? 0,
  }), [products, total, categories]);

  const hasActiveFilters = Boolean(searchQuery || filterCode || filterCategoryId || filterStatus !== 'all');

  const handleSearch = () => {
    setParams({ search: searchInput.trim() });
  };

  const handleCodeSearch = () => {
    setParams({ sku: codeInput.trim() || null, page: null });
  };

  const handleFilterCategory = (value: string) => {
    setParams({ categoryId: value });
  };

  const handleFilterStatus = (value: string) => {
    setParams({ status: value });
  };

  const handlePageSizeChange = (size: number) => {
    setParams({ limit: String(size), page: null });
  };

  const resetFilters = () => {
    setSearchInput('');
    setCodeInput('');
    setParams({ search: null, sku: null, categoryId: null, status: 'all', page: null });
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setProductToDelete(null);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete || deleteConfirmText !== 'ELIMINAR') return;
    setIsDeleting(true);
    try {
      await deleteProduct.mutateAsync(productToDelete.id);
      toast.success(`${productToDelete.name} ha sido eliminado correctamente`);
      handleCloseDeleteModal();
    } catch {
      toast.error('Error al eliminar el producto');
    } finally {
      setIsDeleting(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    const toastId = toast.loading('Preparando exportación del catálogo...');
    try {
      const baseQuery: ProductQueryParams = {
        sortBy: 'createdAt',
        sortDir: 'desc',
      };
      if (searchQuery) baseQuery.search = searchQuery;
      if (filterCategoryId) baseQuery.categoryId = filterCategoryId;
      if (filterStatus === 'active') baseQuery.isActive = true;
      if (filterStatus === 'inactive') baseQuery.isActive = false;

      // Backend max limit is 100, paginate through all
      const PAGE_SIZE = 100;
      const firstPage = await productsService.getProducts({ ...baseQuery, limit: PAGE_SIZE, page: 1 });
      const allItems = [...firstPage.data];
      const totalPages = firstPage.totalPages;

      if (totalPages > 1) {
        const promises = [];
        for (let p = 2; p <= totalPages; p++) {
          promises.push(productsService.getProducts({ ...baseQuery, limit: PAGE_SIZE, page: p }));
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

      const headers = ['SKU', 'Nombre', 'Nombre Corto', 'Categoría', 'Tipo', 'Precio Público', 'Puntos', 'Vol. Negocio', 'Marca', 'Países', 'Estado', 'Destacado', 'Visible E-commerce', 'POS', 'Creado'];
      const rows = allItems.map((p) => {
        const status = p.isActive ? 'Activo' : 'Inactivo';
        const countries = (p.activeCountries ?? []).join(', ');
        const createdAt = new Date(p.createdAt).toLocaleDateString('es-MX');
        return [
          p.code,
          `"${(p.name ?? '').replace(/"/g, '""')}"`,
          `"${(p.shortName ?? '').replace(/"/g, '""')}"`,
          `"${(p.categoryName ?? '').replace(/"/g, '""')}"`,
          p.productType,
          p.price ?? '',
          p.pointsValue ?? '',
          p.businessVolume ?? '',
          `"${(p.brand ?? '').replace(/"/g, '""')}"`,
          `"${countries}"`,
          status,
          p.isFeatured ? 'Sí' : 'No',
          p.isVisibleEcommerce ? 'Sí' : 'No',
          p.availableInPos ? 'Sí' : 'No',
          createdAt,
        ].join(',');
      });

      const bom = '\uFEFF';
      const csv = bom + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalogo_productos_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${allItems.length} productos exportados`, { id: toastId });
    } catch {
      toast.error('Error al exportar catálogo', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  }, [searchQuery, filterCategoryId, filterStatus]);

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Column definitions
  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      header: 'Producto',
      sortable: true,
      sortValue: (p) => p.name,
      render: (product) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={40}
                height={40}
                className="object-cover"
              />
            ) : (
              <CubeIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{product.name}</p>
            {product.shortName && (
              <p className="text-sm text-gray-500 truncate max-w-xs">{product.shortName}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'SKU',
      sortable: true,
      sortValue: (p) => p.code,
      render: (product) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-sm font-mono font-medium text-gray-800">
          {product.code}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Categoría',
      sortable: true,
      sortValue: (p) => p.categoryName || '',
      render: (product) =>
        product.categoryName ? (
          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {product.categoryName}
          </span>
        ) : (
          <span className="text-sm text-gray-400">Sin categoría</span>
        ),
    },
    {
      key: 'price',
      header: 'Precio Público',
      sortable: true,
      sortValue: (p) => parseFloat(p.price || '0') || 0,
      render: (product) => (
        <span className="text-sm font-semibold text-gray-900">
          {product.price ? formatCurrency(product.price) : '—'}
        </span>
      ),
    },
    {
      key: 'countries',
      header: 'Países',
      render: (product) => {
        const countries = product.activeCountries ?? [];
        if (countries.length === 0) return <span className="text-sm text-gray-400">—</span>;
        const flagMap: Record<string, string> = {
          MX: '🇲🇽', US: '🇺🇸', CO: '🇨🇴', GT: '🇬🇹', FN: '🇲🇽',
          SV: '🇸🇻', HN: '🇭🇳', NI: '🇳🇮', CR: '🇨🇷', PA: '🇵🇦',
          PE: '🇵🇪', EC: '🇪🇨', CL: '🇨🇱', AR: '🇦🇷', BR: '🇧🇷', ES: '🇪🇸',
        };
        return (
          <div className="flex flex-wrap gap-1">
            {countries.map((code) => (
              <span key={code} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium" title={code}>
                {flagMap[code] || '🏳️'} {code}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      sortValue: (p) => (p.isFeatured ? 2 : p.isActive ? 1 : 0),
      render: (product) => {
        if (!product.isActive) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
              <XCircleIcon className="h-3 w-3" />
              Inactivo
            </span>
          );
        }
        if (product.isFeatured) {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
              <TagIcon className="h-3 w-3" />
              Destacado
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Activo
          </span>
        );
      },
    },
    {
      key: 'productType',
      header: 'Tipo',
      sortable: true,
      sortValue: (p) => p.productType,
      render: (product) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          product.productType === 'kit' ? 'bg-purple-100 text-purple-700' :
          product.productType === 'promotional' ? 'bg-orange-100 text-orange-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {product.productType}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Creado',
      sortable: true,
      sortValue: (p) => p.createdAt,
      render: (product) => (
        <span className="text-sm text-gray-600">{formatDate(product.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (product) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => router.push(`/admin/inventario/kardex/${product.id}`)}
            className="rounded-lg p-2 transition-colors hover:bg-teal-50"
            title="Ver Kardex"
          >
            <ChartBarIcon className="h-4 w-4 text-[#3E667D]" />
          </button>
          <button
            onClick={() => router.push(`/admin/productos/${product.id}/editar`)}
            className="rounded-lg p-2 transition-colors hover:bg-blue-50"
            title="Ver detalles"
          >
            <EyeIcon className="h-4 w-4 text-blue-600" />
          </button>
          <button
            onClick={() => router.push(`/admin/productos/${product.id}/editar`)}
            className="rounded-lg p-2 transition-colors hover:bg-green-50"
            title="Editar producto"
          >
            <PencilIcon className="h-4 w-4 text-green-600" />
          </button>
          <button
            onClick={() => handleDeleteClick(product)}
            className="rounded-lg p-2 transition-colors hover:bg-red-50"
            title="Eliminar producto"
          >
            <TrashIcon className="h-4 w-4 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  // Error state
  if (isError && !productsData) {
    return (
      <PermissionGuard permissions={['products:read', 'products:*']}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBagIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Productos</h1>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 text-red-700">
                  <XCircleIcon className="h-6 w-6" />
                  <p>Error al cargar los productos. Por favor, intenta de nuevo.</p>
                </div>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  // Loading state
  if (isLoading && !productsData) {
    return (
      <PermissionGuard permissions={['products:read', 'products:*']}>
        <div className="min-h-screen bg-gray-50">
          <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBagIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Productos</h1>
              </div>
              <p className="text-white/80 text-lg">Cargando productos...</p>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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

  return (
    <PermissionGuard permissions={['products:read', 'products:*']}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <ShoppingBagIcon className="h-9 w-9" />
                  <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Productos</h1>
                </div>
                <p className="text-base text-white/80 sm:text-lg">
                  Administra el catálogo de productos y el inventario
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin">
                  <Button variant="secondary">Volver al Panel Principal</Button>
                </Link>
                <Link href="/admin/productos/nuevo">
                  <Button variant="primary" leftIcon={<PlusIcon className="h-5 w-5" />}>
                    Nuevo Producto
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
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
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
                    <p className="text-sm text-gray-600 mb-1">Productos Activos</p>
                    <p className="text-3xl font-bold text-green-600">{stats.active}</p>
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
                    <p className="text-sm text-gray-600 mb-1">Destacados</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.featured}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <TagIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Categorías</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.categories}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <FunnelIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    {isFetching ? 'Actualizando...' : 'Actualizar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    {isExporting ? 'Exportando...' : 'Exportar Catálogo'}
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
                <div className="lg:col-span-4">
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
                      className="h-10 px-4 sm:min-w-[96px]"
                      onClick={handleSearch}
                    >
                      Buscar
                    </Button>
                  </div>
                </div>

                {/* Exact SKU Filter */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">SKU exacto</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">#</span>
                      <input
                        type="text"
                        placeholder="Ej: 9019"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCodeSearch();
                          }
                        }}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent font-mono"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-4 sm:min-w-[80px]"
                      onClick={handleCodeSearch}
                    >
                      SKU
                    </Button>
                  </div>
                </div>

                {/* Category Filter */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                  <SearchableSelect
                    options={categories?.map((category) => ({ value: category.id, label: category.name })) || []}
                    value={filterCategoryId}
                    onChange={handleFilterCategory}
                    allLabel="Todas las Categorías"
                    className="w-full"
                  />
                </div>

                {/* Status Filter */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                  <SearchableSelect
                    options={[
                      { value: 'active', label: 'Activos' },
                      { value: 'inactive', label: 'Inactivos' },
                    ]}
                    value={filterStatus}
                    onChange={handleFilterStatus}
                    allLabel="Todos los Estados"
                    allValue="all"
                    className="w-full"
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
                  {filterCode && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700 font-mono">
                      SKU: {filterCode}
                    </span>
                  )}
                  {filterCategoryId && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                      Categoría: {categories?.find(c => c.id === filterCategoryId)?.name || filterCategoryId}
                    </span>
                  )}
                  {filterStatus !== 'all' && (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                      Estado: {filterStatus === 'active' ? 'Activos' : 'Inactivos'}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">Catálogo de productos</h2>
                <p className="text-sm text-gray-600">
                  Mostrando {products.length} de {total}
                </p>
              </div>

              <div className="relative">
                {isFetching && products.length > 0 && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-lg">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-full px-4 py-2">
                      <ArrowPathIcon className="h-4 w-4 text-[#3E667D] animate-spin" />
                      <span className="text-sm font-medium text-gray-600">Actualizando...</span>
                    </div>
                  </div>
                )}

                <DataTable
                  columns={columns}
                  data={products}
                  isLoading={isLoading && !productsData}
                  getRowKey={(product) => product.id}
                  minWidthClassName="min-w-[1100px]"
                  emptyState={
                    <div className="py-2 text-center">
                      <ShoppingBagIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                      <h3 className="mb-2 text-xl font-bold text-gray-900">
                        No se encontraron productos
                      </h3>
                      <p className="text-gray-600">
                        Intenta ajustar los filtros de búsqueda o crear un nuevo producto.
                      </p>
                      <div className="mt-4 flex justify-center gap-2">
                        {hasActiveFilters && (
                          <Button variant="outline" onClick={resetFilters}>
                            Limpiar filtros
                          </Button>
                        )}
                        <Link href="/admin/productos/nuevo">
                          <Button variant="primary" leftIcon={<PlusIcon className="h-4 w-4" />}>
                            Nuevo Producto
                          </Button>
                        </Link>
                      </div>
                    </div>
                  }
                />
              </div>

              {/* Pagination */}
              {products.length > 0 && (
                <DataTablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={total}
                  isLoading={isLoading || isFetching}
                  onPageChange={(p) => setParams({ page: String(p) })}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && productToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={handleCloseDeleteModal} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
              {/* Red header */}
              <div className="bg-red-600 rounded-t-2xl px-6 py-4">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">Eliminar producto</h3>
                </div>
              </div>

              <div className="px-6 py-5">
                <p className="text-gray-600 mb-4">
                  Estás a punto de eliminar el producto:
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-gray-900">{productToDelete.name}</p>
                  <p className="text-sm text-gray-600">SKU: <code className="bg-red-100 px-1.5 py-0.5 rounded text-xs">{productToDelete.code}</code></p>
                  {productToDelete.categoryName && (
                    <p className="text-sm text-gray-500 mt-1">Categoría: {productToDelete.categoryName}</p>
                  )}
                </div>
                <p className="text-sm text-red-700 font-medium mb-4">
                  Esta acción eliminará el producto del catálogo y no se puede deshacer.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escribe <span className="font-bold text-red-600">ELIMINAR</span> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="ELIMINAR"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && deleteConfirmText === 'ELIMINAR') {
                        handleConfirmDelete();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
                <Button variant="outline" onClick={handleCloseDeleteModal} disabled={isDeleting}>
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleConfirmDelete}
                  disabled={deleteConfirmText !== 'ELIMINAR' || isDeleting}
                  isLoading={isDeleting}
                >
                  Eliminar producto
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
