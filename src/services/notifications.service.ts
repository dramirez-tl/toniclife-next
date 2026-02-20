// notifications.service.ts - Service for Notifications API

import api from '@/lib/api';
import type {
  Notification,
  NotificationQueryParams,
  PaginatedNotifications,
  SendNotificationDto,
  SendBulkNotificationDto,
  NotificationPreferences,
  UpdatePreferencesDto,
} from '@/types/notification';

class NotificationsService {
  // ================================
  // SEND NOTIFICATIONS (ADMIN)
  // ================================

  async sendNotification(dto: SendNotificationDto): Promise<Notification> {
    const response = await api.post<Notification>('/notifications/send', dto);
    return response.data;
  }

  async sendBulkNotification(dto: SendBulkNotificationDto): Promise<{ sent: number }> {
    const response = await api.post<{ sent: number }>('/notifications/send/bulk', dto);
    return response.data;
  }

  // ================================
  // MY NOTIFICATIONS (CURRENT USER)
  // ================================

  async getMyNotifications(params: NotificationQueryParams = {}): Promise<PaginatedNotifications> {
    const queryParams = new URLSearchParams();

    if (params.category) queryParams.append('category', params.category);
    if (params.isRead !== undefined) queryParams.append('isRead', String(params.isRead));
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const queryString = queryParams.toString();
    const response = await api.get<PaginatedNotifications>(
      `/notifications/me${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  }

  async getUnreadCount(): Promise<{ count: number }> {
    const response = await api.get<{ count: number }>('/notifications/me/unread-count');
    return response.data;
  }

  async markAsRead(notificationIds: string[]): Promise<void> {
    await api.patch('/notifications/me/read', { notificationIds });
  }

  async markAllAsRead(): Promise<void> {
    await api.patch('/notifications/me/read-all');
  }

  async deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/me/${id}`);
  }

  // ================================
  // PREFERENCES
  // ================================

  async getPreferences(): Promise<NotificationPreferences> {
    const response = await api.get<NotificationPreferences>('/notifications/preferences');
    return response.data;
  }

  async updatePreferences(dto: UpdatePreferencesDto): Promise<NotificationPreferences> {
    const response = await api.patch<NotificationPreferences>(
      '/notifications/preferences',
      dto
    );
    return response.data;
  }

  // ================================
  // ADMIN: USER NOTIFICATIONS
  // ================================

  async getUserPreferences(userId: string): Promise<any> {
    const response = await api.get(`/notifications/user/${userId}/preferences`);
    return response.data;
  }

  async getUserNotifications(
    userId: string,
    params: NotificationQueryParams = {}
  ): Promise<PaginatedNotifications> {
    const queryParams = new URLSearchParams();

    if (params.category) queryParams.append('category', params.category);
    if (params.isRead !== undefined) queryParams.append('isRead', String(params.isRead));
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.page) queryParams.append('page', String(params.page));
    if (params.limit) queryParams.append('limit', String(params.limit));

    const queryString = queryParams.toString();
    const response = await api.get<PaginatedNotifications>(
      `/notifications/user/${userId}${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  }
}

export const notificationsService = new NotificationsService();
export default notificationsService;
