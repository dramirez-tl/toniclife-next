'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ShoppingCartIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useOrders, useUpdateOrderStatus, useCancelOrder } from '@/hooks/useOrders';
import { OrderStatus } from '@/types/order';
import type { Order, OrderQueryParams } from '@/types/order';
import { PermissionGuard } from '@/components/auth';

export default function PedidosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  // Payment filter kept for UI but no longer part of OrderQueryParams
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  // Build query params
  const queryParams: OrderQueryParams = useMemo(() => {
    const params: OrderQueryParams = {
      page: currentPage,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    if (searchQuery) params.search = searchQuery;
    if (filterStatus !== 'all') params.status = filterStatus as OrderStatus;
    return params;
  }, [currentPage, searchQuery, filterStatus]);

  // API hooks
  const { data: ordersData, isLoading, error, refetch } = useOrders(queryParams);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();

  const orders = ordersData?.data || [];
  const totalOrders = ordersData?.total || 0;
  const totalPages = ordersData?.totalPages || 1;

  // Calculate stats from loaded orders
  const stats = useMemo(() => {
    return {
      total: totalOrders,
      pending: orders.filter((o) => o.status === 'pending').length,
      processing: orders.filter((o) => o.status === 'processing').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    };
  }, [orders, totalOrders]);

  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === 'paid' || o.status === 'completed')
      .reduce((sum, o) => sum + parseFloat(o.total), 0);
  }, [orders]);

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateStatus.mutateAsync({
        id: orderId,
        dto: { status: newStatus },
      });
      toast.success(`Pedido actualizado a: ${getStatusLabel(newStatus)}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar el pedido');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await cancelOrder.mutateAsync({
        id: orderId,
        dto: { reason: 'Cancelado por administrador' },
      });
      toast.success('Pedido cancelado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cancelar el pedido');
    }
  };

  const handleExport = () => {
    toast.success('Exportando datos de pedidos...');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmado';
      case 'paid':
        return 'Pagado';
      case 'processing':
        return 'Procesando';
      case 'shipped':
        return 'Enviado';
      case 'in_transit':
        return 'En Tránsito';
      case 'delivered':
        return 'Entregado';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            {getStatusLabel(status)}
          </span>
        );
      case 'processing':
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            {getStatusLabel(status)}
          </span>
        );
      case 'shipped':
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <TruckIcon className="h-3 w-3" />
            {getStatusLabel(status)}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            Pendiente
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            {getStatusLabel(status)}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            {getStatusLabel(status)}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Pagado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            Pendiente
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Reembolsado
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Fallido
          </span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar pedidos</h2>
          <p className="text-gray-600 mb-4">
            {(error as any)?.response?.data?.message || 'Ocurrió un error inesperado'}
          </p>
          <Button onClick={() => refetch()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <PermissionGuard permissions={['orders:read', 'orders:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShoppingCartIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Pedidos</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra y procesa todos los pedidos del sistema
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                onClick={handleExport}
              >
                Exportar Pedidos
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
                  <p className="text-sm text-gray-600 mb-1">Total Pedidos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingCartIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Procesando</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.processing}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TruckIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completados</p>
                  <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ingresos Totales (Pedidos Pagados)</p>
                <p className="text-3xl font-bold text-[#3E667D]">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
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
                    placeholder="Buscar por número de orden o email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="paid">Pagados</option>
                  <option value="processing">Procesando</option>
                  <option value="shipped">Enviados</option>
                  <option value="in_transit">En Transito</option>
                  <option value="delivered">Entregados</option>
                  <option value="completed">Completados</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>

              {/* Payment Filter */}
              <div>
                <select
                  value={filterPayment}
                  onChange={(e) => {
                    setFilterPayment(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                >
                  <option value="all">Todos los Pagos</option>
                  <option value="paid">Pagados</option>
                  <option value="pending">Pago Pendiente</option>
                  <option value="refunded">Reembolsados</option>
                  <option value="failed">Fallidos</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.map((order: Order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{order.orderNumber}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <UserIcon className="h-4 w-4" />
                          {order.customer ? (
                            <>
                              <span className="font-medium">
                                {order.customer.firstName} {order.customer.lastName}
                              </span>
                              <span className="text-gray-400">•</span>
                              <span>{order.customer.email}</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Sin información de cliente</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#3E667D]">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{order.items?.length || 0} productos</p>
                      </div>
                    </div>

                    {/* Order Items */}
                    {order.items && order.items.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-3">
                        <p className="text-sm font-semibold text-gray-900 mb-2">Productos:</p>
                        <ul className="space-y-1">
                          {order.items.slice(0, 3).map((item) => (
                            <li key={item.id} className="text-sm text-gray-700">
                              • {item.quantity}x Producto -{' '}
                              {formatCurrency(item.unitPrice)} c/u
                            </li>
                          ))}
                          {order.items.length > 3 && (
                            <li className="text-sm text-gray-500 italic">
                              ... y {order.items.length - 3} productos más
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Shipping Address */}
                    {order.shippingAddressSnapshot && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Dirección de envío:</span>{' '}
                        {order.shippingAddressSnapshot.street}
                        {order.shippingAddressSnapshot.exteriorNumber &&
                          ` #${order.shippingAddressSnapshot.exteriorNumber}`}
                        , {order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.state}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="lg:w-48 flex flex-col gap-2">
                    <Link href={`/admin/pedidos/${order.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<EyeIcon className="h-4 w-4" />}
                        className="w-full justify-center"
                      >
                        Ver Detalles
                      </Button>
                    </Link>
                    {order.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, OrderStatus.PROCESSING)}
                        isLoading={updateStatus.isPending}
                        className="w-full justify-center"
                      >
                        Marcar Procesando
                      </Button>
                    )}
                    {order.status === 'processing' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, OrderStatus.SHIPPED)}
                        isLoading={updateStatus.isPending}
                        className="w-full justify-center"
                      >
                        Marcar Enviado
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, OrderStatus.COMPLETED)}
                        isLoading={updateStatus.isPending}
                        className="w-full justify-center"
                      >
                        Marcar Completado
                      </Button>
                    )}
                    {(order.status === 'pending' || order.status === 'processing') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelOrder(order.id)}
                        isLoading={cancelOrder.isPending}
                        className="w-full justify-center text-red-600 hover:bg-red-50"
                      >
                        Cancelar Pedido
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {orders.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <ShoppingCartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron pedidos</h3>
                <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {orders.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {orders.length} de {totalOrders} pedidos (Página {currentPage} de{' '}
              {totalPages})
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
    </PermissionGuard>
  );
}
