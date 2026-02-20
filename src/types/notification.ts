// notification.ts - TypeScript types for Notifications module

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'IN_APP';
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type NotificationCategory =
  | 'auth' | 'orders' | 'mlm' | 'billing' | 'system'
  | 'marketing' | 'general' | 'custom'
  | 'commission' | 'rank' | 'network' | 'inventory'
  | 'hr' | 'pos' | 'checkout' | 'delivery'
  | 'payment' | 'refund' | 'alert';

export interface Notification {
  id: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  category: NotificationCategory;
  priority: NotificationPriority;
  isRead: boolean;
  readAt?: string;
  dismissedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationQueryParams {
  category?: NotificationCategory;
  isRead?: boolean;
  priority?: NotificationPriority;
  page?: number;
  limit?: number;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SendNotificationDto {
  userIds: string[];
  title: string;
  message: string;
  channel?: NotificationChannel;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
}

export interface SendBulkNotificationDto {
  targetGroup: 'all' | 'distributors' | 'admins' | 'customers';
  title: string;
  message: string;
  channel?: NotificationChannel;
  category?: NotificationCategory;
  priority?: NotificationPriority;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  mutedCategories: NotificationCategory[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface UpdatePreferencesDto {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  whatsappEnabled?: boolean;
  mutedCategories?: NotificationCategory[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
}
