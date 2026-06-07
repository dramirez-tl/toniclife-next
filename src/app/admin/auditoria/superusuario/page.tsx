'use client';

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  UserIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  EyeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useSuperUserDashboard,
  useTopUsers,
  useExportLogs,
} from '@/hooks/useAudit';
import { RISK_LEVEL_CONFIG } from '@/types/audit';
import { useQueryFilters } from '@/hooks/useQueryFilters';

export default function SuperUserPage() {
  return <Suspense><SuperUserContent /></Suspense>;
}

function SuperUserContent() {
  const { get, setParams } = useQueryFilters({
    quickRange: '7d',
  });

  const quickRange = get('quickRange');

  // Compute dateRange from quickRange
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();

    switch (quickRange) {
      case '24h':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setDate(start.getDate() - 7);
        break;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  }, [quickRange]);

  // Local state for custom date range (overrides quickRange)
  const [customDateRange, setCustomDateRange] = useState<{ startDate: string; endDate: string } | null>(null);

  const effectiveDateRange = customDateRange || dateRange;

  const { timeline, topUsers, patterns, recentHighRiskActions, isLoading, refetch } =
    useSuperUserDashboard(effectiveDateRange.startDate, effectiveDateRange.endDate);

  const exportLogs = useExportLogs();

  // Handle quick date range selection
  const handleQuickRange = (range: string) => {
    setCustomDateRange(null);
    setParams({ quickRange: range });
  };

  // Handle custom date change
  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setParams({ quickRange: null });
    setCustomDateRange((prev) => ({
      startDate: prev?.startDate || dateRange.startDate,
      endDate: prev?.endDate || dateRange.endDate,
      [field]: value,
    }));
  };

  // Calculate timeline stats
  const timelineStats = useMemo(() => {
    if (!timeline || timeline.length === 0) return null;

    const totalActions = timeline.reduce((acc, t) => acc + t.count, 0);
    const avgPerDay = Math.round(totalActions / timeline.length);
    const maxDay = timeline.reduce((max, t) => (t.count > max.count ? t : max), timeline[0]);
    const totalCritical = timeline.reduce((acc, t) => acc + (t.byRiskLevel.critical || 0), 0);
    const totalHigh = timeline.reduce((acc, t) => acc + (t.byRiskLevel.high || 0), 0);

    return { totalActions, avgPerDay, maxDay, totalCritical, totalHigh };
  }, [timeline]);

  // Count suspicious patterns
  const patternCounts = useMemo(() => {
    if (!patterns) return { total: 0, critical: 0 };

    const total =
      (patterns.multipleFailedLogins?.length || 0) +
      (patterns.highVolumeUsers?.length || 0) +
      (patterns.offHoursActivity?.length || 0) +
      (patterns.multipleInventoryAdjustments?.length || 0);

    const critical =
      (patterns.multipleFailedLogins?.length || 0) +
      (patterns.multipleInventoryAdjustments?.length || 0);

    return { total, critical };
  }, [patterns]);

  // Handle export
  const handleExport = async () => {
    try {
      const data = await exportLogs.mutateAsync({
        startDate: effectiveDateRange.startDate,
        endDate: effectiveDateRange.endDate,
      });

      // Create CSV content
      const headers = [
        'Fecha',
        'Usuario',
        'Correo',
        'Acción',
        'Categoría',
        'Descripción',
        'Entidad',
        'Nivel Riesgo',
        'Éxito',
      ];
      const rows = data.map((log) => [
        new Date(log.createdAt).toLocaleString('es-MX'),
        log.userName || 'N/A',
        log.userEmail || 'N/A',
        log.action,
        log.actionCategory || 'N/A',
        log.description || 'N/A',
        log.entityName || 'N/A',
        log.riskLevel || 'N/A',
        log.success ? 'Sí' : 'No',
      ]);

      const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_logs_${effectiveDateRange.startDate}_${effectiveDateRange.endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Exportados ${data.length} registros`);
    } catch {
      toast.error('Error al exportar logs');
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheckIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Super Usuario</h1>
              </div>
              <p className="text-white/80 text-lg">
                Análisis avanzado y monitoreo de seguridad
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/auditoria">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Período:</span>
              </div>

              {/* Quick range buttons */}
              <div className="flex gap-2">
                {[
                  { value: '24h', label: '24h' },
                  { value: '7d', label: '7 días' },
                  { value: '30d', label: '30 días' },
                  { value: '90d', label: '90 días' },
                ].map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={quickRange === value && !customDateRange ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleQuickRange(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {/* Custom date range */}
              <div className="flex items-center gap-2 ml-4">
                <input
                  type="date"
                  value={effectiveDateRange.startDate}
                  onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={effectiveDateRange.endDate}
                  onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Actualizar
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleExport}
                disabled={exportLogs.isPending}
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Exportar
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D]"></div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <ChartBarIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Total Acciones</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {timelineStats?.totalActions?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ~{timelineStats?.avgPerDay || 0} por día
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    {(timelineStats?.totalCritical || 0) > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        !
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Acciones Críticas</p>
                  <p className="text-3xl font-bold text-red-600">
                    {timelineStats?.totalCritical || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{timelineStats?.totalHigh || 0} de alto riesgo
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <MagnifyingGlassIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    {patternCounts.critical > 0 && (
                      <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {patternCounts.critical}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Patrones Sospechosos</p>
                  <p className="text-3xl font-bold text-orange-600">{patternCounts.total}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {patternCounts.critical} requieren atención
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-gray-900">{topUsers?.length || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Top usuario: {topUsers?.[0]?.userName || 'N/A'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Timeline Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowTrendingUpIcon className="h-5 w-5" />
                  Timeline de Actividad
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timeline && timeline.length > 0 ? (
                  <div className="space-y-4">
                    {/* Simple bar chart */}
                    <div className="flex items-end gap-2 h-40">
                      {timeline.map((entry) => {
                        const maxCount = Math.max(...timeline.map((t) => t.count));
                        const height = (entry.count / maxCount) * 100;

                        return (
                          <div key={entry.date} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-gradient-to-t from-[#3E667D] to-[#3E667D]/70 rounded-t"
                              style={{ height: `${height}%` }}
                              title={`${entry.date}: ${entry.count} acciones`}
                            >
                              {/* Risk level indicators */}
                              <div className="w-full h-full relative">
                                {(entry.byRiskLevel.critical || 0) > 0 && (
                                  <div
                                    className="absolute bottom-0 w-full bg-red-500"
                                    style={{
                                      height: `${
                                        ((entry.byRiskLevel.critical || 0) / entry.count) * 100
                                      }%`,
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                              {new Date(entry.date).toLocaleDateString('es-MX', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 justify-center text-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-[#3E667D] rounded" />
                        <span className="text-gray-600">Normal</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-red-500 rounded" />
                        <span className="text-gray-600">Crítico</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay datos para el período seleccionado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserGroupIcon className="h-5 w-5" />
                    Usuarios Más Activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topUsers?.slice(0, 5).map((user, index) => (
                      <Link
                        key={user.userId}
                        href={`/admin/auditoria/superusuario/usuario/${user.userId}`}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="w-8 h-8 bg-[#3E667D] text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {user.userName || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.userEmail}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{user.count}</p>
                          {user.highRiskCount > 0 && (
                            <p className="text-xs text-red-600">{user.highRiskCount} alto riesgo</p>
                          )}
                        </div>
                      </Link>
                    ))}

                    {(!topUsers || topUsers.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        No hay datos de usuarios
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Suspicious Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="h-5 w-5" />
                    Patrones Sospechosos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Multiple Failed Logins */}
                    {patterns?.multipleFailedLogins && patterns.multipleFailedLogins.length > 0 && (
                      <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                        <p className="font-medium text-red-900 mb-1">
                          Múltiples intentos de login fallidos
                        </p>
                        <div className="space-y-1">
                          {patterns.multipleFailedLogins.map((user) => (
                            <p key={user.userId} className="text-sm text-red-700">
                              {user.userEmail}: {user.count} intentos
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* High Volume Users */}
                    {patterns?.highVolumeUsers && patterns.highVolumeUsers.length > 0 && (
                      <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                        <p className="font-medium text-yellow-900 mb-1">
                          Usuarios con actividad inusual
                        </p>
                        <div className="space-y-1">
                          {patterns.highVolumeUsers.map((user) => (
                            <p key={user.userId} className="text-sm text-yellow-700">
                              {user.userEmail}: {user.count} acciones ({user.avgPerDay}/día)
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Off Hours Activity */}
                    {patterns?.offHoursActivity && patterns.offHoursActivity.length > 0 && (
                      <div className="p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
                        <p className="font-medium text-orange-900 mb-1">
                          Actividad fuera de horario
                        </p>
                        <div className="space-y-1">
                          {patterns.offHoursActivity.map((user) => (
                            <p key={user.userId} className="text-sm text-orange-700">
                              {user.userEmail}: {user.count} acciones
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Multiple Inventory Adjustments */}
                    {patterns?.multipleInventoryAdjustments &&
                      patterns.multipleInventoryAdjustments.length > 0 && (
                        <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
                          <p className="font-medium text-red-900 mb-1">
                            Ajustes de inventario múltiples
                          </p>
                          <div className="space-y-1">
                            {patterns.multipleInventoryAdjustments.map((user) => (
                              <p key={user.userId} className="text-sm text-red-700">
                                {user.userEmail}: {user.count} ajustes
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                    {patternCounts.total === 0 && (
                      <div className="text-center py-8">
                        <ShieldCheckIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
                        <p className="text-green-600 font-medium">
                          No se detectaron patrones sospechosos
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent High Risk Actions */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5" />
                    Acciones de Alto Riesgo
                  </CardTitle>
                  <Link href="/admin/auditoria/logs?riskLevel=critical">
                    <Button variant="ghost" size="sm">
                      Ver todas
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentHighRiskActions?.slice(0, 5).map((log) => {
                      const riskConfig = log.riskLevel
                        ? RISK_LEVEL_CONFIG[log.riskLevel as keyof typeof RISK_LEVEL_CONFIG]
                        : null;

                      return (
                        <div
                          key={log.id}
                          className={`p-3 rounded-lg border-l-4 ${
                            log.riskLevel === 'critical'
                              ? 'border-red-500 bg-red-50'
                              : 'border-orange-500 bg-orange-50'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-1">
                            {riskConfig && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}
                              >
                                {riskConfig.label}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatTime(log.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{log.action}</p>
                          <p className="text-xs text-gray-600 truncate">{log.description}</p>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {log.userName || log.userEmail || 'Sistema'}
                          </p>
                        </div>
                      );
                    })}

                    {(!recentHighRiskActions || recentHighRiskActions.length === 0) && (
                      <div className="text-center py-8">
                        <ShieldCheckIcon className="h-12 w-12 text-green-400 mx-auto mb-3" />
                        <p className="text-green-600 font-medium">
                          No hay acciones de alto riesgo recientes
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Herramientas de Análisis</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/admin/auditoria/superusuario/comparar"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Comparar Usuarios</p>
                    <p className="text-xs text-gray-500">Analiza diferencias de actividad</p>
                  </div>
                </Link>

                <Link
                  href="/admin/auditoria/superusuario/timeline"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <ChartBarIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Timeline Detallado</p>
                    <p className="text-xs text-gray-500">Análisis temporal avanzado</p>
                  </div>
                </Link>

                <Link
                  href="/admin/auditoria/superusuario/patrones"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <MagnifyingGlassIcon className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Análisis de Patrones</p>
                    <p className="text-xs text-gray-500">Detecta comportamientos anómalos</p>
                  </div>
                </Link>

                <Link
                  href="/admin/auditoria/logs"
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <EyeIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Explorar Logs</p>
                    <p className="text-xs text-gray-500">Búsqueda avanzada de registros</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
