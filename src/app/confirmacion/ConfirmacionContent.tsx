'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Order } from '@/types/order';
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

async function fetchOrder(orderId: string): Promise<Order> {
  const { data } = await api.get<Order>(`/orders/${orderId}`);
  return data;
}

export default function ConfirmacionContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('id') || '';

  const {
    data: order,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!order) return;

    // Trigger confetti animation on page load
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#3E667D', '#C8DDF2', '#FFD700'],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#3E667D', '#C8DDF2', '#FFD700'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [order]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share && order) {
      navigator.share({
        title: 'Pedido confirmado',
        text: `Mi pedido ${order.orderNumber} ha sido confirmado`,
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Cargando confirmación del pedido...</p>
        </div>
      </div>
    );
  }

  // No orderId provided
  if (!orderId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pedido no encontrado</h2>
            <p className="text-gray-600 mb-4">No se proporcionó un ID de pedido.</p>
            <Link href="/productos">
              <Button>Ir a Productos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isError || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar el pedido</h2>
            <p className="text-gray-600 mb-4">
              {(error as Error)?.message || 'No se pudo obtener la información del pedido.'}
            </p>
            <Link href="/productos">
              <Button>Ir a Productos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const shippingAddress = order.shippingAddressSnapshot;
  const subtotal = parseFloat(order.subtotal || '0');
  const shipping = parseFloat(order.shippingAmount || '0');
  const discount = parseFloat(order.discountAmount || '0');
  const tax = parseFloat(order.taxAmount || '0');
  const total = parseFloat(order.total || '0');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-12 w-12 text-[#3E667D]" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            ¡Pedido Confirmado!
          </h1>

          <p className="text-xl text-white/90 mb-2">
            Gracias por tu compra{shippingAddress ? `, ${shippingAddress.fullName}` : ''}
          </p>

          <p className="text-white/80 mb-8">
            Hemos recibido tu pedido y lo estamos preparando con cuidado
          </p>

          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
            <span className="text-sm">Número de pedido:</span>
            <span className="font-mono font-bold text-lg">{order.orderNumber}</span>
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
          <Link href={`/distribuidor/pedidos/${order.id}`}>
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
                  Confirmación enviada por correo electrónico
                </h3>
                <p className="text-sm text-blue-800">
                  Te hemos enviado un correo de confirmación con todos los detalles de tu pedido.
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
                  <div className="w-10 h-10 bg-[#C8DDF2] rounded-full flex items-center justify-center ring-4 ring-[#C8DDF2]/20">
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-bold text-gray-900 mb-1">Pedido Confirmado</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {new Date(order.createdAt).toLocaleString('es-MX', {
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
                    Te notificaremos cuando tu pedido sea entregado
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
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">&#128230;</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">Producto #{item.productId.substring(0, 8)}</p>
                      <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        ${parseFloat(item.totalPrice).toLocaleString('es-MX')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${subtotal.toLocaleString('es-MX')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Envío</span>
                  <span className="font-medium">
                    {shipping === 0 ? (
                      <span className="text-[#3E667D]">Gratis</span>
                    ) : (
                      `$${shipping.toLocaleString('es-MX')}`
                    )}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento</span>
                    <span className="font-medium text-green-600">
                      -${discount.toLocaleString('es-MX')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA</span>
                  <span className="font-medium">${tax.toLocaleString('es-MX')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-3 mt-3">
                  <span>Total</span>
                  <span className="text-[#3E667D]">${total.toLocaleString('es-MX')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping & Payment */}
          <div className="space-y-6">
            {/* Shipping Address */}
            {shippingAddress && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPinIcon className="h-5 w-5 text-[#3E667D]" />
                    Dirección de Envío
                  </h3>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{shippingAddress.fullName}</p>
                    <p className="text-gray-600">{shippingAddress.street} {shippingAddress.exteriorNumber}</p>
                    <p className="text-gray-600">
                      {shippingAddress.city}, {shippingAddress.state}
                    </p>
                    <p className="text-gray-600">CP {shippingAddress.postalCode}</p>
                    {shippingAddress.phone && (
                      <p className="text-gray-600 mt-2">{shippingAddress.phone}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Method */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-[#3E667D]" />
                  Método de Pago
                </h3>
                <p className="text-sm text-gray-900 font-medium">
                  {order.paymentReference || 'Pago confirmado'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Loyalty Points */}
        {order.totalPoints > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">
                    ¡Ganaste {order.totalPoints} puntos!
                  </h3>
                  <p className="text-sm text-gray-600">
                    Usa tus puntos en tu próxima compra para obtener descuentos exclusivos
                  </p>
                </div>
                <Link href="/distribuidor/lealtad">
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
          <Card className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">Sigue tu Pedido</h3>
              <p className="text-white/80 text-sm mb-4">
                Mantente informado sobre el estado de tu entrega
              </p>
              <Link href={`/distribuidor/pedidos/${order.id}`}>
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

          <Card className="bg-gradient-to-r from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">Sigue Comprando</h3>
              <p className="text-white/80 text-sm mb-4">
                Descubre más productos para tu bienestar
              </p>
              <Link href="/productos">
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
