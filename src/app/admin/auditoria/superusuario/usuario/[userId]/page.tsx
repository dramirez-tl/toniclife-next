'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  UserIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useUserAuditHistory } from '@/hooks/useAudit';
import { RISK_LEVEL_CONFIG, ACTION_CATEGORIES } from '@/types/audit';

export default function UserAuditPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [limit, setLimit] = useState(100);

  const { data: logs, isLoading, refetch } = useUserAuditHistory(userId, limit);

  // Calculate user stats
  const userStats = useMemo(() => {
    if (!logs || logs.length === 0) return null;

    const user = logs[0];
    const byCategory: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};
    const byAction: Record<string, number> = {};
    let failedCount = 0;
    let highRiskCount = 0;

    logs.forEach((log) => {
      // By category
      const category = log.actionCategory || 'OTROS';
      byCategory[category] = (byCategory[category] || 0) + 1;

      // By risk level
      const risk = log.riskLevel || 'low';
      byRiskLevel[risk] = (byRiskLevel[risk] || 0) + 1;

      // By action
      byAction[log.action] = (byAction[log.action] || 0) + 1;

      // Failed operations
      if (log.success === false) failedCount++;

      // High risk
      if (risk === 'high' || risk === 'critical') highRiskCount++;
    });

    // Sort actions by count
    const topActions = Object.entries(byAction)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      userName: user.userName || 'Sin nombre',
      userEmail: user.userEmail || 'N/A',
      userRole: user.userRole || 'N/A',
      totalActions: logs.length,
      byCategory,
      byRiskLevel,
      topActions,
      failedCount,
      highRiskCount,
      firstAction: logs[logs.length - 1]?.createdAt,
      lastAction: logs[0]?.createdAt,
    };
  }, [logs]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get category label
  const getCategoryLabel = (value: string) => {
    return ACTION_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/auditoria/superusuario"
                className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Volver al Super Usuario
              </Link>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">
                    {userStats?.userName || 'Cargando...'}
                  </h1>
                  <p className="text-white/80">{userStats?.userEmail}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                onClick={() => refetch()}
              >
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003B7A]"></div>
          </div>
        ) : !userStats ? (
          <div className="text-center py-20">
            <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Sin datos</h2>
            <p className="text-gray-600">No se encontró actividad para este usuario</p>
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
                    {userStats.totalActions.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                    </div>
                    {userStats.highRiskCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        !
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Alto Riesgo</p>
                  <p className="text-3xl font-bold text-red-600">
                    {userStats.highRiskCount}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Operaciones Fallidas</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {userStats.failedCount}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Rol</p>
                  <p className="text-xl font-bold text-gray-900 capitalize">
                    {userStats.userRole}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* By Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(userStats.byCategory)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, count]) => {
                        const percentage = Math.round((count / userStats.totalActions) * 100);

                        return (
                          <div key={category}>
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {getCategoryLabel(category)}
                              </span>
                              <span className="text-sm text-gray-600">
                                {count} ({percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full bg-[#003B7A]"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* By Risk Level */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(userStats.byRiskLevel)
                      .sort((a, b) => {
                        const order = ['critical', 'high', 'medium', 'low'];
                        return order.indexOf(a[0]) - order.indexOf(b[0]);
                      })
                      .map(([level, count]) => {
                        const config =
                          RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG];
                        const percentage = Math.round((count / userStats.totalActions) * 100);

                        return (
                          <div key={level}>
                            <div className="flex justify-between mb-1">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${config?.bgColor} ${config?.color}`}
                              >
                                {config?.label || level}
                              </span>
                              <span className="text-sm text-gray-600">
                                {count} ({percentage}%)
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

              {/* Top Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Acciones Más Frecuentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userStats.topActions.map(([action, count], index) => (
                      <div
                        key={action}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="w-8 h-8 bg-[#003B7A] text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{action}</p>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Activity Period */}
              <Card>
                <CardHeader>
                  <CardTitle>Período de Actividad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CalendarIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Primera acción registrada</p>
                        <p className="font-medium text-gray-900">
                          {userStats.firstAction
                            ? formatTimestamp(userStats.firstAction)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <ClockIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Última acción registrada</p>
                        <p className="font-medium text-gray-900">
                          {userStats.lastAction
                            ? formatTimestamp(userStats.lastAction)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Logs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5" />
                  Historial de Acciones
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Mostrar:</span>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-y border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Entidad
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Riesgo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {logs?.map((log) => {
                        const riskConfig = log.riskLevel
                          ? RISK_LEVEL_CONFIG[
                              log.riskLevel as keyof typeof RISK_LEVEL_CONFIG
                            ]
                          : null;

                        return (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {formatTimestamp(log.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-gray-900">
                                {log.action}
                              </span>
                              <span className="block text-xs text-gray-500">
                                {getCategoryLabel(log.actionCategory || '')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                              {log.description || '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {log.entityName || log.entityType || '-'}
                            </td>
                            <td className="px-4 py-3">
                              {riskConfig && (
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}
                                >
                                  {riskConfig.label}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {log.success === false ? (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                                  Fallido
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                  Exitoso
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
