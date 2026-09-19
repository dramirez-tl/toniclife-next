'use client';

// Reenvío de una factura por correo (`POST /billing/invoices/:id/email`).
// Sin destinatarios el API manda al correo fiscal del cliente (o al de
// contacto); máximo 5 direcciones.

import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useSendInvoiceEmail } from '@/hooks/useBilling';
import { isValidEmail } from '@/types/billing';

const MAX_RECIPIENTS = 5;

export function SendInvoiceEmailDialog({
  open,
  onOpenChange,
  invoiceId,
  folio,
  defaultEmail,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  folio: string;
  /** Correo fiscal (o de contacto) del receptor, si se conoce. */
  defaultEmail?: string | null;
}) {
  const [raw, setRaw] = useState(defaultEmail ?? '');
  const send = useSendInvoiceEmail();
  const inputId = useId();
  const helpId = `${inputId}-help`;

  const recipients = raw
    .split(/[,\s;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = recipients.filter((r) => !isValidEmail(r));
  const tooMany = recipients.length > MAX_RECIPIENTS;
  const error =
    invalid.length > 0
      ? `Correo inválido: ${invalid.join(', ')}`
      : tooMany
        ? `Máximo ${MAX_RECIPIENTS} destinatarios`
        : '';

  const handleConfirm = async () => {
    try {
      await send.mutateAsync({ id: invoiceId, to: recipients.length > 0 ? recipients : undefined });
      onOpenChange(false);
    } catch {
      // El hook ya avisó.
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (next) setRaw(defaultEmail ?? '');
        onOpenChange(next);
      }}
      title={`Enviar factura ${folio} por correo`}
      description="Se adjuntan el PDF y el XML. Separa varios correos con coma."
      confirmLabel="Enviar"
      isPending={send.isPending}
      disabled={!!error}
      onConfirm={handleConfirm}
    >
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>Destinatarios</Label>
        <Input
          id={inputId}
          type="text"
          inputMode="email"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Vacío = correo fiscal del cliente"
          aria-describedby={helpId}
          aria-invalid={!!error}
          autoComplete="off"
        />
        <p id={helpId} className={`text-xs ${error ? 'text-red-600' : 'text-muted-foreground'}`} role={error ? 'alert' : undefined}>
          {error || 'Si lo dejas vacío se usa el correo fiscal del cliente (o su correo de contacto).'}
        </p>
      </div>
    </ConfirmDialog>
  );
}
