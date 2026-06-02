// app/admin/inventario/ajustes/[id]/page.tsx - Detalle de un conteo de inventario
'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  CheckIcon,
  XMarkIcon,
  DocumentCheckIcon,
  PaperAirplaneIcon,
  BuildingStorefrontIcon,
  UserIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { confirmAction } from '@/lib/utils';
import {
  useAdjustment,
  useSubmitAdjustment,
  useApproveAdjustment,
  useRejectAdjustment,
  useApplyAdjustment,
  useCancelAdjustment,
} from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import { DEFAULT_TIMEZONE } from '@/lib/timezone-utils';
import { useAppSelector } from '@/store/hooks';
import { selectUserRoles } from '@/store/slices/authSlice';

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  planned: { bg: 'bg-gray-100', text: 'text-gray-700' },
  in_progress: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  pending_review: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  completed: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  reviewed: { bg: 'bg-purple-100', text: 'text-purple-700' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-700' },
  applied: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
};

/** Surface the backend message when available, else a fallback. */
function apiError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message || fallback;
}

export default function CountDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? null;

  const { data: count, isLoading, isError } = useAdjustment(id);
  const { data: branches } = useActiveBranches();

  const roles = useAppSelector(selectUserRoles);
  const isSuperAdmin = roles.includes('super_admin');

  const submitMut = useSubmitAdjustment();
  const approveMut = useApproveAdjustment();
  const rejectMut = useRejectAdjustment();
  const applyMut = useApplyAdjustment();
  const cancelMut = useCancelAdjustment();
  const busy =
    submitMut.isPending ||
    approveMut.isPending ||
    rejectMut.isPending ||
    applyMut.isPending ||
    cancelMut.isPending;

  const tz =
    branches?.find((b) => b.name === count?.branch.name)?.timezone ||
    DEFAULT_TIMEZONE;
  const fmt = (d?: string) =>
    d
      ? new Date(d).toLocaleString('es-MX', {
          timeZone: tz,
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '—';

  const status = (count?.status as string) ?? '';
  const badge = STATUS_BADGE[status] ?? { bg: 'bg-gray-100', text: 'text-gray-700' };

  const handleSubmit = async () => {
    if (!id || !(await confirmAction('¿Enviar este conteo a revisión?'))) return;
    try {
      await submitMut.mutateAsync({ id });
      toast.success('Conteo enviado a revisión');
    } catch (err) {
      toast.error(apiError(err, 'No se pudo enviar el conteo'));
    }
  };

  const handleApprove = async () => {
    if (!id || !(await confirmAction('¿Aprobar este conteo?'))) return;
    try {
      await approveMut.mutateAsync({ id });
      toast.success('Conteo aprobado');
    } catch (err) {
      toast.error(apiError(err, 'No se pudo aprobar el conteo'));
    }
  };

  const handleReject = async () => {
    if (!id) return;
    const reason = prompt('Ingresa el motivo de rechazo:');
    if (!reason) return;
    try {
      await rejectMut.mutateAsync({ id, data: { reason } });
      toast.success('Conteo rechazado');
    } catch (err) {
      toast.error(apiError(err, 'No se pudo rechazar el conteo'));
    }
  };

  const handleApply = async () => {
    if (
      !id ||
      !(await confirmAction(
        '¿Aplicar este conteo? Esto modificará las existencias del inventario.',
      ))
    )
      return;
    try {
      await applyMut.mutateAsync({ id });
      toast.success('Conteo aplicado: inventario actualizado');
    } catch (err) {
      toast.error(apiError(err, 'No se pudo aplicar el conteo'));
    }
  };

  // Solo Super Admin. Cancela el conteo (cualquier estado salvo 'applied').
  const handleCancel = async () => {
    if (!id) return;
    if (
      !(await confirmAction(
        '¿Cancelar este conteo? Quedará marcado como Cancelado y ya no podrá usarse.',
      ))
    )
      return;
    try {
      await cancelMut.mutateAsync(id);
      toast.success('Conteo cancelado');
      router.push('/admin/inventario/ajustes');
    } catch (err) {
      toast.error(apiError(err, 'No se pudo cancelar el conteo'));
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3E667D]" />
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────────────────
  if (isError || !count) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <ExclamationTriangleIcon className="h-10 w-10 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900">
              Conteo no encontrado
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              El conteo que buscas no existe o fue eliminado.
            </p>
            <Link href="/admin/inventario/ajustes" className="inline-block mt-4">
              <Button variant="secondary">Volver al listado</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/admin/inventario/ajustes')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="h-6 w-6 text-[#3E667D]" />
              <h1 className="text-2xl font-bold text-gray-900">
                {count.adjustmentNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
              >
                {inventoryService.getAdjustmentStatusLabel(status)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Conteo de inventario ·{' '}
              {inventoryService.getAdjustmentTypeLabel(count.adjustmentType)}
            </p>
          </div>
        </div>

        {/* Workflow actions */}
        <div className="flex flex-wrap gap-2">
          {(status === 'planned' || status === 'in_progress') && (
            <Button variant="primary" onClick={handleSubmit} disabled={busy}>
              <PaperAirplaneIcon className="h-4 w-4 mr-1" />
              Enviar a revisión
            </Button>
          )}
          {(status === 'completed' || status === 'reviewed') && (
            <>
              <Button variant="primary" onClick={handleApprove} disabled={busy}>
                <CheckIcon className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
              <Button variant="secondary" onClick={handleReject} disabled={busy}>
                <XMarkIcon className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
            </>
          )}
          {status === 'approved' && (
            <Button variant="primary" onClick={handleApply} disabled={busy}>
              <DocumentCheckIcon className="h-4 w-4 mr-1" />
              Aplicar al inventario
            </Button>
          )}
          {/* Cancelar: exclusivo de Super Administrador, cualquier estado salvo aplicado/cancelado */}
          {isSuperAdmin && status !== 'applied' && status !== 'cancelled' && (
            <Button variant="danger" onClick={handleCancel} disabled={busy}>
              <TrashIcon className="h-4 w-4 mr-1" />
              Cancelar conteo
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
              <BuildingStorefrontIcon className="h-4 w-4" /> Sucursal
            </div>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {count.branch.name}
            </p>
            <p className="text-xs text-gray-400">{count.branch.code}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-xs font-medium">Productos contados</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {count.totalItems}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-gray-500 text-xs font-medium">Diferencia total</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                count.totalDifference > 0
                  ? 'text-green-600'
                  : count.totalDifference < 0
                    ? 'text-red-600'
                    : 'text-gray-900'
              }`}
            >
              {count.totalDifference > 0 ? '+' : ''}
              {count.totalDifference}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
              <UserIcon className="h-4 w-4" /> Creado por
            </div>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {count.createdBy?.name || '—'}
            </p>
            <p className="text-xs text-gray-400">{fmt(count.createdAt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Notes / rejection */}
      {(count.notes || count.rejectionReason) && (
        <Card>
          <CardContent className="p-4 space-y-2">
            {count.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500">Notas</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">
                  {count.notes}
                </p>
              </div>
            )}
            {count.rejectionReason && (
              <div>
                <p className="text-xs font-medium text-red-500">Motivo de rechazo</p>
                <p className="text-sm text-red-700 whitespace-pre-line">
                  {count.rejectionReason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Productos ({count.items?.length ?? 0})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-3 px-4 font-medium">Producto</th>
                  <th className="py-3 px-4 font-medium text-right">Sistema</th>
                  <th className="py-3 px-4 font-medium text-right">Contado</th>
                  <th className="py-3 px-4 font-medium text-right">Diferencia</th>
                  <th className="py-3 px-4 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody>
                {(count.items ?? []).map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gray-50 hover:bg-gray-50/60"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.productCode}
                        {item.lotNumber ? ` · Lote ${item.lotNumber}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {item.systemQuantity}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {item.countedQuantity}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-semibold ${
                        item.difference > 0
                          ? 'text-green-600'
                          : item.difference < 0
                            ? 'text-red-600'
                            : 'text-gray-400'
                      }`}
                    >
                      {item.difference > 0 ? '+' : ''}
                      {item.difference}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {item.notes || '—'}
                    </td>
                  </tr>
                ))}
                {(count.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      Sin productos en este conteo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Timeline footer */}
      <div className="text-xs text-gray-400 flex flex-wrap gap-x-6 gap-y-1">
        {count.approvedAt && <span>Aprobado: {fmt(count.approvedAt)} {count.approvedBy?.name ? `· ${count.approvedBy.name}` : ''}</span>}
        {count.appliedAt && <span>Aplicado: {fmt(count.appliedAt)} {count.appliedBy?.name ? `· ${count.appliedBy.name}` : ''}</span>}
        <span>Última actualización: {fmt(count.updatedAt)}</span>
      </div>
    </div>
  );
}
