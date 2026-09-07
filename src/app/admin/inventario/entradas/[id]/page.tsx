// app/admin/inventario/entradas/[id]/page.tsx - Detalle de Entrada
'use client';

import { Suspense, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
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
import type { MovementDto } from '@/types/inventory';

export default function EntradaDetailPage() {
  return <Suspense><EntradaDetailContent /></Suspense>;
}

function EntradaDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { data: movement, isLoading, isError, refetch } = useMovement(id);
  const { data: branches } = useActiveBranches();
  const approveMovement = useApproveMovement();
  const rejectMovement = useRejectMovement();

  const handleApprove = async () => {
    try {
      await approveMovement.mutateAsync({ id });
      toast.success('Entrada aprobada — inventario actualizado');
      setShowApproveModal(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al aprobar la entrada');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      await rejectMovement.mutateAsync({ id, reason: rejectReason.trim() });
      toast.success('Entrada rechazada');
      setShowRejectModal(false);
      setRejectReason('');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error al rechazar la entrada');
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
          <p className="mt-3 text-gray-500 text-sm">Cargando entrada...</p>
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
              <ArrowDownTrayIcon className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Entrada no encontrada</h3>
            <p className="text-gray-500 text-sm mb-4">No se pudo cargar el movimiento de entrada.</p>
            <Link href="/admin/inventario/entradas" className="text-[#3E667D] text-sm hover:underline">
              ← Volver a Entradas
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasCostData = (movement.items ?? []).some(i => i.unitCost || i.totalCost);
  const tz = branches?.find((b) => b.name === movement.branchName)?.timezone || DEFAULT_TIMEZONE;
  const fmtAt = (d?: string) =>
    d ? `${inventoryService.formatDateTime(d, tz)} · ${getTimezoneShortLabel(tz)}` : null;
  // Pendiente: before/after son los del momento de CAPTURA; el backend los
  // recalcula con la existencia real al aprobar (auditoría 04-sep, M30).
  const isPending = movement.status === 'pending_approval';
  const stockSuffix = isPending ? ' (al capturar)' : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/inventario/entradas"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div>
                <p className="text-white/60 text-sm font-medium uppercase tracking-wider">Entrada de Producto</p>
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
                    onClick={() => setShowApproveModal(true)}
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
                  {fmtAt(movement.createdAt) && (
                    <p className="text-xs text-gray-400">{fmtAt(movement.createdAt)}</p>
                  )}
                </div>
              )}
              {movement.approvedBy && (
                <div>
                  <p className="text-gray-500">Aprobado por</p>
                  <p className="font-medium">{movement.approvedBy.name}</p>
                  {fmtAt(movement.approvedAt) && (
                    <p className="text-xs text-gray-400">{fmtAt(movement.approvedAt)}</p>
                  )}
                </div>
              )}
              {movement.appliedAt && (
                <div>
                  <p className="text-gray-500">Aplicado al inventario</p>
                  <p className="font-medium">{fmtAt(movement.appliedAt)}</p>
                </div>
              )}
              {movement.rejectedBy && (
                <div>
                  <p className="text-gray-500">
                    {movement.status === 'cancelled' ? 'Cancelado por' : 'Rechazado por'}
                  </p>
                  <p className="font-medium text-red-700">{movement.rejectedBy.name}</p>
                  {fmtAt(movement.rejectedAt) && (
                    <p className="text-xs text-gray-400">{fmtAt(movement.rejectedAt)}</p>
                  )}
                </div>
              )}
              {movement.rejectionReason && (
                <div className="col-span-2 md:col-span-4 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-red-600 text-xs font-semibold uppercase tracking-wide">
                    Motivo del rechazo
                  </p>
                  <p className="text-red-800 mt-0.5">{movement.rejectionReason}</p>
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
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b">
                    <TableHead className="px-3 py-2 text-left font-medium text-gray-600">Producto</TableHead>
                    <TableHead className="px-3 py-2 text-center font-medium text-gray-600">Cantidad</TableHead>
                    {hasCostData && <TableHead className="px-3 py-2 text-center font-medium text-gray-600">Costo Unit.</TableHead>}
                    {hasCostData && <TableHead className="px-3 py-2 text-center font-medium text-gray-600">Costo Total</TableHead>}
                    <TableHead className="px-3 py-2 text-center font-medium text-gray-600">Stock Antes{stockSuffix}</TableHead>
                    <TableHead className="px-3 py-2 text-center font-medium text-gray-600">Stock Después{stockSuffix}</TableHead>
                    <TableHead className="px-3 py-2 text-left font-medium text-gray-600">Lote / CAD</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movement.items ?? []).map((item) => (
                    <TableRow key={item.id} className="border-b hover:bg-gray-50">
                      <TableCell className="px-3 py-3">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.productCode}</p>
                      </TableCell>
                      <TableCell className="px-3 py-3 text-center font-semibold text-green-600">
                        +{item.quantity}
                      </TableCell>
                      {hasCostData && (
                        <TableCell className="px-3 py-3 text-center text-gray-600">
                          {item.unitCost ? `$${Number(item.unitCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                      )}
                      {hasCostData && (
                        <TableCell className="px-3 py-3 text-center text-gray-600">
                          {item.totalCost ? `$${Number(item.totalCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                      )}
                      <TableCell className="px-3 py-3 text-center text-gray-500">{item.quantityBefore}</TableCell>
                      <TableCell className="px-3 py-3 text-center font-medium text-green-700">{item.quantityAfter}</TableCell>
                      <TableCell className="px-3 py-3 text-xs">
                        {item.lotNumber
                          ? <><p className="font-mono text-gray-700">{item.lotNumber}</p>{item.expirationDate && <p className="text-gray-400">CAD: {item.expirationDate}</p>}</>
                          : <span className="text-gray-400">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell className="px-3 py-2">Total</TableCell>
                    <TableCell className="px-3 py-2 text-center text-green-600">+{movement.totalQuantity}</TableCell>
                    {hasCostData && <TableCell className="px-3 py-2 text-center">—</TableCell>}
                    {hasCostData && (
                      <TableCell className="px-3 py-2 text-center">
                        {movement.totalCost
                          ? `$${Number(movement.totalCost).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </TableCell>
                    )}
                    <TableCell colSpan={hasCostData ? 3 : 5} />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            {isPending && (
              <p className="mt-3 text-xs text-gray-500">
                Movimiento pendiente: las existencias mostradas son las del momento de captura.
                Al aprobar, el sistema recalcula con la existencia real de la sucursal.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approve confirmation dialog (mueve stock) */}
      <Dialog
        open={showApproveModal}
        onOpenChange={(open) => {
          if (!open && !approveMovement.isPending) setShowApproveModal(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar entrada</DialogTitle>
            <DialogDescription>
              Al aprobar, la entrada se aplica al inventario de la sucursal con la existencia actual.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted/50 border p-3 text-sm space-y-1.5">
            <p>
              <span className="text-muted-foreground">Folio:</span>{' '}
              <span className="font-mono font-semibold">{movement.movementNumber}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Sucursal:</span>{' '}
              <span className="font-medium">{movement.branchName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Contenido:</span>{' '}
              <span className="font-medium">
                {movement.totalItems} producto{movement.totalItems === 1 ? '' : 's'},{' '}
                +{movement.totalQuantity} unidad{movement.totalQuantity === 1 ? '' : 'es'}
              </span>
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveModal(false)}
              disabled={approveMovement.isPending}
            >
              Volver
            </Button>
            <Button onClick={handleApprove} disabled={approveMovement.isPending}>
              <CheckIcon className="h-4 w-4" />
              {approveMovement.isPending ? 'Aprobando...' : 'Aprobar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={showRejectModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowRejectModal(false);
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar entrada</DialogTitle>
            <DialogDescription>
              Indica el motivo del rechazo del movimiento {movement.movementNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo del rechazo</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowRejectModal(false); setRejectReason(''); }}
              disabled={rejectMovement.isPending}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMovement.isPending}
            >
              {rejectMovement.isPending ? 'Rechazando...' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
