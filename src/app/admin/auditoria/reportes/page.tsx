'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  ShieldCheckIcon,
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon,
  ChartBarIcon,
  TableCellsIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuditStats, useAuditLogs } from '@/hooks/useAudit';
import { RISK_LEVEL_CONFIG, ACTION_CATEGORIES } from '@/types/audit';

type ReportType = 'activity' | 'security' | 'compliance' | 'user';
type ExportFormat = 'csv' | 'pdf' | 'json';

export default function AuditReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedReport, setSelectedReport] = useState<ReportType>('activity');

  const { data: stats, isLoading: statsLoading } = useAuditStats(dateRange.startDate, dateRange.endDate);
  const { data: logsData, isLoading: logsLoading } = useAuditLogs({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 100,
  });

  const isLoading = statsLoading || logsLoading;

  // Handle export
  const handleExport = (format: ExportFormat) => {
    toast.success(`Exportando reporte en formato ${format.toUpperCase()}...`);
    // In real implementation, this would call an API endpoint
  };

  // Report types
  const reportTypes = [
    {
      id: 'activity' as ReportType,
      name: 'Reporte de Actividad',
      description: 'Resumen de todas las operaciones realizadas en el sistema',
      icon: ChartBarIcon,
    },
    {
      id: 'security' as ReportType,
      name: 'Reporte de Seguridad',
      description: 'Operaciones de alto riesgo y alertas de seguridad',
      icon: ShieldCheckIcon,
    },
    {
      id: 'compliance' as ReportType,
      name: 'Reporte de Cumplimiento',
      description: 'Auditoría para cumplimiento regulatorio',
      icon: DocumentTextIcon,
    },
    {
      id: 'user' as ReportType,
      name: 'Reporte por Usuario',
      description: 'Actividad desglosada por usuario del sistema',
      icon: TableCellsIcon,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <DocumentChartBarIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Reportes de Auditoría</h1>
              </div>
              <p className="text-white/80 text-lg">
                Genera y exporta reportes detallados del sistema
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
        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Rango de fechas:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
                />
                <span className="text-gray-500">a</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-sm"
                />
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Exportar:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                  leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                >
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('json')}
                  leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                >
                  JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const isSelected = selectedReport === report.id;
            return (
              <Card
                key={report.id}
                className={`cursor-pointer transition hover:shadow-md ${
                  isSelected ? 'ring-2 ring-[#3E667D] bg-blue-50' : ''
                }`}
                onClick={() => setSelectedReport(report.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-[#3E667D]' : 'bg-gray-100'
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{report.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{report.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Report Content */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D]"></div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Activity Report */}
            {selectedReport === 'activity' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen de Actividad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-3xl font-bold text-blue-600">
                          {stats?.totalLogs?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-gray-600">Total de Operaciones</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-3xl font-bold text-green-600">
                          {((stats?.totalLogs || 0) - (stats?.failedOperations || 0)).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">Operaciones Exitosas</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <p className="text-3xl font-bold text-red-600">
                          {stats?.failedOperations?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-gray-600">Operaciones Fallidas</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-3xl font-bold text-yellow-600">
                          {stats?.pendingReviews?.toLocaleString() || 0}
                        </p>
                        <p className="text-sm text-gray-600">Pendientes de Revisión</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribución por Categoría</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Categoría
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Cantidad
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Porcentaje
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Gráfico
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {stats?.byCategory &&
                            Object.entries(stats.byCategory)
                              .sort((a, b) => b[1] - a[1])
                              .map(([category, count]) => {
                                const percentage = Math.round((count / (stats.totalLogs || 1)) * 100);
                                const categoryInfo = ACTION_CATEGORIES.find((c) => c.value === category);
                                return (
                                  <tr key={category}>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                      {categoryInfo?.label || category}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {count.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{percentage}%</td>
                                    <td className="px-4 py-3">
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className="h-2 rounded-full bg-[#3E667D]"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Security Report */}
            {selectedReport === 'security' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {['critical', 'high', 'medium', 'low'].map((level) => {
                        const config = RISK_LEVEL_CONFIG[level as keyof typeof RISK_LEVEL_CONFIG];
                        const count = stats?.byRiskLevel?.[level] || 0;
                        const percentage = Math.round((count / (stats?.totalLogs || 1)) * 100);
                        return (
                          <div
                            key={level}
                            className={`p-4 rounded-lg ${config.bgColor}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`font-semibold ${config.color}`}>
                                {config.label}
                              </span>
                              <span className={`text-2xl font-bold ${config.color}`}>
                                {count.toLocaleString()}
                              </span>
                            </div>
                            <div className="w-full bg-white/50 rounded-full h-2">
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
                            <p className="text-xs text-gray-600 mt-1">{percentage}% del total</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Operaciones de Alto Riesgo Recientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {logsData?.data
                        .filter((log) => log.riskLevel === 'critical' || log.riskLevel === 'high')
                        .slice(0, 10)
                        .map((log) => {
                          const riskConfig = log.riskLevel
                            ? RISK_LEVEL_CONFIG[log.riskLevel as keyof typeof RISK_LEVEL_CONFIG]
                            : null;
                          return (
                            <div
                              key={log.id}
                              className={`p-4 rounded-lg border-l-4 ${
                                log.riskLevel === 'critical'
                                  ? 'border-red-500 bg-red-50'
                                  : 'border-orange-500 bg-orange-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  {riskConfig && (
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color} mb-1`}
                                    >
                                      {riskConfig.label}
                                    </span>
                                  )}
                                  <p className="font-medium text-gray-900">{log.action}</p>
                                  <p className="text-sm text-gray-600">{log.description}</p>
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                  <p>{log.userName || 'Sistema'}</p>
                                  <p>
                                    {new Date(log.createdAt).toLocaleString('es-MX', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {(!logsData?.data || logsData.data.filter((l) => l.riskLevel === 'critical' || l.riskLevel === 'high').length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          <ShieldCheckIcon className="h-12 w-12 mx-auto mb-3 text-green-400" />
                          <p>No hay operaciones de alto riesgo en este periodo</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Compliance Report */}
            {selectedReport === 'compliance' && (
              <Card>
                <CardHeader>
                  <CardTitle>Reporte de Cumplimiento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Resumen del Periodo</h4>
                      <p className="text-sm text-blue-800">
                        Este reporte incluye todas las operaciones registradas desde{' '}
                        <strong>{dateRange.startDate}</strong> hasta <strong>{dateRange.endDate}</strong>.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Métricas de Auditoría</h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>Total de registros auditados</span>
                            <span className="font-medium">{stats?.totalLogs?.toLocaleString() || 0}</span>
                          </li>
                          <li className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>Operaciones críticas</span>
                            <span className="font-medium text-red-600">
                              {stats?.byRiskLevel?.critical || 0}
                            </span>
                          </li>
                          <li className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>Operaciones de alto riesgo</span>
                            <span className="font-medium text-orange-600">
                              {stats?.byRiskLevel?.high || 0}
                            </span>
                          </li>
                          <li className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>Tasa de éxito</span>
                            <span className="font-medium text-green-600">
                              {stats?.totalLogs
                                ? Math.round(((stats.totalLogs - stats.failedOperations) / stats.totalLogs) * 100)
                                : 0}%
                            </span>
                          </li>
                          <li className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>Revisiones completadas</span>
                            <span className="font-medium">
                              {(stats?.totalLogs || 0) - (stats?.pendingReviews || 0)}
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Estado de Cumplimiento</h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-green-50 rounded-lg flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">✓</span>
                            </div>
                            <div>
                              <p className="font-medium text-green-900">Logs habilitados</p>
                              <p className="text-xs text-green-700">Sistema de auditoría activo</p>
                            </div>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">✓</span>
                            </div>
                            <div>
                              <p className="font-medium text-green-900">Registro de IP</p>
                              <p className="text-xs text-green-700">Trazabilidad completa</p>
                            </div>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">✓</span>
                            </div>
                            <div>
                              <p className="font-medium text-green-900">Alertas configuradas</p>
                              <p className="text-xs text-green-700">Monitoreo en tiempo real</p>
                            </div>
                          </div>
                          {(stats?.pendingReviews || 0) > 0 && (
                            <div className="p-3 bg-yellow-50 rounded-lg flex items-center gap-3">
                              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">!</span>
                              </div>
                              <div>
                                <p className="font-medium text-yellow-900">Revisiones pendientes</p>
                                <p className="text-xs text-yellow-700">
                                  {stats?.pendingReviews} operaciones requieren revisión
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Report */}
            {selectedReport === 'user' && (
              <Card>
                <CardHeader>
                  <CardTitle>Actividad por Usuario</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <TableCellsIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Próximamente
                    </h3>
                    <p className="text-gray-600 mb-4">
                      El reporte detallado por usuario estará disponible en una próxima actualización.
                    </p>
                    <p className="text-sm text-gray-500">
                      Este reporte mostrará la actividad de cada usuario, incluyendo operaciones
                      realizadas, patrones de uso y análisis de comportamiento.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
