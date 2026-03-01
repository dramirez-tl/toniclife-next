'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  ShieldCheckIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useAuditAlerts, useUpdateAlertStatus } from '@/hooks/useAudit';
import {
  AuditAlert,
  AlertStatus,
  AlertSeverity,
  RISK_LEVEL_CONFIG,
  ALERT_STATUS_CONFIG,
} from '@/types/audit';

export default function AuditAlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const { data: alerts, isLoading, refetch } = useAuditAlerts(severityFilter || undefined);
  const updateAlertStatus = useUpdateAlertStatus();

  // Filter alerts by status
  const filteredAlerts = alerts?.filter((alert) => {
    if (statusFilter && alert.status !== statusFilter) return false;
    return true;
  }) || [];

  // Group alerts by severity
  const criticalCount = alerts?.filter((a) => a.severity === 'critical' && a.status === 'pending').length || 0;
  const highCount = alerts?.filter((a) => a.severity === 'high' && a.status === 'pending').length || 0;
  const pendingCount = alerts?.filter((a) => a.status === 'pending').length || 0;

  // Handle status update
  const handleStatusUpdate = async (id: string, status: AlertStatus, notes?: string) => {
    try {
      await updateAlertStatus.mutateAsync({ id, status, notes });
      toast.success(
        status === 'acknowledged'
          ? 'Alerta marcada como revisada'
          : status === 'resolved'
            ? 'Alerta resuelta'
            : 'Alerta descartada'
      );
      refetch();
    } catch {
      toast.error('Error al actualizar la alerta');
    }
  };

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

  // Get severity icon
  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />;
      case 'high':
        return <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />;
      case 'medium':
        return <BellAlertIcon className="h-6 w-6 text-yellow-600" />;
      default:
        return <BellAlertIcon className="h-6 w-6 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BellAlertIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Gestión de Alertas</h1>
              </div>
              <p className="text-white/80 text-lg">
                Monitoreo y gestión de alertas de seguridad del sistema
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

      {/* Critical Alerts Banner */}
      {criticalCount > 0 && (
        <div className="bg-red-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 animate-pulse" />
              <span className="font-medium">
                {criticalCount} alerta(s) crítica(s) requieren atención inmediata
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card
            className={`cursor-pointer transition hover:shadow-md ${
              statusFilter === 'pending' ? 'ring-2 ring-[#3E667D]' : ''
            }`}
            onClick={() => setStatusFilter('pending')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${
              severityFilter === 'critical' ? 'ring-2 ring-red-500' : ''
            }`}
            onClick={() => {
              setSeverityFilter(severityFilter === 'critical' ? '' : 'critical');
              setStatusFilter('pending');
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Críticas</p>
                  <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${
              severityFilter === 'high' ? 'ring-2 ring-orange-500' : ''
            }`}
            onClick={() => {
              setSeverityFilter(severityFilter === 'high' ? '' : 'high');
              setStatusFilter('pending');
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Alta Prioridad</p>
                  <p className="text-2xl font-bold text-orange-600">{highCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition hover:shadow-md ${
              statusFilter === 'resolved' ? 'ring-2 ring-green-500' : ''
            }`}
            onClick={() => setStatusFilter('resolved')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Resueltas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {alerts?.filter((a) => a.status === 'resolved').length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">Filtros:</span>
              </div>

              <SearchableSelect
                options={[
                  { value: 'pending', label: 'Pendientes' },
                  { value: 'acknowledged', label: 'Revisadas' },
                  { value: 'resolved', label: 'Resueltas' },
                  { value: 'dismissed', label: 'Descartadas' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                allLabel="Todos los estados"
              />

              <SearchableSelect
                options={[
                  { value: 'critical', label: 'Crítica' },
                  { value: 'high', label: 'Alta' },
                  { value: 'medium', label: 'Media' },
                  { value: 'low', label: 'Baja' },
                ]}
                value={severityFilter}
                onChange={setSeverityFilter}
                allLabel="Todas las severidades"
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('pending');
                  setSeverityFilter('');
                }}
              >
                Limpiar filtros
              </Button>

              <div className="flex-1" />

              <Button
                variant="outline"
                size="sm"
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                onClick={() => refetch()}
              >
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellAlertIcon className="h-5 w-5" />
              Alertas ({filteredAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D]"></div>
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No hay alertas que mostrar
                </h3>
                <p className="text-gray-600">
                  {statusFilter === 'pending'
                    ? 'Todas las alertas han sido atendidas'
                    : 'No se encontraron alertas con los filtros seleccionados'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredAlerts.map((alert) => {
                  const severityConfig = RISK_LEVEL_CONFIG[alert.severity as keyof typeof RISK_LEVEL_CONFIG];
                  const statusConfig = ALERT_STATUS_CONFIG[alert.status];

                  return (
                    <div
                      key={alert.id}
                      className={`p-6 hover:bg-gray-50 transition ${
                        alert.severity === 'critical' && alert.status === 'pending'
                          ? 'bg-red-50 border-l-4 border-red-500'
                          : alert.severity === 'high' && alert.status === 'pending'
                            ? 'bg-orange-50 border-l-4 border-orange-500'
                            : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Severity Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getSeverityIcon(alert.severity)}
                        </div>

                        {/* Alert Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            {severityConfig && (
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${severityConfig.bgColor} ${severityConfig.color}`}
                              >
                                {severityConfig.label}
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {alert.alertType}
                            </span>
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {alert.title}
                          </h3>

                          {alert.description && (
                            <p className="text-gray-600 mb-3">{alert.description}</p>
                          )}

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <ClockIcon className="h-4 w-4" />
                              {formatTimestamp(alert.createdAt)}
                            </span>

                            {alert.acknowledgedAt && (
                              <span>
                                Revisado: {formatTimestamp(alert.acknowledgedAt)}
                              </span>
                            )}

                            {alert.resolvedAt && (
                              <span>
                                Resuelto: {formatTimestamp(alert.resolvedAt)}
                              </span>
                            )}
                          </div>

                          {alert.resolutionNotes && (
                            <div className="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-700">
                              <strong>Notas:</strong> {alert.resolutionNotes}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        {alert.status === 'pending' && (
                          <div className="flex-shrink-0 flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={<EyeIcon className="h-4 w-4" />}
                              onClick={() => handleStatusUpdate(alert.id, 'acknowledged')}
                            >
                              Revisar
                            </Button>
                            <Button
                              size="sm"
                              variant="primary"
                              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                              onClick={() => handleStatusUpdate(alert.id, 'resolved')}
                            >
                              Resolver
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              leftIcon={<XMarkIcon className="h-4 w-4" />}
                              onClick={() => handleStatusUpdate(alert.id, 'dismissed')}
                            >
                              Descartar
                            </Button>
                          </div>
                        )}

                        {alert.status === 'acknowledged' && (
                          <div className="flex-shrink-0">
                            <Button
                              size="sm"
                              variant="primary"
                              leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                              onClick={() => handleStatusUpdate(alert.id, 'resolved')}
                            >
                              Resolver
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
