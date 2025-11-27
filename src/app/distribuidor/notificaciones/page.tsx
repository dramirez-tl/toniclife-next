'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  Cog6ToothIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  UserPlusIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

const mockNotifications = [
  {
    id: '1',
    type: 'sale',
    icon: ShoppingBagIcon,
    color: 'green',
    title: 'Nueva Venta Realizada',
    message: 'Patricia González compró Vitamina D3 + K2',
    timestamp: '2025-01-25T14:30:00',
    isRead: false,
    priority: 'normal',
  },
  {
    id: '2',
    type: 'commission',
    icon: CurrencyDollarIcon,
    color: 'blue',
    title: 'Comisión Generada',
    message: 'Has ganado $120 MXN de comisión por venta de equipo',
    timestamp: '2025-01-25T13:15:00',
    isRead: false,
    priority: 'normal',
  },
  {
    id: '3',
    type: 'recruit',
    icon: UserPlusIcon,
    color: 'purple',
    title: 'Nuevo Distribuidor',
    message: 'Ana Martínez se unió a tu equipo',
    timestamp: '2025-01-25T11:00:00',
    isRead: false,
    priority: 'high',
  },
  {
    id: '4',
    type: 'achievement',
    icon: TrophyIcon,
    color: 'yellow',
    title: '¡Meta Alcanzada!',
    message: 'Completaste tu meta de ventas mensuales de $50,000',
    timestamp: '2025-01-25T10:30:00',
    isRead: true,
    priority: 'high',
  },
  {
    id: '5',
    type: 'alert',
    icon: ExclamationTriangleIcon,
    color: 'red',
    title: 'Stock Bajo',
    message: 'Omega 3 Premium tiene solo 8 unidades en inventario',
    timestamp: '2025-01-25T09:00:00',
    isRead: false,
    priority: 'high',
  },
  {
    id: '6',
    type: 'message',
    icon: ChatBubbleLeftIcon,
    color: 'gray',
    title: 'Nuevo Mensaje',
    message: 'Laura Mendoza: "¿Vamos a tener reunión mañana?"',
    timestamp: '2025-01-24T18:20:00',
    isRead: true,
    priority: 'normal',
  },
  {
    id: '7',
    type: 'info',
    icon: InformationCircleIcon,
    color: 'blue',
    title: 'Actualización de Sistema',
    message: 'Nuevas funcionalidades disponibles en el portal',
    timestamp: '2025-01-24T16:00:00',
    isRead: true,
    priority: 'low',
  },
  {
    id: '8',
    type: 'sale',
    icon: ShoppingBagIcon,
    color: 'green',
    title: 'Venta de Equipo',
    message: 'Diana Flores vendió Colágeno Hidrolizado',
    timestamp: '2025-01-24T14:30:00',
    isRead: true,
    priority: 'normal',
  },
  {
    id: '9',
    type: 'commission',
    icon: CurrencyDollarIcon,
    color: 'blue',
    title: 'Pago Programado',
    message: 'Recibirás $8,500 el 5 de febrero',
    timestamp: '2025-01-24T12:00:00',
    isRead: true,
    priority: 'normal',
  },
  {
    id: '10',
    type: 'info',
    icon: InformationCircleIcon,
    color: 'blue',
    title: 'Evento Próximo',
    message: 'Reunión regional mañana a las 10am en Hotel Sheraton',
    timestamp: '2025-01-24T10:00:00',
    isRead: true,
    priority: 'normal',
  },
];

const notificationTypes = [
  { id: 'all', name: 'Todas', count: mockNotifications.length },
  { id: 'sale', name: 'Ventas', count: mockNotifications.filter(n => n.type === 'sale').length },
  { id: 'commission', name: 'Comisiones', count: mockNotifications.filter(n => n.type === 'commission').length },
  { id: 'recruit', name: 'Reclutamiento', count: mockNotifications.filter(n => n.type === 'recruit').length },
  { id: 'achievement', name: 'Logros', count: mockNotifications.filter(n => n.type === 'achievement').length },
  { id: 'alert', name: 'Alertas', count: mockNotifications.filter(n => n.type === 'alert').length },
];

export default function NotificacionesPage() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');

  const filteredNotifications = notifications.filter(notification => {
    if (filterType !== 'all' && notification.type !== filterType) return false;
    if (filterRead === 'unread' && notification.isRead) return false;
    if (filterRead === 'read' && !notification.isRead) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(notifications.map(n =>
      n.id === notificationId ? { ...n, isRead: true } : n
    ));
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const handleDelete = (notificationId: string) => {
    setNotifications(notifications.filter(n => n.id !== notificationId));
    toast.success('Notificación eliminada');
  };

  const handleDeleteAll = () => {
    setNotifications(notifications.filter(n => !n.isRead));
    toast.success('Notificaciones leídas eliminadas');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      case 'yellow': return 'bg-yellow-100 text-yellow-600';
      case 'red': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <BellIcon className="h-10 w-10" />
                  {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                      {unreadCount}
                    </div>
                  )}
                </div>
                <h1 className="text-4xl font-bold">Notificaciones</h1>
              </div>
              <p className="text-white/80 text-lg">
                Mantente al día con todas tus actualizaciones
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary">
                  Volver al Dashboard
                </Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<Cog6ToothIcon className="h-5 w-5" />}
                onClick={() => toast.info('Función próximamente disponible')}
              >
                Preferencias
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        {unreadCount > 0 && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BellSolidIcon className="h-6 w-6 text-blue-600" />
                  <span className="font-semibold text-blue-900">
                    Tienes {unreadCount} {unreadCount === 1 ? 'notificación nueva' : 'notificaciones nuevas'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<CheckIcon className="h-4 w-4" />}
                    onClick={handleMarkAllAsRead}
                  >
                    Marcar todas como leídas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<TrashIcon className="h-4 w-4" />}
                    onClick={handleDeleteAll}
                  >
                    Eliminar leídas
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4">Filtrar por Tipo</h3>
                <div className="space-y-2">
                  {notificationTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setFilterType(type.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                        filterType === type.id
                          ? 'bg-[#003B7A] text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-sm font-medium">{type.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        filterType === type.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {type.count}
                      </span>
                    </button>
                  ))}
                </div>

                <hr className="my-4" />

                <h3 className="font-bold text-gray-900 mb-4">Estado</h3>
                <div className="space-y-2">
                  {['all', 'unread', 'read'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterRead(status)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        filterRead === status
                          ? 'bg-[#7AB82E] text-white font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {status === 'all' ? 'Todas' : status === 'unread' ? 'No leídas' : 'Leídas'}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Content - Notifications List */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {filteredNotifications.length} {filteredNotifications.length === 1 ? 'Notificación' : 'Notificaciones'}
                </h2>

                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-12">
                    <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No hay notificaciones
                    </h3>
                    <p className="text-gray-600">
                      Estás al día con todas tus notificaciones
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredNotifications.map((notification) => {
                      const IconComponent = notification.icon;
                      return (
                        <div
                          key={notification.id}
                          className={`flex gap-4 p-4 rounded-lg border transition-all ${
                            notification.isRead
                              ? 'bg-white border-gray-200'
                              : 'bg-blue-50 border-blue-200 shadow-sm'
                          }`}
                        >
                          {/* Icon */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notification.color)}`}>
                            <IconComponent className="h-6 w-6" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h3 className={`font-semibold ${notification.isRead ? 'text-gray-900' : 'text-gray-900 font-bold'}`}>
                                {notification.title}
                              </h3>
                              <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
                                {formatTime(notification.timestamp)}
                              </span>
                            </div>
                            <p className={`text-sm mb-2 ${notification.isRead ? 'text-gray-600' : 'text-gray-700'}`}>
                              {notification.message}
                            </p>
                            {notification.priority === 'high' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Alta Prioridad
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Marcar como leída"
                              >
                                <CheckIcon className="h-4 w-4 text-gray-600" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Load More */}
                {filteredNotifications.length > 0 && (
                  <div className="mt-6 text-center">
                    <Button variant="outline">
                      Cargar Más Notificaciones
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
