'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
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
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useProducts, useCategories, useDeleteProduct } from '@/hooks/useProducts';
import type { ProductQueryParams } from '@/types/product';
import { PermissionGuard } from '@/components/auth';

export default function ProductosPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Build query params
  const queryParams: ProductQueryParams = useMemo(() => {
    const params: ProductQueryParams = {
      page,
      limit,
      sortBy: 'createdAt',
      sortDir: 'desc',
    };
    if (searchQuery) params.search = searchQuery;
    if (filterCategoryId) params.categoryId = filterCategoryId;
    if (filterStatus === 'active') params.isActive = true;
    if (filterStatus === 'inactive') params.isActive = false;
    return params;
  }, [searchQuery, filterCategoryId, filterStatus, page]);

  // Fetch products and categories
  const { data: productsData, isLoading, isError, refetch } = useProducts(queryParams);
  const { data: categories } = useCategories({ isActive: true });
  const deleteProduct = useDeleteProduct();

  const products = productsData?.data ?? [];
  const total = productsData?.total ?? 0;
  const totalPages = productsData?.totalPages ?? 1;

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: total,
      active: products.filter(p => p.isActive).length,
      lowStock: products.filter(p => p.minStockAlert && parseFloat(p.minStockAlert) > 0).length,
      featured: products.filter(p => p.isFeatured).length,
    };
  }, [products, total]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

    try {
      await deleteProduct.mutateAsync(productId);
      toast.success('Producto eliminado correctamente');
    } catch {
      toast.error('Error al eliminar el producto');
    }
  };

  const handleExport = () => {
    toast.success('Exportando catálogo de productos...');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const getStatusBadge = (isActive: boolean, isFeatured: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          <XCircleIcon className="h-3 w-3" />
          Inactivo
        </span>
      );
    }
    if (isFeatured) {
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
  };

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

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8 text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar productos</h2>
            <p className="text-gray-600 mb-4">No se pudieron cargar los productos. Intenta de nuevo.</p>
            <Button variant="primary" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PermissionGuard permissions={['products:read', 'products:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBagIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Productos</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra el catálogo de productos y el inventario
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">
                  Volver al Panel Principal
                </Button>
              </Link>
              <Link href="/admin/productos/nuevo">
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                >
                  Nuevo Producto
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
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Productos Activos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.active}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Destacados</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.featured}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <TagIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categorías</p>
                  <p className="text-3xl font-bold text-purple-600">{categories?.length ?? 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <FunnelIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Catálogo de Productos</p>
                <p className="text-lg font-semibold text-[#003B7A]">
                  {total} productos en el sistema
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  Actualizar
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                  onClick={handleExport}
                >
                  Exportar Catálogo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterCategoryId}
                  onChange={(e) => {
                    setFilterCategoryId(e.target.value);
                    setPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="">Todas las Categorías</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value as 'all' | 'active' | 'inactive');
                    setPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </div>

              <Button type="submit" variant="primary">
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="h-8 w-8 text-[#003B7A] animate-spin" />
                <span className="ml-3 text-gray-600">Cargando productos...</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Producto</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">SKU</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Categoría</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Precio Base</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Puntos</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Estado</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Tipo</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Creado</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {product.imageUrl ? (
                                  <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    width={48}
                                    height={48}
                                    className="object-cover"
                                  />
                                ) : (
                                  <CubeIcon className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{product.name}</p>
                                {product.shortName && (
                                  <p className="text-sm text-gray-500 truncate max-w-xs">
                                    {product.shortName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 font-mono">
                            {product.code}
                          </td>
                          <td className="py-4 px-4">
                            {product.categoryName ? (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {product.categoryName}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">Sin categoría</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-900 font-semibold">
                            {formatCurrency(product.pointsValue)}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-900">
                            {product.pointsValue} pts
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(product.isActive, product.isFeatured)}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              product.productType === 'kit' ? 'bg-purple-100 text-purple-700' :
                              product.productType === 'promotional' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {product.productType}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {formatDate(product.createdAt)}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => router.push(`/admin/productos/${product.id}/editar`)}
                                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver detalles"
                              >
                                <EyeIcon className="h-4 w-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => router.push(`/admin/productos/${product.id}/editar`)}
                                className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                                title="Editar producto"
                              >
                                <PencilIcon className="h-4 w-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                disabled={deleteProduct.isPending}
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Eliminar producto"
                              >
                                <TrashIcon className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {products.length === 0 && !isLoading && (
                  <div className="text-center py-12">
                    <ShoppingBagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No se encontraron productos
                    </h3>
                    <p className="text-gray-600">
                      Intenta ajustar los filtros de búsqueda
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {products.length > 0 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Mostrando {products.length} de {total} productos (Página {page} de {totalPages})
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
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
