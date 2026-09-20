'use client';

// BatchActions — acciones por estado del lote (contrato §4.2 / §5.3):
//   generated → Descargar layout · Marcar enviado · Cancelar
//   sent      → Descargar layout · Cargar resultado (preview → aplicar) · Confirmar pago ·
//               Liberar pendientes (filas WITHHOLDING_CHANGED) · Conciliar
//   reconciled/cancelled → Descargar layout (archivo conservado)
// Toda acción financiera pasa por ConfirmDialog (nunca window.confirm); los
// errores se muestran con `treasuryErrorMessage`. Los botones de escritura van
// dentro de `PermissionGuard fallback={<></>}` (mlm:pay | mlm:admin).
// Aplicar el resultado reenvía el MISMO archivo de la vista previa (multipart
// `bankResult`) más su `applyToken`: el API recalcula el sha256 y los coteja.

import { useId, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  PaperAirplaneIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PermissionGuard } from '@/components/auth';
import {
  useApplyBankResult,
  useCancelBatch,
  useConfirmBatch,
  useMarkBatchSent,
  usePreviewBankResult,
  useReconcileBatch,
  useReleasePendingRows,
} from '@/hooks/useTreasury';
import { payoutBatchesService } from '@/services/treasury.service';
import { saveBlob } from '@/lib/download';
import type { BankResultPreview, BankResultPreviewRow, PayoutBatchFull, WithholdingShortfallRow } from '@/types/treasury';
import { TREASURY_PAY_PERMISSIONS } from '../useTreasuryPermissions';
import { treasuryErrorMessage } from '../treasury-error';
import { filenameFromDisposition, formatInt, formatMoney, todayCdmx, toNumber } from '../treasury-format';

export type BatchAction =
  | 'layout'
  | 'mark-sent'
  | 'result'
  | 'confirm'
  | 'release-pending'
  | 'reconcile'
  | 'cancel';

export interface BatchActionTarget {
  batch: PayoutBatchFull;
  action: Exclude<BatchAction, 'layout'>;
}

/** Filas pendientes del lote (`rows.pending` del API; null si el listado no lo trae). */
export function batchPendingRows(batch: PayoutBatchFull): number | null {
  return batch.rows?.pending ?? batch.pendingCount ?? null;
}

export function availableActions(batch: PayoutBatchFull): BatchAction[] {
  switch (batch.status) {
    case 'generated':
      return ['layout', 'mark-sent', 'cancel'];
    case 'sent': {
      const pending = batchPendingRows(batch);
      // "Liberar pendientes" solo tiene sentido con filas pendientes tras aplicar resultado/confirmar.
      const canRelease = !!batch.resultSummary && (pending === null || pending > 0);
      return canRelease
        ? ['layout', 'result', 'confirm', 'release-pending', 'reconcile']
        : ['layout', 'result', 'confirm', 'reconcile'];
    }
    default:
      return ['layout'];
  }
}

/** Descarga el layout regenerado por el API (coteja sha256; 409 si difiere). */
export async function downloadBatchLayout(batch: PayoutBatchFull): Promise<void> {
  try {
    const { blob, disposition } = await payoutBatchesService.downloadLayout(batch.id);
    saveBlob(blob, filenameFromDisposition(disposition, `${batch.batchNumber}.csv`), blob.type || undefined);
  } catch (err) {
    toast.error(treasuryErrorMessage(err, 'No se pudo descargar el layout'));
  }
}

const ACTION_META: Record<BatchAction, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = {
  layout: { label: 'Descargar layout', icon: ArrowDownTrayIcon },
  'mark-sent': { label: 'Marcar enviado', icon: PaperAirplaneIcon },
  result: { label: 'Cargar resultado', icon: ArrowUpTrayIcon },
  confirm: { label: 'Confirmar pago', icon: CheckCircleIcon },
  'release-pending': { label: 'Liberar pendientes', icon: ArrowUturnLeftIcon },
  reconcile: { label: 'Conciliar', icon: CheckBadgeIcon },
  cancel: { label: 'Cancelar lote', icon: XCircleIcon },
};

interface BatchActionButtonsProps {
  batch: PayoutBatchFull;
  onAction: (target: BatchActionTarget) => void;
  /** Botones compactos (solo icono) para la tabla. */
  compact?: boolean;
}

export function BatchActionButtons({ batch, onAction, compact = false }: BatchActionButtonsProps) {
  const [downloading, setDownloading] = useState(false);
  const actions = availableActions(batch);

  const render = (action: BatchAction) => {
    const meta = ACTION_META[action];
    const Icon = meta.icon;
    const isLayout = action === 'layout';
    const destructive = action === 'cancel';
    const button = (
      <Button
        key={action}
        type="button"
        variant={compact ? 'ghost' : 'outline'}
        size="sm"
        className={compact ? `h-8 px-2 ${destructive ? 'text-destructive' : ''}` : destructive ? 'text-destructive hover:text-destructive' : ''}
        title={meta.label}
        aria-label={compact ? `${meta.label} ${batch.batchNumber}` : undefined}
        disabled={isLayout && downloading}
        onClick={async () => {
          if (isLayout) {
            setDownloading(true);
            await downloadBatchLayout(batch);
            setDownloading(false);
            return;
          }
          onAction({ batch, action });
        }}
      >
        {isLayout && downloading ? (
          <Loader2 className={`h-4 w-4 animate-spin ${compact ? '' : 'mr-1.5'}`} aria-hidden />
        ) : (
          <Icon className={`h-4 w-4 ${compact ? '' : 'mr-1.5'}`} aria-hidden />
        )}
        {!compact && meta.label}
      </Button>
    );
    return button;
  };

  return (
    <div className={`flex flex-wrap ${compact ? 'justify-end gap-0.5' : 'gap-2'}`}>
      <PermissionGuard permissions={TREASURY_PAY_PERMISSIONS} fallback={<></>}>
        {actions.map(render)}
      </PermissionGuard>
    </div>
  );
}

// ── Diálogos ─────────────────────────────────────────────────────────────

interface DialogHostProps {
  target: BatchActionTarget | null;
  onClose: () => void;
  /** Se llama tras una acción exitosa (p. ej. para refrescar la fila). */
  onDone?: (batch: PayoutBatchFull | null) => void;
}

/** Monta el diálogo de la acción pedida; usa `key` por objetivo para arrancar limpio. */
export function BatchActionDialogs({ target, onClose, onDone }: DialogHostProps) {
  if (!target) return null;
  const key = `${target.batch.id}-${target.action}`;
  switch (target.action) {
    case 'mark-sent':
      return <MarkSentDialog key={key} batch={target.batch} onClose={onClose} onDone={onDone} />;
    case 'result':
      return <UploadResultDialog key={key} batch={target.batch} onClose={onClose} onDone={onDone} />;
    case 'confirm':
      return <ConfirmBatchDialog key={key} batch={target.batch} onClose={onClose} onDone={onDone} />;
    case 'release-pending':
      return <ReleasePendingDialog key={key} batch={target.batch} onClose={onClose} onDone={onDone} />;
    case 'reconcile':
      return <ReconcileDialog key={key} batch={target.batch} onClose={onClose} onDone={onDone} />;
    case 'cancel':
      return <CancelBatchDialog key={key} batch={target.batch} onClose={onClose} onDone={onDone} />;
    default:
      return null;
  }
}

interface SingleDialogProps {
  batch: PayoutBatchFull;
  onClose: () => void;
  onDone?: (batch: PayoutBatchFull | null) => void;
}

function BatchSummaryLine({ batch }: { batch: PayoutBatchFull }) {
  return (
    <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
      <span className="font-mono font-medium text-foreground">{batch.batchNumber}</span>
      <span className="ml-2 text-muted-foreground">
        {formatInt(batch.itemsCount)} filas · {formatMoney(batch.totalNetPayout, batch.currencyCode)}
        {batch.period?.name ? ` · ${batch.period.name}` : ''}
      </span>
    </p>
  );
}

function MarkSentDialog({ batch, onClose, onDone }: SingleDialogProps) {
  const mutation = useMarkBatchSent();
  const [reference, setReference] = useState('');
  const [sentAt, setSentAt] = useState('');
  const refId = useId();
  const atId = useId();

  const handle = async () => {
    try {
      const res = await mutation.mutateAsync({
        id: batch.id,
        payload: {
          bankReference: reference.trim() || undefined,
          sentAt: sentAt ? new Date(sentAt).toISOString() : undefined,
        },
      });
      toast.success(`Lote ${batch.batchNumber} marcado como enviado al banco`);
      onDone?.(res);
      onClose();
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo marcar el lote como enviado'));
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Marcar lote como enviado"
      description="Registra que el layout ya se cargó en el banco. Nada se marca como pagado todavía: eso ocurre con el resultado del banco o la confirmación con referencia."
      confirmLabel="Marcar enviado"
      isPending={mutation.isPending}
      onConfirm={handle}
    >
      <div className="space-y-3">
        <BatchSummaryLine batch={batch} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={refId}>Referencia del banco (opcional)</Label>
            <Input id={refId} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} placeholder="Folio de carga / archivo" disabled={mutation.isPending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={atId}>Enviado el (opcional)</Label>
            <Input id={atId} type="datetime-local" value={sentAt} onChange={(e) => setSentAt(e.target.value)} disabled={mutation.isPending} />
          </div>
        </div>
      </div>
    </ConfirmDialog>
  );
}

function ConfirmBatchDialog({ batch, onClose, onDone }: SingleDialogProps) {
  const mutation = useConfirmBatch();
  const [reference, setReference] = useState(batch.bankReference ?? '');
  const [paymentDate, setPaymentDate] = useState(batch.paymentDate?.slice(0, 10) || todayCdmx());
  const refId = useId();
  const dateId = useId();
  const today = todayCdmx();
  const refOk = reference.trim().length >= 1 && reference.trim().length <= 100;
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) && paymentDate <= today;
  const pending = batchPendingRows(batch) ?? batch.itemsCount;

  const handle = async () => {
    try {
      const res = await mutation.mutateAsync({ id: batch.id, payload: { reference: reference.trim(), paymentDate } });
      const tail =
        res.mismatched.length > 0
          ? ` · ${formatInt(res.mismatched.length)} sin pagar por cambio de convenio (usa “Liberar pendientes”)`
          : '';
      toast.success(`Pago confirmado: ${formatInt(res.paid)} fila(s) del lote ${batch.batchNumber} marcadas como pagadas${tail}`);
      if (res.withholdingShortfalls.length > 0) {
        toast.warning(
          `${formatInt(res.withholdingShortfalls.length)} convenio(s) recibieron menos abono que el plan (faltante ${formatMoney(sumShortfall(res.withholdingShortfalls), batch.currencyCode)}): se cobra en un periodo siguiente`,
          { duration: 12000 },
        );
      }
      onDone?.(res.batch);
      onClose();
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo confirmar el pago del lote'));
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Confirmar pago del lote (sin archivo del banco)"
      description="Para bancos que no entregan archivo de resultado: todas las filas pendientes pasan a pagadas con esta referencia y fecha, se aplican los convenios y se escribe el ledger. Si tienes archivo, usa “Cargar resultado”."
      confirmLabel="Confirmar pago"
      confirmText={pending > 0 ? String(pending) : undefined}
      isPending={mutation.isPending}
      disabled={!refOk || !dateOk}
      onConfirm={handle}
    >
      <div className="space-y-3">
        <BatchSummaryLine batch={batch} />
        <p className="text-xs text-muted-foreground">Filas pendientes: {formatInt(pending)}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={refId}>Referencia del banco *</Label>
            <Input id={refId} value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} disabled={mutation.isPending} aria-invalid={reference.length > 0 && !refOk} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={dateId}>Fecha de pago *</Label>
            <Input id={dateId} type="date" value={paymentDate} max={today} onChange={(e) => setPaymentDate(e.target.value)} disabled={mutation.isPending} aria-invalid={!dateOk} />
          </div>
        </div>
      </div>
    </ConfirmDialog>
  );
}

function ReleasePendingDialog({ batch, onClose, onDone }: SingleDialogProps) {
  const mutation = useReleasePendingRows();
  const pending = batchPendingRows(batch);
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const trimmed = reason.trim();
  const reasonOk = trimmed.length >= 5 && trimmed.length <= 300;

  const handle = async () => {
    try {
      const res = await mutation.mutateAsync({ id: batch.id, reason: trimmed });
      toast.success(`${formatInt(res.released)} fila(s) del lote ${batch.batchNumber} liberadas: vuelven a Aprobadas para un nuevo lote`);
      onDone?.(res.batch);
      onClose();
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudieron liberar las filas pendientes'));
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Liberar filas pendientes"
      description="Saca del lote las filas que quedaron pendientes porque su convenio de retención cambió después de generar el layout (WITHHOLDING_CHANGED). No se escribe ledger: vuelven a Aprobadas para un lote nuevo con la retención vigente, y este lote puede conciliarse."
      confirmLabel="Liberar pendientes"
      confirmText={pending !== null && pending > 0 ? String(pending) : undefined}
      isPending={mutation.isPending}
      disabled={!reasonOk}
      onConfirm={handle}
    >
      <div className="space-y-3">
        <BatchSummaryLine batch={batch} />
        <p className="text-xs text-muted-foreground">
          Filas pendientes: {pending === null ? 'sin dato' : formatInt(pending)}. Si el banco ya pagó alguna, aplica primero el
          resultado o confirma el pago; solo se liberan las que sigan pendientes.
        </p>
        <div className="space-y-1.5">
          <Label htmlFor={reasonId}>Motivo (5-300) *</Label>
          <Textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            disabled={mutation.isPending}
            aria-invalid={reason.length > 0 && !reasonOk}
            aria-describedby={`${reasonId}-hint`}
            placeholder="Ej. Convenio del distribuidor cambió tras generar el layout; se reprograma en el siguiente lote"
          />
          <p id={`${reasonId}-hint`} className="text-xs text-muted-foreground">
            Queda en la auditoría del lote (COMMISSION_BATCH_RELEASE). {trimmed.length}/300
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
}

function ReconcileDialog({ batch, onClose, onDone }: SingleDialogProps) {
  const mutation = useReconcileBatch();
  const pending = batchPendingRows(batch);

  const handle = async () => {
    try {
      const res = await mutation.mutateAsync(batch.id);
      toast.success(`Lote ${batch.batchNumber} conciliado`);
      onDone?.(res);
      onClose();
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo conciliar el lote'));
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Conciliar lote"
      description="Cierra el lote: exige 0 filas pendientes. Marca los pagos del ledger como conciliados y, si el periodo ya no tiene comisiones por pagar, lo marca como pagado."
      confirmLabel="Conciliar"
      isPending={mutation.isPending}
      onConfirm={handle}
    >
      <div className="space-y-2">
        <BatchSummaryLine batch={batch} />
        {pending !== null && pending > 0 && (
          <p className="text-xs text-amber-700">
            Aún hay {formatInt(pending)} fila(s) pendientes: el API rechazará la conciliación (TRS_BATCH_STATE) hasta
            aplicar el resultado, confirmar el pago o liberar las pendientes por cambio de convenio.
          </p>
        )}
        {batch.resultSummary && (
          <p className="text-xs text-muted-foreground">
            Resultado aplicado: {formatInt(batch.resultSummary.paid ?? 0)} pagadas · {formatInt(batch.resultSummary.failed ?? 0)} rechazadas
          </p>
        )}
      </div>
    </ConfirmDialog>
  );
}

function CancelBatchDialog({ batch, onClose, onDone }: SingleDialogProps) {
  const mutation = useCancelBatch();
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const trimmed = reason.trim();
  const reasonOk = trimmed.length >= 5 && trimmed.length <= 300;

  const handle = async () => {
    try {
      const res = await mutation.mutateAsync({ id: batch.id, reason: trimmed });
      toast.success(`Lote ${batch.batchNumber} cancelado: sus comisiones vuelven a Aprobadas`);
      onDone?.(res);
      onClose();
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo cancelar el lote'));
    }
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Cancelar lote"
      description="Solo lotes generados (no enviados). Libera las comisiones para un nuevo lote; el archivo del layout se conserva para auditoría."
      confirmLabel="Cancelar lote"
      confirmText={batch.batchNumber}
      destructive
      isPending={mutation.isPending}
      disabled={!reasonOk}
      onConfirm={handle}
    >
      <div className="space-y-3">
        <BatchSummaryLine batch={batch} />
        <div className="space-y-1.5">
          <Label htmlFor={reasonId}>Motivo (5-300)</Label>
          <Textarea id={reasonId} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} disabled={mutation.isPending} aria-invalid={reason.length > 0 && !reasonOk} placeholder="Ej. Se generó con fecha valor equivocada" />
        </div>
      </div>
    </ConfirmDialog>
  );
}

// ── Resultado del banco: subir → vista previa → aplicar ──────────────────

function issueRows(preview: BankResultPreview, kind: 'mismatched' | 'unmatched'): BankResultPreviewRow[] {
  return preview[kind] ?? [];
}

function PreviewTable({ rows, caption }: { rows: BankResultPreviewRow[]; caption: string }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <caption className="px-3 py-2 text-left font-medium text-foreground">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-1.5">Línea</th>
            <th className="px-3 py-1.5">Sec.</th>
            <th className="px-3 py-1.5">Nº dist.</th>
            <th className="px-3 py-1.5">Cuenta</th>
            <th className="px-3 py-1.5 text-right">Importe</th>
            <th className="px-3 py-1.5">Estado</th>
            <th className="px-3 py-1.5">Ref./rastreo</th>
            <th className="px-3 py-1.5">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.line ?? i}-${r.sequence ?? ''}`} className="border-b border-border last:border-0">
              <td className="px-3 py-1.5 tabular-nums">{r.line ?? '—'}</td>
              <td className="px-3 py-1.5 tabular-nums">{r.sequence ?? '—'}</td>
              <td className="px-3 py-1.5 font-mono">{r.customerNumber ?? '—'}</td>
              <td className="px-3 py-1.5 font-mono">{r.accountLast4 ? `****${r.accountLast4}` : '—'}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">
                {r.amount === null || r.amount === undefined ? '—' : toNumber(r.amount).toFixed(2)}
                {r.expectedAmount !== null && r.expectedAmount !== undefined && (
                  <span className="text-muted-foreground"> / esperado {toNumber(r.expectedAmount).toFixed(2)}</span>
                )}
              </td>
              <td className="px-3 py-1.5">
                <Badge variant={r.status === 'ok' ? 'success' : 'destructive'}>{r.status === 'ok' ? 'ok' : 'fail'}</Badge>
              </td>
              <td className="px-3 py-1.5 font-mono">{r.reference ?? r.trackingKey ?? '—'}</td>
              <td className="px-3 py-1.5 text-muted-foreground">{r.issue ?? r.failureReason ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Σ del faltante de convenios (moneda de pago del lote). */
function sumShortfall(rows: WithholdingShortfallRow[]): number {
  return Math.round(rows.reduce((acc, r) => acc + r.shortfall, 0) * 100) / 100;
}

/**
 * Convenios con abono menor al plan (`withholdingShortfalls[]`): la fila SÍ se paga,
 * con la retención congelada en el layout; el faltante queda para el siguiente periodo.
 */
function ShortfallTable({ rows, currency, compact = false }: { rows: WithholdingShortfallRow[]; currency: string; compact?: boolean }) {
  if (rows.length === 0) return null;
  const total = sumShortfall(rows);
  const shown = compact ? rows.slice(0, 8) : rows;
  return (
    <div className="overflow-x-auto rounded-md border border-amber-200 bg-amber-50" role="region" aria-label="Convenios con abono menor al plan">
      <table className="w-full text-xs">
        <caption className="px-3 py-2 text-left font-medium text-amber-900">
          Convenios con abono menor al plan: {formatInt(rows.length)} fila(s) · faltante {formatMoney(total, currency)} (se cobra en un periodo siguiente)
        </caption>
        <thead>
          <tr className="border-b border-amber-200 text-left uppercase tracking-wide text-amber-800">
            <th className="px-3 py-1.5">Sec.</th>
            <th className="px-3 py-1.5">Nº dist.</th>
            <th className="px-3 py-1.5 text-right">Congelada</th>
            <th className="px-3 py-1.5 text-right">Plan hoy</th>
            <th className="px-3 py-1.5 text-right">Faltante</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.commissionId} className="border-b border-amber-200/60 text-amber-900 last:border-0">
              <td className="px-3 py-1.5 tabular-nums">{r.sequence ?? '—'}</td>
              <td className="px-3 py-1.5 font-mono">{r.customerNumber ?? '—'}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(r.frozen, currency)}</td>
              <td className="px-3 py-1.5 text-right tabular-nums">{formatMoney(r.requested, currency)}</td>
              <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatMoney(r.shortfall, currency)}</td>
            </tr>
          ))}
        </tbody>
        {shown.length < rows.length && (
          <tfoot>
            <tr>
              <td colSpan={5} className="px-3 py-1.5 text-amber-800">
                y {formatInt(rows.length - shown.length)} más (lista completa en la vista previa).
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function UploadResultDialog({ batch, onClose, onDone }: SingleDialogProps) {
  const previewMutation = usePreviewBankResult();
  const applyMutation = useApplyBankResult();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BankResultPreview | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const fileId = useId();

  const runPreview = async () => {
    if (!file) return;
    try {
      const res = await previewMutation.mutateAsync({ id: batch.id, file });
      setPreview(res);
    } catch (err) {
      setPreview(null);
      toast.error(treasuryErrorMessage(err, 'No se pudo leer el archivo de resultado'));
    }
  };

  const apply = async () => {
    // El archivo se conserva en estado: aplicar reenvía el MISMO File + applyToken.
    if (!preview || !file) return;
    try {
      const res = await applyMutation.mutateAsync({ id: batch.id, file, applyToken: preview.applyToken });
      if (!res.applied) {
        toast.info(`Este archivo ya se había aplicado al lote ${batch.batchNumber}: no se escribió nada (idempotente)`);
      } else {
        toast.success(
          `Resultado aplicado: ${formatInt(res.paid)} pagadas · ${formatInt(res.failed)} rechazadas${
            res.mismatched.length > 0 ? ` · ${formatInt(res.mismatched.length)} sin aplicar por diferencia` : ''
          }${res.unmatched.length > 0 ? ` · ${formatInt(res.unmatched.length)} no encontradas` : ''}`,
        );
        if (res.withholdingShortfalls.length > 0) {
          toast.warning(
            `${formatInt(res.withholdingShortfalls.length)} convenio(s) recibieron menos abono que el plan (faltante ${formatMoney(sumShortfall(res.withholdingShortfalls), batch.currencyCode)}): se cobra en un periodo siguiente`,
            { duration: 12000 },
          );
        }
      }
      setApplyOpen(false);
      onDone?.(res.batch);
      onClose();
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo aplicar el resultado'));
    }
  };

  const mismatched = preview ? issueRows(preview, 'mismatched') : [];
  const unmatched = preview ? issueRows(preview, 'unmatched') : [];
  const shortfalls = preview?.withholdingShortfalls ?? [];
  const alreadyProcessed = preview?.alreadyProcessed ?? [];
  const parseErrors = preview?.errors ?? [];
  const applicable = preview ? preview.paid + preview.failed : 0;
  const busy = previewMutation.isPending || applyMutation.isPending;
  const canApply = !!preview && !!file && !preview.alreadyApplied && applicable > 0 && !busy;

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cargar resultado del banco</DialogTitle>
            <DialogDescription>
              El archivo se analiza sin escribir nada: revisa la vista previa (ok / fail / no cuadra / no encontrada) y
              después aplica. Las filas ok pasan a pagadas; las fail vuelven a Aprobadas con el rechazo en el ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <BatchSummaryLine batch={batch} />
            <div className="space-y-1.5">
              <Label htmlFor={fileId}>Archivo de resultado (CSV/TXT, ≤ 2 MB)</Label>
              <FileUpload
                id={fileId}
                label=""
                name="bankResult"
                accept=".csv,.txt,text/csv,text/plain"
                maxSizeMB={2}
                onChange={(f) => {
                  setFile(f);
                  setPreview(null);
                }}
                disabled={busy}
                hideStatus
                texts={{ allowedHint: 'CSV o TXT del banco (máx. {max}MB)', errorType: 'Solo CSV o TXT.' }}
              />
              <Button type="button" size="sm" onClick={() => void runPreview()} disabled={!file || busy} aria-busy={previewMutation.isPending}>
                {previewMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />}
                Analizar archivo
              </Button>
            </div>

            {preview && (
              <div className="space-y-3" aria-live="polite">
                {preview.alreadyApplied && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
                    Este archivo (mismo sha256) ya se aplicó a este lote: volver a aplicarlo no escribe nada.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="success">{formatInt(preview.paid)} ok</Badge>
                  <Badge variant="destructive">{formatInt(preview.failed)} fail</Badge>
                  <Badge variant="warning">{formatInt(mismatched.length)} no cuadran</Badge>
                  <Badge variant="outline">{formatInt(unmatched.length)} no encontradas</Badge>
                  {alreadyProcessed.length > 0 && (
                    <Badge variant="secondary">{formatInt(alreadyProcessed.length)} ya procesadas</Badge>
                  )}
                  {preview.pendingNotInFile !== null && preview.pendingNotInFile !== undefined && preview.pendingNotInFile > 0 && (
                    <Badge variant="outline" title="Filas pendientes del lote que el archivo no menciona: siguen pendientes">
                      {formatInt(preview.pendingNotInFile)} pendientes fuera del archivo
                    </Badge>
                  )}
                </div>
                {preview.totals && (
                  <p className="text-xs text-muted-foreground">
                    {preview.totals.ok !== null && preview.totals.ok !== undefined
                      ? `Σ ok ${formatMoney(preview.totals.ok, preview.totals.currency ?? batch.currencyCode)}`
                      : ''}
                    {preview.totals.fail !== null && preview.totals.fail !== undefined
                      ? ` · Σ fail ${formatMoney(preview.totals.fail, preview.totals.currency ?? batch.currencyCode)}`
                      : ''}
                    {preview.parse
                      ? ` · ${formatInt(preview.parse.rows)} línea(s) leídas${preview.parse.separator ? ` (separador “${preview.parse.separator}”)` : ''}`
                      : ''}
                  </p>
                )}
                {parseErrors.length > 0 && (
                  <ul className="space-y-0.5 text-xs text-destructive" aria-label="Errores de lectura del archivo">
                    {parseErrors.map((e, i) => (
                      <li key={`${e.line ?? 'x'}-${i}`}>
                        {e.line ? `Línea ${e.line}: ` : ''}
                        {e.message}
                      </li>
                    ))}
                  </ul>
                )}
                <PreviewTable rows={mismatched} caption="No cuadran (importe distinto, fila ajena o convenio cambiado): NO se pagan" />
                <PreviewTable rows={unmatched} caption="No encontradas en el lote: se ignoran" />
                <ShortfallTable rows={shortfalls} currency={batch.currencyCode} />
                {alreadyProcessed.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ya procesadas antes (se ignoran):{' '}
                    {alreadyProcessed
                      .slice(0, 10)
                      .map((r) => `línea ${r.line ?? '?'}${r.sequence !== null && r.sequence !== undefined ? ` / sec. ${r.sequence}` : ''} (${r.rowStatus})`)
                      .join(', ')}
                    {alreadyProcessed.length > 10 ? ` y ${formatInt(alreadyProcessed.length - 10)} más` : ''}
                  </p>
                )}
                {preview.rows && preview.rows.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Ver filas que se aplicarán ({formatInt(preview.rows.length)})</summary>
                    <div className="mt-2">
                      <PreviewTable rows={preview.rows} caption="Filas ok / fail" />
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cerrar
            </Button>
            <Button type="button" onClick={() => setApplyOpen(true)} disabled={!canApply}>
              Aplicar resultado…
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preview && (
        <ConfirmDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          title="Aplicar resultado del banco"
          description="Se reenvía el mismo archivo analizado (el API coteja su sha256 con el token): se escribirá el ledger y cambiará el estado de las comisiones. Idempotente por archivo: volver a aplicar el mismo no duplica."
          confirmLabel="Aplicar"
          confirmText={String(applicable)}
          isPending={applyMutation.isPending}
          onConfirm={apply}
        >
          <div className="space-y-3">
            <ul className="space-y-1 text-sm">
              <li>{formatInt(preview.paid)} comisiones pasan a pagadas (convenios aplicados, ledger completado).</li>
              <li>{formatInt(preview.failed)} vuelven a Aprobadas con ledger “rechazado”.</li>
              {mismatched.length > 0 && <li className="text-amber-700">{formatInt(mismatched.length)} no se tocan por diferencia de importe.</li>}
            </ul>
            <ShortfallTable rows={shortfalls} currency={batch.currencyCode} compact />
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
