// payout-format.ts — Etiquetas y formato de lotes de dispersión y ledger.

import type { PayoutBatchStatus, PayoutItemRowStatus } from '@/types/treasury';
import type { BadgeTone } from '../treasury-format';

export const BATCH_STATUS_LABELS: Record<PayoutBatchStatus, string> = {
  generated: 'Generado',
  sent: 'Enviado al banco',
  reconciled: 'Conciliado',
  cancelled: 'Cancelado',
};

export const BATCH_STATUS_TONES: Record<PayoutBatchStatus, BadgeTone> = {
  generated: 'info',
  sent: 'warning',
  reconciled: 'success',
  cancelled: 'outline',
};

export function batchStatusLabel(status: string): string {
  return (BATCH_STATUS_LABELS as Record<string, string>)[status] ?? status;
}

export const ROW_STATUS_LABELS: Record<PayoutItemRowStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  failed: 'Rechazada',
};

export const ROW_STATUS_TONES: Record<PayoutItemRowStatus, BadgeTone> = {
  pending: 'warning',
  paid: 'success',
  failed: 'destructive',
};

export function rowStatusLabel(status: string): string {
  return (ROW_STATUS_LABELS as Record<string, string>)[status] ?? status;
}

export const LEDGER_STATUS_LABELS: Record<string, string> = {
  completed: 'Completado',
  failed: 'Rechazado',
  reversed: 'Revertido',
  pending: 'Pendiente',
};

export const LEDGER_STATUS_TONES: Record<string, BadgeTone> = {
  completed: 'success',
  failed: 'destructive',
  reversed: 'outline',
  pending: 'warning',
};

export function ledgerStatusLabel(status: string): string {
  return LEDGER_STATUS_LABELS[status] ?? status;
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: 'Transferencia',
  check: 'Cheque',
  cash: 'Efectivo',
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export const LAYOUT_FORMAT_LABELS: Record<string, string> = {
  generic_csv: 'CSV genérico',
  spei_csv: 'SPEI (STP) CSV',
};

export function layoutFormatLabel(format: string | null | undefined): string {
  if (!format) return '—';
  return LAYOUT_FORMAT_LABELS[format] ?? format;
}

/** Primeros 12 caracteres del sha256 (para la tabla; el completo va en title). */
export function shortHash(hash: string | null | undefined): string {
  if (!hash) return '—';
  return `${hash.slice(0, 12)}…`;
}

export function payoutExportFilename(suffix: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `dispersion-${suffix}-${stamp}.csv`;
}
