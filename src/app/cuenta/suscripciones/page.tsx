'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CalendarIcon,
  TruckIcon,
  PauseIcon,
  PlayIcon,
  XMarkIcon,
  PencilIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

const mockSubscriptions = [
  {
    id: 'SUB-2025-001',
    status: 'active',
    product: {
      id: '1',
      name: 'Vitamina D3 + K2',
      image: '/products/vitamin-d.jpg',
      price: 449,
    },
    frequency: 'monthly',
    nextDelivery: '2025-02-15',
    startDate: '2024-11-15',
    deliveriesCompleted: 3,
    totalSavings: 135,
    discount: 10,
  },
  {
    id: 'SUB-2025-002',
    status: 'active',
    product: {
      id: '2',
      name: 'Omega 3 Premium',
      image: '/products/omega-3.jpg',
      price: 599,
    },
    frequency: 'bimonthly',
    nextDelivery: '2025-03-01',
    startDate: '2025-01-01',
    deliveriesCompleted: 1,
    totalSavings: 60,
    discount: 10,
  },
  {
    id: 'SUB-2024-145',
    status: 'paused',
    product: {
      id: '3',
      name: 'Magnesio Bisglicinato',
      image: '/products/magnesium.jpg',
      price: 399,
    },
    frequency: 'monthly',
    pausedUntil: '2025-03-01',
    startDate: '2024-08-10',
    deliveriesCompleted: 5,
    totalSavings: 200,
    discount: 10,
  },
];

const frequencyLabels = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
};

const statusConfig = {
  active: {
    label: 'Activa',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircleSolid,
  },
  paused: {
    label: 'Pausada',
    color: 'bg-yellow-100 text-yellow-800',
    icon: PauseIcon,
  },
  cancelled: {
    label: 'Cancelada',
    color: 'bg-red-100 text-red-800',
    icon: XMarkIcon,
  },
};

export default function SuscripcionesPage() {
  const [subscriptions, setSubscriptions] = useState(mockSubscriptions);

  const handlePauseSubscription = (subId: string) => {
    toast.success('Suscripción pausada');
  };

  const handleResumeSubscription = (subId: string) => {
    toast.success('Suscripción reactivada');
  };

  const handleCancelSubscription = (subId: string) => {
    if (confirm('¿Estás seguro de que quieres cancelar esta suscripción? Puedes pausarla en su lugar.')) {
      toast.success('Suscripción cancelada');
    }
  };

  const handleEditFrequency = (subId: string) => {
    toast.info('Editar frecuencia de entrega');
  };

  const handleSkipNextDelivery = (subId: string) => {
    toast.success('Siguiente entrega omitida');
  };

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const totalMonthlyValue = activeSubscriptions.reduce((sum, sub) => {
    const monthlyPrice = sub.frequency === 'monthly' ? sub.product.price :
                        sub.frequency === 'bimonthly' ? sub.product.price / 2 :
                        sub.frequency === 'quarterly' ? sub.product.price / 3 : 0;
    return sum + monthlyPrice;
  }, 0);
  const totalSavings = subscriptions.reduce((sum, sub) => sum + sub.totalSavings, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CalendarIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Mis Suscripciones</h1>
              </div>
              <p className="text-white/80 text-lg">
                {activeSubscriptions.length} {activeSubscriptions.length === 1 ? 'suscripción activa' : 'suscripciones activas'}
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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Suscripciones Activas</p>
                  <p className="text-3xl font-bold text-gray-900">{activeSubscriptions.length}</p>
                </div>
                <CalendarIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Valor Mensual</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${Math.round(totalMonthlyValue).toLocaleString('es-MX')}
                  </p>
                </div>
                <CreditCardIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ahorro Total</p>
                  <p className="text-3xl font-bold text-[#7AB82E]">
                    ${totalSavings.toLocaleString('es-MX')}
                  </p>
                </div>
                <GiftIcon className="h-12 w-12 text-[#7AB82E]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {subscriptions.length === 0 ? (
          // Empty State
          <Card>
            <CardContent className="p-16 text-center">
              <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                No tienes suscripciones activas
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Ahorra 10% en cada entrega y nunca te quedes sin tus productos favoritos
              </p>
              <Link href="/tienda">
                <Button variant="primary" size="lg">
                  Explorar Productos
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Subscriptions List */}
            <div className="space-y-6">
              {subscriptions.map((subscription) => {
                const status = statusConfig[subscription.status as keyof typeof statusConfig];
                const StatusIcon = status.icon;

                return (
                  <Card key={subscription.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-6">
                        {/* Product Image */}
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-4xl">📦</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900">
                                  {subscription.product.name}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                  <StatusIcon className="h-4 w-4" />
                                  {status.label}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                ID: {subscription.id}
                              </p>
                              <p className="text-sm text-gray-600">
                                Desde {new Date(subscription.startDate).toLocaleDateString('es-MX')}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-3xl font-bold text-gray-900 mb-1">
                                ${subscription.product.price}
                              </p>
                              <p className="text-xs text-green-600 font-medium">
                                {subscription.discount}% de descuento
                              </p>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <CalendarIcon className="h-4 w-4 text-gray-500" />
                                <p className="text-xs text-gray-600">Frecuencia</p>
                              </div>
                              <p className="font-semibold text-gray-900">
                                {frequencyLabels[subscription.frequency as keyof typeof frequencyLabels]}
                              </p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <TruckIcon className="h-4 w-4 text-gray-500" />
                                <p className="text-xs text-gray-600">
                                  {subscription.status === 'paused' ? 'Pausada hasta' : 'Próxima entrega'}
                                </p>
                              </div>
                              <p className="font-semibold text-gray-900">
                                {subscription.status === 'paused' && subscription.pausedUntil
                                  ? new Date(subscription.pausedUntil).toLocaleDateString('es-MX', {
                                      day: 'numeric',
                                      month: 'long'
                                    })
                                  : subscription.nextDelivery
                                    ? new Date(subscription.nextDelivery).toLocaleDateString('es-MX', {
                                        day: 'numeric',
                                        month: 'long'
                                      })
                                    : '-'}
                              </p>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircleIcon className="h-4 w-4 text-gray-500" />
                                <p className="text-xs text-gray-600">Entregas completadas</p>
                              </div>
                              <p className="font-semibold text-gray-900">
                                {subscription.deliveriesCompleted}
                              </p>
                            </div>
                          </div>

                          {/* Savings Banner */}
                          <div className="p-4 bg-green-50 rounded-lg mb-4">
                            <p className="text-sm text-green-800">
                              💰 Has ahorrado <span className="font-bold">${subscription.totalSavings}</span> con esta suscripción
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            {subscription.status === 'active' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<PencilIcon className="h-4 w-4" />}
                                  onClick={() => handleEditFrequency(subscription.id)}
                                >
                                  Cambiar Frecuencia
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<ClockIcon className="h-4 w-4" />}
                                  onClick={() => handleSkipNextDelivery(subscription.id)}
                                >
                                  Omitir Siguiente
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<PauseIcon className="h-4 w-4" />}
                                  onClick={() => handlePauseSubscription(subscription.id)}
                                >
                                  Pausar
                                </Button>
                              </>
                            )}

                            {subscription.status === 'paused' && (
                              <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<PlayIcon className="h-4 w-4" />}
                                onClick={() => handleResumeSubscription(subscription.id)}
                              >
                                Reactivar
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              leftIcon={<XMarkIcon className="h-4 w-4" />}
                              onClick={() => handleCancelSubscription(subscription.id)}
                            >
                              Cancelar Suscripción
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Benefits CTA */}
            <Card className="mt-8 bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-2xl font-bold mb-4">Beneficios de Suscribirse</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <CheckCircleSolid className="h-6 w-6 flex-shrink-0 mt-0.5" />
                        <span>10% de descuento en cada entrega</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircleSolid className="h-6 w-6 flex-shrink-0 mt-0.5" />
                        <span>Envío gratis en todas las entregas</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircleSolid className="h-6 w-6 flex-shrink-0 mt-0.5" />
                        <span>Pausa, omite o cancela cuando quieras</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircleSolid className="h-6 w-6 flex-shrink-0 mt-0.5" />
                        <span>Sin compromisos ni contratos</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-center justify-center">
                    <Link href="/tienda">
                      <Button variant="secondary" size="lg">
                        Agregar Nueva Suscripción
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
