'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  EyeIcon,
  UserIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useAuditDashboard } from '@/hooks/useAudit';
import { RISK_LEVEL_CONFIG, ALERT_STATUS_CONFIG } from '@/types/audit';
import { PermissionGuard } from '@/components/auth';

export default function AuditDashboardPage() {
  const { stats, alerts, recentLogs, isLoading } = useAuditDashboard();

  const pendingAlerts = alerts?.filter((a) => a.status === 'pending') || [];
  const criticalAlerts = alerts?.filter((a) => a.severity === 'critical' && a.status === 'pending') || [];

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D]"></div>
      </div>
    );
  }

  return (
    <PermissionGuard permissions={['audit:read', 'audit:*']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheckIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Centro de Auditoría</h1>
              </div>
              <p className="text-white/80 text-lg">
                Monitoreo de seguridad y control de operaciones
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-6 w-6" />
                <span className="font-medium">
                  {criticalAlerts.length} alerta(s) crítica(s) requieren atención inmediata
                </span>
              </div>
              <Link href="/admin/auditoria/alertas">
                <Button variant="secondary" size="sm">
                  Ver Alertas
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Total de Registros</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.totalLogs?.toLocaleString() || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <BellAlertIcon className="h-6 w-6 text-yellow-600" />
                </div>
                {pendingAlerts.length > 0 && (
                  <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingAlerts.length}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-1">Alertas Pendientes</p>
              <p className="text-3xl font-bold text-gray-900">{pendingAlerts.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Revisiones Pendientes</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.pendingReviews || 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Operaciones Fallidas</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.failedOperations || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Risk Level Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.byRiskLevel &&
                  Object.entries(stats.byRiskLevel).map(([level, count]) => {
                    const config = RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG];
                    const percentage = Math.round((count / (stats.totalLogs || 1)) * 100);

                    return (
                      <div key={level}>
                        <div className="flex justify-between mb-1">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config?.bgColor} ${config?.color}`}
                          >
                            {config?.label || level}
                          </span>
                          <span className="text-sm text-gray-600">
                            {count.toLocaleString()} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              level === 'critical'
                                ? 'bg-red-500'
                                : level === 'high'
                                  ? 'bg-orange-500'
                                  : level === 'medium'
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.byCategory &&
                  Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([category, count]) => {
                      const percentage = Math.round((count / (stats.totalLogs || 1)) * 100);

                      return (
                        <div key={category}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{category}</span>
                            <span className="text-sm text-gray-600">
                              {count.toLocaleString()} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-[#3E667D]"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>Accesos Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link
                href="/admin/auditoria/logs"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Ver Todos los Logs</span>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400" />
              </Link>

              <Link
                href="/admin/auditoria/alertas"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <BellAlertIcon className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Gestionar Alertas</span>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400" />
              </Link>

              <Link
                href="/admin/auditoria/logs?requiresReview=true"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <EyeIcon className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Revisiones Pendientes</span>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400" />
              </Link>

              <Link
                href="/admin/auditoria/logs?riskLevel=critical"
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition"
              >
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-900">Operaciones Críticas</span>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-red-400" />
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Actividad Reciente</CardTitle>
              <Link href="/admin/auditoria/logs">
                <Button variant="ghost" size="sm">
                  Ver todos
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentLogs?.slice(0, 5).map((log) => {
                  const riskConfig = log.riskLevel
                    ? RISK_LEVEL_CONFIG[log.riskLevel as keyof typeof RISK_LEVEL_CONFIG]
                    : null;

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        log.riskLevel === 'critical'
                          ? 'border-red-500 bg-red-50'
                          : log.riskLevel === 'high'
                            ? 'border-orange-500 bg-orange-50'
                            : log.riskLevel === 'medium'
                              ? 'border-yellow-500 bg-yellow-50'
                              : 'border-green-500 bg-green-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {riskConfig && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}
                              >
                                {riskConfig.label}
                              </span>
                            )}
                            <span className="text-xs font-medium text-gray-500">{log.action}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{log.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            {log.userName && (
                              <span className="flex items-center gap-1">
                                <UserIcon className="h-3 w-3" />
                                {log.userName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {formatTime(log.createdAt)}
                            </span>
                          </div>
                        </div>
                        {!log.success && (
                          <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded">
                            Fallido
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {(!recentLogs || recentLogs.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p>No hay actividad reciente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </PermissionGuard>
  );
}
