// app/admin/inventario/ajustes/page.tsx - Inventory Adjustments
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  ClipboardDocumentCheckIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  DocumentCheckIcon,
  PlayIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/utils';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useAdjustments,
  useAdjustmentStats,
  useApproveAdjustment,
  useRejectAdjustment,
  useApplyAdjustment,
  useCancelAdjustment,
  useExportAdjustments,
  useBranchPosLock,
} from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import {
  AdjustmentStatus,
  type AdjustmentQueryDto,
  type AdjustmentDto,
} from '@/types/inventory';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';

export default function AjustesPage() {
  return <Suspense><AjustesContent /></Suspense>;
}

function AjustesContent() {
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    branch: 'all',
    page: '1',
    limit: '20',
  });

  const statusFilter = get('status');
  const branchFilter = get('branch');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 20;

  // Reject dialog
  const [rejectTarget, setRejectTarget] = useState<AdjustmentDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: branches } = useActiveBranches();

  const query: AdjustmentQueryDto = useMemo(
    () => ({
      status: statusFilter !== 'all' ? (statusFilter as AdjustmentStatus) : undefined,
      branchId: branchFilter !== 'all' ? branchFilter : undefined,
      page,
      limit,
    }),
    [statusFilter, branchFilter, page, limit],
  );

  const statsParams: AdjustmentQueryDto = useMemo(
    () => ({ branchId: branchFilter !== 'all' ? branchFilter : undefined }),
    [branchFilter],
  );

  const { data: adjustmentsData, isLoading, isFetching } = useAdjustments(query);
  const { data: statsData, isLoading: statsLoading } = useAdjustmentStats(statsParams);
  const { data: branchLock } = useBranchPosLock(
    branchFilter !== 'all' ? branchFilter : null,
  );
  const selectedBranchName = branches?.find((b) => b.id === branchFilter)?.name;
  const approveAdjustment = useApproveAdjustment();
  const rejectAdjustment = useRejectAdjustment();
  const applyAdjustment = useApplyAdjustment();
  const cancelAdjustment = useCancelAdjustment();
  const exportAdjustments = useExportAdjustments();

  const total = adjustmentsData?.total || 0;

  // Stats reales (server-side). "Pendientes" agrupa los estados previos a
  // aprobación; los demás mapean a un estado único (cards clickables).
  const stats = useMemo(() => {
    const s = statsData?.byStatus ?? {};
    const sum = (...keys: string[]) =>
      keys.reduce((acc, k) => acc + (s[k] ?? 0), 0);
    return {
      total: statsData?.total ?? 0,
      pending: sum('planned', 'in_progress', 'completed', 'pending_review', 'pending_approval'),
      approved: s.approved ?? 0,
      applied: s.applied ?? 0,
    };
  }, [statsData]);

  const handleApprove = async (adjustment: AdjustmentDto) => {
    try {
      await approveAdjustment.mutateAsync({ id: adjustment.id });
      toast.success('Ajuste aprobado correctamente');
    } catch {
      toast.error('Error al aprobar el ajuste');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error('Indica el motivo del rechazo');
      return;
    }
    try {
      await rejectAdjustment.mutateAsync({ id: rejectTarget.id, data: { reason } });
      toast.success('Ajuste rechazado');
      setRejectTarget(null);
      setRejectReason('');
    } catch {
      toast.error('Error al rechazar el ajuste');
    }
  };

  const handleApply = async (adjustment: AdjustmentDto) => {
    const ok = await confirmAction(
      '¿Estás seguro de aplicar este ajuste? Esta acción modificará el inventario.',
    );
    if (!ok) return;
    try {
      await applyAdjustment.mutateAsync({ id: adjustment.id });
      toast.success('Ajuste aplicado correctamente');
    } catch {
      toast.error('Error al aplicar el ajuste');
    }
  };

  const handleCancel = async (adjustment: AdjustmentDto) => {
    const ok = await confirmAction('¿Estás seguro de cancelar este ajuste?');
    if (!ok) return;
    try {
      await cancelAdjustment.mutateAsync(adjustment.id);
      toast.success('Ajuste cancelado');
    } catch {
      toast.error('Error al cancelar el ajuste');
    }
  };

  const handleExport = async () => {
    try {
      await exportAdjustments.mutateAsync(statsParams);
      toast.success('CSV de ajustes descargado');
    } catch {
      toast.error('No se pudo exportar el CSV');
    }
  };

  const getStatusBadge = (status: AdjustmentStatus | string) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <ClockIcon className="h-3 w-3" /> },
      planned: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <ClockIcon className="h-3 w-3" /> },
      in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700', icon: <ClockIcon className="h-3 w-3" /> },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <ClockIcon className="h-3 w-3" /> },
      pending_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <ClockIcon className="h-3 w-3" /> },
      completed: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: <CheckIcon className="h-3 w-3" /> },
      reviewed: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <CheckIcon className="h-3 w-3" /> },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckIcon className="h-3 w-3" /> },
      applied: { bg: 'bg-green-100', text: 'text-green-700', icon: <DocumentCheckIcon className="h-3 w-3" /> },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: <XMarkIcon className="h-3 w-3" /> },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', icon: <XMarkIcon className="h-3 w-3" /> },
    };
    const { bg, text, icon } = config[status] ?? {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      icon: <ClockIcon className="h-3 w-3" />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${bg} ${text} rounded-full text-xs font-medium`}>
        {icon}
        {inventoryService.getAdjustmentStatusLabel(status)}
      </span>
    );
  };

  // AdjustmentDto espeja CountDto del backend (countNumber/countType/
  // totalProductsCounted/totalDiscrepancies).
  const readNumber = (a: AdjustmentDto) => a.countNumber || '—';
  const readTypeLabel = (a: AdjustmentDto) =>
    a.countType ? inventoryService.getCountTypeLabel(a.countType) : '—';
  const readItems = (a: AdjustmentDto) => a.totalProductsCounted ?? 0;
  const readDiscrepancies = (a: AdjustmentDto) => a.totalDiscrepancies ?? 0;

  const columns: DataTableColumn<AdjustmentDto>[] = useMemo(
    () => [
      {
        key: 'number',
        header: '# Ajuste',
        render: (a) => (
          <Link
            href={`/admin/inventario/ajustes/${a.id}`}
            className="font-mono font-semibold text-[#3E667D] hover:underline"
          >
            {readNumber(a)}
          </Link>
        ),
      },
      {
        key: 'branch',
        header: 'Sucursal',
        render: (a) => <span className="font-medium">{a.branch?.name}</span>,
      },
      {
        key: 'type',
        header: 'Tipo',
        render: (a) => (
          <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
            {readTypeLabel(a)}
          </span>
        ),
      },
      {
        key: 'items',
        header: 'Productos',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (a) => <span className="font-semibold">{readItems(a)}</span>,
      },
      {
        key: 'discrepancies',
        header: 'Discrepancias',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (a) => {
          const d = readDiscrepancies(a);
          return (
            <span className={`font-bold ${d > 0 ? 'text-amber-600' : 'text-gray-600'}`}>
              {d}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Estado',
        render: (a) => getStatusBadge(a.status),
      },
      {
        key: 'createdAt',
        header: 'Creado',
        cellClassName: 'text-sm text-gray-600',
        render: (a) => {
          const tz =
            branches?.find((b) => b.name === a.branch?.name)?.timezone ||
            DEFAULT_TIMEZONE;
          return (
            <div>
              <p>
                {inventoryService.formatDateTime(a.createdAt, tz)}
                <span className="text-gray-400"> · {getTimezoneShortLabel(tz)}</span>
              </p>
              {a.countedBy && (
                <p className="text-xs text-gray-500">por {a.countedBy.name}</p>
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
        render: (a) => (
          <div className="flex items-center justify-end gap-1">
            <Link href={`/admin/inventario/ajustes/${a.id}`}>
              <Button variant="ghost" size="icon-sm" title="Ver detalle">
                <EyeIcon className="h-4 w-4" />
              </Button>
            </Link>

            {(a.status === AdjustmentStatus.PENDING_APPROVAL ||
              (a.status as string) === 'completed' ||
              (a.status as string) === 'pending_review') && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Aprobar"
                  className="text-green-600 hover:bg-green-50"
                  onClick={() => handleApprove(a)}
                  disabled={approveAdjustment.isPending}
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Rechazar"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setRejectReason('');
                    setRejectTarget(a);
                  }}
                  disabled={rejectAdjustment.isPending}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </>
            )}

            {a.status === AdjustmentStatus.APPROVED && (
              <Button
                variant="ghost"
                size="icon-sm"
                title="Aplicar"
                className="text-purple-600 hover:bg-purple-50"
                onClick={() => handleApply(a)}
                disabled={applyAdjustment.isPending}
              >
                <PlayIcon className="h-4 w-4" />
              </Button>
            )}

            {(a.status === AdjustmentStatus.DRAFT ||
              a.status === AdjustmentStatus.PENDING_APPROVAL ||
              a.status === ('planned' as AdjustmentStatus) ||
              a.status === ('in_progress' as AdjustmentStatus)) && (
              <Button
                variant="ghost"
                size="icon-sm"
                title="Cancelar"
                className="text-red-600 hover:bg-red-50"
                onClick={() => handleCancel(a)}
                disabled={cancelAdjustment.isPending}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [
      branches,
      approveAdjustment.isPending,
      rejectAdjustment.isPending,
      applyAdjustment.isPending,
      cancelAdjustment.isPending,
    ],
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
    statusValue?: string;
  }) => {
    const active = statusValue !== undefined && statusFilter === statusValue;
    const clickable = statusValue !== undefined;
    const inner = (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{label}</p>
              <p className={`text-3xl font-bold ${valueColor}`}>
                {statsLoading ? '—' : value}
              </p>
            </div>
            <div className={`w-12 h-12 ${iconBg} rounded-full flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
    if (!clickable) return inner;
    return (
      <button
        type="button"
        onClick={() => setParams({ status: statusValue, page: null })}
        className={`text-left rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] ${
          active ? 'ring-2 ring-[#3E667D]' : 'hover:-translate-y-0.5'
        }`}
        aria-pressed={active}
      >
        {inner}
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
                <ClipboardDocumentCheckIcon className="h-8 w-8 lg:h-10 lg:w-10" />
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                  Ajustes de Inventario
                </h1>
              </div>
              <p className="text-white/80 text-sm sm:text-base lg:text-lg">
                Conteos físicos, correcciones y ajustes de stock
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link href="/admin/inventario">
                <Button variant="secondary">Volver a Inventario</Button>
              </Link>
              <Button
                className="bg-white text-[#3E667D] hover:bg-white/90"
                onClick={handleExport}
                disabled={exportAdjustments.isPending}
              >
                {exportAdjustments.isPending ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="h-5 w-5" />
                )}
                Exportar
              </Button>
              <Link href="/admin/inventario/ajustes/nuevo">
                <Button variant="default">
                  <PlusIcon className="h-5 w-5" />
                  Nuevo Ajuste
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Indicador de bloqueo de POS por inventario */}
        {branchFilter !== 'all' && branchLock && (
          <div
            className={`mb-6 rounded-xl border p-4 ${
              branchLock.locked
                ? 'border-red-200 bg-red-50'
                : 'border-green-200 bg-green-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                  branchLock.locked ? 'bg-red-100' : 'bg-green-100'
                }`}
              >
                {branchLock.locked ? (
                  <LockClosedIcon className="h-5 w-5 text-red-600" />
                ) : (
                  <LockOpenIcon className="h-5 w-5 text-green-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    branchLock.locked ? 'text-red-800' : 'text-green-800'
                  }`}
                >
                  {branchLock.locked
                    ? 'POS BLOQUEADO — inventario en progreso'
                    : 'POS activo'}
                  {selectedBranchName ? ` · ${selectedBranchName}` : ''}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    branchLock.locked ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {branchLock.locked
                    ? 'Las terminales POS de esta sucursal están bloqueadas hasta que se apliquen o cancelen los conteos activos.'
                    : 'Al iniciar un conteo para esta sucursal, su POS se bloqueará automáticamente hasta aplicarlo o cancelarlo.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            label="Total Ajustes"
            value={stats.total}
            icon={ClipboardDocumentCheckIcon}
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
          />
          <StatCard
            label="Aprobados"
            value={stats.approved}
            icon={CheckIcon}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
            valueColor="text-blue-600"
            statusValue="approved"
          />
          <StatCard
            label="Aplicados"
            value={stats.applied}
            icon={DocumentCheckIcon}
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
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400 shrink-0" />
                <SearchableSelect
                  options={[
                    { value: 'planned', label: 'Planeado' },
                    { value: 'in_progress', label: 'En Progreso' },
                    { value: 'completed', label: 'Pend. Aprobación' },
                    { value: 'approved', label: 'Aprobado' },
                    { value: 'applied', label: 'Aplicado' },
                    { value: 'cancelled', label: 'Cancelado' },
                  ]}
                  value={statusFilter}
                  onChange={(val) => setParams({ status: val, page: null })}
                  allLabel="Todos los Estados"
                  allValue="all"
                  className="w-[200px]"
                />
              </div>

              <SearchableSelect
                options={(branches ?? []).map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={branchFilter}
                onChange={(val) => setParams({ branch: val, page: null })}
                allLabel="Todas las Sucursales"
                allValue="all"
                className="w-[220px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Adjustments Table */}
        <Card>
          <CardContent className="p-0">
            <DataTable<AdjustmentDto>
              columns={columns}
              data={adjustmentsData?.data ?? []}
              getRowKey={(adjustment) => adjustment.id}
              isLoading={isLoading}
              loadingRows={8}
              minWidthClassName="min-w-[900px]"
              emptyState={
                <div className="text-center py-12">
                  <ClipboardDocumentCheckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    No se encontraron ajustes
                  </h3>
                  <p className="text-sm text-gray-500">
                    Crea un nuevo ajuste para comenzar
                  </p>
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

      {/* Reject dialog */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar ajuste</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `Vas a rechazar el ajuste ${readNumber(rejectTarget)}.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo del rechazo</Label>
            <Textarea
              id="reject-reason"
              placeholder="Describe por qué se rechaza el ajuste..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectReason('');
              }}
              disabled={rejectAdjustment.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectAdjustment.isPending || !rejectReason.trim()}
            >
              {rejectAdjustment.isPending ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
