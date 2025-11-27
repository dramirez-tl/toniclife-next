'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  TruckIcon,
  MapPinIcon,
  CheckCircleIcon,
  ClockIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ChatBubbleLeftIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

// Mock tracking data
const mockTrackingData = {
  'ORD-2025-001': {
    id: 'ORD-2025-001',
    status: 'delivered',
    trackingNumber: 'TL-TRACK-2025-001',
    carrier: 'DHL Express',
    carrierPhone: '+52 800 765 6400',
    orderDate: '2025-01-20',
    deliveryDate: '2025-01-25',
    total: 1299,
    shippingCost: 0,
    shippingAddress: {
      name: 'Juan Pérez',
      street: 'Av. Insurgentes Sur 1234',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '03100',
      phone: '+52 123 456 7890',
    },
    products: [
      {
        id: '1',
        name: 'Vitamina D3 + K2',
        quantity: 2,
        price: 449,
        image: '/products/vitamin-d.jpg',
      },
      {
        id: '2',
        name: 'Omega 3 Premium',
        quantity: 1,
        price: 599,
        image: '/products/omega-3.jpg',
      },
    ],
    timeline: [
      {
        status: 'Pedido recibido',
        date: '2025-01-20T10:30:00',
        location: 'Sistema Tonic Life',
        description: 'Tu pedido ha sido recibido y está siendo procesado',
        completed: true,
      },
      {
        status: 'Pedido confirmado',
        date: '2025-01-20T14:15:00',
        location: 'Centro de distribución CDMX',
        description: 'El pago ha sido confirmado y el pedido está en preparación',
        completed: true,
      },
      {
        status: 'En preparación',
        date: '2025-01-21T09:00:00',
        location: 'Almacén principal',
        description: 'Los productos están siendo empaquetados',
        completed: true,
      },
      {
        status: 'Enviado',
        date: '2025-01-22T16:45:00',
        location: 'Centro de distribución CDMX',
        description: 'El paquete ha sido entregado a la paquetería',
        completed: true,
      },
      {
        status: 'En tránsito',
        date: '2025-01-23T08:20:00',
        location: 'Hub DHL - Ciudad de México',
        description: 'Tu paquete está en camino',
        completed: true,
      },
      {
        status: 'En reparto',
        date: '2025-01-25T07:00:00',
        location: 'Unidad de reparto local',
        description: 'El paquete salió para entrega',
        completed: true,
      },
      {
        status: 'Entregado',
        date: '2025-01-25T11:30:00',
        location: 'Av. Insurgentes Sur 1234, CDMX',
        description: 'Paquete entregado exitosamente. Recibido por: Juan Pérez',
        completed: true,
      },
    ],
  },
  'ORD-2025-002': {
    id: 'ORD-2025-002',
    status: 'in_transit',
    trackingNumber: 'TL-TRACK-2025-002',
    carrier: 'Estafeta',
    carrierPhone: '+52 800 378 2338',
    orderDate: '2025-01-15',
    estimatedDelivery: '2025-01-28',
    total: 899,
    shippingCost: 99,
    shippingAddress: {
      name: 'María González',
      street: 'Calle Revolución 567',
      city: 'Guadalajara',
      state: 'Jalisco',
      zipCode: '44100',
      phone: '+52 333 123 4567',
    },
    products: [
      {
        id: '3',
        name: 'Magnesio Bisglicinato',
        quantity: 1,
        price: 399,
        image: '/products/magnesium.jpg',
      },
      {
        id: '4',
        name: 'Complejo B Activo',
        quantity: 1,
        price: 349,
        image: '/products/vitamin-b.jpg',
      },
    ],
    timeline: [
      {
        status: 'Pedido recibido',
        date: '2025-01-15T11:20:00',
        location: 'Sistema Tonic Life',
        description: 'Tu pedido ha sido recibido',
        completed: true,
      },
      {
        status: 'Pedido confirmado',
        date: '2025-01-15T15:30:00',
        location: 'Centro de distribución CDMX',
        description: 'Pago confirmado',
        completed: true,
      },
      {
        status: 'Enviado',
        date: '2025-01-17T10:00:00',
        location: 'Centro de distribución CDMX',
        description: 'Paquete entregado a Estafeta',
        completed: true,
      },
      {
        status: 'En tránsito',
        date: '2025-01-20T14:30:00',
        location: 'Hub Estafeta - Guadalajara',
        description: 'Tu paquete llegó a Guadalajara',
        completed: true,
      },
      {
        status: 'En reparto',
        date: '2025-01-28T06:00:00',
        location: 'Unidad de reparto local',
        description: 'Salió para entrega',
        completed: false,
      },
      {
        status: 'Entregado',
        date: null,
        location: 'Destino final',
        description: 'Entrega pendiente',
        completed: false,
      },
    ],
  },
};

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const orderData = mockTrackingData[orderId as keyof typeof mockTrackingData];

  const [showAllTimeline, setShowAllTimeline] = useState(true);

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <TruckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Pedido no encontrado
            </h2>
            <p className="text-gray-600 mb-6">
              No pudimos encontrar información sobre este pedido
            </p>
            <Link href="/cuenta/pedidos">
              <Button variant="primary">
                Ver todos mis pedidos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStep = orderData.timeline.filter(t => t.completed).length;
  const totalSteps = orderData.timeline.length;
  const progress = (currentStep / totalSteps) * 100;

  const handlePrint = () => {
    toast.info('Imprimiendo detalles del pedido...');
  };

  const handleDownloadInvoice = () => {
    toast.success('Descargando factura...');
  };

  const handleContactCarrier = () => {
    toast.info(`Contactando a ${orderData.carrier}...`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-6">
            <Link href="/cuenta/pedidos">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
              >
                Volver a Pedidos
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<PrinterIcon className="h-4 w-4" />}
                onClick={handlePrint}
              >
                Imprimir
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<DocumentTextIcon className="h-4 w-4" />}
                onClick={handleDownloadInvoice}
              >
                Factura
              </Button>
            </div>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Rastreo de Pedido
              </h1>
              <p className="text-2xl font-mono text-white/90 mb-4">
                {orderData.id}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  Ordenado: {new Date(orderData.orderDate).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
                {'deliveryDate' in orderData && orderData.deliveryDate && (
                  <span className="flex items-center gap-2">
                    <CheckCircleSolid className="h-5 w-5 text-green-400" />
                    Entregado: {new Date(orderData.deliveryDate).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long'
                    })}
                  </span>
                )}
                {'estimatedDelivery' in orderData && orderData.estimatedDelivery && !('deliveryDate' in orderData && orderData.deliveryDate) && (
                  <span className="flex items-center gap-2">
                    <TruckIcon className="h-5 w-5" />
                    Entrega estimada: {new Date(orderData.estimatedDelivery).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long'
                    })}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm text-white/80 mb-1">Total del pedido</p>
              <p className="text-4xl font-bold">
                ${orderData.total.toLocaleString('es-MX')}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progreso de entrega</span>
              <span className="text-sm font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-[#7AB82E] h-full transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Seguimiento del Pedido
                  </h2>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Tracking</p>
                    <p className="font-mono font-bold text-[#003B7A]">
                      {orderData.trackingNumber}
                    </p>
                  </div>
                </div>

                {/* Timeline */}
                <div className="relative">
                  {orderData.timeline.map((event, index) => {
                    const isLast = index === orderData.timeline.length - 1;
                    const isCompleted = event.completed;
                    const isCurrent = isCompleted && !orderData.timeline[index + 1]?.completed;

                    return (
                      <div key={index} className="relative">
                        {/* Connecting Line */}
                        {!isLast && (
                          <div
                            className={`absolute left-[19px] top-[40px] w-[2px] h-[calc(100%+20px)] ${
                              isCompleted ? 'bg-[#7AB82E]' : 'bg-gray-200'
                            }`}
                          />
                        )}

                        {/* Event */}
                        <div className={`flex gap-4 pb-8 ${isCurrent ? 'animate-pulse' : ''}`}>
                          {/* Icon */}
                          <div className="relative z-10 flex-shrink-0">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                isCompleted
                                  ? 'bg-[#7AB82E] ring-4 ring-[#7AB82E]/20'
                                  : 'bg-gray-200 ring-4 ring-gray-100'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircleSolid className="h-6 w-6 text-white" />
                              ) : (
                                <div className="w-3 h-3 bg-gray-400 rounded-full" />
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 pt-1">
                            <div className="flex items-start justify-between mb-1">
                              <h3
                                className={`font-bold ${
                                  isCompleted ? 'text-gray-900' : 'text-gray-400'
                                }`}
                              >
                                {event.status}
                              </h3>
                              {event.date && (
                                <span className="text-sm text-gray-500">
                                  {new Date(event.date).toLocaleString('es-MX', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              {event.description}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPinIcon className="h-3 w-3" />
                              {event.location}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Carrier Info */}
                <div className="mt-6 p-6 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <TruckIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2">
                        Paquetería: {orderData.carrier}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Si tienes preguntas sobre tu envío, puedes contactar directamente a la paquetería
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<PhoneIcon className="h-4 w-4" />}
                          onClick={handleContactCarrier}
                        >
                          {orderData.carrierPhone}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<ChatBubbleLeftIcon className="h-4 w-4" />}
                        >
                          Chat con soporte
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Details */}
          <div className="space-y-6">
            {/* Products */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Productos</h3>
                <div className="space-y-3">
                  {orderData.products.map((product) => (
                    <div key={product.id} className="flex gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">📦</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Cantidad: {product.quantity}
                        </p>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          ${(product.price * product.quantity).toLocaleString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      ${(orderData.total - orderData.shippingCost).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-600">Envío</span>
                    <span className="font-medium">
                      {orderData.shippingCost === 0 ? (
                        <span className="text-[#7AB82E]">Gratis</span>
                      ) : (
                        `$${orderData.shippingCost}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>Total</span>
                    <span className="text-[#003B7A]">
                      ${orderData.total.toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-[#003B7A]" />
                  Dirección de Envío
                </h3>
                <div className="text-sm">
                  <p className="font-medium text-gray-900 mb-1">
                    {orderData.shippingAddress.name}
                  </p>
                  <p className="text-gray-600">
                    {orderData.shippingAddress.street}
                  </p>
                  <p className="text-gray-600">
                    {orderData.shippingAddress.city}, {orderData.shippingAddress.state}
                  </p>
                  <p className="text-gray-600 mb-3">
                    CP {orderData.shippingAddress.zipCode}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1">
                    <PhoneIcon className="h-4 w-4" />
                    {orderData.shippingAddress.phone}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold mb-2">¿Necesitas ayuda?</h3>
                <p className="text-sm text-white/90 mb-4">
                  Nuestro equipo está disponible para asistirte
                </p>
                <div className="space-y-2">
                  <Link href="/ayuda">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      leftIcon={<ChatBubbleLeftIcon className="h-4 w-4" />}
                    >
                      Chat en vivo
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-white hover:bg-white/10"
                    leftIcon={<EnvelopeIcon className="h-4 w-4" />}
                  >
                    Enviar email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
