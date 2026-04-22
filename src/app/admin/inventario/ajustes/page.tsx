// app/admin/inventario/ajustes/page.tsx - Inventory Adjustments
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useAdjustments,
  useApproveAdjustment,
  useRejectAdjustment,
  useApplyAdjustment,
  useCancelAdjustment,
} from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import {
  AdjustmentStatus,
  AdjustmentType,
  type AdjustmentQueryDto,
  type AdjustmentDto,
} from '@/types/inventory';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';

export default function AjustesPage() {
  return <Suspense><AjustesContent /></Suspense>;
}

function AjustesContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    page: '1',
  });

  const statusFilter = get('status') as AdjustmentStatus | '';
  const typeFilter = get('type') as AdjustmentType | '';
  const branchFilter = get('branch');
  const page = getNumber('page') || 1;

  // Fetch branches for filter
  const { data: branches } = useActiveBranches();

  const query: AdjustmentQueryDto = {
    status: statusFilter || undefined,
    adjustmentType: typeFilter || undefined,
    branchId: branchFilter || undefined,
    page,
    limit: 20,
  };

  const { data: adjustmentsData, isLoading } = useAdjustments(query);
  const approveAdjustment = useApproveAdjustment();
  const rejectAdjustment = useRejectAdjustment();
  const applyAdjustment = useApplyAdjustment();
  const cancelAdjustment = useCancelAdjustment();

  const handleApprove = async (adjustment: AdjustmentDto) => {
    try {
      await approveAdjustment.mutateAsync({ id: adjustment.id });
      toast.success('Ajuste aprobado correctamente');
    } catch (error) {
      toast.error('Error al aprobar el ajuste');
    }
  };

  const handleReject = async (adjustment: AdjustmentDto) => {
    const reason = prompt('Ingresa el motivo de rechazo:');
    if (!reason) return;

    try {
      await rejectAdjustment.mutateAsync({ id: adjustment.id, data: { reason } });
      toast.success('Ajuste rechazado');
    } catch (error) {
      toast.error('Error al rechazar el ajuste');
    }
  };

  const handleApply = async (adjustment: AdjustmentDto) => {
    const ok = await confirmAction('¿Estás seguro de aplicar este ajuste? Esta acción modificará el inventario.');
    if (!ok) return;

    try {
      await applyAdjustment.mutateAsync({ id: adjustment.id });
      toast.success('Ajuste aplicado correctamente');
    } catch (error) {
      toast.error('Error al aplicar el ajuste');
    }
  };

  const handleCancel = async (adjustment: AdjustmentDto) => {
    const ok2 = await confirmAction('¿Estás seguro de cancelar este ajuste?');
    if (!ok2) return;

    try {
      await cancelAdjustment.mutateAsync(adjustment.id);
      toast.success('Ajuste cancelado');
    } catch (error) {
      toast.error('Error al cancelar el ajuste');
    }
  };

  const getStatusBadge = (status: AdjustmentStatus) => {
    const config: Record<AdjustmentStatus, { bg: string; text: string; icon: React.ReactNode }> = {
      [AdjustmentStatus.DRAFT]: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        icon: <ClockIcon className="h-3 w-3" />,
      },
      [AdjustmentStatus.PENDING_APPROVAL]: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: <ClockIcon className="h-3 w-3" />,
      },
      [AdjustmentStatus.APPROVED]: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: <CheckIcon className="h-3 w-3" />,
      },
      [AdjustmentStatus.APPLIED]: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: <DocumentCheckIcon className="h-3 w-3" />,
      },
      [AdjustmentStatus.REJECTED]: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <XMarkIcon className="h-3 w-3" />,
      },
      [AdjustmentStatus.CANCELLED]: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <XMarkIcon className="h-3 w-3" />,
      },
    };

    const { bg, text, icon } = config[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${bg} ${text} rounded-full text-xs font-medium`}>
        {icon}
        {inventoryService.getAdjustmentStatusLabel(status)}
      </span>
    );
  };

  const getTypeBadge = (type: AdjustmentType) => {
    return (
      <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
        {inventoryService.getAdjustmentTypeLabel(type)}
      </span>
    );
  };

  // Stats
  const stats = {
    total: adjustmentsData?.total || 0,
    pending: adjustmentsData?.data.filter(a => a.status === AdjustmentStatus.PENDING_APPROVAL).length || 0,
    approved: adjustmentsData?.data.filter(a => a.status === AdjustmentStatus.APPROVED).length || 0,
    applied: adjustmentsData?.data.filter(a => a.status === AdjustmentStatus.APPLIED).length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ClipboardDocumentCheckIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Ajustes de Inventario</h1>
              </div>
              <p className="text-white/80 text-lg">
                Conteos físicos, correcciones y ajustes de stock
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/inventario">
                <Button variant="secondary">Volver a Inventario</Button>
              </Link>
              <Link href="/admin/inventario/ajustes/nuevo">
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                >
                  Nuevo Ajuste
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Ajustes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pend. Aprobación</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Aprobados</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Aplicados</p>
                  <p className="text-3xl font-bold text-green-600">{stats.applied}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DocumentCheckIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <SearchableSelect
                  options={[
                    { value: AdjustmentStatus.DRAFT, label: 'Borrador' },
                    { value: AdjustmentStatus.PENDING_APPROVAL, label: 'Pendiente Aprobación' },
                    { value: AdjustmentStatus.APPROVED, label: 'Aprobado' },
                    { value: AdjustmentStatus.APPLIED, label: 'Aplicado' },
                    { value: AdjustmentStatus.REJECTED, label: 'Rechazado' },
                    { value: AdjustmentStatus.CANCELLED, label: 'Cancelado' },
                  ]}
                  value={statusFilter}
                  onChange={(val) => setParams({ status: val })}
                  allLabel="Todos los Estados"
                />
              </div>

              {/* Type Filter */}
              <SearchableSelect
                options={[
                  { value: AdjustmentType.COUNT, label: 'Conteo Físico' },
                  { value: AdjustmentType.CORRECTION, label: 'Corrección' },
                  { value: AdjustmentType.DAMAGE, label: 'Daño/Merma' },
                  { value: AdjustmentType.EXPIRATION, label: 'Caducidad' },
                  { value: AdjustmentType.LOSS, label: 'Pérdida' },
                  { value: AdjustmentType.FOUND, label: 'Encontrado' },
                ]}
                value={typeFilter}
                onChange={(val) => setParams({ type: val })}
                allLabel="Todos los Tipos"
              />

              {/* Branch Filter */}
              <SearchableSelect
                options={(branches ?? []).map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={branchFilter}
                onChange={(val) => setParams({ branch: val })}
                allLabel="Todas las Sucursales"
              />
            </div>
          </CardContent>
        </Card>

        {/* Adjustments Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando ajustes...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          # Ajuste
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Sucursal
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Tipo
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Items
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Diferencia
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Estado
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Creado
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {adjustmentsData?.data.map((adjustment) => (
                        <tr
                          key={adjustment.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <span className="font-mono font-semibold text-[#3E667D]">
                              {adjustment.adjustmentNumber}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-medium">{adjustment.branch.name}</span>
                          </td>
                          <td className="py-4 px-4">
                            {getTypeBadge(adjustment.adjustmentType)}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-semibold">{adjustment.totalItems}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`font-bold ${
                                adjustment.totalDifference > 0
                                  ? 'text-green-600'
                                  : adjustment.totalDifference < 0
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              {adjustment.totalDifference > 0 ? '+' : ''}
                              {adjustment.totalDifference}
                            </span>
                          </td>
                          <td className="py-4 px-4">{getStatusBadge(adjustment.status)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {(() => { const tz = branches?.find(b => b.name === adjustment.branch.name)?.timezone || DEFAULT_TIMEZONE; return (
                            <div>
                              <p>{inventoryService.formatDateTime(adjustment.createdAt, tz)}<span className="text-gray-400"> · {getTimezoneShortLabel(tz)}</span></p>
                              {adjustment.createdBy && (
                                <p className="text-xs text-gray-500">
                                  por {adjustment.createdBy.name}
                                </p>
                              )}
                            </div>
                            ); })()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/inventario/ajustes/${adjustment.id}`}>
                                <button
                                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Ver Detalle"
                                >
                                  <EyeIcon className="h-4 w-4 text-blue-600" />
                                </button>
                              </Link>

                              {adjustment.status === AdjustmentStatus.PENDING_APPROVAL && (
                                <>
                                  <button
                                    onClick={() => handleApprove(adjustment)}
                                    className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Aprobar"
                                    disabled={approveAdjustment.isPending}
                                  >
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  </button>
                                  <button
                                    onClick={() => handleReject(adjustment)}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Rechazar"
                                    disabled={rejectAdjustment.isPending}
                                  >
                                    <XMarkIcon className="h-4 w-4 text-red-600" />
                                  </button>
                                </>
                              )}

                              {adjustment.status === AdjustmentStatus.APPROVED && (
                                <button
                                  onClick={() => handleApply(adjustment)}
                                  className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Aplicar"
                                  disabled={applyAdjustment.isPending}
                                >
                                  <PlayIcon className="h-4 w-4 text-purple-600" />
                                </button>
                              )}

                              {(adjustment.status === AdjustmentStatus.DRAFT ||
                                adjustment.status === AdjustmentStatus.PENDING_APPROVAL) && (
                                <button
                                  onClick={() => handleCancel(adjustment)}
                                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Cancelar"
                                  disabled={cancelAdjustment.isPending}
                                >
                                  <XMarkIcon className="h-4 w-4 text-red-600" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(!adjustmentsData?.data || adjustmentsData.data.length === 0) && (
                  <div className="text-center py-12">
                    <ClipboardDocumentCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No se encontraron ajustes
                    </h3>
                    <p className="text-gray-600">Crea un nuevo ajuste para comenzar</p>
                  </div>
                )}

                {/* Pagination */}
                {adjustmentsData && adjustmentsData.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Página {adjustmentsData.page} de {adjustmentsData.totalPages} ({adjustmentsData.total} ajustes)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setParams({ page: String(page - 1) })}
                        disabled={page === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setParams({ page: String(page + 1) })}
                        disabled={page >= adjustmentsData.totalPages}
                      >
                        Siguiente
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
