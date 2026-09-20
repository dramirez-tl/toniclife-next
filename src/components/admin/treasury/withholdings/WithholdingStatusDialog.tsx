'use client';

// WithholdingStatusDialog — pausar / cancelar / reactivar un convenio con
// motivo obligatorio (5-300, contrato §1.13) sobre ConfirmDialog. Cancelar es
// terminal: `destructive` + `confirmText` = nº del distribuidor.
// Montar con `key` por apertura para que el motivo arranque vacío.

import { useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { WithholdingAgreementRow, WithholdingStatusChange } from '@/types/treasury';
import { formatMoney } from '../treasury-format';
import { withholdingConceptLabel } from './withholding-format';

interface WithholdingStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agreement: WithholdingAgreementRow;
  target: WithholdingStatusChange;
  onConfirm: (reason: string) => void | Promise<void>;
  isPending: boolean;
}

const COPY: Record<WithholdingStatusChange, { title: string; description: string; confirm: string }> = {
  paused: {
    title: 'Pausar convenio',
    description: 'Mientras esté pausado no se retiene nada al pagar comisiones; el saldo se conserva.',
    confirm: 'Pausar',
  },
  active: {
    title: 'Reactivar convenio',
    description: 'Vuelve a retenerse a partir del siguiente pago de comisiones.',
    confirm: 'Reactivar',
  },
  cancelled: {
    title: 'Cancelar convenio',
    description:
      'Acción terminal: el saldo pendiente deja de retenerse y el convenio no se puede reactivar. Los abonos ya aplicados se conservan.',
    confirm: 'Cancelar convenio',
  },
};

export function WithholdingStatusDialog({
  open,
  onOpenChange,
  agreement,
  target,
  onConfirm,
  isPending,
}: WithholdingStatusDialogProps) {
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const helpId = `${reasonId}-help`;
  const copy = COPY[target];
  const trimmed = reason.trim();
  const reasonOk = trimmed.length >= 5 && trimmed.length <= 300;
  const isCancel = target === 'cancelled';
  const confirmText = isCancel ? (agreement.customerNumber ?? 'CANCELAR') : undefined;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirm}
      confirmText={confirmText}
      destructive={isCancel}
      isPending={isPending}
      disabled={!reasonOk}
      onConfirm={() => onConfirm(trimmed)}
    >
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="font-medium text-foreground">
            {agreement.customerName ?? 'Distribuidor'}
            {agreement.customerNumber && (
              <span className="ml-2 font-mono text-xs text-muted-foreground">#{agreement.customerNumber}</span>
            )}
          </p>
          <p className="mt-1 text-muted-foreground">
            <Badge variant="outline" className="mr-2">
              {withholdingConceptLabel(agreement.concept)}
            </Badge>
            {agreement.description}
          </p>
          {agreement.balanceRemaining !== null && agreement.balanceRemaining !== undefined && (
            <p className="mt-1 tabular-nums text-muted-foreground">
              Saldo pendiente:{' '}
              <span className="font-semibold text-foreground">
                {formatMoney(agreement.balanceRemaining, agreement.currencyCode)}
              </span>
            </p>
          )}
          {agreement.inBatch && (
            <p className="mt-2 text-xs text-amber-700">
              El distribuidor tiene comisiones en un lote de dispersión vivo: el API rechazará el cambio
              (TRS_IN_BATCH) hasta que el lote se concilie o cancele.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={reasonId}>Motivo (obligatorio)</Label>
          <Textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={300}
            disabled={isPending}
            aria-describedby={helpId}
            aria-invalid={reason.length > 0 && !reasonOk}
            placeholder={
              isCancel
                ? 'Ej. Liquidó por transferencia el 18-sep-2026, folio T-0102'
                : 'Ej. Solicitud del distribuidor por incapacidad, autorizó Tesorería'
            }
          />
          <p id={helpId} className="text-xs text-muted-foreground">
            Entre 5 y 300 caracteres. Queda en la bitácora del convenio y en auditoría.
          </p>
        </div>
      </div>
    </ConfirmDialog>
  );
}
