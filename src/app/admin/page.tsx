'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useDashboardKPIs } from '@/hooks/useReports';
import {
  UserGroupIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  UsersIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChartBarIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  completed: { label: 'Completado', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  delivered: { label: 'Entregado', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  processing: { label: 'Procesando', color: 'text-blue-700', bg: 'bg-blue-50' },
  shipped: { label: 'Enviado', color: 'text-blue-700', bg: 'bg-blue-50' },
  in_transit: { label: 'En tránsito', color: 'text-blue-700', bg: 'bg-blue-50' },
  pending: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50' },
  paid: { label: 'Pagado', color: 'text-teal-700', bg: 'bg-teal-50' },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-50' },
  refunded: { label: 'Reembolsado', color: 'text-red-700', bg: 'bg-red-50' },
};

export default function AdminDashboard() {
  const { data: kpis, isLoading, error } = useDashboardKPIs();

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
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

  const formatDate = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-50' };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Panel Principal</h1>
          <p className="text-gray-500 mt-1">Resumen general del sistema</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="animate-pulse">
                <div className="h-10 w-10 bg-gray-100 rounded-xl mb-4" />
                <div className="h-3 w-20 bg-gray-100 rounded mb-3" />
                <div className="h-7 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Panel Principal</h1>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-red-700">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <p>Error al cargar los datos del panel principal. Por favor, intenta de nuevo.</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: 'Usuarios Totales',
      value: kpis?.totalUsers ?? 0,
      change: kpis?.usersGrowth ?? 0,
      icon: UserGroupIcon,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Pedidos del Mes',
      value: kpis?.totalOrders ?? 0,
      change: kpis?.ordersGrowth ?? 0,
      icon: ShoppingBagIcon,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Ingresos del Mes',
      value: kpis?.totalRevenue ?? 0,
      change: kpis?.revenueGrowth ?? 0,
      icon: CurrencyDollarIcon,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      isCurrency: true,
    },
    {
      title: 'Distribuidores Activos',
      value: kpis?.activeDistributors ?? 0,
      change: kpis?.distributorsGrowth ?? 0,
      icon: UsersIcon,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="p-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Panel Principal</h1>
        <p className="text-gray-500 mt-1">Resumen general del sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-gray-100/50 transition-shadow duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`${stat.iconBg} p-3 rounded-xl`}>
                <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                stat.change >= 0 ? 'text-emerald-600' : 'text-red-500'
              }`}>
                {stat.change >= 0 ? (
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownIcon className="h-3.5 w-3.5" />
                )}
                <span>{Math.abs(stat.change)}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {stat.isCurrency ? '$' : ''}{stat.value.toLocaleString('es-MX')}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <ShoppingBagIcon className="h-4 w-4 text-blue-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Pedidos Recientes</h2>
              </div>
              <Link href="/admin/pedidos">
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-700">
                  Ver todos
                </Button>
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(kpis?.recentOrders ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <ShoppingBagIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No hay pedidos recientes</p>
                      </td>
                    </tr>
                  ) : (
                    (kpis?.recentOrders ?? []).map((order) => {
                      const status = getStatusConfig(order.status);
                      return (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                              {order.orderNumber}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-sm font-medium text-gray-900">{order.customerName}</p>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              ${order.amount.toLocaleString('es-MX')}
                            </p>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <p className="text-sm text-gray-500">{formatDate(order.date)}</p>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3 p-6 border-b border-gray-50">
              <div className="bg-amber-50 p-2 rounded-lg">
                <ChartBarIcon className="h-4 w-4 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Productos Más Vendidos</h2>
            </div>
            <div className="p-6">
              {(kpis?.topProducts ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <ChartBarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No hay datos de productos</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(kpis?.topProducts ?? []).map((product, index) => (
                    <div key={product.productId} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold ${
                        index === 0 ? 'bg-amber-100 text-amber-700' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.sales} ventas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          ${product.revenue.toLocaleString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3 p-6 border-b border-gray-50">
              <div className="bg-violet-50 p-2 rounded-lg">
                <ClockIcon className="h-4 w-4 text-violet-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
            </div>
            <div className="p-6">
              {(kpis?.recentActivity ?? []).length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No hay actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(kpis?.recentActivity ?? []).map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        activity.type === 'user' ? 'bg-blue-500' :
                        activity.type === 'order' ? 'bg-emerald-500' :
                        activity.type === 'product' ? 'bg-amber-500' :
                        activity.type === 'payment' ? 'bg-violet-500' :
                        'bg-gray-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 leading-snug">{activity.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatTime(activity.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3 p-6 border-b border-gray-50">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Estado del Sistema</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                { name: 'API', status: 'online' },
                { name: 'Base de Datos', status: 'online' },
                { name: 'Pagos', status: 'online' },
                { name: 'Correo', status: 'online' },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{service.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-medium text-emerald-600">Operativo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
