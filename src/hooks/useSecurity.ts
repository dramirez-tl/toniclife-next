// hooks/useSecurity.ts - React Query hooks para seguridad y backups

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi } from '@/services/securityApi';
import {
  BackupListResponse,
  BackupStats,
  BackupSettings,
  SecuritySettings,
  SecurityEventListResponse,
  CreateBackupDto,
  Backup,
} from '@/types/security';

// Query keys
export const securityKeys = {
  all: ['security'] as const,
  backups: () => [...securityKeys.all, 'backups'] as const,
  backupsList: (page: number, limit: number) => [...securityKeys.backups(), page, limit] as const,
  backupStats: () => [...securityKeys.backups(), 'stats'] as const,
  backupSettings: () => [...securityKeys.all, 'backup-settings'] as const,
  securitySettings: () => [...securityKeys.all, 'security-settings'] as const,
  securityEvents: (page: number, limit: number) => [...securityKeys.all, 'events', page, limit] as const,
};

// ================================
// BACKUPS HOOKS
// ================================

/**
 * Hook para obtener lista de backups
 */
export function useBackups(page = 1, limit = 20) {
  return useQuery<BackupListResponse>({
    queryKey: securityKeys.backupsList(page, limit),
    queryFn: () => securityApi.getBackups(page, limit),
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para obtener estadísticas de backups
 */
export function useBackupStats() {
  return useQuery<BackupStats>({
    queryKey: securityKeys.backupStats(),
    queryFn: () => securityApi.getBackupStats(),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para crear backup manual
 */
export function useCreateBackup() {
  const queryClient = useQueryClient();

  return useMutation<Backup, Error, CreateBackupDto>({
    mutationFn: (data) => securityApi.createBackup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.backups() });
      queryClient.invalidateQueries({ queryKey: securityKeys.backupStats() });
    },
  });
}

/**
 * Hook para descargar backup
 */
export function useDownloadBackup() {
  return useMutation<Blob, Error, string>({
    mutationFn: (id) => securityApi.downloadBackup(id),
  });
}

/**
 * Hook para restaurar backup
 */
export function useRestoreBackup() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: (id) => securityApi.restoreBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.backups() });
    },
  });
}

/**
 * Hook para eliminar backup
 */
export function useDeleteBackup() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => securityApi.deleteBackup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.backups() });
      queryClient.invalidateQueries({ queryKey: securityKeys.backupStats() });
    },
  });
}

// ================================
// SETTINGS HOOKS
// ================================

/**
 * Hook para obtener configuración de backups
 */
export function useBackupSettings() {
  return useQuery<BackupSettings>({
    queryKey: securityKeys.backupSettings(),
    queryFn: () => securityApi.getBackupSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para actualizar configuración de backups
 */
export function useUpdateBackupSettings() {
  const queryClient = useQueryClient();

  return useMutation<BackupSettings, Error, Partial<BackupSettings>>({
    mutationFn: (settings) => securityApi.updateBackupSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.backupSettings() });
    },
  });
}

/**
 * Hook para obtener configuración de seguridad
 */
export function useSecuritySettings() {
  return useQuery<SecuritySettings>({
    queryKey: securityKeys.securitySettings(),
    queryFn: () => securityApi.getSecuritySettings(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para actualizar configuración de seguridad
 */
export function useUpdateSecuritySettings() {
  const queryClient = useQueryClient();

  return useMutation<SecuritySettings, Error, Partial<SecuritySettings>>({
    mutationFn: (settings) => securityApi.updateSecuritySettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: securityKeys.securitySettings() });
    },
  });
}

// ================================
// SECURITY EVENTS HOOKS
// ================================

/**
 * Hook para obtener eventos de seguridad
 */
export function useSecurityEvents(page = 1, limit = 20) {
  return useQuery<SecurityEventListResponse>({
    queryKey: securityKeys.securityEvents(page, limit),
    queryFn: () => securityApi.getSecurityEvents(page, limit),
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Refetch cada minuto
  });
}

// ================================
// COMBINED HOOKS
// ================================

/**
 * Hook combinado para dashboard de seguridad
 */
export function useSecurityDashboard() {
  const backupsQuery = useBackups(1, 5);
  const backupStatsQuery = useBackupStats();
  const securityEventsQuery = useSecurityEvents(1, 5);
  const backupSettingsQuery = useBackupSettings();
  const securitySettingsQuery = useSecuritySettings();

  return {
    backups: backupsQuery.data?.data,
    backupStats: backupStatsQuery.data,
    securityEvents: securityEventsQuery.data?.data,
    backupSettings: backupSettingsQuery.data,
    securitySettings: securitySettingsQuery.data,
    isLoading:
      backupsQuery.isLoading ||
      backupStatsQuery.isLoading ||
      securityEventsQuery.isLoading,
    isError:
      backupsQuery.isError ||
      backupStatsQuery.isError ||
      securityEventsQuery.isError,
    refetch: () => {
      backupsQuery.refetch();
      backupStatsQuery.refetch();
      securityEventsQuery.refetch();
    },
  };
}
