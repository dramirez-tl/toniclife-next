'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CubeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockInventory = [
  {
    id: '1',
    productId: 'VIT-D3-001',
    name: 'Vitamina D3 + K2',
    category: 'Vitaminas',
    sku: 'VD3K2-60',
    stock: 45,
    minStock: 10,
    maxStock: 100,
    price: 449,
    cost: 270,
    image: '/products/vitamin-d3.jpg',
    lastRestock: '2025-01-15',
    status: 'in_stock',
  },
  {
    id: '2',
    productId: 'OMG-001',
    name: 'Omega 3 Premium',
    category: 'Suplementos',
    sku: 'OMG3-90',
    stock: 8,
    minStock: 10,
    maxStock: 80,
    price: 599,
    cost: 360,
    image: '/products/omega-3.jpg',
    lastRestock: '2025-01-10',
    status: 'low_stock',
  },
  {
    id: '3',
    productId: 'MAG-001',
    name: 'Magnesio Bisglicinato',
    category: 'Minerales',
    sku: 'MAG-60',
    stock: 62,
    minStock: 15,
    maxStock: 100,
    price: 399,
    cost: 240,
    image: '/products/magnesium.jpg',
    lastRestock: '2025-01-20',
    status: 'in_stock',
  },
  {
    id: '4',
    productId: 'COL-001',
    name: 'Colágeno Hidrolizado',
    category: 'Proteínas',
    sku: 'COL-500',
    stock: 0,
    minStock: 5,
    maxStock: 50,
    price: 699,
    cost: 420,
    image: '/products/collagen.jpg',
    lastRestock: '2025-01-05',
    status: 'out_of_stock',
  },
  {
    id: '5',
    productId: 'PRO-001',
    name: 'Probióticos 10B UFC',
    category: 'Digestivos',
    sku: 'PROB-30',
    stock: 28,
    minStock: 10,
    maxStock: 60,
    price: 549,
    cost: 330,
    image: '/products/probiotics.jpg',
    lastRestock: '2025-01-18',
    status: 'in_stock',
  },
  {
    id: '6',
    productId: 'CUR-001',
    name: 'Cúrcuma + Pimienta Negra',
    category: 'Antiinflamatorios',
    sku: 'CUR-60',
    stock: 3,
    minStock: 10,
    maxStock: 70,
    price: 479,
    cost: 290,
    image: '/products/turmeric.jpg',
    lastRestock: '2025-01-08',
    status: 'low_stock',
  },
];

const statusConfig = {
  in_stock: { label: 'En Stock', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
  low_stock: { label: 'Stock Bajo', color: 'bg-yellow-100 text-yellow-800', icon: ExclamationTriangleIcon },
  out_of_stock: { label: 'Sin Stock', color: 'bg-red-100 text-red-800', icon: ExclamationTriangleIcon },
};

const categories = ['Todas', 'Vitaminas', 'Suplementos', 'Minerales', 'Proteínas', 'Digestivos', 'Antiinflamatorios'];

export default function InventarioPage() {
  const [inventory, setInventory] = useState(mockInventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredInventory = inventory.filter(item => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.sku.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterCategory !== 'Todas' && item.category !== filterCategory) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    totalProducts: inventory.length,
    totalValue: inventory.reduce((sum, item) => sum + (item.stock * item.price), 0),
    lowStock: inventory.filter(i => i.status === 'low_stock').length,
    outOfStock: inventory.filter(i => i.status === 'out_of_stock').length,
  };

  const handleAdjustStock = (itemId: string, adjustment: number) => {
    setInventory(inventory.map(item => {
      if (item.id === itemId) {
        const newStock = Math.max(0, item.stock + adjustment);
        let newStatus = item.status;

        if (newStock === 0) newStatus = 'out_of_stock';
        else if (newStock < item.minStock) newStatus = 'low_stock';
        else newStatus = 'in_stock';

        return { ...item, stock: newStock, status: newStatus };
      }
      return item;
    }));

    toast.success(adjustment > 0 ? `+${adjustment} unidades agregadas` : `${Math.abs(adjustment)} unidades removidas`);
  };

  const handleRestock = (itemId: string) => {
    setInventory(inventory.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          stock: item.maxStock,
          status: 'in_stock' as const,
          lastRestock: new Date().toISOString().split('T')[0],
        };
      }
      return item;
    }));
    toast.success('Inventario reabastecido al máximo');
  };

  const handleOrder = (itemId: string, quantity: number) => {
    toast.success(`Pedido de ${quantity} unidades solicitado`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CubeIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Inventario</h1>
              </div>
              <p className="text-white/80 text-lg">
                Controla tu stock de productos
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary">
                  Volver al Dashboard
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<ShoppingCartIcon className="h-5 w-5" />}
                onClick={() => toast.info('Función próximamente disponible')}
              >
                Hacer Pedido
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
                  <p className="text-sm text-gray-600 mb-1">Productos Totales</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
                <CubeIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Valor Total</p>
                  <p className="text-2xl font-bold">${stats.totalValue.toLocaleString('es-MX')}</p>
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
                <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400" />
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
                <ExclamationTriangleIcon className="h-12 w-12 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {(stats.lowStock > 0 || stats.outOfStock > 0) && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 mb-1">Atención Requerida</h3>
                  <p className="text-sm text-yellow-800">
                    {stats.outOfStock > 0 && `${stats.outOfStock} productos sin stock`}
                    {stats.outOfStock > 0 && stats.lowStock > 0 && ' • '}
                    {stats.lowStock > 0 && `${stats.lowStock} productos con stock bajo`}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilterStatus('low_stock')}
                >
                  Ver Productos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                />
              </div>

              {/* Filters */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                  >
                    <option value="all">Todos</option>
                    <option value="in_stock">En Stock</option>
                    <option value="low_stock">Stock Bajo</option>
                    <option value="out_of_stock">Sin Stock</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterCategory('Todas');
                      setFilterStatus('all');
                    }}
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Producto</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">SKU</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Stock</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Estado</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Precio</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Valor</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const status = statusConfig[item.status as keyof typeof statusConfig];
                    const StatusIcon = status.icon;
                    const stockPercentage = (item.stock / item.maxStock) * 100;

                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        {/* Product */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                              <CubeIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-sm text-gray-600">{item.category}</p>
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="py-4 px-4">
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">{item.sku}</code>
                        </td>

                        {/* Stock */}
                        <td className="py-4 px-4">
                          <div className="text-center">
                            <p className="font-bold text-gray-900 mb-1">{item.stock}</p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  stockPercentage > 50 ? 'bg-green-500' :
                                  stockPercentage > 25 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${stockPercentage}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Min: {item.minStock} / Max: {item.maxStock}
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {status.label}
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="py-4 px-4 text-right">
                          <p className="font-semibold text-gray-900">${item.price}</p>
                          <p className="text-xs text-gray-500">Costo: ${item.cost}</p>
                        </td>

                        {/* Value */}
                        <td className="py-4 px-4 text-right">
                          <p className="font-bold text-[#003B7A]">
                            ${(item.stock * item.price).toLocaleString('es-MX')}
                          </p>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAdjustStock(item.id, -1)}
                              disabled={item.stock === 0}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAdjustStock(item.id, 1)}
                            >
                              <PlusIcon className="h-4 w-4" />
                            </Button>
                            {item.status !== 'in_stock' && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                                onClick={() => handleRestock(item.id)}
                              >
                                Reabastecer
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
