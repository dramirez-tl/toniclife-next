'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  CheckBadgeIcon,
  ClockIcon,
  XMarkIcon,
  PlayIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  CubeIcon,
  TruckIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  useTransfer,
  useApproveTransfer,
  useApplyTransfer,
  useRejectTransfer,
  useCancelTransfer,
} from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';
import type { TransferDto } from '@/types/inventory';
import { generateTransferTicketPdf } from '@/lib/generate-transfer-ticket';

// ================================
// Status Timeline
// ================================

function StatusTimeline({ transfer, originTz, destTz }: { transfer: TransferDto; originTz: string; destTz: string }) {
  const isRejected = transfer.status === 'rejected';
  const isCancelled = transfer.status === 'cancelled';
  const isTerminal = isRejected || isCancelled;

  const steps = [
    {
      label: 'Solicitado',
      date: transfer.requestedAt,
      tz: originTz,
      user: transfer.requestedBy?.name,
      done: true,
      icon: <ClockIcon className="h-4 w-4" />,
    },
    {
      label: transfer.status === 'approved' ? 'En Tránsito' : 'Aprobado',
      date: transfer.approvedAt,
      tz: originTz,
      user: transfer.approvedBy?.name,
      done: ['approved', 'applied'].includes(transfer.status),
      icon: transfer.status === 'approved' ? <TruckIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />,
    },
    {
      label: 'Aplicado',
      date: transfer.appliedAt,
      tz: destTz,
      user: transfer.appliedBy?.name,
      done: transfer.status === 'applied',
      icon: <CheckBadgeIcon className="h-4 w-4" />,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Progreso</h2>
      <div className="flex items-start justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-gray-200" />
        <div
          className={`absolute top-5 left-[10%] h-0.5 transition-all duration-500 ${isTerminal ? 'bg-red-400' : 'bg-[#3E667D]'}`}
          style={{
            width: transfer.status === 'pending_approval'
              ? '0%'
              : transfer.status === 'approved'
                ? '40%'
                : transfer.status === 'applied'
                  ? '80%'
                  : isRejected
                    ? '0%'
                    : transfer.status === 'cancelled'
                      ? steps[1].done ? '40%' : '0%'
                      : '0%',
          }}
        />

        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center relative z-10 flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${
                step.done
                  ? 'bg-[#3E667D]'
                  : 'bg-gray-300'
              }`}
            >
              {step.icon}
            </div>
            <p className={`text-sm font-medium mt-2 ${step.done ? 'text-[#3E667D]' : 'text-gray-400'}`}>
              {step.label}
            </p>
            {step.date && (
              <p className="text-xs text-gray-500 mt-0.5">
                {inventoryService.formatDateTime(step.date, step.tz)}
                <span className="text-gray-400"> · {getTimezoneShortLabel(step.tz)}</span>
              </p>
            )}
            {step.user && (
              <p className="text-xs text-gray-400">{step.user}</p>
            )}
          </div>
        ))}
      </div>

      {/* Terminal state indicator */}
      {isTerminal && (
        <div className={`mt-6 p-3 rounded-lg ${isRejected ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-2">
            {isRejected ? (
              <XMarkIcon className="h-5 w-5 text-red-600" />
            ) : (
              <NoSymbolIcon className="h-5 w-5 text-gray-600" />
            )}
            <span className={`text-sm font-medium ${isRejected ? 'text-red-700' : 'text-gray-700'}`}>
              {isRejected ? 'Rechazado' : 'Cancelado'}
              {transfer.rejectedBy && ` por ${transfer.rejectedBy.name}`}
              {transfer.rejectedAt && ` el ${inventoryService.formatDateTime(transfer.rejectedAt, originTz)} · ${getTimezoneShortLabel(originTz)}`}
            </span>
          </div>
          {transfer.rejectionReason && (
            <p className="text-sm text-gray-600 mt-2 ml-7">
              Motivo: {transfer.rejectionReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ================================
// Status Badge
// ================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <ClockIcon className="h-4 w-4" /> },
    approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <TruckIcon className="h-4 w-4" /> },
    applied: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckBadgeIcon className="h-4 w-4" /> },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: <XMarkIcon className="h-4 w-4" /> },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <NoSymbolIcon className="h-4 w-4" /> },
  };
  const c = config[status] || config.pending_approval;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${c.bg} ${c.text} rounded-full text-sm font-medium`}>
      {c.icon}
      {inventoryService.getTransferStatusLabel(status)}
    </span>
  );
}

// ================================
// Main Page
// ================================

export default function TransferDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const currentUser = useSelector(selectUser);
  const { data: transfer, isLoading, error } = useTransfer(id);
  const { data: branches } = useActiveBranches();
  const originTz = useMemo(() => branches?.find(b => b.code === transfer?.branch?.code)?.timezone || DEFAULT_TIMEZONE, [branches, transfer?.branch?.code]);
  const destTz = useMemo(() => branches?.find(b => b.code === transfer?.destinationBranch?.code)?.timezone || DEFAULT_TIMEZONE, [branches, transfer?.destinationBranch?.code]);
  const approveTransfer = useApproveTransfer();
  const applyTransfer = useApplyTransfer();
  const rejectTransfer = useRejectTransfer();
  const cancelTransfer = useCancelTransfer();

  // No se puede aprobar su propio traspaso (segregación de funciones)
  const isSelfRequester = useMemo(
    () => !!currentUser && !!transfer?.requestedBy && currentUser.id === transfer.requestedBy.id,
    [currentUser, transfer?.requestedBy],
  );

  // Modal state
  const [actionModal, setActionModal] = useState<'reject' | 'cancel' | 'apply' | null>(null);
  const [actionReason, setActionReason] = useState('');

  const isMutating = approveTransfer.isPending || applyTransfer.isPending || rejectTransfer.isPending || cancelTransfer.isPending;
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!transfer) return;
    setIsGeneratingPdf(true);
    try {
      const url = await generateTransferTicketPdf(transfer);
      window.open(url, '_blank');
    } catch {
      toast.error('Error al generar el PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [transfer]);

  const closeModal = useCallback(() => {
    if (!isMutating) {
      setActionModal(null);
      setActionReason('');
    }
  }, [isMutating]);

  useEffect(() => {
    if (!actionModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [actionModal, closeModal]);

  const handleApprove = async () => {
    try {
      await approveTransfer.mutateAsync({ id });
      toast.success('Traspaso aprobado correctamente');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al aprobar el traspaso';
      toast.error(msg);
    }
  };

  const handleApply = async () => {
    try {
      await applyTransfer.mutateAsync(id);
      toast.success('Traspaso aplicado — inventario movido correctamente');
      setActionModal(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al aplicar el traspaso';
      toast.error(msg);
    }
  };

  const handleReject = async () => {
    if (!actionReason.trim()) return;
    try {
      await rejectTransfer.mutateAsync({ id, data: { reason: actionReason.trim() } });
      toast.success('Traspaso rechazado');
      closeModal();
    } catch {
      toast.error('Error al rechazar el traspaso');
    }
  };

  const handleCancel = async () => {
    if (!actionReason.trim()) return;
    const wasInTransit = transfer?.status === 'approved';
    try {
      const result = await cancelTransfer.mutateAsync({ id, data: { reason: actionReason.trim() } });
      closeModal();
      if (wasInTransit && result.relatedMovementId) {
        toast.success('Traspaso cancelado — se creó devolución automática');
        router.push(`/admin/inventario/traspasos/${result.relatedMovementId}`);
      } else {
        toast.success('Traspaso cancelado');
      }
    } catch {
      toast.error('Error al cancelar el traspaso');
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Cargando traspaso...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !transfer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error al cargar el traspaso</h2>
          <p className="text-gray-600 mb-4">
            {(error as any)?.response?.data?.message || 'Traspaso no encontrado'}
          </p>
          <Link href="/admin/inventario/traspasos">
            <Button>
              Volver a Traspasos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/inventario/traspasos" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{transfer.movementNumber}</h1>
                  <StatusBadge status={transfer.status} />
                </div>
                <p className="text-gray-500 text-sm mt-0.5">
                  Creado el {inventoryService.formatDateTime(transfer.createdAt, originTz)} · {getTimezoneShortLabel(originTz)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="text-gray-700"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}
              </Button>
              {transfer.status === 'pending_approval' && (
                <>
                  <div className="relative group">
                    <Button
                      onClick={handleApprove}
                      disabled={isMutating || isSelfRequester}
                    >
                      <CheckIcon className="h-4 w-4" />
                      Aprobar
                    </Button>
                    {isSelfRequester && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        No puedes aprobar tu propio traspaso
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setActionModal('reject')}
                    disabled={isMutating}
                    className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Rechazar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActionModal('cancel')}
                    disabled={isMutating}
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-600"
                  >
                    <NoSymbolIcon className="h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}

              {transfer.status === 'approved' && (
                <>
                  <Button
                    variant="success"
                    onClick={() => setActionModal('apply')}
                    disabled={isMutating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <PlayIcon className="h-4 w-4" />
                    Aplicar Traspaso
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActionModal('cancel')}
                    disabled={isMutating}
                    className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-600"
                  >
                    <NoSymbolIcon className="h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Timeline */}
        <StatusTimeline transfer={transfer} originTz={originTz} destTz={destTz} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left: Items Table + Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-gray-400" />
                Productos ({transfer.totalItems})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Producto</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Codigo</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Cantidad</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Lote / CAD</th>
                      {transfer.status === 'applied' && (
                        <>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Antes</th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Despues</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {transfer.items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{item.productName}</td>
                        <td className="py-3 px-4 text-sm text-gray-500 font-mono">{item.productCode}</td>
                        <td className="py-3 px-4 text-center font-semibold text-[#3E667D]">{item.quantity}</td>
                        <td className="py-3 px-4 text-xs">
                          {item.lotNumber
                            ? <><p className="font-mono text-gray-700">{item.lotNumber}</p>{item.expirationDate && <p className="text-gray-400">CAD: {item.expirationDate}</p>}</>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        {transfer.status === 'applied' && (
                          <>
                            <td className="py-3 px-4 text-center text-sm text-gray-500">{item.quantityBefore}</td>
                            <td className="py-3 px-4 text-center text-sm text-gray-500">{item.quantityAfter}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={2} className="py-3 px-4 font-medium text-right text-gray-600">
                        Total:
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#3E667D]">
                        {transfer.totalQuantity} unidades
                      </td>
                      <td />
                      {transfer.status === 'applied' && <td colSpan={2} />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Reason & Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                Detalle
              </h2>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Motivo:</span>
                  <p className="font-medium text-gray-900 mt-0.5">{transfer.reason}</p>
                </div>
                {transfer.notes && (
                  <div>
                    <span className="text-sm text-gray-500">Notas:</span>
                    <p className="text-gray-700 mt-0.5">{transfer.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Branches */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Sucursales</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <BuildingStorefrontIcon className="h-5 w-5 text-[#3E667D] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Origen</p>
                    <p className="font-medium text-gray-900">{transfer.branch.name}</p>
                    <p className="text-sm text-gray-500">{transfer.branch.code}</p>
                  </div>
                </div>
                <div className="flex justify-center">
                  <ArrowsRightLeftIcon className="h-5 w-5 text-gray-300 rotate-90" />
                </div>
                <div className="flex items-start gap-3">
                  <BuildingStorefrontIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Destino</p>
                    <p className="font-medium text-gray-900">{transfer.destinationBranch.name}</p>
                    <p className="text-sm text-gray-500">{transfer.destinationBranch.code}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Trail */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Historial</h2>
              <div className="space-y-4 text-sm">
                {transfer.requestedBy && (
                  <div className="flex items-start gap-3">
                    <UserIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Solicitado por</p>
                      <p className="font-medium text-gray-900">{transfer.requestedBy.name}</p>
                      {transfer.requestedAt && (
                        <p className="text-xs text-gray-400">{inventoryService.formatDateTime(transfer.requestedAt, originTz)} · {getTimezoneShortLabel(originTz)}</p>
                      )}
                    </div>
                  </div>
                )}
                {transfer.approvedBy && (
                  <div className="flex items-start gap-3">
                    <CheckIcon className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Aprobado por</p>
                      <p className="font-medium text-gray-900">{transfer.approvedBy.name}</p>
                      {transfer.approvedAt && (
                        <p className="text-xs text-gray-400">{inventoryService.formatDateTime(transfer.approvedAt, originTz)} · {getTimezoneShortLabel(originTz)}</p>
                      )}
                    </div>
                  </div>
                )}
                {transfer.appliedBy && (
                  <div className="flex items-start gap-3">
                    <CheckBadgeIcon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">Aplicado por</p>
                      <p className="font-medium text-gray-900">{transfer.appliedBy.name}</p>
                      {transfer.appliedAt && (
                        <p className="text-xs text-gray-400">{inventoryService.formatDateTime(transfer.appliedAt, destTz)} · {getTimezoneShortLabel(destTz)}</p>
                      )}
                    </div>
                  </div>
                )}
                {transfer.rejectedBy && (
                  <div className="flex items-start gap-3">
                    <XMarkIcon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-500">
                        {transfer.status === 'rejected' ? 'Rechazado' : 'Cancelado'} por
                      </p>
                      <p className="font-medium text-gray-900">{transfer.rejectedBy.name}</p>
                      {transfer.rejectedAt && (
                        <p className="text-xs text-gray-400">{inventoryService.formatDateTime(transfer.rejectedAt, originTz)} · {getTimezoneShortLabel(originTz)}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Related movement */}
            {transfer.relatedMovementId && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Movimiento Relacionado</h2>
                <Link
                  href={`/admin/inventario/traspasos/${transfer.relatedMovementId}`}
                  className="text-sm text-[#3E667D] hover:underline font-mono"
                >
                  Ver movimiento de entrada
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {actionModal && actionModal !== 'apply' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-full ${actionModal === 'reject' ? 'bg-orange-100' : 'bg-red-100'}`}>
                  <ExclamationTriangleIcon
                    className={`h-6 w-6 ${actionModal === 'reject' ? 'text-orange-600' : 'text-red-600'}`}
                  />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {actionModal === 'reject' ? 'Rechazar Traspaso' : 'Cancelar Traspaso'}
                </h3>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                {actionModal === 'reject'
                  ? 'El traspaso será rechazado y el stock reservado se liberará.'
                  : transfer.status === 'approved'
                    ? 'El traspaso será cancelado y se creará automáticamente un traspaso de devolución para regresar los productos a la sucursal origen.'
                    : 'El traspaso será cancelado permanentemente y el stock reservado se liberará.'}
              </p>
              {actionModal === 'cancel' && transfer.status === 'approved' && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                  <TruckIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Se generará un traspaso de devolución</p>
                    <p className="text-blue-600 mt-0.5">
                      {transfer.destinationBranch.name} → {transfer.branch.name}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={
                    actionModal === 'reject'
                      ? 'Describe el motivo del rechazo...'
                      : 'Describe el motivo de la cancelacion...'
                  }
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]/30 focus:border-[#3E667D] resize-none"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{actionReason.length}/500</p>
              </div>

              <div className="flex gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={isMutating}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button
                  onClick={actionModal === 'reject' ? handleReject : handleCancel}
                  disabled={!actionReason.trim() || isMutating}
                  className={`flex-1 text-white ${
                    actionModal === 'reject' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isMutating
                    ? 'Procesando...'
                    : actionModal === 'reject' ? 'Confirmar Rechazo' : 'Confirmar Cancelacion'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apply Confirmation Modal */}
      {actionModal === 'apply' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <PlayIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Aplicar Traspaso</h3>
              </div>

              <p className="text-sm text-gray-600 mb-2">
                Esta accion movera el inventario entre sucursales:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                <p><span className="text-gray-500">Origen:</span> <span className="font-medium">{transfer.branch.name}</span></p>
                <p><span className="text-gray-500">Destino:</span> <span className="font-medium">{transfer.destinationBranch.name}</span></p>
                <p><span className="text-gray-500">Productos:</span> <span className="font-medium">{transfer.totalItems} items, {transfer.totalQuantity} unidades</span></p>
              </div>
              <p className="text-sm text-amber-600 flex items-start gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                Esta accion no se puede deshacer.
              </p>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={isMutating}
                  className="flex-1"
                >
                  Volver
                </Button>
                <Button
                  variant="success"
                  onClick={handleApply}
                  disabled={isMutating}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isMutating ? 'Aplicando...' : 'Confirmar y Aplicar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
