'use client';

// ViaticoDetailModal - Detalle de una solicitud con las acciones que apliquen:
// aprobar (monto autorizado opcional) / rechazar (motivo) para quien aprueba y
// no es el solicitante; cancelar o editar para el solicitante mientras esté
// pendiente. Muestra el grid por día (mig 157) en solo lectura con subtotales
// por categoría; las solicitudes anteriores muestran sus 4 montos. El cuerpo
// vive en un componente interno con `key` por solicitud: se monta al abrir y
// arranca limpio sin efectos.

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useApproveViatico,
  useCancelViatico,
  useRejectViatico,
  useViatico,
  useViaticoConcepts,
} from '@/hooks/useViaticos';
import { daysOfRange, rangeLabel } from '@/lib/viaticos-week';
import { ViaticoDayGridView } from './ViaticoDayGrid';
import {
  VIATICO_STATUS_LABELS,
  VIATICO_STATUS_VARIANTS,
  type Viatico,
} from '@/types/viaticos';

interface ViaticoDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viatico: Viatico | null;
  canApprove: boolean;
  onEdit?: (viatico: Viatico) => void;
}

type Mode = 'view' | 'approve' | 'reject' | 'cancel';

const money = (n: number | null | undefined, currency = 'MXN') =>
  (n ?? 0).toLocaleString('es-MX', { style: 'currency', currency });

const fmtDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return '—';
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
  return d.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};

function errorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { message?: string | string[] } } };
  const m = err?.response?.data?.message;
  if (Array.isArray(m)) return m.join(' · ');
  return m || fallback;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm text-foreground">{value}</div>
    </div>
  );
}

export function ViaticoDetailModal({ open, onOpenChange, viatico, canApprove, onEdit }: ViaticoDetailModalProps) {
  // El listado no trae el detalle por día: se carga al abrir.
  const detail = useViatico(open && viatico ? viatico.id : undefined);
  return (
    <Dialog open={open && !!viatico} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
        {open && viatico && (
          <ViaticoDetailBody
            key={viatico.id}
            viatico={detail.data ?? viatico}
            loadingItems={!detail.data}
            canApprove={canApprove}
            onEdit={onEdit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const CATEGORY_SUBTOTALS = [
  ['Hospedaje', 'lodgingAmount'],
  ['Transporte', 'transportAmount'],
  ['Alimentos', 'mealsAmount'],
  ['Combustible y vehículo', 'fuelAmount'],
  ['Otros', 'otherAmount'],
] as const;

function DailyBreakdown({ v, loadingItems }: { v: Viatico; loadingItems: boolean }) {
  const catalog = useViaticoConcepts();
  if (loadingItems) return <Skeleton className="h-48 w-full" />;
  const items = v.items ?? [];
  if (items.length === 0) {
    // Solicitud anterior al detalle por día (4 montos).
    return (
      <div className="rounded-lg border border-border">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border">
            {(
              [
                ['Transporte', v.transportAmount],
                ['Hospedaje', v.lodgingAmount],
                ['Alimentos', v.mealsAmount],
                [v.otherDescription ? `Otros · ${v.otherDescription}` : 'Otros', v.otherAmount],
              ] as const
            ).map(([label, amount]) => (
              <tr key={label}>
                <td className="px-4 py-2 text-muted-foreground">{label}</td>
                <td className="px-4 py-2 text-right tabular-nums">{money(amount, v.currencyCode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CATEGORY_SUBTOTALS.map(([label, key]) => (
          <div key={key} className="rounded-md border border-border px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">{money(v[key] ?? 0, v.currencyCode)}</p>
          </div>
        ))}
      </div>
      <ViaticoDayGridView
        catalog={catalog.data}
        items={items}
        days={daysOfRange(v.tripStart, v.tripEnd)}
        currency={v.currencyCode}
      />
    </div>
  );
}

function ViaticoDetailBody({
  viatico: v,
  loadingItems,
  canApprove,
  onEdit,
  onClose,
}: {
  viatico: Viatico;
  loadingItems: boolean;
  canApprove: boolean;
  onEdit?: (viatico: Viatico) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('view');
  const [approvedAmount, setApprovedAmount] = useState(String(v.requestedAmount));
  const [text, setText] = useState('');
  const approve = useApproveViatico();
  const reject = useRejectViatico();
  const cancel = useCancelViatico();
  const busy = approve.isPending || reject.isPending || cancel.isPending;

  const pending = v.status === 'pending';
  const mayDecide = canApprove && pending && !v.isMine;
  const mayEditOrCancel = v.isMine && pending;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      onClose();
    } catch (e) {
      toast.error(errorMessage(e, 'No se pudo completar la acción.'));
    }
  };

  const confirmApprove = () => {
    const amount = Number(approvedAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Captura el monto autorizado.');
      return;
    }
    void run(
      () => approve.mutateAsync({ id: v.id, dto: { approvedAmount: amount, notes: text.trim() || undefined } }),
      `Solicitud ${v.folio} aprobada`,
    );
  };

  const confirmReject = () => {
    if (text.trim().length < 3) {
      toast.error('Escribe el motivo del rechazo.');
      return;
    }
    void run(() => reject.mutateAsync({ id: v.id, dto: { reason: text.trim() } }), `Solicitud ${v.folio} rechazada`);
  };

  const confirmCancel = () =>
    void run(() => cancel.mutateAsync({ id: v.id, dto: { reason: text.trim() || undefined } }), 'Solicitud cancelada');

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{v.folio}</span>
          <Badge variant={VIATICO_STATUS_VARIANTS[v.status]}>{VIATICO_STATUS_LABELS[v.status]}</Badge>
        </DialogTitle>
        <DialogDescription>
          Solicitado por {v.requesterName}
          {v.departmentName ? ` · ${v.departmentName}` : ''} el {fmtDate(v.createdAt, true)}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="Semana / periodo" value={rangeLabel(v.tripStart, v.tripEnd)} />
        <Row label="Destino / sucursal" value={v.destination || v.branchName || '—'} />
        {(v.vehicleType || v.odometerKm != null) && (
          <Row
            label="Vehículo"
            value={[
              v.vehicleType === 'propio' ? 'Propio' : v.vehicleType === 'asignado' ? 'Asignado' : null,
              v.odometerKm != null ? `${v.odometerKm.toLocaleString('es-MX')} km` : null,
              v.fuelEfficiencyKmL != null ? `${v.fuelEfficiencyKmL} km/L` : null,
              v.tankCapacityL != null ? `tanque ${v.tankCapacityL} L` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        )}
        <div className="sm:col-span-3">
          <Row label="Motivo" value={<span className="whitespace-pre-wrap">{v.purpose}</span>} />
        </div>
        {v.notes && (
          <div className="sm:col-span-3">
            <Row label="Notas del solicitante" value={<span className="whitespace-pre-wrap">{v.notes}</span>} />
          </div>
        )}
      </div>

      <DailyBreakdown v={v} loadingItems={loadingItems} />

      <div className="flex flex-col gap-2 rounded-lg bg-muted/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-foreground">
          Total solicitado: <span className="tabular-nums">{money(v.requestedAmount, v.currencyCode)}</span>
        </p>
        {v.status === 'approved' && (
          <p className="text-sm font-semibold text-emerald-800">
            Monto autorizado: <span className="tabular-nums">{money(v.approvedAmount, v.currencyCode)}</span>
          </p>
        )}
      </div>

      {v.status !== 'pending' && (
        <div className="rounded-lg bg-muted/60 p-4 text-sm">
          <p className="font-medium text-foreground">
            {VIATICO_STATUS_LABELS[v.status]}
            {v.decidedByName ? ` por ${v.decidedByName}` : ''}
            {v.decidedAt ? ` · ${fmtDate(v.decidedAt, true)}` : ''}
          </p>
          {v.decisionNotes && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{v.decisionNotes}</p>}
        </div>
      )}

      {mode === 'approve' && (
        <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
          <div>
            <Label htmlFor="via-approved">Monto autorizado ({v.currencyCode})</Label>
            <Input
              id="via-approved"
              type="number"
              min={0.01}
              step="0.01"
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Solicitado: {money(v.requestedAmount, v.currencyCode)}</p>
          </div>
          <div>
            <Label htmlFor="via-approve-notes">Comentario (opcional)</Label>
            <Textarea id="via-approve-notes" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        </div>
      )}

      {mode === 'reject' && (
        <div className="space-y-2 rounded-lg border border-red-200 bg-red-50/50 p-4">
          <Label htmlFor="via-reject">Motivo del rechazo *</Label>
          <Textarea
            id="via-reject"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="El solicitante verá este motivo"
          />
        </div>
      )}

      {mode === 'cancel' && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4">
          <Label htmlFor="via-cancel">Motivo de la cancelación (opcional)</Label>
          <Textarea id="via-cancel" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
      )}

      <DialogFooter className="flex-wrap gap-2">
        {mode === 'view' && (
          <>
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            {mayEditOrCancel && (
              <>
                <Button type="button" variant="outline" onClick={() => setMode('cancel')}>
                  Cancelar solicitud
                </Button>
                {onEdit && (
                  <Button type="button" variant="secondary" onClick={() => onEdit(v)}>
                    Editar
                  </Button>
                )}
              </>
            )}
            {mayDecide && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => setMode('reject')}
                >
                  Rechazar
                </Button>
                <Button type="button" onClick={() => setMode('approve')}>
                  Aprobar
                </Button>
              </>
            )}
          </>
        )}
        {mode !== 'view' && (
          <>
            <Button type="button" variant="outline" onClick={() => setMode('view')} disabled={busy}>
              Volver
            </Button>
            {mode === 'approve' && (
              <Button type="button" onClick={confirmApprove} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar aprobación
              </Button>
            )}
            {mode === 'reject' && (
              <Button type="button" variant="destructive" onClick={confirmReject} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar rechazo
              </Button>
            )}
            {mode === 'cancel' && (
              <Button type="button" variant="destructive" onClick={confirmCancel} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancelar solicitud
              </Button>
            )}
          </>
        )}
      </DialogFooter>
    </>
  );
}
