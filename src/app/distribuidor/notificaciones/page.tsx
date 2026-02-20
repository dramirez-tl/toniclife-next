'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  useMyNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
} from '@/hooks/useNotifications';
import type {
  Notification,
  NotificationQueryParams,
  NotificationCategory,
} from '@/types/notification';
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
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'sonner';

// ================================
// CATEGORY MAPPING
// ================================

type CategoryFilterId = 'all' | NotificationCategory;

interface CategoryFilterOption {
  id: CategoryFilterId;
  name: string;
}

const CATEGORY_FILTERS: CategoryFilterOption[] = [
  { id: 'all', name: 'Todas' },
  { id: 'orders', name: 'Ventas' },
  { id: 'commission', name: 'Comisiones' },
  { id: 'network', name: 'Reclutamiento' },
  { id: 'mlm', name: 'Logros' },
  { id: 'alert', name: 'Alertas' },
  { id: 'system', name: 'Sistema' },
  { id: 'general', name: 'General' },
];

const getCategoryIcon = (category: NotificationCategory) => {
  switch (category) {
    case 'orders':
      return ShoppingBagIcon;
    case 'commission':
    case 'billing':
    case 'payment':
    case 'refund':
      return CurrencyDollarIcon;
    case 'network':
    case 'rank':
      return UserPlusIcon;
    case 'mlm':
      return TrophyIcon;
    case 'alert':
    case 'inventory':
      return ExclamationTriangleIcon;
    case 'general':
    case 'marketing':
    case 'custom':
      return ChatBubbleLeftIcon;
    default:
      return InformationCircleIcon;
  }
};

const getCategoryColor = (category: NotificationCategory) => {
  switch (category) {
    case 'orders':
      return 'bg-green-100 text-green-600';
    case 'commission':
    case 'billing':
    case 'payment':
      return 'bg-blue-100 text-blue-600';
    case 'network':
    case 'rank':
      return 'bg-purple-100 text-purple-600';
    case 'mlm':
      return 'bg-yellow-100 text-yellow-600';
    case 'alert':
    case 'inventory':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

// ================================
// MAIN PAGE COMPONENT
// ================================

export default function NotificacionesPage() {
  const [filterCategory, setFilterCategory] = useState<CategoryFilterId>('all');
  const [filterRead, setFilterRead] = useState<'all' | 'unread' | 'read'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Build query params
  const queryParams: NotificationQueryParams = useMemo(() => {
    const params: NotificationQueryParams = {
      page: currentPage,
      limit: pageSize,
    };

    if (filterCategory !== 'all') {
      params.category = filterCategory as NotificationCategory;
    }
    if (filterRead === 'unread') {
      params.isRead = false;
    } else if (filterRead === 'read') {
      params.isRead = true;
    }

    return params;
  }, [filterCategory, filterRead, currentPage]);

  // API Hooks
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useMyNotifications(queryParams);
  const { data: unreadData } = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const notifications = notificationsData?.data ?? [];
  const totalPages = notificationsData?.totalPages ?? 1;
  const totalNotifications = notificationsData?.total ?? 0;
  const unreadCount = unreadData?.count ?? 0;

  // Category counts from current data
  const categoryCounts = useMemo(() => {
    if (!notifications.length) return {};
    const counts: Record<string, number> = {};
    notifications.forEach((n) => {
      counts[n.category] = (counts[n.category] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  // ================================
  // HANDLERS
  // ================================

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead.mutateAsync([notificationId]);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Error al marcar la notificacion como leida'
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
      toast.success('Todas las notificaciones marcadas como leidas');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          'Error al marcar todas las notificaciones como leidas'
      );
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification.mutateAsync(notificationId);
      toast.success('Notificacion eliminada');
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Error al eliminar la notificacion'
      );
    }
  };

  const handleFilterCategory = (id: CategoryFilterId) => {
    setFilterCategory(id);
    setCurrentPage(1);
  };

  const handleFilterRead = (status: 'all' | 'unread' | 'read') => {
    setFilterRead(status);
    setCurrentPage(1);
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
    if (diffDays < 7) return `Hace ${diffDays} dias`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  // ================================
  // LOADING STATE
  // ================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <BellIcon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">Notificaciones</h1>
            </div>
            <p className="text-white/80 text-lg">Cargando notificaciones...</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar skeleton */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 w-32 bg-gray-200 rounded" />
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-9 bg-gray-200 rounded-lg" />
                    ))}
                    <div className="h-px bg-gray-200 my-4" />
                    <div className="h-5 w-20 bg-gray-200 rounded" />
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-9 bg-gray-200 rounded-lg" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Content skeleton */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 w-48 bg-gray-200 rounded" />
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex gap-4 p-4 rounded-lg border border-gray-200">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 bg-gray-200 rounded" />
                          <div className="h-3 w-full bg-gray-200 rounded" />
                          <div className="h-3 w-1/4 bg-gray-200 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================================
  // ERROR STATE
  // ================================

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <BellIcon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">Notificaciones</h1>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-700">
                <ExclamationTriangleIcon className="h-6 w-6" />
                <p>Error al cargar las notificaciones. Por favor, intenta de nuevo.</p>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ================================
  // MAIN RENDER
  // ================================

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
                Mantente al dia con todas tus actualizaciones
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Button
                variant="primary"
                leftIcon={<Cog6ToothIcon className="h-5 w-5" />}
                onClick={() => toast.info('Funcion proximamente disponible')}
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
                    Tienes {unreadCount}{' '}
                    {unreadCount === 1
                      ? 'notificacion nueva'
                      : 'notificaciones nuevas'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<CheckIcon className="h-4 w-4" />}
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsRead.isPending}
                  >
                    {markAllAsRead.isPending
                      ? 'Marcando...'
                      : 'Marcar todas como leidas'}
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
                  {CATEGORY_FILTERS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleFilterCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                        filterCategory === cat.id
                          ? 'bg-[#003B7A] text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-sm font-medium">{cat.name}</span>
                      {cat.id !== 'all' && categoryCounts[cat.id] !== undefined && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            filterCategory === cat.id
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {categoryCounts[cat.id]}
                        </span>
                      )}
                      {cat.id === 'all' && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            filterCategory === cat.id
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {totalNotifications}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <hr className="my-4" />

                <h3 className="font-bold text-gray-900 mb-4">Estado</h3>
                <div className="space-y-2">
                  {(
                    [
                      { value: 'all', label: 'Todas' },
                      { value: 'unread', label: 'No leidas' },
                      { value: 'read', label: 'Leidas' },
                    ] as const
                  ).map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleFilterRead(status.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        filterRead === status.value
                          ? 'bg-[#7AB82E] text-white font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {status.label}
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
                  {totalNotifications}{' '}
                  {totalNotifications === 1 ? 'Notificacion' : 'Notificaciones'}
                </h2>

                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No hay notificaciones
                    </h3>
                    <p className="text-gray-600">
                      Estas al dia con todas tus notificaciones
                    </p>
                    {(filterCategory !== 'all' || filterRead !== 'all') && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          setFilterCategory('all');
                          setFilterRead('all');
                          setCurrentPage(1);
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification: Notification) => {
                      const IconComponent = getCategoryIcon(notification.category);
                      const iconColor = getCategoryColor(notification.category);

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
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor}`}
                          >
                            <IconComponent className="h-6 w-6" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h3
                                className={`font-semibold ${
                                  notification.isRead
                                    ? 'text-gray-900'
                                    : 'text-gray-900 font-bold'
                                }`}
                              >
                                {notification.title}
                              </h3>
                              <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
                                {formatTime(notification.createdAt)}
                              </span>
                            </div>
                            <p
                              className={`text-sm mb-2 ${
                                notification.isRead ? 'text-gray-600' : 'text-gray-700'
                              }`}
                            >
                              {notification.message}
                            </p>
                            {notification.priority === 'HIGH' ||
                            notification.priority === 'URGENT' ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  notification.priority === 'URGENT'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}
                              >
                                {notification.priority === 'URGENT'
                                  ? 'Urgente'
                                  : 'Alta Prioridad'}
                              </span>
                            ) : null}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Marcar como leida"
                                disabled={markAsRead.isPending}
                              >
                                <CheckIcon className="h-4 w-4 text-gray-600" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                              disabled={deleteNotification.isPending}
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination */}
                {notifications.length > 0 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Mostrando {notifications.length} de {totalNotifications}{' '}
                      notificaciones
                      {totalPages > 1 &&
                        ` (Pagina ${currentPage} de ${totalPages})`}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                      >
                        Siguiente
                      </Button>
                    </div>
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
