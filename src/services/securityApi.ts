// services/securityApi.ts - API service para seguridad y backups

import api from '@/lib/api';
import {
  Backup,
  BackupListResponse,
  BackupStats,
  BackupSettings,
  SecuritySettings,
  SecurityEventListResponse,
  CreateBackupDto,
} from '@/types/security';

// Default values para cuando los endpoints no existen
const DEFAULT_BACKUP_STATS: BackupStats = {
  totalBackups: 0,
  totalSizeBytes: 0,
  totalSizeFormatted: '0 MB',
  lastBackupDate: null,
  nextScheduledBackup: null,
  successRate: 100,
};

const DEFAULT_BACKUP_SETTINGS: BackupSettings = {
  autoBackupEnabled: false,
  backupFrequency: 'daily',
  backupTime: '03:00',
  retentionDays: 30,
  includeDatabase: true,
  includeFiles: true,
  includeImages: true,
  cloudBackupEnabled: false,
  encryptBackups: false,
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  twoFactorRequired: false,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  passwordExpiryDays: 0,
  ipWhitelistEnabled: false,
  auditLoggingEnabled: true,
  ipWhitelist: [],
};

export const securityApi = {
  // ================================
  // BACKUPS
  // ================================

  // TODO: Endpoint no implementado en backend
  /**
   * Obtener lista de backups
   */
  async getBackups(page = 1, limit = 20): Promise<BackupListResponse> {
    try {
      const response = await api.get<BackupListResponse>('/backups', {
        params: { page, limit },
      });
      return response.data;
    } catch {
      // Endpoint no implementado - retornar lista vacía
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }
  },

  // TODO: Endpoint no implementado en backend
  /**
   * Obtener estadísticas de backups
   */
  async getBackupStats(): Promise<BackupStats> {
    try {
      const response = await api.get<BackupStats>('/backups/stats');
      return response.data;
    } catch {
      // Endpoint no implementado - retornar defaults
      return DEFAULT_BACKUP_STATS;
    }
  },

  // TODO: Endpoint no implementado en backend
  /**
   * Crear backup manual
   */
  async createBackup(data: CreateBackupDto = {}): Promise<Backup> {
    const response = await api.post<Backup>('/backups', data);
    return response.data;
  },

  // TODO: Endpoint no implementado en backend
  /**
   * Descargar backup
   */
  async downloadBackup(id: string): Promise<Blob> {
    const response = await api.get(`/backups/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // TODO: Endpoint no implementado en backend
  /**
   * Restaurar backup
   */
  async restoreBackup(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/backups/${id}/restore`);
    return response.data;
  },

  // TODO: Endpoint no implementado en backend
  /**
   * Eliminar backup
   */
  async deleteBackup(id: string): Promise<void> {
    await api.delete(`/backups/${id}`);
  },

  // ================================
  // BACKUP SETTINGS
  // ================================

  // TODO: Endpoint no implementado en backend
  /**
   * Obtener configuración de backups
   */
  async getBackupSettings(): Promise<BackupSettings> {
    try {
      const response = await api.get<BackupSettings>('/settings/backup');
      return response.data;
    } catch {
      // Endpoint no implementado - retornar defaults
      return DEFAULT_BACKUP_SETTINGS;
    }
  },

  // TODO: Endpoint no implementado en backend
  /**
   * Actualizar configuración de backups
   */
  async updateBackupSettings(settings: Partial<BackupSettings>): Promise<BackupSettings> {
    const response = await api.put<BackupSettings>('/settings/backup', settings);
    return response.data;
  },

  // ================================
  // SECURITY SETTINGS
  // ================================

  // TODO: Endpoint no implementado en backend
  /**
   * Obtener configuración de seguridad
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const response = await api.get<SecuritySettings>('/settings/security');
      return response.data;
    } catch {
      // Endpoint no implementado - retornar defaults
      return DEFAULT_SECURITY_SETTINGS;
    }
  },

  // TODO: Endpoint no implementado en backend
  /**
   * Actualizar configuración de seguridad
   */
  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
    const response = await api.put<SecuritySettings>('/settings/security', settings);
    return response.data;
  },

  // ================================
  // SECURITY EVENTS
  // ================================

  // TODO: Endpoint no implementado en backend
  /**
   * Obtener eventos de seguridad
   */
  async getSecurityEvents(page = 1, limit = 20): Promise<SecurityEventListResponse> {
    try {
      const response = await api.get<SecurityEventListResponse>('/security/events', {
        params: { page, limit },
      });
      return response.data;
    } catch {
      // Endpoint no implementado - retornar lista vacía
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }
  },
};
