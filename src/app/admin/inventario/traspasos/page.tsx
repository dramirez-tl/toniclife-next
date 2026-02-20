// app/admin/inventario/traspasos/page.tsx - Transfer Management
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  CheckIcon,
  TruckIcon,
  ArchiveBoxIcon,
  XMarkIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useTransfers, useApproveTransfer, useShipTransfer, useCancelTransfer } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import { TransferStatus, type TransferQueryDto, type TransferDto } from '@/types/inventory';

export default function TraspasosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransferStatus | ''>('');
  const [sourceBranchFilter, setSourceBranchFilter] = useState('');
  const [destBranchFilter, setDestBranchFilter] = useState('');
  const [page, setPage] = useState(1);
  // Fetch branches for filters
  const { data: branches } = useActiveBranches();

  const query: TransferQueryDto = {
    search: searchQuery || undefined,
    status: statusFilter || undefined,
    sourceBranchId: sourceBranchFilter || undefined,
    destinationBranchId: destBranchFilter || undefined,
    page,
    limit: 20,
  };

  const { data: transfersData, isLoading } = useTransfers(query);
  const approveTransfer = useApproveTransfer();
  const shipTransfer = useShipTransfer();
  const cancelTransfer = useCancelTransfer();

  const handleApprove = async (transfer: TransferDto) => {
    try {
      await approveTransfer.mutateAsync({ id: transfer.id });
      toast.success('Traspaso aprobado correctamente');
    } catch (error) {
      toast.error('Error al aprobar el traspaso');
    }
  };

  const handleShip = async (transfer: TransferDto) => {
    try {
      await shipTransfer.mutateAsync({ id: transfer.id });
      toast.success('Traspaso marcado como enviado');
    } catch (error) {
      toast.error('Error al enviar el traspaso');
    }
  };

  const handleCancel = async (transfer: TransferDto) => {
    const reason = prompt('Ingresa el motivo de cancelación:');
    if (!reason) return;

    try {
      await cancelTransfer.mutateAsync({ id: transfer.id, data: { reason } });
      toast.success('Traspaso cancelado');
    } catch (error) {
      toast.error('Error al cancelar el traspaso');
    }
  };

  const getStatusBadge = (status: TransferStatus) => {
    const config: Record<TransferStatus, { bg: string; text: string; icon: React.ReactNode }> = {
      [TransferStatus.PENDING]: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: <ClockIcon className="h-3 w-3" />,
      },
      [TransferStatus.IN_TRANSIT]: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: <TruckIcon className="h-3 w-3" />,
      },
      [TransferStatus.RECEIVED]: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: <CheckIcon className="h-3 w-3" />,
      },
      [TransferStatus.CANCELLED]: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <XMarkIcon className="h-3 w-3" />,
      },
      [TransferStatus.PARTIAL]: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        icon: <ArrowPathIcon className="h-3 w-3" />,
      },
    };

    const { bg, text, icon } = config[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${bg} ${text} rounded-full text-xs font-medium`}>
        {icon}
        {inventoryService.getTransferStatusLabel(status)}
      </span>
    );
  };

  // Stats
  const stats = {
    total: transfersData?.total || 0,
    pending: transfersData?.data.filter(t => t.status === TransferStatus.PENDING).length || 0,
    inTransit: transfersData?.data.filter(t => t.status === TransferStatus.IN_TRANSIT).length || 0,
    received: transfersData?.data.filter(t => t.status === TransferStatus.RECEIVED).length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
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
                <Button
                  variant="primary"
                  leftIcon={<PlusIcon className="h-5 w-5" />}
                >
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
                  <p className="text-3xl font-bold text-blue-600">{stats.inTransit}</p>
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
                  <p className="text-sm text-gray-600 mb-1">Recibidos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.received}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                    placeholder="Buscar por número de traspaso..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TransferStatus | '')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="">Todos los Estados</option>
                  <option value={TransferStatus.PENDING}>Pendiente</option>
                  <option value={TransferStatus.IN_TRANSIT}>En Tránsito</option>
                  <option value={TransferStatus.RECEIVED}>Recibido</option>
                  <option value={TransferStatus.CANCELLED}>Cancelado</option>
                </select>
              </div>

              {/* Source Branch */}
              <select
                value={sourceBranchFilter}
                onChange={(e) => setSourceBranchFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              >
                <option value="">Origen: Todas</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              {/* Destination Branch */}
              <select
                value={destBranchFilter}
                onChange={(e) => setDestBranchFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              >
                <option value="">Destino: Todas</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Transfers Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-[#003B7A] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando traspasos...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          # Traspaso
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Origen → Destino
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Items
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Cantidad
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Estado
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Solicitado
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {transfersData?.data.map((transfer) => (
                        <tr
                          key={transfer.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <span className="font-mono font-semibold text-[#003B7A]">
                              {transfer.transferNumber}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{transfer.sourceBranch.name}</span>
                              <ArrowsRightLeftIcon className="h-4 w-4 text-gray-400" />
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
                            <div>
                              <p>{inventoryService.formatDateTime(transfer.requestedAt)}</p>
                              {transfer.requestedBy && (
                                <p className="text-xs text-gray-500">
                                  por {transfer.requestedBy.name}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/admin/inventario/traspasos/${transfer.id}`}>
                                <button
                                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Ver Detalle"
                                >
                                  <EyeIcon className="h-4 w-4 text-blue-600" />
                                </button>
                              </Link>

                              {transfer.status === TransferStatus.PENDING && (
                                <>
                                  <button
                                    onClick={() => handleApprove(transfer)}
                                    className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                                    title="Aprobar"
                                    disabled={approveTransfer.isPending}
                                  >
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  </button>
                                  <button
                                    onClick={() => handleCancel(transfer)}
                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Cancelar"
                                    disabled={cancelTransfer.isPending}
                                  >
                                    <XMarkIcon className="h-4 w-4 text-red-600" />
                                  </button>
                                </>
                              )}

                              {transfer.status === TransferStatus.IN_TRANSIT && (
                                <Link href={`/admin/inventario/traspasos/${transfer.id}/recibir`}>
                                  <button
                                    className="p-2 hover:bg-purple-50 rounded-lg transition-colors"
                                    title="Recibir"
                                  >
                                    <ArchiveBoxIcon className="h-4 w-4 text-purple-600" />
                                  </button>
                                </Link>
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
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No se encontraron traspasos
                    </h3>
                    <p className="text-gray-600">Crea un nuevo traspaso para comenzar</p>
                  </div>
                )}

                {/* Pagination */}
                {transfersData && transfersData.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Página {transfersData.page} de {transfersData.totalPages} ({transfersData.total} traspasos)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
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
    </div>
  );
}
