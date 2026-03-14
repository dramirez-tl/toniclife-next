'use client';

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  ClockIcon,
  CheckBadgeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useMovements,
  useApproveMovement,
  useRejectMovement,
} from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import {
  MovementType,
  MovementStatus,
  type MovementQueryDto,
  type MovementDto,
} from '@/types/inventory';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { generateMovementTicketPdf } from '@/lib/generate-movement-ticket';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

export default function SalidasPage() {
  return <Suspense><SalidasContent /></Suspense>;
}

function SalidasContent() {
  const router = useRouter();
  const { get, getNumber, setParams } = useQueryFilters({ page: '1' });
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const approveMovement = useApproveMovement();
  const rejectMovement = useRejectMovement();

  const searchQuery = get('search');
  const statusFilter = get('status') as MovementStatus | '';
  const branchFilter = get('branch');
  const page = getNumber('page') || 1;

  const { data: branches } = useActiveBranches();

  const query: MovementQueryDto = {
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    branchId: branchFilter || undefined,
    movementType: MovementType.EXIT,
    page,
    limit: 20,
  };

  // Lightweight stats queries (limit:1 → server returns accurate .total)
  const baseStatsQuery: MovementQueryDto = useMemo(() => ({
    search: searchQuery || undefined,
    branchId: branchFilter || undefined,
    movementType: MovementType.EXIT,
    limit: 1,
    page: 1,
  }), [searchQuery, branchFilter]);

  const appliedStatsQuery: MovementQueryDto = useMemo(() => ({
    search: searchQuery || undefined,
    branchId: branchFilter || undefined,
    movementType: MovementType.EXIT,
    status: MovementStatus.APPLIED,
    limit: 1,
    page: 1,
  }), [searchQuery, branchFilter]);

  const pendingStatsQuery: MovementQueryDto = useMemo(() => ({
    search: searchQuery || undefined,
    branchId: branchFilter || undefined,
    movementType: MovementType.EXIT,
    status: MovementStatus.PENDING,
    limit: 1,
    page: 1,
  }), [searchQuery, branchFilter]);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const { data: movementsData, isLoading } = useMovements(query);
  const { data: baseStatsData } = useMovements(baseStatsQuery);
  const { data: appliedStatsData } = useMovements(appliedStatsQuery);
  const { data: pendingStatsData } = useMovements(pendingStatsQuery);

  const handleSearch = () => {
    setParams({ search: searchInput || '', page: '1' });
  };

  const handleApprove = async (id: string) => {
    try {
      await approveMovement.mutateAsync({ id });
      toast.success('Salida aprobada correctamente');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al aprobar la salida');
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectReason.trim()) return;
    try {
      await rejectMovement.mutateAsync({ id: showRejectModal, reason: rejectReason.trim() });
      toast.success('Salida rechazada');
      setShowRejectModal(null);
      setRejectReason('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al rechazar la salida');
    }
  };

  const handleDownloadPdf = async (movement: MovementDto) => {
    try {
      const detail = movement.items?.length ? movement : await inventoryService.getMovement(movement.id);
      const url = await generateMovementTicketPdf(detail);
      window.open(url, '_blank');
    } catch {
      toast.error('Error al generar el PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string }> = {
      applied: { bg: 'bg-green-100', text: 'text-green-700', label: 'Aplicado' },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Aprobado' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rechazado' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Cancelado' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Borrador' },
    };
    const c = config[status] || config.applied;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${c.bg} ${c.text} rounded-full text-xs font-medium`}>
        {c.label}
      </span>
    );
  };

  const stats = {
    total: baseStatsData?.total ?? 0,
    applied: appliedStatsData?.total ?? 0,
    pending: pendingStatsData?.total ?? 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ArrowUpTrayIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Salidas de Producto</h1>
              </div>
              <p className="text-white/80 text-lg">
                Registro de salidas de mercancía del inventario
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/inventario">
                <Button variant="secondary">Volver a Inventario</Button>
              </Link>
              <Link href="/admin/inventario/salidas/nuevo">
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                >
                  Nueva Salida
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Salidas</p>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.total)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <ArrowUpTrayIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Aplicadas</p>
                  <p className="text-3xl font-bold text-green-600">{formatNumber(stats.applied)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckBadgeIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-yellow-600">{formatNumber(stats.pending)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="No. de movimiento..."
                    value={searchInput || ''}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3E667D]/20 focus:border-[#3E667D]"
                  />
                </div>
              </div>
              <div className="min-w-[160px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setParams({ status: e.target.value, page: '1' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3E667D]/20 focus:border-[#3E667D]"
                >
                  <option value="">Todos</option>
                  <option value="applied">Aplicado</option>
                  <option value="pending_approval">Pendiente</option>
                  <option value="approved">Aprobado</option>
                  <option value="rejected">Rechazado</option>
                </select>
              </div>
              <div className="min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">Sucursal</label>
                <SearchableSelect
                  value={branchFilter || ''}
                  onChange={(val) => setParams({ branch: val, page: '1' })}
                  options={[{ value: '', label: 'Todas' }, ...(branches?.map(b => ({ value: b.id, label: b.name })) || [])]}
                  placeholder="Todas"
                />
              </div>
              <Button variant="secondary" onClick={handleSearch}>Buscar</Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-gray-500">Cargando salidas...</div>
            ) : !movementsData?.data.length ? (
              <div className="p-12 text-center text-gray-500">
                <ArrowUpTrayIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay salidas registradas</p>
                <p className="text-sm mt-1">Crea una nueva salida para comenzar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-600">No. Movimiento</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Sucursal</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Razón</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Items</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Cantidad</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Estado</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementsData.data.map((movement) => (
                      <tr key={movement.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{movement.movementNumber}</td>
                        <td className="px-4 py-3">{movement.branchName}</td>
                        <td className="px-4 py-3">{inventoryService.getMovementReasonLabel(movement.reason)}</td>
                        <td className="px-4 py-3 text-center">{movement.totalItems}</td>
                        <td className="px-4 py-3 text-center font-medium">{movement.totalQuantity}</td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(movement.status)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{(() => { const tz = branches?.find(b => b.name === movement.branchName)?.timezone || DEFAULT_TIMEZONE; return <>{inventoryService.formatDateTime(movement.createdAt, tz)}<span className="text-gray-400"> · {getTimezoneShortLabel(tz)}</span></>; })()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => router.push(`/admin/inventario/salidas/${movement.id}`)}
                              className="p-1.5 text-gray-500 hover:text-[#3E667D] hover:bg-gray-100 rounded-lg transition-colors"
                              title="Ver detalle"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPdf(movement)}
                              className="p-1.5 text-gray-500 hover:text-[#3E667D] hover:bg-gray-100 rounded-lg transition-colors"
                              title="Descargar PDF"
                            >
                              <DocumentArrowDownIcon className="h-4 w-4" />
                            </button>
                            {movement.status === 'pending_approval' && (
                              <>
                                <button
                                  onClick={() => handleApprove(movement.id)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Aprobar"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setShowRejectModal(movement.id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Rechazar"
                                >
                                  <XMarkIcon className="h-4 w-4" />
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
            )}

            {movementsData && movementsData.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-600">
                  Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, movementsData.total)} de {movementsData.total}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) })}>
                    Anterior
                  </Button>
                  <Button variant="secondary" size="sm" disabled={page >= movementsData.totalPages} onClick={() => setParams({ page: String(page + 1) })}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowRejectModal(null); setRejectReason(''); }} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rechazar Salida</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del rechazo *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Indica el motivo del rechazo..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || rejectMovement.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectMovement.isPending ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

