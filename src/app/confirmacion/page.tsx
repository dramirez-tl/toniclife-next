'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CheckCircleIcon,
  TruckIcon,
  EnvelopeIcon,
  PrinterIcon,
  ShareIcon,
  ArrowRightIcon,
  CalendarIcon,
  MapPinIcon,
  CreditCardIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import confetti from 'canvas-confetti';

// Mock order confirmation data
const mockOrderData = {
  orderId: 'ORD-2025-003',
  orderDate: new Date().toISOString(),
  estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  total: 1548,
  subtotal: 1349,
  shipping: 99,
  discount: 0,
  tax: 100,
  paymentMethod: 'Tarjeta ****1234',
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
  loyaltyPointsEarned: 155,
  isFirstOrder: false,
  trackingAvailable: false,
};

export default function ConfirmacionPage() {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti animation on page load
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#003B7A', '#7AB82E', '#FFD700'],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#003B7A', '#7AB82E', '#FFD700'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Pedido confirmado',
        text: `Mi pedido ${mockOrderData.orderId} ha sido confirmado`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-12 w-12 text-[#7AB82E]" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            ¡Pedido Confirmado!
          </h1>

          <p className="text-xl text-white/90 mb-2">
            Gracias por tu compra, {mockOrderData.shippingAddress.name}
          </p>

          <p className="text-white/80 mb-8">
            Hemos recibido tu pedido y estamos preparándolo con cuidado
          </p>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
            <span className="text-sm">Número de pedido:</span>
            <span className="font-mono font-bold text-lg">{mockOrderData.orderId}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <Button
            variant="outline"
            leftIcon={<PrinterIcon className="h-5 w-5" />}
            onClick={handlePrint}
          >
            Imprimir Confirmación
          </Button>
          <Button
            variant="outline"
            leftIcon={<ShareIcon className="h-5 w-5" />}
            onClick={handleShare}
          >
            Compartir
          </Button>
          <Link href={`/cuenta/pedidos/${mockOrderData.orderId}`}>
            <Button
              variant="outline"
              leftIcon={<TruckIcon className="h-5 w-5" />}
            >
              Rastrear Pedido
            </Button>
          </Link>
        </div>

        {/* Email Confirmation Notice */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <EnvelopeIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Confirmación enviada por email
                </h3>
                <p className="text-sm text-blue-800">
                  Te hemos enviado un email de confirmación con todos los detalles de tu pedido.
                  Si no lo encuentras, revisa tu carpeta de spam.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              ¿Qué sigue?
            </h2>

            <div className="space-y-6">
              {/* Step 1 - Confirmed */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-[#7AB82E] rounded-full flex items-center justify-center ring-4 ring-[#7AB82E]/20">
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-bold text-gray-900 mb-1">Pedido Confirmado</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {new Date(mockOrderData.orderDate).toLocaleString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    Hemos recibido tu pedido y el pago ha sido confirmado
                  </p>
                </div>
              </div>

              {/* Step 2 - Processing */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-bold text-gray-900 mb-1">En Preparación</h3>
                  <p className="text-sm text-gray-600">
                    Estamos empaquetando cuidadosamente tus productos
                  </p>
                </div>
              </div>

              {/* Step 3 - Shipped */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <TruckIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-bold text-gray-400 mb-1">Enviado</h3>
                  <p className="text-sm text-gray-500">
                    Te notificaremos cuando tu pedido sea enviado
                  </p>
                </div>
              </div>

              {/* Step 4 - Delivered */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-bold text-gray-400 mb-1">Entregado</h3>
                  <p className="text-sm text-gray-500">
                    Entrega estimada: {new Date(mockOrderData.estimatedDelivery).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Order Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">Detalles del Pedido</h3>

              <div className="space-y-3 mb-6">
                {mockOrderData.products.map((product) => (
                  <div key={product.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">Cantidad: {product.quantity}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        ${(product.price * product.quantity).toLocaleString('es-MX')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${mockOrderData.subtotal.toLocaleString('es-MX')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Envío</span>
                  <span className="font-medium">
                    {mockOrderData.shipping === 0 ? (
                      <span className="text-[#7AB82E]">Gratis</span>
                    ) : (
                      `$${mockOrderData.shipping}`
                    )}
                  </span>
                </div>
                {mockOrderData.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento</span>
                    <span className="font-medium text-green-600">
                      -${mockOrderData.discount}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA</span>
                  <span className="font-medium">${mockOrderData.tax}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-3 mt-3">
                  <span>Total</span>
                  <span className="text-[#003B7A]">${mockOrderData.total.toLocaleString('es-MX')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping & Payment */}
          <div className="space-y-6">
            {/* Shipping Address */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-[#003B7A]" />
                  Dirección de Envío
                </h3>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{mockOrderData.shippingAddress.name}</p>
                  <p className="text-gray-600">{mockOrderData.shippingAddress.street}</p>
                  <p className="text-gray-600">
                    {mockOrderData.shippingAddress.city}, {mockOrderData.shippingAddress.state}
                  </p>
                  <p className="text-gray-600">CP {mockOrderData.shippingAddress.zipCode}</p>
                  <p className="text-gray-600 mt-2">{mockOrderData.shippingAddress.phone}</p>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-[#003B7A]" />
                  Método de Pago
                </h3>
                <p className="text-sm text-gray-900 font-medium">
                  {mockOrderData.paymentMethod}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Loyalty Points */}
        {mockOrderData.loyaltyPointsEarned > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">
                    ¡Ganaste {mockOrderData.loyaltyPointsEarned} puntos de lealtad!
                  </h3>
                  <p className="text-sm text-gray-600">
                    Usa tus puntos en tu próxima compra para obtener descuentos exclusivos
                  </p>
                </div>
                <Link href="/cuenta/lealtad">
                  <Button variant="outline" size="sm">
                    Ver Puntos
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTAs */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">Sigue tu Pedido</h3>
              <p className="text-white/80 text-sm mb-4">
                Mantente informado sobre el estado de tu entrega
              </p>
              <Link href={`/cuenta/pedidos/${mockOrderData.orderId}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ArrowRightIcon className="h-4 w-4" />}
                >
                  Ver Detalles
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">Continúa Comprando</h3>
              <p className="text-white/80 text-sm mb-4">
                Descubre más productos para tu bienestar
              </p>
              <Link href="/tienda">
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ArrowRightIcon className="h-4 w-4" />}
                >
                  Explorar Productos
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Help */}
        <Card className="mt-8">
          <CardContent className="p-6 text-center">
            <h3 className="font-bold text-gray-900 mb-2">¿Necesitas ayuda?</h3>
            <p className="text-gray-600 mb-4">
              Nuestro equipo de soporte está disponible para asistirte
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/ayuda">
                <Button variant="outline" size="sm">
                  Centro de Ayuda
                </Button>
              </Link>
              <Link href="/contacto">
                <Button variant="outline" size="sm">
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
