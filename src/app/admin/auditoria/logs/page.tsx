'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui';
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuditLogs, useMarkAsReviewed } from '@/hooks/useAudit';
import { AuditFilters, AuditLog, RISK_LEVEL_CONFIG, ACTION_CATEGORIES, RiskLevel } from '@/types/audit';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQueryFilters } from '@/hooks/useQueryFilters';

function AuditLogsContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    page: '1',
  });

  const search = get('search');
  const riskLevel = get('riskLevel') as RiskLevel | '';
  const actionCategory = get('actionCategory');
  const requiresReview = get('requiresReview') === 'true' ? true : undefined;
  const success = get('success') ? get('success') === 'true' : undefined;
  const currentPage = getNumber('page') || 1;

  // Build filters object for API hook
  const filters: AuditFilters = {
    search: search || '',
    riskLevel: riskLevel || undefined,
    actionCategory: actionCategory || undefined,
    requiresReview,
    success,
    page: currentPage,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  };

  const { data, isLoading, refetch } = useAuditLogs(filters);
  const markAsReviewed = useMarkAsReviewed();

  // Handle mark as reviewed
  const handleMarkAsReviewed = async (id: string) => {
    try {
      await markAsReviewed.mutateAsync({ id });
      toast.success('Log marcado como revisado');
      refetch();
    } catch (error) {
      toast.error('Error al marcar como revisado');
    }
  };

  // Export logs
  const handleExport = () => {
    toast.success('Exportando logs de auditoría...');
  };

  // Format timestamp
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

  // Table columns
  const columns = useMemo<DataTableColumn<AuditLog>[]>(
    () => [
      {
        key: 'createdAt',
        header: 'Fecha/Hora',
        cellClassName: 'text-sm text-gray-500 whitespace-nowrap',
        render: (log) => (
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4" />
            {formatTimestamp(log.createdAt)}
          </div>
        ),
      },
      {
        key: 'riskLevel',
        header: 'Riesgo',
        render: (log) => {
          const riskConfig = log.riskLevel
            ? RISK_LEVEL_CONFIG[log.riskLevel as keyof typeof RISK_LEVEL_CONFIG]
            : null;
          return (
            riskConfig && (
              <span
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}
              >
                {riskConfig.label}
              </span>
            )
          );
        },
      },
      {
        key: 'action',
        header: 'Acción',
        render: (log) => (
          <div>
            <p className="text-sm font-medium text-gray-900">{log.action}</p>
            <p className="text-xs text-gray-500">{log.actionCategory}</p>
          </div>
        ),
      },
      {
        key: 'user',
        header: 'Usuario',
        render: (log) => (
          <div className="flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {log.userName || 'Sistema'}
              </p>
              <p className="text-xs text-gray-500">{log.userEmail}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'entity',
        header: 'Entidad',
        render: (log) => (
          <div>
            <p className="text-sm font-medium text-gray-900">
              {log.entityName || '-'}
            </p>
            <p className="text-xs text-gray-500">{log.entityType}</p>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Estado',
        render: (log) => (
          <div className="flex items-center gap-2">
            {log.success ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
            {log.requiresReview && !log.reviewedAt && (
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded">
                Revisión
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Acciones',
        render: (log) => (
          <div className="flex items-center gap-2">
            <button
              className="p-1 hover:bg-gray-100 rounded"
              title="Ver detalle"
            >
              <EyeIcon className="h-5 w-5 text-gray-500" />
            </button>
            {log.requiresReview && !log.reviewedAt && (
              <button
                className="p-1 hover:bg-green-100 rounded"
                title="Marcar como revisado"
                onClick={() => handleMarkAsReviewed(log.id)}
              >
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              </button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheckIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Logs de Auditoría</h1>
              </div>
              <p className="text-white/80 text-lg">
                Historial completo de operaciones del sistema
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/auditoria">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
              <Button
                variant="default"
                onClick={handleExport}
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por descripción, usuario, entidad..."
                    value={search}
                    onChange={(e) => setParams({ search: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Risk Level Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <SearchableSelect
                  options={[
                    { value: 'critical', label: 'Crítico' },
                    { value: 'high', label: 'Alto' },
                    { value: 'medium', label: 'Medio' },
                    { value: 'low', label: 'Bajo' },
                  ]}
                  value={riskLevel || ''}
                  onChange={(val) => setParams({ riskLevel: val || null })}
                  allLabel="Todos los Niveles"
                />
              </div>

              {/* Category Filter */}
              <div>
                <SearchableSelect
                  options={ACTION_CATEGORIES.map((cat) => ({
                    value: cat.value,
                    label: cat.label,
                  }))}
                  value={actionCategory || ''}
                  onChange={(val) => setParams({ actionCategory: val || null })}
                  allLabel="Todas las Categorías"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={requiresReview || false}
                    onChange={(e) => setParams({ requiresReview: e.target.checked ? 'true' : null })}
                    className="w-4 h-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#3E667D]"
                  />
                  <span className="text-sm text-gray-700">Pendientes de revisión</span>
                </label>
              </div>

              {/* Clear Filters */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setParams({
                    search: null,
                    riskLevel: null,
                    actionCategory: null,
                    requiresReview: null,
                    success: null,
                    page: null,
                  })
                }
              >
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            <DataTable<AuditLog>
              columns={columns}
              data={data?.data ?? []}
              getRowKey={(log, i) => String(log.id ?? i)}
              isLoading={isLoading}
              loadingRows={20}
              rowClassName="border-b border-gray-200 transition-colors hover:bg-gray-50"
              emptyState={
                <div className="text-center py-12">
                  <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    No se encontraron registros
                  </h3>
                  <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
                </div>
              }
            />

            {/* Pagination */}
            {!isLoading && data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <p className="text-sm text-gray-600">
                  Mostrando {(currentPage - 1) * 20 + 1} -{' '}
                  {Math.min(currentPage * 20, data.total)} de {data.total} registros
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setParams({ page: String(currentPage - 1) })}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="px-3 py-1 text-sm">
                    {currentPage} / {data.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === data.totalPages}
                    onClick={() => setParams({ page: String(currentPage + 1) })}
                  >
                    Siguiente
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function AuditLogsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D]"></div>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<AuditLogsLoading />}>
      <AuditLogsContent />
    </Suspense>
  );
}
