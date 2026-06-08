'use client';

import { Suspense, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { selectUser } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  NoSymbolIcon,
  TruckIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import {
  useTransfers,
  useTransferStats,
  useApproveTransfer,
  useApplyTransfer,
  useRejectTransfer,
  useCancelTransfer,
  useExportTransfers,
} from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import { type TransferQueryDto, type TransferDto } from '@/types/inventory';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

export default function TraspasosPage() {
  return <Suspense><TraspasosContent /></Suspense>;
}

function TraspasosContent() {
  const currentUser = useSelector(selectUser);
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    sourceBranch: 'all',
    destBranch: 'all',
    page: '1',
    limit: '20',
  });

  const searchQuery = get('search');
  const statusFilter = get('status');
  const sourceBranchFilter = get('sourceBranch');
  const destBranchFilter = get('destBranch');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);

  const { data: branches } = useActiveBranches();

  const query: TransferQueryDto = useMemo(
    () => ({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
      sourceBranchId: sourceBranchFilter !== 'all' ? sourceBranchFilter : undefined,
      destinationBranchId: destBranchFilter !== 'all' ? destBranchFilter : undefined,
      page,
      limit,
    }),
    [searchQuery, statusFilter, sourceBranchFilter, destBranchFilter, page, limit],
  );

  const statsParams: TransferQueryDto = useMemo(
    () => ({
      search: searchQuery || undefined,
      sourceBranchId: sourceBranchFilter !== 'all' ? sourceBranchFilter : undefined,
      destinationBranchId: destBranchFilter !== 'all' ? destBranchFilter : undefined,
    }),
    [searchQuery, sourceBranchFilter, destBranchFilter],
  );

  const { data: transfersData, isLoading, isFetching } = useTransfers(query);
  const { data: statsData, isLoading: statsLoading } = useTransferStats(statsParams);
  const approveTransfer = useApproveTransfer();
  const applyTransfer = useApplyTransfer();
  const rejectTransfer = useRejectTransfer();
  const cancelTransfer = useCancelTransfer();
  const exportTransfers = useExportTransfers();

  const total = transfersData?.total ?? 0;
  const stats = useMemo(
    () => ({
      total: statsData?.total ?? 0,
      pending: statsData?.byStatus.pending_approval ?? 0,
      approved: statsData?.byStatus.approved ?? 0,
      applied: statsData?.byStatus.applied ?? 0,
    }),
    [statsData],
  );

  // Reject/cancel dialog
  const [actionModal, setActionModal] = useState<{
    type: 'reject' | 'cancel';
    transfer: TransferDto;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const closeActionModal = () => {
    if (!rejectTransfer.isPending && !cancelTransfer.isPending) {
      setActionModal(null);
      setActionReason('');
    }
  };

  const handleApprove = async (transfer: TransferDto) => {
    try {
      await approveTransfer.mutateAsync({ id: transfer.id });
      toast.success('Traspaso aprobado correctamente');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al aprobar el traspaso');
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
    const reason = actionReason.trim();
    try {
      if (actionModal.type === 'reject') {
        await rejectTransfer.mutateAsync({ id: actionModal.transfer.id, data: { reason } });
        toast.success('Traspaso rechazado');
      } else {
        await cancelTransfer.mutateAsync({ id: actionModal.transfer.id, data: { reason } });
        toast.success('Traspaso cancelado');
      }
      setActionModal(null);
      setActionReason('');
    } catch {
      toast.error(
        actionModal.type === 'reject'
          ? 'Error al rechazar el traspaso'
          : 'Error al cancelar el traspaso',
      );
    }
  };

  const handleExport = async () => {
    try {
      await exportTransfers.mutateAsync(statsParams);
      toast.success('CSV de traspasos descargado');
    } catch {
      toast.error('No se pudo exportar el CSV');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <ClockIcon className="h-3 w-3" /> },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <TruckIcon className="h-3 w-3" /> },
      applied: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckBadgeIcon className="h-3 w-3" /> },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: <XMarkIcon className="h-3 w-3" /> },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <NoSymbolIcon className="h-3 w-3" /> },
    };
    const c = config[status] || config.pending_approval;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${c.bg} ${c.text} rounded-full text-xs font-medium`}>
        {c.icon}
        {inventoryService.getTransferStatusLabel(status)}
      </span>
    );
  };

  const columns: DataTableColumn<TransferDto>[] = useMemo(
    () => [
      {
        key: 'movementNumber',
        header: '# Movimiento',
        render: (transfer) => (
          <Link
            href={`/admin/inventario/traspasos/${transfer.id}`}
            className="font-mono font-semibold text-[#3E667D] hover:underline"
          >
            {transfer.movementNumber}
          </Link>
        ),
      },
      {
        key: 'route',
        header: 'Origen → Destino',
        render: (transfer) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{transfer.branch.name}</span>
            <ArrowsRightLeftIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="font-medium">{transfer.destinationBranch.name}</span>
          </div>
        ),
      },
      {
        key: 'totalItems',
        header: 'Items',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (transfer) => <span className="font-semibold">{transfer.totalItems}</span>,
      },
      {
        key: 'totalQuantity',
        header: 'Cantidad',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (transfer) => <span className="font-semibold">{transfer.totalQuantity}</span>,
      },
      {
        key: 'status',
        header: 'Estado',
        render: (transfer) => getStatusBadge(transfer.status),
      },
      {
        key: 'requestedAt',
        header: 'Solicitado',
        cellClassName: 'text-sm text-gray-600',
        render: (transfer) => {
          const tz =
            branches?.find((b) => b.code === transfer.branch.code)?.timezone ||
            DEFAULT_TIMEZONE;
          return (
            <div>
              <p>
                {inventoryService.formatDateTime(transfer.requestedAt, tz)}
                <span className="text-gray-400"> · {getTimezoneShortLabel(tz)}</span>
              </p>
              {transfer.requestedBy && (
                <p className="text-xs text-gray-500">por {transfer.requestedBy.name}</p>
              )}
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (transfer) => (
          <div className="flex items-center justify-end gap-1">
            <Link href={`/admin/inventario/traspasos/${transfer.id}`}>
              <Button variant="ghost" size="icon-sm" title="Ver Detalle">
                <EyeIcon className="h-4 w-4" />
              </Button>
            </Link>

            {transfer.status === 'pending_approval' && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-green-600 hover:bg-green-50 disabled:opacity-40"
                  onClick={() => handleApprove(transfer)}
                  title={
                    currentUser?.id === transfer.requestedBy?.id
                      ? 'No puedes aprobar tu propio traspaso'
                      : 'Aprobar'
                  }
                  disabled={
                    approveTransfer.isPending ||
                    currentUser?.id === transfer.requestedBy?.id
                  }
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-orange-600 hover:bg-orange-50"
                  onClick={() => {
                    setActionReason('');
                    setActionModal({ type: 'reject', transfer });
                  }}
                  title="Rechazar"
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setActionReason('');
                    setActionModal({ type: 'cancel', transfer });
                  }}
                  title="Cancelar"
                >
                  <NoSymbolIcon className="h-4 w-4" />
                </Button>
              </>
            )}

            {transfer.status === 'approved' && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-green-600 hover:bg-green-50"
                  onClick={() => handleApply(transfer)}
                  title="Aplicar Traspaso"
                  disabled={applyTransfer.isPending}
                >
                  <PlayIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setActionReason('');
                    setActionModal({ type: 'cancel', transfer });
                  }}
                  title="Cancelar"
                >
                  <NoSymbolIcon className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [branches, currentUser, approveTransfer.isPending, applyTransfer.isPending],
  );

  const StatCard = ({
    label,
    value,
    iconBg,
    iconColor,
    valueColor,
    icon: Icon,
    statusValue,
  }: {
    label: string;
    value: number;
    iconBg: string;
    iconColor: string;
    valueColor: string;
    icon: React.ComponentType<{ className?: string }>;
    statusValue: string;
  }) => {
    const active = statusFilter === statusValue;
    return (
      <button
        type="button"
        onClick={() => setParams({ status: statusValue, page: null })}
        className={`text-left rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] ${
          active ? 'ring-2 ring-[#3E667D]' : 'hover:-translate-y-0.5'
        }`}
        aria-pressed={active}
      >
        <Card className="h-full">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${valueColor}`}>
                  {statsLoading ? '—' : formatNumber(value)}
                </p>
              </div>
              <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ArrowsRightLeftIcon className="h-8 w-8 lg:h-10 lg:w-10" />
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                  Traspasos entre Sucursales
                </h1>
              </div>
              <p className="text-white/80 text-sm sm:text-base lg:text-lg">
                Gestiona el movimiento de mercancía entre sucursales
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link href="/admin/inventario">
                <Button variant="secondary">Volver a Inventario</Button>
              </Link>
              <Button
                className="bg-white text-[#3E667D] hover:bg-white/90"
                onClick={handleExport}
                disabled={exportTransfers.isPending}
              >
                {exportTransfers.isPending ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="h-5 w-5" />
                )}
                Exportar
              </Button>
              <Link href="/admin/inventario/traspasos/nuevo">
                <Button variant="default">
                  <PlusIcon className="h-5 w-5" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            label="Total Traspasos"
            value={stats.total}
            icon={ArrowsRightLeftIcon}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            valueColor="text-gray-900"
            statusValue="all"
          />
          <StatCard
            label="Pendientes"
            value={stats.pending}
            icon={ClockIcon}
            iconBg="bg-yellow-100"
            iconColor="text-yellow-600"
            valueColor="text-yellow-600"
            statusValue="pending_approval"
          />
          <StatCard
            label="En Tránsito"
            value={stats.approved}
            icon={TruckIcon}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            valueColor="text-blue-600"
            statusValue="approved"
          />
          <StatCard
            label="Aplicados"
            value={stats.applied}
            icon={CheckBadgeIcon}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            valueColor="text-green-600"
            statusValue="applied"
          />
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <Input
                    type="text"
                    placeholder="Buscar por número de movimiento..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setParams({ search: e.target.value, page: null });
                    }}
                    className="w-full pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400 shrink-0" />
                <SearchableSelect
                  options={[
                    { value: 'pending_approval', label: 'Pendiente' },
                    { value: 'approved', label: 'En Tránsito' },
                    { value: 'applied', label: 'Aplicado' },
                    { value: 'rejected', label: 'Rechazado' },
                    { value: 'cancelled', label: 'Cancelado' },
                  ]}
                  value={statusFilter}
                  onChange={(val) => setParams({ status: val, page: null })}
                  allLabel="Todos los Estados"
                  allValue="all"
                  className="w-[170px]"
                />
              </div>
              <SearchableSelect
                options={(branches ?? []).map((branch) => ({ value: branch.id, label: branch.name }))}
                value={sourceBranchFilter}
                onChange={(val) => setParams({ sourceBranch: val, page: null })}
                allLabel="Origen: Todas"
                allValue="all"
                className="w-[180px]"
              />
              <SearchableSelect
                options={(branches ?? []).map((branch) => ({ value: branch.id, label: branch.name }))}
                value={destBranchFilter}
                onChange={(val) => setParams({ destBranch: val, page: null })}
                allLabel="Destino: Todas"
                allValue="all"
                className="w-[180px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Transfers Table */}
        <Card>
          <CardContent className="p-0">
            <DataTable<TransferDto>
              columns={columns}
              data={transfersData?.data ?? []}
              getRowKey={(transfer) => transfer.id}
              isLoading={isLoading}
              loadingRows={10}
              minWidthClassName="min-w-[900px]"
              emptyState={
                <div className="text-center py-12">
                  <ArrowsRightLeftIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No se encontraron traspasos
                  </h3>
                  <p className="text-sm text-gray-500">Crea un nuevo traspaso para comenzar</p>
                </div>
              }
            />
          </CardContent>
        </Card>

        <DataTablePagination
          currentPage={page}
          pageSize={limit}
          totalItems={total}
          isLoading={isLoading || isFetching}
          onPageChange={(p) => setParams({ page: String(p) })}
          onPageSizeChange={(size) => setParams({ limit: String(size), page: null })}
          pageSizeOptions={[10, 20, 50, 100]}
        />
      </div>

      {/* Reject/Cancel Dialog */}
      <Dialog open={!!actionModal} onOpenChange={(open) => !open && closeActionModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionModal?.type === 'reject' ? 'Rechazar traspaso' : 'Cancelar traspaso'}
            </DialogTitle>
            <DialogDescription>
              {actionModal?.type === 'reject'
                ? 'El traspaso será rechazado y el stock reservado se liberará.'
                : 'El traspaso será cancelado permanentemente y el stock reservado se liberará.'}
              {actionModal ? ` Movimiento ${actionModal.transfer.movementNumber}.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="action-reason">Motivo</Label>
            <Textarea
              id="action-reason"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder={
                actionModal?.type === 'reject'
                  ? 'Describe el motivo del rechazo...'
                  : 'Describe el motivo de la cancelación...'
              }
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeActionModal}
              disabled={rejectTransfer.isPending || cancelTransfer.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleActionConfirm}
              disabled={
                !actionReason.trim() ||
                rejectTransfer.isPending ||
                cancelTransfer.isPending
              }
            >
              {rejectTransfer.isPending || cancelTransfer.isPending
                ? 'Procesando...'
                : actionModal?.type === 'reject'
                  ? 'Confirmar rechazo'
                  : 'Confirmar cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
