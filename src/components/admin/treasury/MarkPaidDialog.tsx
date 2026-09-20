'use client';

// MarkPaidDialog — pago DIRECTO solo `cash|check` (contrato §1.3 / §4.1):
// método, referencia y fecha (≤ hoy) obligatorios; `confirmText` = número de
// filas. Las transferencias se pagan por lote de dispersión (TRS_USE_BATCH).
// Renderizar con `key` distinta por apertura para que el formulario arranque limpio.

import { useId, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { CommissionRow, DirectPaymentMethod, MarkPaidPayload } from '@/types/treasury';
import { formatInt, formatMoney, sumRowsByCurrency, todayCdmx } from './treasury-format';

interface MarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: CommissionRow[];
  onConfirm: (payload: Omit<MarkPaidPayload, 'commissionIds'>) => void | Promise<void>;
  isPending: boolean;
}

const METHOD_OPTIONS: Array<{ value: DirectPaymentMethod; label: string }> = [
  { value: 'check', label: 'Cheque' },
  { value: 'cash', label: 'Efectivo' },
];

export function MarkPaidDialog({ open, onOpenChange, rows, onConfirm, isPending }: MarkPaidDialogProps) {
  const [method, setMethod] = useState<DirectPaymentMethod>('check');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayCdmx());
  const methodId = useId();
  const referenceId = useId();
  const dateId = useId();

  // El padre monta el diálogo con `key` por apertura: el formulario arranca
  // limpio cada vez sin efectos.
  const payable = rows.filter((r) => r.stage === 'approved');
  const totals = sumRowsByCurrency(payable);
  const today = todayCdmx();
  const refOk = reference.trim().length >= 1 && reference.trim().length <= 100;
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) && paymentDate <= today;
  const skipped = rows.length - payable.length;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Registrar pago directo de ${formatInt(payable.length)} comisiones`}
      description="Solo cheque o efectivo. Las transferencias se dispersan por lote (layout bancario + conciliación). Los convenios vigentes se descuentan al pagar."
      confirmLabel="Registrar pago"
      confirmText={payable.length > 0 ? String(payable.length) : undefined}
      isPending={isPending}
      disabled={payable.length === 0 || !refOk || !dateOk}
      onConfirm={() => onConfirm({ paymentMethod: method, reference: reference.trim(), paymentDate })}
    >
      <div className="space-y-4">
        <ul className="space-y-1 text-sm">
          {totals.map((t) => (
            <li key={t.currency} className="flex items-center justify-between gap-3">
              <span>
                <Badge variant="outline" className="mr-2 font-mono">
                  {t.currency}
                </Badge>
                {formatInt(t.rows)} filas
              </span>
              <span className="tabular-nums">
                neto {formatMoney(t.net, t.currency)} · a dispersar {formatMoney(t.toDisperse, t.currency)}
              </span>
            </li>
          ))}
          {totals.length === 0 && (
            <li className="text-muted-foreground">Ninguna fila seleccionada está Aprobada.</li>
          )}
        </ul>
        {skipped > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatInt(skipped)} fila(s) no están Aprobadas y se ignoran.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={methodId}>Método</Label>
            <SearchableSelect
              id={methodId}
              options={METHOD_OPTIONS}
              value={method}
              onChange={(v) => setMethod(v === 'cash' ? 'cash' : 'check')}
              showAllOption={false}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={referenceId}>Referencia</Label>
            <Input
              id={referenceId}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={100}
              placeholder="Nº de cheque / póliza"
              disabled={isPending}
              aria-invalid={reference.length > 0 && !refOk}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={dateId}>Fecha de pago</Label>
            <Input
              id={dateId}
              type="date"
              value={paymentDate}
              max={today}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={isPending}
              aria-invalid={!dateOk}
            />
          </div>
        </div>
      </div>
    </ConfirmDialog>
  );
}
