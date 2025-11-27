'use client';

import { useState } from 'react';
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
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const mockOrders = [
  {
    id: 'ORD-12456',
    customer: {
      name: 'Patricia González',
      email: 'patricia.gonzalez@email.com',
      type: 'customer',
    },
    items: [
      { name: 'Vitamina D3 + K2', quantity: 2, price: 449 },
      { name: 'Omega 3 Premium', quantity: 1, price: 599 },
    ],
    total: 1497,
    subtotal: 1300,
    shipping: 150,
    discount: 53,
    status: 'completed',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    shippingAddress: 'Av. Insurgentes 1234, CDMX',
    createdAt: '2025-01-25T14:30:00',
    completedAt: '2025-01-25T18:45:00',
  },
  {
    id: 'ORD-12455',
    customer: {
      name: 'Carlos Ramírez',
      email: 'carlos.ramirez@email.com',
      type: 'customer',
    },
    items: [
      { name: 'Colágeno Hidrolizado', quantity: 1, price: 699 },
    ],
    total: 849,
    subtotal: 699,
    shipping: 150,
    discount: 0,
    status: 'processing',
    paymentMethod: 'transfer',
    paymentStatus: 'paid',
    shippingAddress: 'Calle Reforma 567, Guadalajara',
    createdAt: '2025-01-25T11:20:00',
    completedAt: null,
  },
  {
    id: 'ORD-12454',
    customer: {
      name: 'Laura Mendoza',
      email: 'laura.mendoza@email.com',
      type: 'distributor',
    },
    items: [
      { name: 'Vitamina D3 + K2', quantity: 10, price: 449 },
      { name: 'Omega 3 Premium', quantity: 5, price: 599 },
      { name: 'Colágeno Hidrolizado', quantity: 8, price: 699 },
    ],
    total: 13977,
    subtotal: 13977,
    shipping: 0,
    discount: 1000,
    status: 'completed',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    shippingAddress: 'Blvd. Puerta de Hierro 890, Zapopan',
    createdAt: '2025-01-24T16:45:00',
    completedAt: '2025-01-25T10:30:00',
  },
  {
    id: 'ORD-12453',
    customer: {
      name: 'Ana Martínez',
      email: 'ana.martinez@email.com',
      type: 'distributor',
    },
    items: [
      { name: 'Probióticos Avanzados', quantity: 3, price: 549 },
      { name: 'Magnesio Premium', quantity: 2, price: 379 },
    ],
    total: 2405,
    subtotal: 2405,
    shipping: 0,
    discount: 200,
    status: 'pending',
    paymentMethod: 'transfer',
    paymentStatus: 'pending',
    shippingAddress: 'Av. Universidad 234, Monterrey',
    createdAt: '2025-01-25T09:15:00',
    completedAt: null,
  },
  {
    id: 'ORD-12452',
    customer: {
      name: 'Diana Flores',
      email: 'diana.flores@email.com',
      type: 'distributor',
    },
    items: [
      { name: 'Colágeno Hidrolizado', quantity: 15, price: 699 },
      { name: 'Vitamina C 1000mg', quantity: 10, price: 299 },
    ],
    total: 13475,
    subtotal: 13475,
    shipping: 0,
    discount: 1000,
    status: 'shipped',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    shippingAddress: 'Calle Hidalgo 456, Puebla',
    createdAt: '2025-01-24T14:20:00',
    completedAt: null,
  },
  {
    id: 'ORD-12451',
    customer: {
      name: 'Miguel Torres',
      email: 'miguel.torres@email.com',
      type: 'customer',
    },
    items: [
      { name: 'Melatonina 5mg', quantity: 1, price: 349 },
    ],
    total: 499,
    subtotal: 349,
    shipping: 150,
    discount: 0,
    status: 'cancelled',
    paymentMethod: 'card',
    paymentStatus: 'refunded',
    shippingAddress: 'Av. Juárez 789, Querétaro',
    createdAt: '2025-01-24T10:30:00',
    completedAt: null,
  },
  {
    id: 'ORD-12450',
    customer: {
      name: 'Sofía Ramírez',
      email: 'sofia.ramirez@email.com',
      type: 'customer',
    },
    items: [
      { name: 'Vitamina D3 + K2', quantity: 1, price: 449 },
      { name: 'Magnesio Premium', quantity: 1, price: 379 },
    ],
    total: 978,
    subtotal: 828,
    shipping: 150,
    discount: 0,
    status: 'completed',
    paymentMethod: 'oxxo',
    paymentStatus: 'paid',
    shippingAddress: 'Calle Morelos 123, León',
    createdAt: '2025-01-23T18:20:00',
    completedAt: '2025-01-24T15:30:00',
  },
  {
    id: 'ORD-12449',
    customer: {
      name: 'Fernando García',
      email: 'fernando.garcia@email.com',
      type: 'distributor',
    },
    items: [
      { name: 'Proteína Vegetal', quantity: 5, price: 799 },
    ],
    total: 3995,
    subtotal: 3995,
    shipping: 0,
    discount: 300,
    status: 'processing',
    paymentMethod: 'transfer',
    paymentStatus: 'paid',
    shippingAddress: 'Av. Patria 345, Aguascalientes',
    createdAt: '2025-01-23T14:10:00',
    completedAt: null,
  },
];

export default function PedidosPage() {
  const [orders, setOrders] = useState(mockOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesPayment = filterPayment === 'all' || order.paymentStatus === filterPayment;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.total, 0);

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    setOrders(orders.map(o =>
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
    toast.success(`Pedido ${orderId} actualizado a: ${getStatusLabel(newStatus)}`);
  };

  const handleExport = () => {
    toast.success('Exportando datos de pedidos...');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'processing': return 'Procesando';
      case 'shipped': return 'Enviado';
      case 'completed': return 'Completado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Completado
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            Procesando
          </span>
        );
      case 'shipped':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            <TruckIcon className="h-3 w-3" />
            Enviado
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ClockIcon className="h-3 w-3" />
            Pendiente
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Cancelado
          </span>
        );
      default:
        return null;
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
      default:
        return null;
    }
  };

  const getCustomerTypeBadge = (type: string) => {
    if (type === 'distributor') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
          Distribuidor
        </span>
      );
    }
    return null;
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
      hour: '2-digit',
      minute: '2-digit',
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
                <ShoppingCartIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Pedidos</h1>
              </div>
              <p className="text-white/80 text-lg">
                Administra y procesa todos los pedidos del sistema
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
                <p className="text-3xl font-bold text-[#003B7A]">{formatCurrency(totalRevenue)}</p>
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
                    placeholder="Buscar por ID, cliente o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="processing">Procesando</option>
                  <option value="shipped">Enviados</option>
                  <option value="completed">Completados</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>

              {/* Payment Filter */}
              <div>
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="all">Todos los Pagos</option>
                  <option value="paid">Pagados</option>
                  <option value="pending">Pago Pendiente</option>
                  <option value="refunded">Reembolsados</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                  {/* Order Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{order.id}</h3>
                          {getStatusBadge(order.status)}
                          {getPaymentBadge(order.paymentStatus)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <UserIcon className="h-4 w-4" />
                          <span className="font-medium">{order.customer.name}</span>
                          {getCustomerTypeBadge(order.customer.type)}
                          <span className="text-gray-400">•</span>
                          <span>{order.customer.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{formatDate(order.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#003B7A]">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} productos
                        </p>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Productos:</p>
                      <ul className="space-y-1">
                        {order.items.map((item, index) => (
                          <li key={index} className="text-sm text-gray-700">
                            • {item.quantity}x {item.name} - {formatCurrency(item.price)} c/u
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Shipping Address */}
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Dirección de envío:</span> {order.shippingAddress}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="lg:w-48 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<EyeIcon className="h-4 w-4" />}
                      onClick={() => toast.info('Función próximamente disponible')}
                      className="w-full justify-center"
                    >
                      Ver Detalles
                    </Button>
                    {order.status === 'pending' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, 'processing')}
                        className="w-full justify-center"
                      >
                        Marcar Procesando
                      </Button>
                    )}
                    {order.status === 'processing' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, 'shipped')}
                        className="w-full justify-center"
                      >
                        Marcar Enviado
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, 'completed')}
                        className="w-full justify-center"
                      >
                        Marcar Completado
                      </Button>
                    )}
                    {(order.status === 'pending' || order.status === 'processing') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(order.id, 'cancelled')}
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

        {filteredOrders.length === 0 && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <ShoppingCartIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se encontraron pedidos
                </h3>
                <p className="text-gray-600">
                  Intenta ajustar los filtros de búsqueda
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {filteredOrders.length} de {orders.length} pedidos
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
      </div>
    </div>
  );
}
