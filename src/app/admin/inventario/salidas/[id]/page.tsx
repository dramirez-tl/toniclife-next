// app/admin/inventario/salidas/[id]/page.tsx - Detalle de Salida
'use client';

import { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useMovement, useApproveMovement, useRejectMovement } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import { generateMovementTicketPdf } from '@/lib/generate-movement-ticket';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';

export default function SalidaDetailPage() {
  return <Suspense><SalidaDetailContent /></Suspense>;
}

function SalidaDetailContent() {
  const params = useParams();
  const id = params.id as string;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: movement, isLoading, isError, refetch } = useMovement(id);
  const { data: branches } = useActiveBranches();
  const approveMovement = useApproveMovement();
  const rejectMovement = useRejectMovement();

  const handleApprove = async () => {
    try {
      await approveMovement.mutateAsync({ id });
      toast.success('Salida aprobada correctamente');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al aprobar la salida');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await rejectMovement.mutateAsync({ id, reason: rejectReason.trim() });
      toast.success('Salida rechazada');
      setShowRejectModal(false);
      setRejectReason('');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al rechazar la salida');
    }
  };

  const handleDownloadPdf = async () => {
    if (!movement) return;
    try {
      const url = await generateMovementTicketPdf(movement);
      window.open(url, '_blank');
    } catch {
      toast.error('Error al generar el PDF');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; label: string; icon?: React.ReactNode }> = {
      applied:          { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Aplicado',  icon: <CheckBadgeIcon className="h-4 w-4" /> },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendiente', icon: <ClockIcon className="h-4 w-4" /> },
      approved:         { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Aprobado',  icon: <CheckIcon className="h-4 w-4" /> },
      rejected:         { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Rechazado', icon: <XMarkIcon className="h-4 w-4" /> },
      cancelled:        { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Cancelado' },
      draft:            { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Borrador' },
    };
    const c = config[status] || config.applied;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 ${c.bg} ${c.text} rounded-full text-sm font-medium`}>
        {c.icon}
        {c.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-gray-500 text-sm">Cargando salida...</p>
        </div>
      </div>
    );
  }

  if (isError || !movement) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
              <ArrowUpTrayIcon className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Salida no encontrada</h3>
            <p className="text-gray-500 text-sm mb-4">No se pudo cargar el movimiento de salida.</p>
            <Link href="/admin/inventario/salidas" className="text-[#3E667D] text-sm hover:underline">
              ← Volver a Salidas
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasCostData = (movement.items ?? []).some(i => i.unitCost || i.totalCost);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/inventario/salidas"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <p className="text-white/60 text-sm font-medium uppercase tracking-wider">Salida de Producto</p>
                <h1 className="text-2xl font-bold">{movement.movementNumber}</h1>
                {(() => { const tz = branches?.find(b => b.name === movement.branchName)?.timezone || DEFAULT_TIMEZONE; return <p className="text-white/70 text-sm">{inventoryService.formatDateTime(movement.createdAt, tz)} · {getTimezoneShortLabel(tz)}</p>; })()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(movement.status)}
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                PDF
              </button>
              {movement.status === 'pending_approval' && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={approveMovement.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Rechazar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* General Info */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Información General</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">No. Movimiento</p>
                <p className="font-medium font-mono">{movement.movementNumber}</p>
              </div>
              <div>
                <p className="text-gray-500">Sucursal</p>
                <p className="font-medium">{movement.branchName}</p>
              </div>
              <div>
                <p className="text-gray-500">Razón</p>
                <p className="font-medium">{inventoryService.getMovementReasonLabel(movement.reason)}</p>
              </div>
              <div>
                <p className="text-gray-500">Estado</p>
                {getStatusBadge(movement.status)}
              </div>
              {movement.referenceNumber && (
                <div>
                  <p className="text-gray-500">No. Referencia</p>
                  <p className="font-medium">{movement.referenceNumber}</p>
                </div>
              )}
              {movement.requestedBy && (
                <div>
                  <p className="text-gray-500">Registrado por</p>
                  <p className="font-medium">{movement.requestedBy.name}</p>
                </div>
              )}
              {movement.notes && (
                <div className="col-span-2 md:col-span-4">
                  <p className="text-gray-500">Notas</p>
                  <p className="font-medium">{movement.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">
              Productos ({movement.items?.length ?? 0})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Producto</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Cantidad</th>
                    {hasCostData && <th className="px-3 py-2 text-center font-medium text-gray-600">Costo Unit.</th>}
                    {hasCostData && <th className="px-3 py-2 text-center font-medium text-gray-600">Costo Total</th>}
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Stock Antes</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Stock Después</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Lote / CAD</th>
                  </tr>
                </thead>
                <tbody>
                  {(movement.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-3">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.productCode}</p>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-red-600">
                        -{item.quantity}
                      </td>
                      {hasCostData && (
                        <td className="px-3 py-3 text-center text-gray-600">
                          {item.unitCost ? `$${Number(item.unitCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      )}
                      {hasCostData && (
                        <td className="px-3 py-3 text-center text-gray-600">
                          {item.totalCost ? `$${Number(item.totalCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      )}
                      <td className="px-3 py-3 text-center text-gray-500">{item.quantityBefore}</td>
                      <td className="px-3 py-3 text-center font-medium text-red-700">{item.quantityAfter}</td>
                      <td className="px-3 py-3 text-xs">
                        {item.lotNumber
                          ? <><p className="font-mono text-gray-700">{item.lotNumber}</p>{item.expirationDate && <p className="text-gray-400">CAD: {item.expirationDate}</p>}</>
                          : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-center text-red-600">-{movement.totalQuantity}</td>
                    {hasCostData && <td className="px-3 py-2 text-center">—</td>}
                    {hasCostData && (
                      <td className="px-3 py-2 text-center">
                        {movement.totalCost
                          ? `$${Number(movement.totalCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                    )}
                    <td colSpan={hasCostData ? 3 : 5} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-3">Rechazar Salida</h3>
              <p className="text-sm text-gray-600 mb-4">
                Indica el motivo del rechazo del movimiento <span className="font-mono font-medium">{movement.movementNumber}</span>.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Motivo del rechazo..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent resize-none"
              />
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || rejectMovement.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Rechazar
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
