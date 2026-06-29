'use client';

import { useMemo, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

// Los ids (all/orders/commission/...) son códigos de categoría; la etiqueta
// visible se traduce vía t('categories.<id>').
const CATEGORY_FILTER_IDS: CategoryFilterId[] = [
  'all',
  'orders',
  'commission',
  'network',
  'mlm',
  'alert',
  'system',
  'general',
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
  return <Suspense><NotificacionesContent /></Suspense>;
}

function NotificacionesContent() {
  const t = useTranslations('distributor.notifications');
  const { get, getNumber, setParams } = useQueryFilters({ category: 'all', read: 'all', page: '1' });
  const filterCategory = get('category') as CategoryFilterId;
  const filterRead = get('read') as 'all' | 'unread' | 'read';
  const currentPage = getNumber('page') || 1;
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
        error.response?.data?.message || t('toast.markReadError')
      );
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
      toast.success(t('toast.allRead'));
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || t('toast.allReadError')
      );
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification.mutateAsync(notificationId);
      toast.success(t('toast.deleted'));
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || t('toast.deleteError')
      );
    }
  };

  const handleFilterCategory = (id: CategoryFilterId) => {
    setParams({ category: id });
  };

  const handleFilterRead = (status: 'all' | 'unread' | 'read') => {
    setParams({ read: status });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('time.now');
    if (diffMins < 60) return t('time.minutes', { count: diffMins });
    if (diffHours < 24) return t('time.hours', { count: diffHours });
    if (diffDays === 1) return t('time.yesterday');
    if (diffDays < 7) return t('time.days', { count: diffDays });
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  // ================================
  // LOADING STATE
  // ================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <BellIcon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">{t('title')}</h1>
            </div>
            <p className="text-white/80 text-lg">{t('loading')}</p>
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
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex items-center gap-3 mb-2">
              <BellIcon className="h-10 w-10" />
              <h1 className="text-4xl font-bold">{t('title')}</h1>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-red-700">
                <ExclamationTriangleIcon className="h-6 w-6" />
                <p>{t('error.body')}</p>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => refetch()}
              >
                <ArrowPathIcon className="h-4 w-4" />
                {t('error.retry')}
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
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
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
                <h1 className="text-4xl font-bold">{t('title')}</h1>
              </div>
              <p className="text-white/80 text-lg">
                {t('subtitle')}
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/distribuidor">
                <Button variant="secondary">{t('backToPanel')}</Button>
              </Link>
              <Button
                variant="default"
                onClick={() => toast.info(t('preferencesSoon'))}
              >
                <Cog6ToothIcon className="h-5 w-5" />
                {t('preferences')}
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
                    {t('unreadBanner', { count: unreadCount })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsRead.isPending}
                  >
                    <CheckIcon className="h-4 w-4" />
                    {markAllAsRead.isPending
                      ? t('markingAll')
                      : t('markAllRead')}
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
                <h3 className="font-bold text-gray-900 mb-4">{t('filterByType')}</h3>
                <div className="space-y-2">
                  {CATEGORY_FILTER_IDS.map((catId) => (
                    <button
                      key={catId}
                      onClick={() => handleFilterCategory(catId)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                        filterCategory === catId
                          ? 'bg-[#3E667D] text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className="text-sm font-medium">{t(`categories.${catId}` as never)}</span>
                      {catId !== 'all' && categoryCounts[catId] !== undefined && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            filterCategory === catId
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {categoryCounts[catId]}
                        </span>
                      )}
                      {catId === 'all' && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            filterCategory === catId
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

                <h3 className="font-bold text-gray-900 mb-4">{t('state')}</h3>
                <div className="space-y-2">
                  {(
                    [
                      { value: 'all', label: t('readFilter.all') },
                      { value: 'unread', label: t('readFilter.unread') },
                      { value: 'read', label: t('readFilter.read') },
                    ] as const
                  ).map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleFilterRead(status.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        filterRead === status.value
                          ? 'bg-[#3E667D] text-white font-medium'
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
                  {t('count', { count: totalNotifications })}
                </h2>

                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {t('empty.title')}
                    </h3>
                    <p className="text-gray-600">
                      {t('empty.body')}
                    </p>
                    {(filterCategory !== 'all' || filterRead !== 'all') && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setParams({ category: null, read: null, page: null })}
                      >
                        {t('empty.clearFilters')}
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
                                  ? t('priority.urgent')
                                  : t('priority.high')}
                              </span>
                            ) : null}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            {!notification.isRead && (
                              <button
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title={t('actions.markRead')}
                                disabled={markAsRead.isPending}
                              >
                                <CheckIcon className="h-4 w-4 text-gray-600" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(notification.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('actions.delete')}
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
                      {t('pagination.showing', { shown: notifications.length, total: totalNotifications })}
                      {totalPages > 1 &&
                        t('pagination.page', { current: currentPage, total: totalPages })}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() =>
                          setParams({ page: String(Math.max(1, currentPage - 1)) })
                        }
                      >
                        {t('pagination.previous')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                          setParams({ page: String(Math.min(totalPages, currentPage + 1)) })
                        }
                      >
                        {t('pagination.next')}
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
