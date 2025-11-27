'use client';

import { useState } from 'react';
import Link from 'next/link';
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
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockProducts = [
  {
    id: '1',
    name: 'Vitamina D3 + K2',
    sku: 'VIT-D3K2-001',
    category: 'Vitaminas',
    price: 449,
    cost: 200,
    stock: 156,
    lowStockThreshold: 50,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 234,
    revenue: 105066,
    rating: 4.8,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Omega 3 Premium',
    sku: 'OMG-3-PRE-002',
    category: 'Suplementos',
    price: 599,
    cost: 280,
    stock: 8,
    lowStockThreshold: 30,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 189,
    revenue: 113211,
    rating: 4.9,
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Colágeno Hidrolizado',
    sku: 'COL-HID-003',
    category: 'Belleza',
    price: 699,
    cost: 320,
    stock: 92,
    lowStockThreshold: 40,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 312,
    revenue: 218088,
    rating: 4.7,
    createdAt: '2023-11-10',
  },
  {
    id: '4',
    name: 'Multivitamínico Completo',
    sku: 'MLT-VIT-004',
    category: 'Vitaminas',
    price: 399,
    cost: 180,
    stock: 0,
    lowStockThreshold: 60,
    status: 'out_of_stock',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 145,
    revenue: 57855,
    rating: 4.6,
    createdAt: '2024-03-05',
  },
  {
    id: '5',
    name: 'Probióticos Avanzados',
    sku: 'PRO-ADV-005',
    category: 'Digestión',
    price: 549,
    cost: 250,
    stock: 67,
    lowStockThreshold: 35,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 178,
    revenue: 97722,
    rating: 4.8,
    createdAt: '2024-01-28',
  },
  {
    id: '6',
    name: 'Magnesio Premium',
    sku: 'MAG-PRE-006',
    category: 'Minerales',
    price: 379,
    cost: 170,
    stock: 124,
    lowStockThreshold: 50,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 201,
    revenue: 76179,
    rating: 4.5,
    createdAt: '2024-02-14',
  },
  {
    id: '7',
    name: 'Proteína Vegetal',
    sku: 'PRO-VEG-007',
    category: 'Proteínas',
    price: 799,
    cost: 360,
    stock: 45,
    lowStockThreshold: 25,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 92,
    revenue: 73508,
    rating: 4.4,
    createdAt: '2024-04-01',
  },
  {
    id: '8',
    name: 'Vitamina C 1000mg',
    sku: 'VIT-C-008',
    category: 'Vitaminas',
    price: 299,
    cost: 130,
    stock: 198,
    lowStockThreshold: 70,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 287,
    revenue: 85813,
    rating: 4.7,
    createdAt: '2023-12-05',
  },
  {
    id: '9',
    name: 'Melatonina 5mg',
    sku: 'MEL-5MG-009',
    category: 'Sueño',
    price: 349,
    cost: 155,
    stock: 23,
    lowStockThreshold: 40,
    status: 'active',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 167,
    revenue: 58283,
    rating: 4.6,
    createdAt: '2024-03-18',
  },
  {
    id: '10',
    name: 'Ashwagandha Extract',
    sku: 'ASH-EXT-010',
    category: 'Adaptógenos',
    price: 499,
    cost: 225,
    stock: 0,
    lowStockThreshold: 30,
    status: 'discontinued',
    image: 'https://images.unsplash.com/photo-1550572017-4440b5d8b8c7?w=400&h=400&fit=crop',
    sales: 56,
    revenue: 27944,
    rating: 4.3,
    createdAt: '2024-05-10',
  },
];

const categories = [
  'Todas las Categorías',
  'Vitaminas',
  'Suplementos',
  'Belleza',
  'Digestión',
  'Minerales',
  'Proteínas',
  'Sueño',
  'Adaptógenos',
];

export default function ProductosPage() {
  const [products, setProducts] = useState(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas las Categorías');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'Todas las Categorías' || product.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
    outOfStock: products.filter(p => p.stock === 0 && p.status === 'out_of_stock').length,
  };

  const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.cost), 0);

  const handleDeleteProduct = (productId: string) => {
    setProducts(products.filter(p => p.id !== productId));
    toast.success('Producto eliminado correctamente');
  };

  const handleExport = () => {
    toast.success('Exportando catálogo de productos...');
  };

  const getStatusBadge = (status: string, stock: number, lowStockThreshold: number) => {
    if (status === 'discontinued') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          <XCircleIcon className="h-3 w-3" />
          Descontinuado
        </span>
      );
    }
    if (status === 'out_of_stock' || stock === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <XCircleIcon className="h-3 w-3" />
          Sin Stock
        </span>
      );
    }
    if (stock <= lowStockThreshold) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
          <TagIcon className="h-3 w-3" />
          Stock Bajo
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
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
                  Volver al Dashboard
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={() => toast.info('Función próximamente disponible')}
              >
                Nuevo Producto
              </Button>
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
                  <p className="text-sm text-gray-600 mb-1">Stock Bajo</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.lowStock}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Sin Stock</p>
                  <p className="text-3xl font-bold text-red-600">{stats.outOfStock}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Value Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Valor Total del Inventario (Costo)</p>
                <p className="text-3xl font-bold text-[#003B7A]">{formatCurrency(totalInventoryValue)}</p>
              </div>
              <div className="flex gap-3">
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="active">Activos</option>
                  <option value="out_of_stock">Sin Stock</option>
                  <option value="discontinued">Descontinuados</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Producto</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">SKU</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Categoría</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Precio</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Costo</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Stock</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Estado</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Ventas</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Ingresos</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{product.name}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-yellow-500">★</span>
                              <span className="text-sm text-gray-600">{product.rating}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600 font-mono">
                        {product.sku}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-semibold">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {formatCurrency(product.cost)}
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className={`text-sm font-semibold ${
                            product.stock === 0 ? 'text-red-600' :
                            product.stock <= product.lowStockThreshold ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {product.stock} unidades
                          </p>
                          {product.stock > 0 && product.stock <= product.lowStockThreshold && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Umbral: {product.lowStockThreshold}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(product.status, product.stock, product.lowStockThreshold)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                        {product.sales} vendidos
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-900 font-semibold">
                        {formatCurrency(product.revenue)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toast.info('Función próximamente disponible')}
                            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <EyeIcon className="h-4 w-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => toast.info('Función próximamente disponible')}
                            className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                            title="Editar producto"
                          >
                            <PencilIcon className="h-4 w-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
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

            {filteredProducts.length === 0 && (
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
            {filteredProducts.length > 0 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {filteredProducts.length} de {products.length} productos
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
