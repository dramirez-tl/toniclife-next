'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { selectUser } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  CheckBadgeIcon,
  XMarkIcon,
  ClockIcon,
  PlayIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useTransfers,
  useApproveTransfer,
  useApplyTransfer,
  useRejectTransfer,
  useCancelTransfer,
} from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import { MovementStatus, type TransferQueryDto, type TransferDto } from '@/types/inventory';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';

export default function TraspasosPage() {
  return <Suspense><TraspasosContent /></Suspense>;
}

function TraspasosContent() {
  const currentUser = useSelector(selectUser);
  const { get, getNumber, setParams } = useQueryFilters({ page: '1' });

  const searchQuery = get('search');
  const statusFilter = get('status') as MovementStatus | '';
  const sourceBranchFilter = get('sourceBranch');
  const destBranchFilter = get('destBranch');
  const page = getNumber('page') || 1;

  const { data: branches } = useActiveBranches();

  const query: TransferQueryDto = {
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    sourceBranchId: sourceBranchFilter || undefined,
    destinationBranchId: destBranchFilter || undefined,
    page,
    limit: 20,
  };

  const [searchInput, setSearchInput] = useState(searchQuery);

  const { data: transfersData, isLoading } = useTransfers(query);
  const approveTransfer = useApproveTransfer();
  const applyTransfer = useApplyTransfer();
  const rejectTransfer = useRejectTransfer();
  const cancelTransfer = useCancelTransfer();

  // Modal state for reject/cancel with reason
  const [actionModal, setActionModal] = useState<{
    type: 'reject' | 'cancel';
    transfer: TransferDto;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const closeActionModal = useCallback(() => {
    if (!rejectTransfer.isPending && !cancelTransfer.isPending) {
      setActionModal(null);
      setActionReason('');
    }
  }, [rejectTransfer.isPending, cancelTransfer.isPending]);

  useEffect(() => {
    if (!actionModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeActionModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [actionModal, closeActionModal]);

  const handleApprove = async (transfer: TransferDto) => {
    try {
      await approveTransfer.mutateAsync({ id: transfer.id });
      toast.success('Traspaso aprobado correctamente');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al aprobar el traspaso';
      toast.error(msg);
    }
  };

  const handleApply = async (transfer: TransferDto) => {
    try {
      await applyTransfer.mutateAsync(transfer.id);
      toast.success('Traspaso aplicado — inventario movido correctamente');
    } catch {
      toast.error('Error al aplicar el traspaso');
    }
  };

  const handleActionConfirm = async () => {
    if (!actionModal || !actionReason.trim()) return;
    try {
      if (actionModal.type === 'reject') {
        await rejectTransfer.mutateAsync({
          id: actionModal.transfer.id,
          data: { reason: actionReason.trim() },
        });
        toast.success('Traspaso rechazado');
      } else {
        await cancelTransfer.mutateAsync({
          id: actionModal.transfer.id,
          data: { reason: actionReason.trim() },
        });
        toast.success('Traspaso cancelado');
      }
      closeActionModal();
    } catch {
      toast.error(
        actionModal.type === 'reject'
          ? 'Error al rechazar el traspaso'
          : 'Error al cancelar el traspaso',
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending_approval: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: <ClockIcon className="h-3 w-3" />,
      },
      approved: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: <TruckIcon className="h-3 w-3" />,
      },
      applied: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: <CheckBadgeIcon className="h-3 w-3" />,
      },
      rejected: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <XMarkIcon className="h-3 w-3" />,
      },
      cancelled: {
        bg: 'bg-gray-100',
        text: 'text-gray-600',
        icon: <NoSymbolIcon className="h-3 w-3" />,
      },
    };

    const c = config[status] || config.pending_approval;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${c.bg} ${c.text} rounded-full text-xs font-medium`}>
        {c.icon}
        {inventoryService.getTransferStatusLabel(status)}
      </span>
    );
  };

  // Stats
  const stats = {
    total: transfersData?.total || 0,
    pending: transfersData?.data.filter(t => t.status === 'pending_approval').length || 0,
    approved: transfersData?.data.filter(t => t.status === 'approved').length || 0,
    applied: transfersData?.data.filter(t => t.status === 'applied').length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ArrowsRightLeftIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Traspasos entre Sucursales</h1>
              </div>
              <p className="text-white/80 text-lg">
                Gestiona el movimiento de mercancía entre sucursales
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/inventario">
                <Button variant="secondary">Volver a Inventario</Button>
              </Link>
              <Link href="/admin/inventario/traspasos/nuevo">
                <Button variant="primary" leftIcon={<PlusIcon className="h-5 w-5" />}>
                  Nuevo Traspaso
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
                  <p className="text-sm text-gray-600 mb-1">Total Traspasos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ArrowsRightLeftIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendientes</p>
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
                  <p className="text-sm text-gray-600 mb-1">En Tránsito</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <TruckIcon className="h-6 w-6 text-blue-600" />
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
                  <CheckBadgeIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por número de movimiento..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setParams({ search: e.target.value });
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <SearchableSelect
                  options={[
                    { value: 'pending_approval', label: 'Pendiente' },
                    { value: 'approved', label: 'En Tránsito' },
                    { value: 'applied', label: 'Aplicado' },
                    { value: 'rejected', label: 'Rechazado' },
                    { value: 'cancelled', label: 'Cancelado' },
                  ]}
                  value={statusFilter}
                  onChange={(val) => setParams({ status: val })}
                  allLabel="Todos los Estados"
                />
              </div>
              <SearchableSelect
                options={(branches ?? []).map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={sourceBranchFilter}
                onChange={(val) => setParams({ sourceBranch: val })}
                allLabel="Origen: Todas"
              />
              <SearchableSelect
                options={(branches ?? []).map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={destBranchFilter}
                onChange={(val) => setParams({ destBranch: val })}
                allLabel="Destino: Todas"
              />
            </div>
          </CardContent>
        </Card>

        {/* Transfers Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando traspasos...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900"># Movimiento</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Origen → Destino</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Items</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">Cantidad</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Estado</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Solicitado</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfersData?.data.map((transfer) => (
                        <tr key={transfer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-4 px-4">
                            <Link
                              href={`/admin/inventario/traspasos/${transfer.id}`}
                              className="font-mono font-semibold text-[#3E667D] hover:underline"
                            >
                              {transfer.movementNumber}
                            </Link>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{transfer.branch.name}</span>
                              <ArrowsRightLeftIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="font-medium">{transfer.destinationBranch.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-semibold">{transfer.totalItems}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-semibold">{transfer.totalQuantity}</span>
                          </td>
                          <td className="py-4 px-4">{getStatusBadge(transfer.status)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {(() => { const tz = branches?.find(b => b.code === transfer.branch.code)?.timezone || DEFAULT_TIMEZONE; return (
                            <div>
                              <p>{inventoryService.formatDateTime(transfer.requestedAt, tz)}<span className="text-gray-400"> · {getTimezoneShortLabel(tz)}</span></p>
                              {transfer.requestedBy && (
                                <p className="text-xs text-gray-500">por {transfer.requestedBy.name}</p>
                              )}
                            </div>
                            ); })()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/admin/inventario/traspasos/${transfer.id}`}>
                                <button className="p-2 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Detalle">
                                  <EyeIcon className="h-4 w-4 text-blue-600" />
                                </button>
                              </Link>

                              {transfer.status === 'pending_approval' && (
                                <>
                                  <button
                                    onClick={() => handleApprove(transfer)}
                                    className="p-2 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    title={currentUser?.id === transfer.requestedBy?.id ? 'No puedes aprobar tu propio traspaso' : 'Aprobar'}
                                    disabled={approveTransfer.isPending || currentUser?.id === transfer.requestedBy?.id}
                                  >
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  </button>
                                  <button
                                    onClick={() => setActionModal({ type: 'reject', transfer })}
                                    className="p-2 hover:bg-orange-50 rounded-lg transition-colors"
                                    title="Rechazar"
                                  >
                                    <XMarkIcon className="h-4 w-4 text-orange-600" />
                                  </button>
                                  <button
                                    onClick={() => setActionModal({ type: 'cancel', transfer })}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Cancelar"
                                  >
                                    <NoSymbolIcon className="h-4 w-4 text-red-600" />
                                  </button>
                                </>
                              )}

                              {transfer.status === 'approved' && (
                                <>
                                  <button
                                    onClick={() => handleApply(transfer)}
                                    className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Aplicar Traspaso"
                                    disabled={applyTransfer.isPending}
                                  >
                                    <PlayIcon className="h-4 w-4 text-green-600" />
                                  </button>
                                  <button
                                    onClick={() => setActionModal({ type: 'cancel', transfer })}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Cancelar"
                                  >
                                    <NoSymbolIcon className="h-4 w-4 text-red-600" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(!transfersData?.data || transfersData.data.length === 0) && (
                  <div className="text-center py-12">
                    <ArrowsRightLeftIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron traspasos</h3>
                    <p className="text-gray-600">Crea un nuevo traspaso para comenzar</p>
                  </div>
                )}

                {transfersData && transfersData.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Página {transfersData.page} de {transfersData.totalPages} ({transfersData.total} traspasos)
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
                        disabled={page >= transfersData.totalPages}
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

      {/* Reject/Cancel Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeActionModal} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full ${actionModal.type === 'reject' ? 'bg-orange-100' : 'bg-red-100'}`}>
                  <ExclamationTriangleIcon
                    className={`h-6 w-6 ${actionModal.type === 'reject' ? 'text-orange-600' : 'text-red-600'}`}
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {actionModal.type === 'reject' ? 'Rechazar Traspaso' : 'Cancelar Traspaso'}
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {actionModal.type === 'reject'
                  ? 'El traspaso será rechazado y el stock reservado se liberará.'
                  : 'El traspaso será cancelado permanentemente y el stock reservado se liberará.'}
                {' '}Movimiento:{' '}
                <span className="font-semibold font-mono">{actionModal.transfer.movementNumber}</span>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    actionModal.type === 'reject'
                      ? 'Describe el motivo del rechazo...'
                      : 'Describe el motivo de la cancelación...'
                  }
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]/30 focus:border-[#3E667D] resize-none"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{actionReason.length}/500</p>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={closeActionModal}
                  disabled={rejectTransfer.isPending || cancelTransfer.isPending}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Volver
                </button>
                <button
                  onClick={handleActionConfirm}
                  disabled={!actionReason.trim() || rejectTransfer.isPending || cancelTransfer.isPending}
                  className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                    actionModal.type === 'reject'
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {rejectTransfer.isPending || cancelTransfer.isPending
                    ? 'Procesando...'
                    : actionModal.type === 'reject'
                      ? 'Confirmar Rechazo'
                      : 'Confirmar Cancelación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
