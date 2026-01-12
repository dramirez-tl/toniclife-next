'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ShoppingBagIcon,
  HeartIcon,
  MapPinIcon,
  CreditCardIcon,
  TruckIcon,
  ClockIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, StarIcon } from '@heroicons/react/24/solid';

// Mock user data
const mockUser = {
  firstName: 'Juan',
  lastName: 'Pérez',
  email: 'juan.perez@email.com',
  phone: '+52 123 456 7890',
  avatar: '/images/avatars/default.png',
  memberSince: '2024-01-15',
  loyaltyPoints: 1250,
};

const mockStats = {
  totalOrders: 12,
  wishlistItems: 8,
  savedAddresses: 2,
};

const mockRecentOrders = [
  {
    id: 'ORD-2025-001',
    date: '2025-01-20',
    total: 1299,
    status: 'delivered',
    items: 3,
    image: '/products/vitamin-d.jpg',
  },
  {
    id: 'ORD-2025-002',
    date: '2025-01-10',
    total: 899,
    status: 'in_transit',
    items: 2,
    image: '/products/omega-3.jpg',
  },
];

export default function MiCuentaPage() {
  const quickActions = [
    {
      icon: ShoppingBagIcon,
      title: 'Mis Pedidos',
      description: `${mockStats.totalOrders} pedidos realizados`,
      href: '/cuenta/pedidos',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: HeartIcon,
      title: 'Favoritos',
      description: `${mockStats.wishlistItems} productos guardados`,
      href: '/cuenta/favoritos',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      icon: MapPinIcon,
      title: 'Direcciones',
      description: `${mockStats.savedAddresses} direcciones guardadas`,
      href: '/cuenta/direcciones',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: CreditCardIcon,
      title: 'Métodos de Pago',
      description: 'Gestionar tarjetas',
      href: '/cuenta/pagos',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: StarIcon,
      title: 'Puntos de Lealtad',
      description: `${mockUser.loyaltyPoints} puntos disponibles`,
      href: '/cuenta/lealtad',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      delivered: { text: 'Entregado', color: 'bg-green-100 text-green-800' },
      in_transit: { text: 'En tránsito', color: 'bg-blue-100 text-blue-800' },
      processing: { text: 'Procesando', color: 'bg-yellow-100 text-yellow-800' },
      cancelled: { text: 'Cancelado', color: 'bg-red-100 text-red-800' },
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.processing;
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
          ¡Hola, {mockUser.firstName}! 👋
        </h1>
        <p className="text-gray-600">
          Bienvenido a tu panel de control. Aquí puedes ver un resumen de tu actividad.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total de Pedidos</p>
                <p className="text-3xl font-bold text-gray-900">{mockStats.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingBagIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Lista de Deseos</p>
                <p className="text-3xl font-bold text-gray-900">{mockStats.wishlistItems}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <HeartIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Puntos de Lealtad</p>
                <p className="text-3xl font-bold text-gray-900">{mockUser.loyaltyPoints}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <StarIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Acceso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${action.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <action.icon className={`h-6 w-6 ${action.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pedidos Recientes</h2>
          <Link href="/cuenta/pedidos">
            <Button variant="outline" size="sm" rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
              Ver todos
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {mockRecentOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-6">
                  {/* Order Image */}
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ShoppingBagIcon className="h-10 w-10" />
                    </div>
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{order.id}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            {new Date(order.date).toLocaleDateString('es-MX', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          <span>{order.items} {order.items === 1 ? 'producto' : 'productos'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900 mb-1">
                          ${order.total.toLocaleString('es-MX')}
                        </p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status).color}`}>
                          {getStatusBadge(order.status).text}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      <Link href={`/cuenta/pedidos/${order.id}`}>
                        <Button variant="outline" size="sm" leftIcon={<TruckIcon className="h-4 w-4" />}>
                          Rastrear Pedido
                        </Button>
                      </Link>
                      <Link href={`/cuenta/pedidos/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          Ver Detalles
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Loyalty Program CTA */}
      <Card className="mb-8 bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">Programa de Lealtad</h3>
              <p className="text-white/90 mb-4">
                Tienes {mockUser.loyaltyPoints} puntos. ¡Canjéalos por descuentos exclusivos!
              </p>
              <div className="flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                  <span className="font-semibold">Faltan 250 puntos para el siguiente nivel</span>
                </div>
              </div>
            </div>
            <Link href="/cuenta/lealtad">
              <Button variant="secondary" size="lg" rightIcon={<ArrowRightIcon className="h-5 w-5" />}>
                Ver Beneficios
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-12 h-12 bg-[#003B7A]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="h-6 w-6 text-[#003B7A]" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Mejora tu Experiencia de Bienestar
              </h3>
              <p className="text-gray-600 mb-4">
                Basado en tus compras y preferencias, tenemos recomendaciones personalizadas para ti
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/quiz">
                  <Button variant="primary" leftIcon={<CheckCircleIcon className="h-5 w-5" />}>
                    Retomar Health Quiz
                  </Button>
                </Link>
                <Link href="/productos">
                  <Button variant="outline">
                    Explorar Productos
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
