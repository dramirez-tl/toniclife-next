'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ChartBarIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const mockStats = {
  totalUsers: 1247,
  usersGrowth: 12.5,
  totalOrders: 3456,
  ordersGrowth: 8.3,
  totalRevenue: 458900,
  revenueGrowth: 15.7,
  activeDistributors: 342,
  distributorsGrowth: 18.2,
};

const mockRecentOrders = [
  {
    id: 'ORD-12456',
    customer: 'Patricia González',
    amount: 1298,
    status: 'completed',
    date: '2025-01-25T14:30:00',
  },
  {
    id: 'ORD-12455',
    customer: 'Ricardo Méndez',
    amount: 2547,
    status: 'processing',
    date: '2025-01-25T13:15:00',
  },
  {
    id: 'ORD-12454',
    customer: 'Ana Martínez',
    amount: 899,
    status: 'pending',
    date: '2025-01-25T11:00:00',
  },
  {
    id: 'ORD-12453',
    customer: 'Carlos López',
    amount: 1547,
    status: 'completed',
    date: '2025-01-25T10:30:00',
  },
  {
    id: 'ORD-12452',
    customer: 'María Torres',
    amount: 3245,
    status: 'completed',
    date: '2025-01-24T18:20:00',
  },
];

const mockTopProducts = [
  { name: 'Vitamina D3 + K2', sales: 234, revenue: 105066 },
  { name: 'Omega 3 Premium', sales: 198, revenue: 118602 },
  { name: 'Magnesio Bisglicinato', sales: 187, revenue: 74613 },
  { name: 'Colágeno Hidrolizado', sales: 156, revenue: 109044 },
  { name: 'Probióticos 10B UFC', sales: 143, revenue: 78507 },
];

const mockRecentActivity = [
  {
    id: '1',
    type: 'user',
    message: 'Nuevo distribuidor registrado: Laura Mendoza',
    timestamp: '2025-01-25T14:30:00',
  },
  {
    id: '2',
    type: 'order',
    message: 'Pedido ORD-12456 completado',
    timestamp: '2025-01-25T13:45:00',
  },
  {
    id: '3',
    type: 'product',
    message: 'Stock bajo en Omega 3 Premium',
    timestamp: '2025-01-25T12:00:00',
  },
  {
    id: '4',
    type: 'payment',
    message: 'Pago de comisiones procesado: $45,000 MXN',
    timestamp: '2025-01-25T10:00:00',
  },
  {
    id: '5',
    type: 'system',
    message: 'Backup automático completado',
    timestamp: '2025-01-25T03:00:00',
  },
];

const statusConfig = {
  completed: { label: 'Completado', color: 'bg-green-100 text-green-800' },
  processing: { label: 'Procesando', color: 'bg-blue-100 text-blue-800' },
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export default function AdminDashboard() {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Panel de Administrador</h1>
              <p className="text-white/80 text-lg">
                Gestión completa de Tonic Life
              </p>
            </div>
            <Button
              variant="secondary"
              leftIcon={<Cog6ToothIcon className="h-5 w-5" />}
            >
              Configuración
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <UserGroupIcon className="h-8 w-8 text-blue-500" />
                <div className={`flex items-center gap-1 text-sm ${mockStats.usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {mockStats.usersGrowth >= 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                  )}
                  <span>{Math.abs(mockStats.usersGrowth)}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Usuarios Totales</p>
              <p className="text-3xl font-bold text-gray-900">{mockStats.totalUsers.toLocaleString('es-MX')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <ShoppingBagIcon className="h-8 w-8 text-green-500" />
                <div className={`flex items-center gap-1 text-sm ${mockStats.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {mockStats.ordersGrowth >= 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                  )}
                  <span>{Math.abs(mockStats.ordersGrowth)}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Pedidos Totales</p>
              <p className="text-3xl font-bold text-gray-900">{mockStats.totalOrders.toLocaleString('es-MX')}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CurrencyDollarIcon className="h-8 w-8 text-white/80" />
                <div className="flex items-center gap-1 text-sm text-white/90">
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                  <span>{mockStats.revenueGrowth}%</span>
                </div>
              </div>
              <p className="text-sm text-white/80 mb-1">Ingresos Totales</p>
              <p className="text-3xl font-bold">${mockStats.totalRevenue.toLocaleString('es-MX')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <UserGroupIcon className="h-8 w-8 text-purple-500" />
                <div className={`flex items-center gap-1 text-sm ${mockStats.distributorsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {mockStats.distributorsGrowth >= 0 ? (
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                  )}
                  <span>{Math.abs(mockStats.distributorsGrowth)}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Distribuidores Activos</p>
              <p className="text-3xl font-bold text-gray-900">{mockStats.activeDistributors}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Link href="/admin/usuarios">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Usuarios</p>
                    <p className="text-sm text-gray-600">Gestionar usuarios</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/productos">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <ShoppingBagIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Productos</p>
                    <p className="text-sm text-gray-600">Catálogo completo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/pedidos">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <ClockIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Pedidos</p>
                    <p className="text-sm text-gray-600">Gestionar pedidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/reportes">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ChartBarIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Reportes</p>
                    <p className="text-sm text-gray-600">Analytics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Pedidos Recientes</h2>
                  <Link href="/admin/pedidos">
                    <Button variant="ghost" size="sm">
                      Ver todos
                    </Button>
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">ID</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900">Cliente</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Monto</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900">Estado</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockRecentOrders.map((order) => {
                        const status = statusConfig[order.status as keyof typeof statusConfig];
                        return (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <code className="text-sm bg-gray-100 px-2 py-1 rounded">{order.id}</code>
                            </td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-900">{order.customer}</p>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <p className="font-semibold text-gray-900">${order.amount.toLocaleString('es-MX')}</p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-sm text-gray-600">
                              {formatTime(order.date)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Productos Más Vendidos</h2>
                <div className="space-y-4">
                  {mockTopProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.sales} ventas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#003B7A]">
                          ${product.revenue.toLocaleString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Actividad Reciente</h2>
                <div className="space-y-4">
                  {mockRecentActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        activity.type === 'user' ? 'bg-blue-500' :
                        activity.type === 'order' ? 'bg-green-500' :
                        activity.type === 'product' ? 'bg-yellow-500' :
                        activity.type === 'payment' ? 'bg-purple-500' :
                        'bg-gray-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{activity.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatTime(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Estado del Sistema</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API</span>
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Operativo</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Base de Datos</span>
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Operativo</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Pagos</span>
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Operativo</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Email</span>
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-600">Lento</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
