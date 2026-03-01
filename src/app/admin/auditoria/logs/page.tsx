'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
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
import { AuditFilters, RISK_LEVEL_CONFIG, ACTION_CATEGORIES, RiskLevel } from '@/types/audit';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

function AuditLogsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Filters from URL
  const [filters, setFilters] = useState<AuditFilters>({
    search: searchParams.get('search') || '',
    riskLevel: (searchParams.get('riskLevel') as RiskLevel) || undefined,
    actionCategory: searchParams.get('actionCategory') || undefined,
    requiresReview: searchParams.get('requiresReview') === 'true' || undefined,
    success: searchParams.get('success') ? searchParams.get('success') === 'true' : undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data, isLoading, refetch } = useAuditLogs(filters);
  const markAsReviewed = useMarkAsReviewed();

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.riskLevel) params.set('riskLevel', filters.riskLevel);
    if (filters.actionCategory) params.set('actionCategory', filters.actionCategory);
    if (filters.requiresReview) params.set('requiresReview', 'true');
    if (filters.success !== undefined) params.set('success', String(filters.success));
    if (filters.page && filters.page > 1) params.set('page', String(filters.page));

    const queryString = params.toString();
    router.replace(`/admin/auditoria/logs${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [filters, router]);

  // Handle filter changes
  const updateFilters = (newFilters: Partial<AuditFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  // Handle pagination
  const changePage = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

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
                variant="primary"
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                onClick={handleExport}
              >
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
                    value={filters.search || ''}
                    onChange={(e) => updateFilters({ search: e.target.value })}
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
                  value={filters.riskLevel || ''}
                  onChange={(val) => updateFilters({ riskLevel: val as RiskLevel || undefined })}
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
                  value={filters.actionCategory || ''}
                  onChange={(val) => updateFilters({ actionCategory: val || undefined })}
                  allLabel="Todas las Categorías"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.requiresReview || false}
                    onChange={(e) => updateFilters({ requiresReview: e.target.checked || undefined })}
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
                  setFilters({
                    page: 1,
                    limit: 20,
                    sortBy: 'createdAt',
                    sortOrder: 'desc',
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
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D]"></div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Fecha/Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Riesgo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Acción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Usuario
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Entidad
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Estado
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {data?.data.map((log) => {
                        const riskConfig = log.riskLevel
                          ? RISK_LEVEL_CONFIG[log.riskLevel as keyof typeof RISK_LEVEL_CONFIG]
                          : null;

                        return (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                {formatTimestamp(log.createdAt)}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {riskConfig && (
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${riskConfig.bgColor} ${riskConfig.color}`}
                                >
                                  {riskConfig.label}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{log.action}</p>
                                <p className="text-xs text-gray-500">{log.actionCategory}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {log.userName || 'Sistema'}
                                  </p>
                                  <p className="text-xs text-gray-500">{log.userEmail}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {log.entityName || '-'}
                                </p>
                                <p className="text-xs text-gray-500">{log.entityType}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
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
                            </td>
                            <td className="px-4 py-4">
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
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {(!data?.data || data.data.length === 0) && (
                  <div className="text-center py-12">
                    <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No se encontraron registros
                    </h3>
                    <p className="text-gray-600">Intenta ajustar los filtros de búsqueda</p>
                  </div>
                )}

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-4 border-t">
                    <p className="text-sm text-gray-600">
                      Mostrando {(filters.page! - 1) * filters.limit! + 1} -{' '}
                      {Math.min(filters.page! * filters.limit!, data.total)} de {data.total} registros
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={filters.page === 1}
                        onClick={() => changePage(filters.page! - 1)}
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Anterior
                      </Button>
                      <span className="px-3 py-1 text-sm">
                        {filters.page} / {data.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={filters.page === data.totalPages}
                        onClick={() => changePage(filters.page! + 1)}
                      >
                        Siguiente
                        <ChevronRightIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
