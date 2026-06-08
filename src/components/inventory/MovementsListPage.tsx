'use client';

// Shared list screen for inventory movements (entradas/salidas).
// Both pages differ only by movementType + labels, so they render this.

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  ClockIcon,
  CheckBadgeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useMovements,
  useMovementStats,
  useApproveMovement,
  useRejectMovement,
  useExportMovements,
} from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import {
  MovementType,
  type MovementQueryDto,
  type MovementDto,
} from '@/types/inventory';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { generateMovementTicketPdf } from '@/lib/generate-movement-ticket';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  applied: { bg: 'bg-green-100', text: 'text-green-700', label: 'Aplicado' },
  pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Aprobado' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazado' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelado' },
  draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Borrador' },
};

function getStatusBadge(status: string) {
  const c = STATUS_BADGES[status] || STATUS_BADGES.applied;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 ${c.bg} ${c.text} rounded-full text-xs font-medium`}
    >
      {c.label}
    </span>
  );
}

export interface MovementsListPageProps {
  movementType: MovementType.ENTRY | MovementType.EXIT;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  newHref: string;
  newLabel: string;
  basePath: string; // e.g. /admin/inventario/entradas
  noun: string; // "entrada" | "salida"
  emptyLabel: string;
}

export function MovementsListPage(props: MovementsListPageProps) {
  return (
    <Suspense>
      <MovementsListContent {...props} />
    </Suspense>
  );
}

function MovementsListContent({
  movementType,
  title,
  subtitle,
  icon: Icon,
  newHref,
  newLabel,
  basePath,
  noun,
  emptyLabel,
}: MovementsListPageProps) {
  const { get, getNumber, setParams } = useQueryFilters({
    status: 'all',
    branch: 'all',
    page: '1',
    limit: '20',
  });

  const searchQuery = get('search');
  const statusFilter = get('status');
  const branchFilter = get('branch');
  const page = getNumber('page') || 1;
  const limit = getNumber('limit') || 20;

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [rejectTarget, setRejectTarget] = useState<MovementDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: branches } = useActiveBranches();
  const approveMovement = useApproveMovement();
  const rejectMovement = useRejectMovement();
  const exportMovements = useExportMovements();

  const query: MovementQueryDto = useMemo(
    () => ({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
      branchId: branchFilter !== 'all' ? branchFilter : undefined,
      movementType,
      page,
      limit,
    }),
    [searchQuery, statusFilter, branchFilter, movementType, page, limit],
  );

  const statsParams: MovementQueryDto = useMemo(
    () => ({
      search: searchQuery || undefined,
      branchId: branchFilter !== 'all' ? branchFilter : undefined,
      movementType,
    }),
    [searchQuery, branchFilter, movementType],
  );

  const { data: movementsData, isLoading, isFetching } = useMovements(query);
  const { data: statsData, isLoading: statsLoading } = useMovementStats(statsParams);

  const total = movementsData?.total ?? 0;
  const stats = useMemo(
    () => ({
      total: statsData?.total ?? 0,
      applied: statsData?.byStatus.applied ?? 0,
      pending: statsData?.byStatus.pending_approval ?? 0,
    }),
    [statsData],
  );

  const handleSearch = () => setParams({ search: searchInput?.trim() || null, page: null });

  const handleApprove = async (id: string) => {
    try {
      await approveMovement.mutateAsync({ id });
      toast.success(`${capitalize(noun)} aprobada correctamente`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Error al aprobar la ${noun}`);
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
      await rejectMovement.mutateAsync({ id: rejectTarget.id, reason });
      toast.success(`${capitalize(noun)} rechazada`);
      setRejectTarget(null);
      setRejectReason('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Error al rechazar la ${noun}`);
    }
  };

  const handleDownloadPdf = async (movement: MovementDto) => {
    try {
      const detail = movement.items?.length
        ? movement
        : await inventoryService.getMovement(movement.id);
      const url = await generateMovementTicketPdf(detail);
      window.open(url, '_blank');
    } catch {
      toast.error('Error al generar el PDF');
    }
  };

  const handleExport = async () => {
    try {
      const { page: _p, limit: _l, ...rest } = query;
      await exportMovements.mutateAsync({ query: rest });
      toast.success('CSV descargado');
    } catch {
      toast.error('No se pudo exportar el CSV');
    }
  };

  const columns: DataTableColumn<MovementDto>[] = useMemo(
    () => [
      {
        key: 'movementNumber',
        header: 'No. Movimiento',
        render: (m) => (
          <Link
            href={`${basePath}/${m.id}`}
            className="font-mono text-xs font-semibold text-[#3E667D] hover:underline"
          >
            {m.movementNumber}
          </Link>
        ),
      },
      { key: 'branchName', header: 'Sucursal', render: (m) => m.branchName },
      {
        key: 'reason',
        header: 'Razón',
        render: (m) => inventoryService.getMovementReasonLabel(m.reason),
      },
      {
        key: 'totalItems',
        header: 'Items',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (m) => m.totalItems,
      },
      {
        key: 'totalQuantity',
        header: 'Cantidad',
        headerClassName: 'text-center',
        cellClassName: 'text-center font-medium',
        render: (m) => m.totalQuantity,
      },
      {
        key: 'status',
        header: 'Estado',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (m) => getStatusBadge(m.status),
      },
      {
        key: 'createdAt',
        header: 'Fecha',
        cellClassName: 'text-xs text-gray-500',
        render: (m) => {
          const tz =
            branches?.find((b) => b.name === m.branchName)?.timezone ||
            DEFAULT_TIMEZONE;
          return (
            <>
              {inventoryService.formatDateTime(m.createdAt, tz)}
              <span className="text-gray-400"> · {getTimezoneShortLabel(tz)}</span>
            </>
          );
        },
      },
      {
        key: 'actions',
        header: 'Acciones',
        headerClassName: 'text-center',
        cellClassName: 'text-center',
        render: (m) => (
          <div className="flex items-center justify-center gap-1">
            <Link href={`${basePath}/${m.id}`}>
              <Button variant="ghost" size="icon-sm" title="Ver detalle">
                <EyeIcon className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Descargar PDF"
              onClick={() => handleDownloadPdf(m)}
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
            </Button>
            {m.status === 'pending_approval' && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Aprobar"
                  className="text-green-600 hover:bg-green-50"
                  onClick={() => handleApprove(m.id)}
                  disabled={approveMovement.isPending}
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
                    setRejectTarget(m);
                  }}
                  disabled={rejectMovement.isPending}
                >
                  <XMarkIcon className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [branches, approveMovement.isPending, rejectMovement.isPending, basePath],
  );

  const StatCard = ({
    label,
    value,
    iconBg,
    iconColor,
    valueColor,
    icon: CardIcon,
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
                <CardIcon className={`h-6 w-6 ${iconColor}`} />
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
                <Icon className="h-8 w-8 lg:h-10 lg:w-10" />
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{title}</h1>
              </div>
              <p className="text-white/80 text-sm sm:text-base lg:text-lg">{subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Link href="/admin/inventario">
                <Button variant="secondary">Volver a Inventario</Button>
              </Link>
              <Button
                className="bg-white text-[#3E667D] hover:bg-white/90"
                onClick={handleExport}
                disabled={exportMovements.isPending}
              >
                {exportMovements.isPending ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowDownTrayIcon className="h-5 w-5" />
                )}
                Exportar
              </Button>
              <Link href={newHref}>
                <Button variant="default">
                  <PlusIcon className="h-5 w-5" />
                  {newLabel}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            label={`Total ${title}`}
            value={stats.total}
            icon={Icon}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            valueColor="text-gray-900"
            statusValue="all"
          />
          <StatCard
            label="Aplicadas"
            value={stats.applied}
            icon={CheckBadgeIcon}
            iconBg="bg-green-100"
            iconColor="text-green-600"
            valueColor="text-green-600"
            statusValue="applied"
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
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por No. de movimiento..."
                      value={searchInput || ''}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    />
                  </div>
                  <Button variant="default" onClick={handleSearch}>
                    Buscar
                  </Button>
                </div>
              </div>

              <SearchableSelect
                options={[
                  { value: 'applied', label: 'Aplicado' },
                  { value: 'pending_approval', label: 'Pendiente' },
                  { value: 'approved', label: 'Aprobado' },
                  { value: 'rejected', label: 'Rechazado' },
                  { value: 'cancelled', label: 'Cancelado' },
                ]}
                value={statusFilter}
                onChange={(val) => setParams({ status: val, page: null })}
                allLabel="Todos los Estados"
                allValue="all"
                className="w-[180px]"
              />

              <SearchableSelect
                value={branchFilter}
                onChange={(val) => setParams({ branch: val, page: null })}
                options={(branches ?? []).map((b) => ({ value: b.id, label: b.name }))}
                allLabel="Todas las Sucursales"
                allValue="all"
                className="w-[220px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <DataTable<MovementDto>
              columns={columns}
              data={movementsData?.data ?? []}
              getRowKey={(m) => m.id}
              isLoading={isLoading}
              loadingRows={8}
              minWidthClassName="min-w-[900px]"
              emptyState={
                <div className="py-12 text-center">
                  <Icon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{emptyLabel}</h3>
                  <p className="text-sm text-gray-500">{newLabel} para comenzar</p>
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
            <DialogTitle>Rechazar {noun}</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `Vas a rechazar el movimiento ${rejectTarget.movementNumber}.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo del rechazo</Label>
            <Textarea
              id="reject-reason"
              placeholder="Indica el motivo del rechazo..."
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
              disabled={rejectMovement.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rejectMovement.isPending || !rejectReason.trim()}
            >
              {rejectMovement.isPending ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
