'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PrinterIcon,
  EnvelopeIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CreditCardIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  DocumentTextIcon,
  ReceiptRefundIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

// Mock data - In real app, fetch based on [id]
const orderData = {
  id: '12345',
  orderNumber: 'TL-2024-12345',
  date: '2024-01-26 10:30 AM',
  status: 'processing',
  paymentStatus: 'paid',
  customer: {
    name: 'María González',
    email: 'maria.gonzalez@email.com',
    phone: '+52 55 1234 5678',
    userId: 'USR-789'
  },
  shippingAddress: {
    street: 'Av. Insurgentes Sur 1602',
    city: 'Ciudad de México',
    state: 'CDMX',
    zip: '03940',
    country: 'México'
  },
  billingAddress: {
    street: 'Av. Insurgentes Sur 1602',
    city: 'Ciudad de México',
    state: 'CDMX',
    zip: '03940',
    country: 'México'
  },
  items: [
    {
      id: 'P1',
      name: 'Proteína Vegana Chocolate',
      sku: 'TL-PROT-001',
      price: 45.00,
      quantity: 2,
      image: '/products/protein.jpg'
    },
    {
      id: 'P2',
      name: 'Omega-3 Plus',
      sku: 'TL-OMG-002',
      price: 32.00,
      quantity: 1,
      image: '/products/omega.jpg'
    },
    {
      id: 'P3',
      name: 'Multivitamínico Completo',
      sku: 'TL-MLT-003',
      price: 28.00,
      quantity: 3,
      image: '/products/multi.jpg'
    }
  ],
  pricing: {
    subtotal: 206.00,
    shipping: 0.00,
    discount: 20.60,
    tax: 18.54,
    total: 203.94
  },
  payment: {
    method: 'Tarjeta de Crédito',
    lastFour: '4242',
    transactionId: 'TXN-789456123',
    gateway: 'Stripe'
  },
  shipping: {
    method: 'Envío Estándar',
    carrier: 'DHL',
    trackingNumber: 'DHL123456789MX',
    estimatedDelivery: '2024-01-30'
  },
  timeline: [
    {
      status: 'Pedido Recibido',
      date: '2024-01-26 10:30 AM',
      description: 'El pedido ha sido recibido y está siendo procesado',
      completed: true
    },
    {
      status: 'Pago Confirmado',
      date: '2024-01-26 10:31 AM',
      description: 'El pago ha sido verificado exitosamente',
      completed: true
    },
    {
      status: 'En Preparación',
      date: '2024-01-26 2:15 PM',
      description: 'Los productos están siendo preparados para envío',
      completed: true
    },
    {
      status: 'Enviado',
      date: '',
      description: 'El pedido ha sido enviado',
      completed: false
    },
    {
      status: 'Entregado',
      date: '',
      description: 'El pedido ha sido entregado al cliente',
      completed: false
    }
  ],
  notes: [
    {
      id: 'N1',
      author: 'Admin',
      date: '2024-01-26 10:35 AM',
      text: 'Cliente solicitó envío express, pero no está disponible en su zona. Se contactó por email.'
    },
    {
      id: 'N2',
      author: 'María González',
      date: '2024-01-26 11:00 AM',
      text: '¿Pueden incluir una nota de regalo? Es para mi hermana.'
    }
  ],
  couponCode: 'WELCOME10',
  isDistributor: false,
  distributorId: null
};

const statusOptions = [
  { value: 'pending', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processing', label: 'Procesando', color: 'bg-blue-100 text-blue-800' },
  { value: 'shipped', label: 'Enviado', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Entregado', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelado', color: 'bg-red-100 text-red-800' },
  { value: 'refunded', label: 'Reembolsado', color: 'bg-gray-100 text-gray-800' }
];

export default function OrderDetailAdminPage() {
  const [status, setStatus] = useState(orderData.status);
  const [newNote, setNewNote] = useState('');
  const [showActions, setShowActions] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    toast.success(`Estado actualizado a: ${statusOptions.find(s => s.value === newStatus)?.label}`);
  };

  const handlePrint = () => {
    toast.success('Generando factura PDF...');
  };

  const handleSendEmail = () => {
    toast.success('Email de actualización enviado al cliente');
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      toast.success('Nota agregada al pedido');
      setNewNote('');
    }
  };

  const handleRefund = () => {
    if (confirm('¿Estás seguro de que deseas procesar un reembolso completo?')) {
      toast.success('Reembolso procesado exitosamente');
    }
  };

  const handleCancel = () => {
    if (confirm('¿Estás seguro de que deseas cancelar este pedido?')) {
      setStatus('cancelled');
      toast.success('Pedido cancelado');
    }
  };

  const currentStatusOption = statusOptions.find(s => s.value === status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/pedidos"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Pedido #{orderData.orderNumber}
                </h1>
                <p className="text-gray-600">{orderData.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <PrinterIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleSendEmail}
                className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <EnvelopeIcon className="h-5 w-5" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="p-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <EllipsisVerticalIcon className="h-5 w-5" />
                </button>
                {showActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                    <button
                      onClick={handleRefund}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <ReceiptRefundIcon className="h-4 w-4" />
                      Procesar Reembolso
                    </button>
                    <button
                      onClick={handleCancel}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Cancelar Pedido
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Productos</h2>
              <div className="space-y-4">
                {orderData.items.map((item) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                      <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">${item.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">
                        Total: ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Summary */}
              <div className="mt-6 pt-6 border-t space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>${orderData.pricing.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Envío</span>
                  <span>
                    {orderData.pricing.shipping === 0 ? 'GRATIS' : `$${orderData.pricing.shipping.toFixed(2)}`}
                  </span>
                </div>
                {orderData.pricing.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento ({orderData.couponCode})</span>
                    <span>-${orderData.pricing.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-700">
                  <span>Impuestos</span>
                  <span>${orderData.pricing.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                  <span>Total</span>
                  <span>${orderData.pricing.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Estado del Pedido</h2>
              <div className="space-y-6">
                {orderData.timeline.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          step.completed ? 'bg-[#7AB82E] text-white' : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircleIcon className="h-6 w-6" />
                        ) : (
                          <ClockIcon className="h-6 w-6" />
                        )}
                      </div>
                      {index < orderData.timeline.length - 1 && (
                        <div
                          className={`w-0.5 h-16 ${
                            step.completed ? 'bg-[#7AB82E]' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <h3 className="font-medium text-gray-900">{step.status}</h3>
                      {step.date && (
                        <p className="text-sm text-gray-600">{step.date}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Notas y Comentarios</h2>

              <div className="space-y-4 mb-6">
                {orderData.notes.map((note) => (
                  <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{note.author}</span>
                      <span className="text-sm text-gray-600">{note.date}</span>
                    </div>
                    <p className="text-gray-700">{note.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Agregar una nota..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                />
                <button
                  onClick={handleAddNote}
                  className="px-6 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855]"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Estado</h2>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A] mb-3"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex justify-center">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${currentStatusOption?.color}`}>
                  {currentStatusOption?.label}
                </span>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Cliente</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <UserIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{orderData.customer.name}</p>
                    <Link
                      href={`/admin/usuarios/${orderData.customer.userId}`}
                      className="text-sm text-[#003B7A] hover:underline"
                    >
                      Ver perfil →
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  <a
                    href={`mailto:${orderData.customer.email}`}
                    className="text-gray-700 hover:text-[#003B7A]"
                  >
                    {orderData.customer.email}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5 text-gray-400" />
                  <a
                    href={`tel:${orderData.customer.phone}`}
                    className="text-gray-700 hover:text-[#003B7A]"
                  >
                    {orderData.customer.phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Envío</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Dirección de Envío</p>
                    <p className="text-sm text-gray-600">
                      {orderData.shippingAddress.street}<br />
                      {orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.zip}<br />
                      {orderData.shippingAddress.country}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TruckIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Método de Envío</p>
                    <p className="text-sm text-gray-600">{orderData.shipping.method}</p>
                    <p className="text-sm text-gray-600">Carrier: {orderData.shipping.carrier}</p>
                  </div>
                </div>
                {orderData.shipping.trackingNumber && (
                  <div className="flex items-start gap-3">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tracking</p>
                      <p className="text-sm text-[#003B7A] font-mono">
                        {orderData.shipping.trackingNumber}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <ClockIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Entrega Estimada</p>
                    <p className="text-sm text-gray-600">{orderData.shipping.estimatedDelivery}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Pago</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CreditCardIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Método de Pago</p>
                    <p className="text-sm text-gray-600">
                      {orderData.payment.method} •••• {orderData.payment.lastFour}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Estado del Pago</p>
                    <p className="text-sm text-green-600">Pagado</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">ID de Transacción</p>
                    <p className="text-xs text-gray-600 font-mono">
                      {orderData.payment.transactionId}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
