// hooks/useAudit.ts - React Query hooks para auditoría

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auditApi } from '@/services/auditApi';
import {
  AuditFilters,
  AuditLogsListResponse,
  AuditStats,
  AuditAlert,
  AuditLog,
  AlertStatus,
  TimelineEntry,
  TopUser,
  SuspiciousPatterns,
  UserComparison,
  ExportFilters,
} from '@/types/audit';

// Query keys
export const auditKeys = {
  all: ['audit'] as const,
  logs: () => [...auditKeys.all, 'logs'] as const,
  logsList: (filters: AuditFilters) => [...auditKeys.logs(), filters] as const,
  log: (id: string) => [...auditKeys.logs(), id] as const,
  stats: (startDate?: string, endDate?: string) => [...auditKeys.all, 'stats', startDate, endDate] as const,
  entityHistory: (entityType: string, entityId: string) =>
    [...auditKeys.all, 'entity', entityType, entityId] as const,
  alerts: (severity?: string) => [...auditKeys.all, 'alerts', severity] as const,
  // Super Usuario keys
  userHistory: (userId: string, limit?: number) => [...auditKeys.all, 'user', userId, limit] as const,
  timeline: (startDate: string, endDate: string, userId?: string) =>
    [...auditKeys.all, 'timeline', startDate, endDate, userId] as const,
  topUsers: (startDate?: string, endDate?: string, limit?: number) =>
    [...auditKeys.all, 'topUsers', startDate, endDate, limit] as const,
  patterns: (startDate: string, endDate: string) =>
    [...auditKeys.all, 'patterns', startDate, endDate] as const,
  compareUsers: (userId1: string, userId2: string, startDate?: string, endDate?: string) =>
    [...auditKeys.all, 'compare', userId1, userId2, startDate, endDate] as const,
  recentActions: (limit?: number, riskLevels?: string[]) =>
    [...auditKeys.all, 'recent', limit, riskLevels] as const,
  // Alert management keys
  alertRules: () => [...auditKeys.all, 'alertRules'] as const,
  alertStats: () => [...auditKeys.all, 'alertStats'] as const,
  // Retention management keys
  retentionPolicies: () => [...auditKeys.all, 'retentionPolicies'] as const,
  retentionStats: () => [...auditKeys.all, 'retentionStats'] as const,
  logsByAge: () => [...auditKeys.all, 'logsByAge'] as const,
};

/**
 * Hook para obtener lista de logs con filtros
 */
export function useAuditLogs(filters: AuditFilters = {}) {
  return useQuery<AuditLogsListResponse>({
    queryKey: auditKeys.logsList(filters),
    queryFn: () => auditApi.getLogs(filters),
    staleTime: 30 * 1000, // 30 segundos
  });
}

/**
 * Hook para obtener un log específico
 */
export function useAuditLog(id: string) {
  return useQuery<AuditLog | null>({
    queryKey: auditKeys.log(id),
    queryFn: () => auditApi.getLog(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para obtener estadísticas
 */
export function useAuditStats(startDate?: string, endDate?: string) {
  return useQuery<AuditStats>({
    queryKey: auditKeys.stats(startDate, endDate),
    queryFn: () => auditApi.getStats(startDate, endDate),
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para obtener historial de una entidad
 */
export function useEntityAuditHistory(entityType: string, entityId: string) {
  return useQuery<AuditLog[]>({
    queryKey: auditKeys.entityHistory(entityType, entityId),
    queryFn: () => auditApi.getEntityHistory(entityType, entityId),
    enabled: !!entityType && !!entityId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para marcar log como revisado
 */
export function useMarkAsReviewed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      auditApi.markAsReviewed(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.logs() });
      queryClient.invalidateQueries({ queryKey: auditKeys.stats() });
    },
  });
}

/**
 * Hook para obtener alertas
 */
export function useAuditAlerts(severity?: string) {
  return useQuery<AuditAlert[]>({
    queryKey: auditKeys.alerts(severity),
    queryFn: () => auditApi.getAlerts(severity),
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Refetch cada minuto
  });
}

/**
 * Hook para actualizar estado de alerta
 */
export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: AlertStatus; notes?: string }) =>
      auditApi.updateAlertStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.alerts() });
    },
  });
}

/**
 * Hook combinado para dashboard de auditoría
 */
export function useAuditDashboard() {
  const statsQuery = useAuditStats();
  const alertsQuery = useAuditAlerts();
  const recentLogsQuery = useAuditLogs({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' });

  return {
    stats: statsQuery.data,
    alerts: alertsQuery.data,
    recentLogs: recentLogsQuery.data?.data,
    isLoading: statsQuery.isLoading || alertsQuery.isLoading || recentLogsQuery.isLoading,
    isError: statsQuery.isError || alertsQuery.isError || recentLogsQuery.isError,
    error: statsQuery.error || alertsQuery.error || recentLogsQuery.error,
  };
}

// ================================
// SUPER USUARIO - HOOKS AVANZADOS
// ================================

/**
 * Hook para obtener historial de un usuario específico
 */
export function useUserAuditHistory(userId: string, limit = 100) {
  return useQuery<AuditLog[]>({
    queryKey: auditKeys.userHistory(userId, limit),
    queryFn: () => auditApi.getUserHistory(userId, limit),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para obtener timeline de acciones
 */
export function useAuditTimeline(startDate: string, endDate: string, userId?: string) {
  return useQuery<TimelineEntry[]>({
    queryKey: auditKeys.timeline(startDate, endDate, userId),
    queryFn: () => auditApi.getTimeline(startDate, endDate, userId),
    enabled: !!startDate && !!endDate,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para obtener usuarios más activos
 */
export function useTopUsers(startDate?: string, endDate?: string, limit = 10) {
  return useQuery<TopUser[]>({
    queryKey: auditKeys.topUsers(startDate, endDate, limit),
    queryFn: () => auditApi.getTopUsers(startDate, endDate, limit),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para detectar patrones sospechosos
 */
export function useSuspiciousPatterns(startDate: string, endDate: string) {
  return useQuery<SuspiciousPatterns>({
    queryKey: auditKeys.patterns(startDate, endDate),
    queryFn: () => auditApi.detectPatterns(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutos - análisis más costoso
  });
}

/**
 * Hook para comparar actividad entre usuarios
 */
export function useCompareUsers(userId1: string, userId2: string, startDate?: string, endDate?: string) {
  return useQuery<UserComparison>({
    queryKey: auditKeys.compareUsers(userId1, userId2, startDate, endDate),
    queryFn: () => auditApi.compareUsers(userId1, userId2, startDate, endDate),
    enabled: !!userId1 && !!userId2,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para obtener acciones recientes con filtro de riesgo
 */
export function useRecentActions(limit = 50, riskLevels?: string[]) {
  return useQuery<AuditLog[]>({
    queryKey: auditKeys.recentActions(limit, riskLevels),
    queryFn: () => auditApi.getRecentActions(limit, riskLevels),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Refresh cada minuto
  });
}

// ================================
// ALERT MANAGEMENT HOOKS
// ================================

/**
 * Hook para crear una alerta
 */
export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: { alertType: string; severity: string; title: string; description?: string }) =>
      auditApi.createAlert(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: auditKeys.alertStats() });
    },
  });
}

/**
 * Hook para obtener reglas de alertas
 */
export function useAlertRules() {
  return useQuery({
    queryKey: auditKeys.alertRules(),
    queryFn: () => auditApi.getAlertRules(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener estadísticas de alertas
 */
export function useAlertStats() {
  return useQuery({
    queryKey: auditKeys.alertStats(),
    queryFn: () => auditApi.getAlertStats(),
    staleTime: 60 * 1000, // 1 minuto
  });
}

// ================================
// RETENTION MANAGEMENT HOOKS
// ================================

/**
 * Hook para obtener políticas de retención
 */
export function useRetentionPolicies() {
  return useQuery({
    queryKey: auditKeys.retentionPolicies(),
    queryFn: () => auditApi.getRetentionPolicies(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener estadísticas de retención
 */
export function useRetentionStats() {
  return useQuery({
    queryKey: auditKeys.retentionStats(),
    queryFn: () => auditApi.getRetentionStats(),
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para obtener logs agrupados por antigüedad
 */
export function useLogsByAge() {
  return useQuery({
    queryKey: auditKeys.logsByAge(),
    queryFn: () => auditApi.getLogsByAge(),
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para ejecutar retención de logs
 */
export function useExecuteRetention() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => auditApi.executeRetention(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.logs() });
      queryClient.invalidateQueries({ queryKey: auditKeys.retentionStats() });
      queryClient.invalidateQueries({ queryKey: auditKeys.logsByAge() });
    },
  });
}

/**
 * Hook para archivar logs
 */
export function useArchiveLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto?: { before?: string }) => auditApi.archiveLogs(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.logs() });
      queryClient.invalidateQueries({ queryKey: auditKeys.retentionStats() });
      queryClient.invalidateQueries({ queryKey: auditKeys.logsByAge() });
    },
  });
}

/**
 * Hook para purgar logs
 */
export function usePurgeLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto?: { before?: string }) => auditApi.purgeLogs(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: auditKeys.logs() });
      queryClient.invalidateQueries({ queryKey: auditKeys.retentionStats() });
      queryClient.invalidateQueries({ queryKey: auditKeys.logsByAge() });
    },
  });
}

/**
 * Hook para exportar logs
 */
export function useExportLogs() {
  return useMutation({
    mutationFn: ({
      startDate,
      endDate,
      filters,
    }: {
      startDate: string;
      endDate: string;
      filters?: ExportFilters;
    }) => auditApi.exportLogs(startDate, endDate, filters),
  });
}

/**
 * Hook combinado para Super Usuario dashboard
 */
export function useSuperUserDashboard(startDate: string, endDate: string) {
  const timelineQuery = useAuditTimeline(startDate, endDate);
  const topUsersQuery = useTopUsers(startDate, endDate, 10);
  const patternsQuery = useSuspiciousPatterns(startDate, endDate);
  const recentActionsQuery = useRecentActions(20, ['high', 'critical']);

  return {
    timeline: timelineQuery.data,
    topUsers: topUsersQuery.data,
    patterns: patternsQuery.data,
    recentHighRiskActions: recentActionsQuery.data,
    isLoading:
      timelineQuery.isLoading ||
      topUsersQuery.isLoading ||
      patternsQuery.isLoading ||
      recentActionsQuery.isLoading,
    isError:
      timelineQuery.isError ||
      topUsersQuery.isError ||
      patternsQuery.isError ||
      recentActionsQuery.isError,
    refetch: () => {
      timelineQuery.refetch();
      topUsersQuery.refetch();
      patternsQuery.refetch();
      recentActionsQuery.refetch();
    },
  };
}
