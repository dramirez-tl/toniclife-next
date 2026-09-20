'use client';

// CancelCommissionDialog — cancelar (o restaurar) UNA comisión con motivo
// obligatorio (5-300). Cancelar es `destructive` y exige teclear el número
// del distribuidor (`confirmText`); solo procede en periodo cerrado, fila sin
// lote y etapa calculated|ready|approved (el API lo vuelve a validar).
// Renderizar con `key` distinta por apertura para que el motivo arranque vacío.

import { useId, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { CommissionRow } from '@/types/treasury';
import { formatMoney } from './treasury-format';

export const REASON_MIN = 5;
export const REASON_MAX = 300;

interface CancelCommissionDialogProps {
  row: CommissionRow | null;
  mode: 'cancel' | 'restore';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void | Promise<void>;
  isPending: boolean;
}

export function CancelCommissionDialog({
  row,
  mode,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: CancelCommissionDialogProps) {
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const helpId = `${reasonId}-help`;

  // El padre monta el diálogo con `key` por fila/apertura: el motivo arranca
  // vacío en cada apertura sin efectos.
  const trimmed = reason.trim();
  const reasonOk = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;
  const isCancel = mode === 'cancel';
  const number = row?.customerNumber ? String(row.customerNumber) : '';

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isCancel ? 'Cancelar comisión' : 'Restaurar comisión'}
      description={
        isCancel
          ? 'La comisión pasa a Cancelada y deja de ser aprobable o pagable. Queda en auditoría con tu usuario y el motivo.'
          : 'La comisión vuelve a Calculada para poder aprobarse de nuevo. Queda en auditoría con tu usuario y el motivo.'
      }
      confirmLabel={isCancel ? 'Cancelar comisión' : 'Restaurar'}
      cancelLabel="Volver"
      confirmText={isCancel && number ? number : undefined}
      destructive={isCancel}
      isPending={isPending}
      disabled={!row || !reasonOk}
      onConfirm={() => onConfirm(trimmed)}
    >
      {row && (
        <div className="space-y-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Distribuidor</dt>
            <dd className="font-medium text-foreground">
              {row.customerName}
              {number ? ` · #${number}` : ''}
            </dd>
            <dt className="text-muted-foreground">Periodo</dt>
            <dd>{row.periodCode}</dd>
            <dt className="text-muted-foreground">Neto</dt>
            <dd className="tabular-nums">{formatMoney(row.totalAmount, row.currencyCode)}</dd>
            {!isCancel && row.cancelReason && (
              <>
                <dt className="text-muted-foreground">Motivo de cancelación</dt>
                <dd>{row.cancelReason}</dd>
              </>
            )}
          </dl>
          <div className="space-y-1.5">
            <Label htmlFor={reasonId}>Motivo (obligatorio)</Label>
            <Textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={REASON_MAX}
              rows={3}
              disabled={isPending}
              aria-describedby={helpId}
              aria-invalid={reason.length > 0 && !reasonOk}
              placeholder={
                isCancel
                  ? 'Ej. Venta devuelta que ya no cuenta para el periodo'
                  : 'Ej. Cancelación por error; la venta sí procede'
              }
            />
            <p id={helpId} className="text-xs text-muted-foreground">
              Entre {REASON_MIN} y {REASON_MAX} caracteres · {trimmed.length}/{REASON_MAX}
            </p>
          </div>
        </div>
      )}
    </ConfirmDialog>
  );
}
