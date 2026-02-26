'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { PermissionGuard } from '@/components/auth';
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  ServerIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuditLogs, useAuditStats, useExportLogs } from '@/hooks/useAudit';
import { AuditLog, RiskLevel, ACTION_CATEGORIES } from '@/types/audit';

export default function LogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<RiskLevel | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch audit logs from API
  const { data: logsData, isLoading, error, refetch } = useAuditLogs({
    search: searchQuery || undefined,
    riskLevel: filterRiskLevel !== 'all' ? filterRiskLevel : undefined,
    actionCategory: filterCategory !== 'all' ? filterCategory : undefined,
    page,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Fetch stats
  const { data: stats } = useAuditStats();

  // Export mutation
  const exportLogs = useExportLogs();

  const logs = logsData?.data || [];
  const totalPages = logsData?.totalPages || 1;

  // Get unique categories from API or use default
  const categories = useMemo(() => {
    return ACTION_CATEGORIES.map(c => c.value);
  }, []);

  // Calculate stats from data
  const localStats = useMemo(() => ({
    total: stats?.totalLogs || 0,
    errors: stats?.failedOperations || 0,
    warnings: stats?.byRiskLevel?.high || 0,
    info: (stats?.byRiskLevel?.low || 0) + (stats?.byRiskLevel?.medium || 0),
    critical: stats?.byRiskLevel?.critical || 0,
  }), [stats]);

  const handleExport = async () => {
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      await exportLogs.mutateAsync({
        startDate: thirtyDaysAgo.toISOString(),
        endDate: today.toISOString(),
      });
      toast.success('Logs exportados correctamente');
    } catch {
      toast.error('Error al exportar logs');
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Logs actualizados');
  };

  const getRiskLevelBadge = (riskLevel: string | null) => {
    switch (riskLevel) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
            <XCircleIcon className="h-3 w-3" />
            Crítico
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
            <ExclamationTriangleIcon className="h-3 w-3" />
            Alto
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
            <ExclamationTriangleIcon className="h-3 w-3" />
            Medio
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            Bajo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            <InformationCircleIcon className="h-3 w-3" />
            Info
          </span>
        );
    }
  };

  const getSuccessBadge = (success: boolean | null) => {
    if (success === false) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
          <XCircleIcon className="h-3 w-3" />
          Error
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <CheckCircleIcon className="h-3 w-3" />
        Éxito
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <PermissionGuard permissions={['audit:read']}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs y Auditoría</h1>
            <p className="text-gray-600">Registros del sistema y métricas</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse border-l-4 border-gray-200 p-4 rounded-r-lg bg-gray-50">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </PermissionGuard>
    );
  }

  if (error) {
    return (
      <PermissionGuard permissions={['audit:read']}>
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Error al cargar logs</h3>
            <p className="text-gray-600 mb-4">No se pudieron cargar los registros del sistema</p>
            <Button variant="primary" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permissions={['audit:read']}>
    <div className="p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs y Auditoría</h1>
          <p className="text-gray-600">Registros del sistema y métricas de rendimiento</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<ArrowPathIcon className="h-5 w-5" />}
            onClick={handleRefresh}
          >
            Actualizar
          </Button>
          <Button
            variant="primary"
            leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
            onClick={handleExport}
            disabled={exportLogs.isPending}
          >
            {exportLogs.isPending ? 'Exportando...' : 'Exportar Logs'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">{localStats.total.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Críticos</p>
                <p className="text-2xl font-bold text-red-600">{localStats.critical}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircleIcon className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Alto Riesgo</p>
                <p className="text-2xl font-bold text-orange-600">{localStats.warnings}</p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Operaciones Fallidas</p>
                <p className="text-2xl font-bold text-yellow-600">{localStats.errors}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <ServerIcon className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendientes de Revisión</p>
                <p className="text-2xl font-bold text-purple-600">{stats?.pendingReviews || 0}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>
            </div>

            {/* Risk Level Filter */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={filterRiskLevel}
                onChange={(e) => setFilterRiskLevel(e.target.value as RiskLevel | 'all')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
              >
                <option value="all">Todos los Niveles</option>
                <option value="critical">Crítico</option>
                <option value="high">Alto</option>
                <option value="medium">Medio</option>
                <option value="low">Bajo</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
              >
                <option value="all">Todas las Categorías</option>
                {ACTION_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Auto Refresh */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => {
                  setAutoRefresh(e.target.checked);
                  toast.info(e.target.checked ? 'Auto-refresh activado' : 'Auto-refresh desactivado');
                }}
                className="w-5 h-5 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
              />
              <span className="text-sm font-medium text-gray-700">Auto-refresh</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {logs.map((log: AuditLog) => (
              <div
                key={log.id}
                className={`border-l-4 p-4 rounded-r-lg ${
                  log.riskLevel === 'critical' ? 'border-red-500 bg-red-50' :
                  log.riskLevel === 'high' ? 'border-orange-500 bg-orange-50' :
                  log.riskLevel === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-green-500 bg-green-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    {getRiskLevelBadge(log.riskLevel)}
                    {getSuccessBadge(log.success)}
                    {log.actionCategory && (
                      <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {ACTION_CATEGORIES.find(c => c.value === log.actionCategory)?.label || log.actionCategory}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{formatTimestamp(log.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <p className="font-semibold text-gray-900 mb-1">{log.action}</p>
                {log.description && (
                  <p className="text-sm text-gray-700 mb-2">{log.description}</p>
                )}
                {(log.oldValues || log.newValues) && (
                  <div className="text-sm text-gray-700 mb-2 font-mono bg-white/50 p-2 rounded">
                    {log.oldValues && (
                      <div><span className="text-red-600">-</span> {JSON.stringify(log.oldValues)}</div>
                    )}
                    {log.newValues && (
                      <div><span className="text-green-600">+</span> {JSON.stringify(log.newValues)}</div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                  {log.userName && (
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-3 w-3" />
                      <span>{log.userName}</span>
                    </div>
                  )}
                  {log.ipAddress && (
                    <span>IP: {log.ipAddress}</span>
                  )}
                  {log.entityName && (
                    <span>Entidad: {log.entityName}</span>
                  )}
                  {log.branchName && (
                    <span>Sucursal: {log.branchName}</span>
                  )}
                  {log.duration && (
                    <span>Duración: {log.duration}ms</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {logs.length === 0 && (
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                No se encontraron logs
              </h3>
              <p className="text-gray-600">
                Intenta ajustar los filtros de búsqueda
              </p>
            </div>
          )}

          {/* Pagination */}
          {logs.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Página {page} de {totalPages} ({logsData?.total || 0} registros)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </PermissionGuard>
  );
}
