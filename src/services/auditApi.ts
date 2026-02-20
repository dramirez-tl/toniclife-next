// services/auditApi.ts - API service para auditoria (axios)

import api from '@/lib/axios';
import type {
  AuditLog,
  AuditLogsListResponse,
  AuditStats,
  AuditAlert,
  AuditFilters,
  AlertStatus,
  TimelineEntry,
  TopUser,
  SuspiciousPatterns,
  UserComparison,
  ExportFilters,
} from '@/types/audit';

// ===== API SERVICE =====

class AuditApi {
  // ================================
  // LOGS DE AUDITORIA
  // ================================

  /**
   * Obtener lista de logs con filtros
   * Backend: GET /audit/logs
   */
  async getLogs(filters: AuditFilters = {}): Promise<AuditLogsListResponse> {
    const params: Record<string, string> = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    });

    const { data } = await api.get<AuditLogsListResponse>('/audit/logs', { params });
    return data;
  }

  /**
   * Obtener log especifico
   * Backend: GET /audit/logs/:id
   */
  async getLog(id: string): Promise<AuditLog | null> {
    const { data } = await api.get<AuditLog | null>(`/audit/logs/${id}`);
    return data;
  }

  /**
   * Obtener estadisticas
   * Backend: GET /audit/logs/stats
   */
  async getStats(startDate?: string, endDate?: string): Promise<AuditStats> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const { data } = await api.get<AuditStats>('/audit/logs/stats', { params });
    return data;
  }

  /**
   * Obtener historial de una entidad
   * Backend: GET /audit/entity/:entityType/:entityId
   */
  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    const { data } = await api.get<AuditLog[]>(`/audit/entity/${entityType}/${entityId}`);
    return data;
  }

  /**
   * Marcar log como revisado
   * Backend: PATCH /audit/logs/:id/review
   */
  async markAsReviewed(id: string, notes?: string): Promise<void> {
    await api.patch(`/audit/logs/${id}/review`, { notes });
  }

  /**
   * Obtener alertas pendientes
   * Backend: GET /audit/alerts
   */
  async getAlerts(severity?: string): Promise<AuditAlert[]> {
    const params: Record<string, string> = {};
    if (severity) params.severity = severity;

    const { data } = await api.get<AuditAlert[]>('/audit/alerts', { params });
    return data;
  }

  /**
   * Actualizar estado de alerta
   * Backend: PATCH /audit/alerts/:id/status
   */
  async updateAlertStatus(id: string, status: AlertStatus, notes?: string): Promise<void> {
    await api.patch(`/audit/alerts/${id}/status`, { status, notes });
  }

  // ================================
  // SUPER USUARIO - METODOS AVANZADOS
  // ================================

  /**
   * Obtener historial de un usuario especifico
   * Backend: GET /audit/user/:userId
   */
  async getUserHistory(userId: string, limit = 100): Promise<AuditLog[]> {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);

    const { data } = await api.get<AuditLog[]>(`/audit/user/${userId}`, { params });
    return data;
  }

  /**
   * Obtener timeline de acciones agrupadas por dia
   * Backend: GET /audit/timeline
   */
  async getTimeline(startDate: string, endDate: string, userId?: string): Promise<TimelineEntry[]> {
    const params: Record<string, string> = { startDate, endDate };
    if (userId) params.userId = userId;

    const { data } = await api.get<TimelineEntry[]>('/audit/timeline', { params });
    return data;
  }

  /**
   * Obtener usuarios mas activos
   * Backend: GET /audit/top-users
   */
  async getTopUsers(startDate?: string, endDate?: string, limit = 10): Promise<TopUser[]> {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (limit) params.limit = String(limit);

    const { data } = await api.get<TopUser[]>('/audit/top-users', { params });
    return data;
  }

  /**
   * Detectar patrones sospechosos
   * Backend: GET /audit/patterns
   */
  async detectPatterns(startDate: string, endDate: string): Promise<SuspiciousPatterns> {
    const { data } = await api.get<SuspiciousPatterns>('/audit/patterns', {
      params: { startDate, endDate },
    });
    return data;
  }

  /**
   * Comparar actividad entre dos usuarios
   * Backend: GET /audit/compare-users
   */
  async compareUsers(userId1: string, userId2: string, startDate?: string, endDate?: string): Promise<UserComparison> {
    const params: Record<string, string> = { userId1, userId2 };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    const { data } = await api.get<UserComparison>('/audit/compare-users', { params });
    return data;
  }

  /**
   * Obtener acciones recientes con filtro de riesgo
   * Backend: GET /audit/recent
   */
  async getRecentActions(limit = 50, riskLevels?: string[]): Promise<AuditLog[]> {
    const params: Record<string, string> = {};
    if (limit) params.limit = String(limit);
    if (riskLevels?.length) params.riskLevels = riskLevels.join(',');

    const { data } = await api.get<AuditLog[]>('/audit/recent', { params });
    return data;
  }

  // ================================
  // ALERT MANAGEMENT
  // ================================

  /**
   * Crear una nueva alerta
   * Backend: POST /audit/alerts
   */
  async createAlert(dto: { alertType: string; severity: string; title: string; description?: string }): Promise<{ id: string } | null> {
    const { data } = await api.post<{ id: string }>('/audit/alerts', dto);
    return data;
  }

  /**
   * Obtener reglas de alertas
   * Backend: GET /audit/alerts/rules
   */
  async getAlertRules(): Promise<any[]> {
    const { data } = await api.get<any[]>('/audit/alerts/rules');
    return data;
  }

  /**
   * Obtener estadisticas de alertas
   * Backend: GET /audit/alerts/stats
   */
  async getAlertStats(): Promise<{
    pending: number;
    acknowledged: number;
    resolved: number;
    bySeverity: Record<string, number>;
  }> {
    const { data } = await api.get('/audit/alerts/stats');
    return data;
  }

  // ================================
  // RETENTION MANAGEMENT
  // ================================

  /**
   * Obtener politicas de retencion
   * Backend: GET /audit/retention/policies
   */
  async getRetentionPolicies(): Promise<any[]> {
    const { data } = await api.get<any[]>('/audit/retention/policies');
    return data;
  }

  /**
   * Obtener estadisticas de retencion
   * Backend: GET /audit/retention/stats
   */
  async getRetentionStats(): Promise<any> {
    const { data } = await api.get('/audit/retention/stats');
    return data;
  }

  /**
   * Obtener logs agrupados por antiguedad
   * Backend: GET /audit/retention/logs-by-age
   */
  async getLogsByAge(): Promise<any> {
    const { data } = await api.get('/audit/retention/logs-by-age');
    return data;
  }

  /**
   * Ejecutar retencion de logs
   * Backend: POST /audit/retention/execute
   */
  async executeRetention(): Promise<any> {
    const { data } = await api.post('/audit/retention/execute');
    return data;
  }

  /**
   * Archivar logs
   * Backend: POST /audit/retention/archive
   */
  async archiveLogs(dto?: { before?: string; startDate?: string; endDate?: string; dryRun?: boolean }): Promise<any> {
    // Map 'before' to 'endDate' if provided for backward compatibility with hooks
    const body: Record<string, any> = { ...dto };
    if (dto?.before && !dto.endDate) {
      body.endDate = dto.before;
    }
    const { data } = await api.post('/audit/retention/archive', body);
    return data;
  }

  /**
   * Purgar logs
   * Backend: POST /audit/retention/purge
   */
  async purgeLogs(dto?: { before?: string; additionalRetentionDays?: number }): Promise<any> {
    const params: Record<string, string> = {};
    if (dto?.additionalRetentionDays) params.additionalRetentionDays = String(dto.additionalRetentionDays);

    const { data } = await api.post('/audit/retention/purge', {}, { params });
    return data;
  }

  /**
   * Exportar logs para evidencia
   * Backend: POST /audit/export
   */
  async exportLogs(startDate: string, endDate: string, filters?: ExportFilters): Promise<AuditLog[]> {
    const { data } = await api.post<AuditLog[]>('/audit/export', { startDate, endDate, filters });
    return data;
  }
}

export const auditApi = new AuditApi();
