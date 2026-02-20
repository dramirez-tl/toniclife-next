// types/security.ts - Tipos para sistema de seguridad y backups

export type BackupStatus = 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'SCHEDULED';
export type BackupType = 'AUTOMATIC' | 'MANUAL';

export interface Backup {
  id: string;
  name: string;
  type: BackupType;
  size: string;
  sizeBytes: number;
  status: BackupStatus;
  duration?: string;
  durationMs?: number;
  includeDatabase: boolean;
  includeFiles: boolean;
  includeMedia: boolean;
  encrypted: boolean;
  cloudUploaded: boolean;
  cloudUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BackupListResponse {
  data: Backup[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BackupStats {
  totalBackups: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  lastBackupDate: string | null;
  nextScheduledBackup: string | null;
  successRate: number;
}

export interface BackupSettings {
  autoBackupEnabled: boolean;
  backupFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  backupTime: string;
  retentionDays: number;
  includeDatabase: boolean;
  includeFiles: boolean;
  includeImages: boolean;
  cloudBackupEnabled: boolean;
  encryptBackups: boolean;
}

export interface SecuritySettings {
  twoFactorRequired: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  passwordExpiryDays: number;
  ipWhitelistEnabled: boolean;
  auditLoggingEnabled: boolean;
  ipWhitelist?: string[];
}

export interface SecurityEvent {
  id: string;
  type: 'SUCCESS' | 'WARNING' | 'ERROR';
  event: string;
  user: string;
  userEmail?: string;
  ip: string;
  timestamp: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityEventListResponse {
  data: SecurityEvent[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateBackupDto {
  name?: string;
  includeDatabase?: boolean;
  includeFiles?: boolean;
  includeMedia?: boolean;
  encrypt?: boolean;
  uploadToCloud?: boolean;
}
