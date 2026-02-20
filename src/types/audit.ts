// types/audit.ts - Tipos para sistema de auditoría

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  actionCategory: string | null;
  description: string | null;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  oldValues: Record<string, any> | null;
  newValues: Record<string, any> | null;
  changedFields: string[] | null;
  branchId: string | null;
  branchName: string | null;
  module: string | null;
  sessionId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  duration: number | null;
  success: boolean | null;
  errorMessage: string | null;
  isSensitive: boolean | null;
  riskLevel: RiskLevel | null;
  requiresReview: boolean | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface AuditLogsListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditStats {
  totalLogs: number;
  byRiskLevel: Record<string, number>;
  byCategory: Record<string, number>;
  failedOperations: number;
  pendingReviews: number;
}

export interface AuditAlert {
  id: string;
  auditLogId: string | null;
  alertType: string;
  severity: AlertSeverity;
  title: string;
  description: string | null;
  metadata: Record<string, any> | null;
  status: AlertStatus;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
}

export interface AuditFilters {
  userId?: string;
  action?: string;
  actionCategory?: string;
  entityType?: string;
  entityId?: string;
  riskLevel?: RiskLevel;
  requiresReview?: boolean;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'action' | 'riskLevel' | 'entityType';
  sortOrder?: 'asc' | 'desc';
}

// Risk level display config
export const RISK_LEVEL_CONFIG: Record<RiskLevel, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Bajo', color: 'text-green-700', bgColor: 'bg-green-100' },
  medium: { label: 'Medio', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  high: { label: 'Alto', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  critical: { label: 'Crítico', color: 'text-red-700', bgColor: 'bg-red-100' },
};

// Alert status display config
export const ALERT_STATUS_CONFIG: Record<AlertStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  acknowledged: { label: 'Revisado', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  resolved: { label: 'Resuelto', color: 'text-green-700', bgColor: 'bg-green-100' },
  dismissed: { label: 'Descartado', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

// Action categories
export const ACTION_CATEGORIES = [
  { value: 'AUTH', label: 'Autenticación' },
  { value: 'INVENTORY', label: 'Inventario' },
  { value: 'ORDER', label: 'Pedidos' },
  { value: 'FINANCE', label: 'Finanzas' },
  { value: 'CUSTOMER', label: 'Clientes' },
  { value: 'MLM', label: 'Red MLM' },
  { value: 'ADMIN', label: 'Administración' },
  { value: 'SYSTEM', label: 'Sistema' },
];

// ================================
// SUPER USUARIO - TIPOS AVANZADOS
// ================================

export interface TimelineEntry {
  date: string;
  count: number;
  byRiskLevel: Record<string, number>;
}

export interface TopUser {
  userId: string;
  userEmail: string | null;
  userName: string | null;
  count: number;
  highRiskCount: number;
}

export interface PatternUser {
  userId: string;
  userEmail: string | null;
  count: number;
  avgPerDay?: number;
}

export interface SuspiciousPatterns {
  multipleFailedLogins: PatternUser[];
  highVolumeUsers: PatternUser[];
  offHoursActivity: PatternUser[];
  multipleInventoryAdjustments: PatternUser[];
}

export interface UserComparison {
  user1: {
    userId: string;
    totalActions: number;
    byCategory: Record<string, number>;
    byRiskLevel: Record<string, number>;
  };
  user2: {
    userId: string;
    totalActions: number;
    byCategory: Record<string, number>;
    byRiskLevel: Record<string, number>;
  };
}

export interface ExportFilters {
  userId?: string;
  entityType?: string;
  riskLevel?: string;
  actionCategory?: string;
}
