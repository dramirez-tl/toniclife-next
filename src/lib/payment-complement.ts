// payment-complement.ts — Vista previa PURA de las parcialidades de un
// complemento de pago (CFDI P). Espejo en el cliente de la lib del API
// (`payment-complement.lib.ts`, contrato §5.4): la fuente de verdad de los
// saldos es la BD; aquí solo se calcula lo que se va a mandar para que
// Contabilidad lo revise antes de confirmar. El API vuelve a calcular todo.

import type { InvoiceSummary } from '@/types/billing';

/** Tolerancia del API para `amountPaid ≤ saldo` y para `Σ = monto`. */
export const PPD_AMOUNT_TOLERANCE = 0.005;

/** Redondeo half-up a 2 decimales con corrección de flotante. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sum2(values: number[]): number {
  return round2(values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0));
}

export interface ComplementDocumentDraft {
  invoice: InvoiceSummary;
  /** Importe capturado para este documento (texto del input). */
  amountPaid: string;
}

export interface PartialityPreviewRow {
  invoiceId: string;
  folioDisplay: string;
  satUuid: string | null;
  receiverRfc: string | null;
  partialityNumber: number;
  previousBalance: number;
  amountPaid: number;
  outstandingBalance: number;
  /** Mensaje si la fila no pasa las reglas del API. */
  error: string | null;
}

export function parseAmount(raw: string): number {
  const n = Number(String(raw).replace(/,/g, '').trim());
  return Number.isFinite(n) ? round2(n) : 0;
}

/**
 * Filas de la vista previa: número de parcialidad = `partialitiesCount + 1`,
 * saldo anterior = `outstandingBalance`, insoluto = anterior − pagado.
 */
export function buildPartialitiesPreview(docs: ComplementDocumentDraft[]): PartialityPreviewRow[] {
  return docs.map(({ invoice, amountPaid }) => {
    const previousBalance = round2(Number(invoice.outstandingBalance ?? 0));
    const paid = parseAmount(amountPaid);
    const outstanding = round2(previousBalance - paid);
    let error: string | null = null;
    if (invoice.paymentMethodCode !== 'PPD') {
      error = 'La factura no es PPD: no admite complemento de pago';
    } else if (invoice.providerStatus !== 'stamped' && invoice.providerStatus !== 'sent') {
      error = 'La factura no está timbrada';
    } else if (previousBalance <= 0) {
      error = 'La factura no tiene saldo pendiente';
    } else if (paid <= 0) {
      error = 'Captura un importe mayor a cero';
    } else if (paid > previousBalance + PPD_AMOUNT_TOLERANCE) {
      error = 'El importe excede el saldo insoluto';
    }
    return {
      invoiceId: invoice.id,
      folioDisplay: invoice.folioDisplay,
      satUuid: invoice.satUuid,
      receiverRfc: invoice.receiverRfc,
      partialityNumber: Number(invoice.partialitiesCount ?? 0) + 1,
      previousBalance,
      amountPaid: paid,
      outstandingBalance: outstanding < 0 ? 0 : outstanding,
      error,
    };
  });
}

export interface ComplementValidationInput {
  amount: string;
  paymentDate: string;
  paymentFormCode: string;
  rows: PartialityPreviewRow[];
  /** Fecha de timbre más reciente entre los documentos (ISO), si se conoce. */
  latestStampDate?: string | null;
  /** Hoy (YYYY-MM-DD) para la regla `paymentDate ≤ hoy`. */
  today: string;
}

/** Reglas del contrato §5.4 que se pueden comprobar en el cliente. */
export function validateComplementDraft(input: ComplementValidationInput): string[] {
  const errors: string[] = [];
  const { rows } = input;
  if (rows.length === 0) errors.push('Selecciona al menos una factura PPD con saldo');
  const amount = parseAmount(input.amount);
  if (amount <= 0) errors.push('El monto del pago debe ser mayor a cero');
  const rfcs = new Set(rows.map((r) => (r.receiverRfc ?? '').toUpperCase()));
  if (rfcs.size > 1) errors.push('Todas las facturas deben ser del mismo receptor (mismo RFC)');
  const sum = sum2(rows.map((r) => r.amountPaid));
  if (rows.length > 0 && Math.abs(sum - amount) > PPD_AMOUNT_TOLERANCE) {
    errors.push(`La suma de los documentos (${sum.toFixed(2)}) debe ser igual al monto (${amount.toFixed(2)})`);
  }
  for (const row of rows) {
    if (row.error) errors.push(`${row.folioDisplay}: ${row.error}`);
  }
  if (!input.paymentFormCode) errors.push('Elige la forma de pago');
  if (input.paymentFormCode === '99') errors.push('La forma de pago 99 (por definir) no aplica a un pago real');
  if (!input.paymentDate) {
    errors.push('Captura la fecha de pago');
  } else {
    if (input.paymentDate > input.today) errors.push('La fecha de pago no puede ser futura');
    if (input.latestStampDate && input.paymentDate < input.latestStampDate.slice(0, 10)) {
      errors.push('La fecha de pago no puede ser anterior al timbre de la factura');
    }
  }
  return errors;
}

/** uuid v4 para `idempotencyKey`; `crypto.randomUUID` exige contexto seguro. */
export function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
