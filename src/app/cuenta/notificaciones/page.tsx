'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BellIcon,
  ShoppingBagIcon,
  TruckIcon,
  GiftIcon,
  SparklesIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XMarkIcon,
  TrashIcon,
  EnvelopeIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolid } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

const notifications = [
  {
    id: 'N1',
    type: 'order',
    title: 'Pedido Enviado',
    message: 'Tu pedido #TL-2024-12345 ha sido enviado y llegará en 2-3 días hábiles.',
    timestamp: '2024-01-26 10:30 AM',
    read: false,
    icon: TruckIcon,
    color: 'bg-blue-100 text-blue-600',
    link: '/cuenta/pedidos/TL-2024-12345'
  },
  {
    id: 'N2',
    type: 'promo',
    title: '¡Oferta Especial! 25% de Descuento',
    message: 'Aprovecha 25% de descuento en toda la línea de proteínas. Usa el código PROTEIN25',
    timestamp: '2024-01-25 03:00 PM',
    read: false,
    icon: GiftIcon,
    color: 'bg-purple-100 text-purple-600',
    link: '/productos?category=proteinas'
  },
  {
    id: 'N3',
    type: 'order',
    title: 'Pedido Entregado',
    message: 'Tu pedido #TL-2024-11234 ha sido entregado exitosamente.',
    timestamp: '2024-01-24 11:45 AM',
    read: true,
    icon: CheckCircleIcon,
    color: 'bg-green-100 text-green-600',
    link: '/cuenta/pedidos/TL-2024-11234'
  },
  {
    id: 'N4',
    type: 'community',
    title: 'Nuevo Desafío: Wellness Challenge 2024',
    message: 'Únete al desafío de bienestar de 30 días y gana puntos.',
    timestamp: '2024-01-23 09:00 AM',
    read: true,
    icon: UserGroupIcon,
    color: 'bg-orange-100 text-orange-600',
    link: '/comunidad/desafios'
  },
  {
    id: 'N5',
    type: 'promo',
    title: 'Producto de Vuelta en Stock',
    message: 'El Colágeno Hidrolizado que agregaste a favoritos está nuevamente disponible.',
    timestamp: '2024-01-22 02:30 PM',
    read: true,
    icon: SparklesIcon,
    color: 'bg-yellow-100 text-yellow-600',
    link: '/productos/colageno-hidrolizado'
  },
  {
    id: 'N6',
    type: 'order',
    title: 'Confirmación de Pedido',
    message: 'Hemos recibido tu pedido #TL-2024-12345. Total: $203.94',
    timestamp: '2024-01-22 10:30 AM',
    read: true,
    icon: ShoppingBagIcon,
    color: 'bg-blue-100 text-blue-600',
    link: '/cuenta/pedidos/TL-2024-12345'
  },
  {
    id: 'N7',
    type: 'newsletter',
    title: 'Nuevo Artículo del Blog',
    message: '5 Beneficios del Omega-3 para tu Salud Cardiovascular',
    timestamp: '2024-01-20 08:00 AM',
    read: true,
    icon: EnvelopeIcon,
    color: 'bg-teal-100 text-teal-600',
    link: '/blog/beneficios-omega-3'
  },
  {
    id: 'N8',
    type: 'promo',
    title: 'Feliz Cumpleaños! 🎉',
    message: 'Disfruta de un 20% de descuento en tu compra de cumpleaños. Código: BDAY20',
    timestamp: '2024-01-15 12:00 AM',
    read: true,
    icon: GiftIcon,
    color: 'bg-pink-100 text-pink-600',
    link: '/productos'
  },
  {
    id: 'N9',
    type: 'community',
    title: 'Logro Desbloqueado: Cliente VIP',
    message: 'Has alcanzado el estatus VIP. Disfruta beneficios exclusivos.',
    timestamp: '2024-01-10 05:00 PM',
    read: true,
    icon: SparklesIcon,
    color: 'bg-purple-100 text-purple-600',
    link: '/cuenta/recompensas'
  },
  {
    id: 'N10',
    type: 'order',
    title: 'Recordatorio: Completa tu Compra',
    message: 'Tienes 3 productos en tu carrito esperándote.',
    timestamp: '2024-01-08 10:00 AM',
    read: true,
    icon: ShoppingBagIcon,
    color: 'bg-gray-100 text-gray-600',
    link: '/carrito'
  }
];

const notificationTypes = [
  { value: 'all', label: 'Todas', count: notifications.length },
  { value: 'order', label: 'Pedidos', count: notifications.filter(n => n.type === 'order').length },
  { value: 'promo', label: 'Promociones', count: notifications.filter(n => n.type === 'promo').length },
  { value: 'community', label: 'Comunidad', count: notifications.filter(n => n.type === 'community').length },
  { value: 'newsletter', label: 'Newsletter', count: notifications.filter(n => n.type === 'newsletter').length },
];

export default function NotificacionesPage() {
  const [filter, setFilter] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    email: {
      orders: true,
      promotions: true,
      newsletter: true,
      community: false
    },
    push: {
      orders: true,
      promotions: false,
      newsletter: false,
      community: true
    },
    sms: {
      orders: true,
      promotions: false,
      newsletter: false,
      community: false
    }
  });

  const [notificationList, setNotificationList] = useState(notifications);

  const unreadCount = notificationList.filter(n => !n.read).length;

  const filteredNotifications = notificationList.filter(n =>
    filter === 'all' || n.type === filter
  );

  const handleMarkAsRead = (id: string) => {
    setNotificationList(notificationList.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
    toast.success('Marcado como leído');
  };

  const handleMarkAllAsRead = () => {
    setNotificationList(notificationList.map(n => ({ ...n, read: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const handleDelete = (id: string) => {
    setNotificationList(notificationList.filter(n => n.id !== id));
    toast.success('Notificación eliminada');
  };

  const handleClearAll = () => {
    if (confirm('¿Estás seguro de que deseas eliminar todas las notificaciones?')) {
      setNotificationList([]);
      toast.success('Todas las notificaciones eliminadas');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return timestamp.split(' ')[0];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <BellSolid className="h-10 w-10 text-[#003B7A]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
                <p className="text-gray-600">
                  {unreadCount > 0 ? `${unreadCount} nuevas notificaciones` : 'No tienes notificaciones nuevas'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <AdjustmentsHorizontalIcon className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-blue-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Preferencias de Notificación</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Email */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <EnvelopeIcon className="h-5 w-5" />
                  Email
                </h3>
                <div className="space-y-2">
                  {Object.entries(notificationSettings.email).map(([key, value]) => (
                    <label key={key} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          email: { ...notificationSettings.email, [key]: e.target.checked }
                        })}
                        className="h-4 w-4 text-[#003B7A] rounded focus:ring-[#7AB82E]"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Push */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <BellIcon className="h-5 w-5" />
                  Push
                </h3>
                <div className="space-y-2">
                  {Object.entries(notificationSettings.push).map(([key, value]) => (
                    <label key={key} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          push: { ...notificationSettings.push, [key]: e.target.checked }
                        })}
                        className="h-4 w-4 text-[#003B7A] rounded focus:ring-[#7AB82E]"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SMS */}
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <ClockIcon className="h-5 w-5" />
                  SMS
                </h3>
                <div className="space-y-2">
                  {Object.entries(notificationSettings.sms).map(([key, value]) => (
                    <label key={key} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          sms: { ...notificationSettings.sms, [key]: e.target.checked }
                        })}
                        className="h-4 w-4 text-[#003B7A] rounded focus:ring-[#7AB82E]"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{key}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex gap-2 overflow-x-auto">
              {notificationTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFilter(type.value)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    filter === type.value
                      ? 'bg-[#003B7A] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label} ({type.count})
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-4 py-2 text-sm text-[#003B7A] hover:bg-blue-50 rounded-lg"
                >
                  Marcar todas como leídas
                </button>
              )}
              {notificationList.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Limpiar todo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No hay notificaciones
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'No tienes notificaciones en este momento'
                : `No tienes notificaciones de ${notificationTypes.find(t => t.value === filter)?.label.toLowerCase()}`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <div
                  key={notification.id}
                  className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
                    !notification.read ? 'border-l-4 border-[#003B7A]' : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`p-3 rounded-full ${notification.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-1">
                          <h3 className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{notification.message}</p>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          {notification.link && (
                            <Link
                              href={notification.link}
                              className="text-sm text-[#003B7A] hover:underline font-medium"
                            >
                              Ver detalles →
                            </Link>
                          )}
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-sm text-gray-600 hover:text-gray-900"
                            >
                              Marcar como leído
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="ml-auto text-gray-400 hover:text-red-600"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
