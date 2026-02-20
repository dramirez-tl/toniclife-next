// useNotifications.ts - React Query hooks for Notifications API

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '@/services/notifications.service';
import type {
  NotificationQueryParams,
  SendNotificationDto,
  SendBulkNotificationDto,
  UpdatePreferencesDto,
} from '@/types/notification';

// ================================
// QUERY KEYS
// ================================

export const notificationKeys = {
  all: ['notifications'] as const,
  myNotifications: (params?: NotificationQueryParams) =>
    [...notificationKeys.all, 'me', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  userNotifications: (userId: string, params?: NotificationQueryParams) =>
    [...notificationKeys.all, 'user', userId, params] as const,
  userPreferences: (userId: string) =>
    [...notificationKeys.all, 'user', userId, 'preferences'] as const,
};

// ================================
// MY NOTIFICATIONS HOOKS
// ================================

export function useMyNotifications(params?: NotificationQueryParams) {
  return useQuery({
    queryKey: notificationKeys.myNotifications(params),
    queryFn: () => notificationsService.getMyNotifications(params),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
    staleTime: 30 * 1000, // 30 seconds for frequent refresh
  });
}

// ================================
// MUTATION HOOKS
// ================================

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationIds: string[]) =>
      notificationsService.markAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// ================================
// ADMIN HOOKS
// ================================

export function useSendNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SendNotificationDto) =>
      notificationsService.sendNotification(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useSendBulkNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SendBulkNotificationDto) =>
      notificationsService.sendBulkNotification(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useUserNotifications(userId: string | null, params?: NotificationQueryParams) {
  return useQuery({
    queryKey: notificationKeys.userNotifications(userId || '', params),
    queryFn: () => notificationsService.getUserNotifications(userId!, params),
    enabled: !!userId,
  });
}

/**
 * Hook para obtener preferencias de notificación de un usuario específico (admin)
 */
export function useUserNotificationPreferences(userId: string | null) {
  return useQuery({
    queryKey: notificationKeys.userPreferences(userId || ''),
    queryFn: () => notificationsService.getUserPreferences(userId!),
    enabled: !!userId,
  });
}

// ================================
// PREFERENCES HOOKS
// ================================

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationsService.getPreferences(),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdatePreferencesDto) =>
      notificationsService.updatePreferences(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}
