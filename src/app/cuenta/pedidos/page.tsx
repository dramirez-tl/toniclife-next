'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ShoppingBagIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

// Mock orders data
const mockOrders = [
  {
    id: 'ORD-2025-001',
    date: '2025-01-20',
    status: 'delivered',
    total: 1299,
    items: 3,
    shippingAddress: 'Av. Insurgentes Sur 1234, CDMX',
    trackingNumber: 'TL-TRACK-2025-001',
    deliveryDate: '2025-01-25',
    paymentMethod: 'Tarjeta ****1234',
    products: [
      { name: 'Vitamina D3 + K2', quantity: 2, price: 449 },
      { name: 'Omega 3 Premium', quantity: 1, price: 599 },
    ],
  },
  {
    id: 'ORD-2025-002',
    date: '2025-01-15',
    status: 'in_transit',
    total: 899,
    items: 2,
    shippingAddress: 'Calle Revolución 567, Guadalajara',
    trackingNumber: 'TL-TRACK-2025-002',
    estimatedDelivery: '2025-01-28',
    paymentMethod: 'PayPal',
    products: [
      { name: 'Magnesio Bisglicinato', quantity: 1, price: 399 },
      { name: 'Complejo B Activo', quantity: 1, price: 349 },
    ],
  },
  {
    id: 'ORD-2025-003',
    date: '2025-01-10',
    status: 'processing',
    total: 1549,
    items: 4,
    shippingAddress: 'Blvd. Díaz Ordaz 890, Monterrey',
    trackingNumber: null,
    estimatedDelivery: '2025-01-30',
    paymentMethod: 'Tarjeta ****5678',
    products: [
      { name: 'Colágeno Hidrolizado', quantity: 1, price: 699 },
      { name: 'Probióticos Advanced', quantity: 1, price: 549 },
      { name: 'Vitamina C 1000mg', quantity: 2, price: 299 },
    ],
  },
  {
    id: 'ORD-2024-145',
    date: '2024-12-20',
    status: 'delivered',
    total: 2199,
    items: 5,
    shippingAddress: 'Av. Insurgentes Sur 1234, CDMX',
    trackingNumber: 'TL-TRACK-2024-145',
    deliveryDate: '2024-12-28',
    paymentMethod: 'Tarjeta ****1234',
    products: [
      { name: 'Pack Inmunidad Total', quantity: 1, price: 1299 },
      { name: 'Té Detox Orgánico', quantity: 2, price: 349 },
    ],
  },
  {
    id: 'ORD-2024-132',
    date: '2024-12-05',
    status: 'cancelled',
    total: 749,
    items: 2,
    shippingAddress: 'Calle Revolución 567, Guadalajara',
    trackingNumber: null,
    paymentMethod: 'Tarjeta ****1234',
    cancellationReason: 'Cancelado por el cliente',
    products: [
      { name: 'Ashwagandha Premium', quantity: 1, price: 499 },
      { name: 'Zinc + Vitamina C', quantity: 1, price: 249 },
    ],
  },
];

const statusConfig = {
  delivered: {
    label: 'Entregado',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleIcon,
    iconColor: 'text-green-600',
  },
  in_transit: {
    label: 'En tránsito',
    color: 'bg-blue-100 text-blue-800',
    icon: TruckIcon,
    iconColor: 'text-blue-600',
  },
  processing: {
    label: 'Procesando',
    color: 'bg-yellow-100 text-yellow-800',
    icon: ClockIcon,
    iconColor: 'text-yellow-600',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: XCircleIcon,
    iconColor: 'text-red-600',
  },
};

const filterOptions = [
  { value: 'all', label: 'Todos los pedidos' },
  { value: 'delivered', label: 'Entregados' },
  { value: 'in_transit', label: 'En tránsito' },
  { value: 'processing', label: 'Procesando' },
  { value: 'cancelled', label: 'Cancelados' },
];

const timeRanges = [
  { value: 'all', label: 'Todo el tiempo' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Último año' },
];

export default function PedidosPage() {
  const [orders, setOrders] = useState(mockOrders);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleDownloadInvoice = (orderId: string) => {
    toast.success(`Descargando factura de ${orderId}`);
  };

  const handleContactSupport = (orderId: string) => {
    toast.info(`Iniciando chat sobre ${orderId}`);
  };

  const handleReorder = (orderId: string) => {
    toast.success('Productos agregados al carrito');
  };

  const filteredOrders = orders
    .filter(order => statusFilter === 'all' || order.status === statusFilter)
    .filter(order => {
      if (searchQuery) {
        return order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
               order.products.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return true;
    });

  const totalSpent = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);

  const stats = {
    total: orders.length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    inTransit: orders.filter(o => o.status === 'in_transit').length,
    processing: orders.filter(o => o.status === 'processing').length,
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
                <h1 className="text-4xl font-bold">Mis Pedidos</h1>
              </div>
              <p className="text-white/80 text-lg">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
            <Link href="/cuenta">
              <Button variant="secondary">
                Volver a Mi Cuenta
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total de pedidos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <ShoppingBagIcon className="h-12 w-12 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Entregados</p>
                  <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
                </div>
                <CheckCircleIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">En tránsito</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.inTransit}</p>
                </div>
                <TruckIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total gastado</p>
                  <p className="text-2xl font-bold text-[#7AB82E]">
                    ${totalSpent.toLocaleString('es-MX')}
                  </p>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por número de pedido o producto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  {filterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Range */}
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  {timeRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-16 text-center">
              <ShoppingBagIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No se encontraron pedidos
              </h3>
              <p className="text-gray-600 mb-6">
                Intenta ajustar los filtros o realiza tu primera compra
              </p>
              <Link href="/tienda">
                <Button variant="primary" size="lg">
                  Explorar Productos
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status as keyof typeof statusConfig];
              const StatusIcon = status.icon;

              return (
                <Card key={order.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    {/* Order Header */}
                    <div className="flex items-start justify-between mb-6 pb-6 border-b">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {order.id}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="h-4 w-4" />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            {new Date(order.date).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          <span>•</span>
                          <span>{order.items} productos</span>
                          <span>•</span>
                          <span>{order.paymentMethod}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-gray-900">
                          ${order.total.toLocaleString('es-MX')}
                        </p>
                      </div>
                    </div>

                    {/* Products List */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3">Productos:</h4>
                      <div className="space-y-2">
                        {order.products.map((product, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-900">
                              {product.quantity}x {product.name}
                            </span>
                            <span className="font-medium text-gray-900">
                              ${(product.price * product.quantity).toLocaleString('es-MX')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Info */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <TruckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 mb-1">
                            Dirección de envío:
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {order.shippingAddress}
                          </p>
                          {order.trackingNumber && (
                            <p className="text-xs text-gray-500">
                              Tracking: <span className="font-mono font-medium">{order.trackingNumber}</span>
                            </p>
                          )}
                          {order.deliveryDate && (
                            <p className="text-sm text-green-600 font-medium mt-1">
                              ✅ Entregado el {new Date(order.deliveryDate).toLocaleDateString('es-MX')}
                            </p>
                          )}
                          {order.estimatedDelivery && !order.deliveryDate && (
                            <p className="text-sm text-blue-600 font-medium mt-1">
                              📅 Entrega estimada: {new Date(order.estimatedDelivery).toLocaleDateString('es-MX')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cancellation Info */}
                    {order.status === 'cancelled' && order.cancellationReason && (
                      <div className="mb-6 p-4 bg-red-50 rounded-lg">
                        <p className="text-sm text-red-800">
                          <strong>Razón de cancelación:</strong> {order.cancellationReason}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      {order.status !== 'cancelled' && (
                        <Link href={`/cuenta/pedidos/${order.id}`}>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<TruckIcon className="h-4 w-4" />}
                          >
                            Rastrear Pedido
                          </Button>
                        </Link>
                      )}

                      {order.status === 'delivered' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<DocumentTextIcon className="h-4 w-4" />}
                            onClick={() => handleDownloadInvoice(order.id)}
                          >
                            Descargar Factura
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<ShoppingBagIcon className="h-4 w-4" />}
                            onClick={() => handleReorder(order.id)}
                          >
                            Volver a Comprar
                          </Button>
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<ChatBubbleLeftIcon className="h-4 w-4" />}
                        onClick={() => handleContactSupport(order.id)}
                      >
                        Soporte
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Help CTA */}
        <Card className="mt-8 bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">¿Necesitas ayuda con un pedido?</h3>
                <p className="text-white/90">
                  Nuestro equipo de soporte está disponible 24/7 para asistirte
                </p>
              </div>
              <Link href="/ayuda">
                <Button variant="secondary" size="lg" leftIcon={<ChatBubbleLeftIcon className="h-5 w-5" />}>
                  Contactar Soporte
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
