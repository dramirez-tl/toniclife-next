// payment-changes.ts - Reglas puras (sin red ni React) de la corrección del
// método de pago de una venta: quién ve el lápiz, cuándo el motivo alcanza y
// los textos del resultado. El API vuelve a validar todo.

import { PAYMENT_METHOD_OPTIONS } from '@/components/admin/pos/payment-method-options';
import type { PaymentBulkResult, PaymentChangePreview, PaymentFiscalAction } from '@/types/payment-changes';

export const PAYMENT_METHOD_PERMISSION = 'pos:payment_method';
export const PAYMENT_REASON_MIN = 10;
export const PAYMENT_REASON_MAX = 500;

/** Roles que ya corregían el método antes del permiso (espejo del API). */
const LEGACY_ROLES = ['super_admin', 'admin', 'administrador', 'contabilidad', 'accountant', 'finance'];

/** ¿Se le muestra el lápiz? Por el permiso (Operaciones, Contabilidad) o por los roles de siempre. */
export function canCorrectPaymentMethod(
  roles: readonly string[] | null | undefined,
  permissions: readonly string[] | null | undefined,
): boolean {
  return (
    (roles ?? []).some((r) => LEGACY_ROLES.includes(r)) || (permissions ?? []).includes(PAYMENT_METHOD_PERMISSION)
  );
}

/** Métodos que se pueden elegir: "Mixto" no (es el resultado de varios cobros). */
export const PAYMENT_EDIT_OPTIONS = PAYMENT_METHOD_OPTIONS.filter((o) => o.value !== 'mixed');

/** Motivo sin espacios de sobra. */
export const cleanReason = (reason: string): string => reason.replace(/\s+/g, ' ').trim();

export const reasonIsEnough = (reason: string, min = PAYMENT_REASON_MIN): boolean => cleanReason(reason).length >= min;

/** Cuántos caracteres faltan para que el motivo alcance (0 = ya alcanza). */
export const reasonMissing = (reason: string, min = PAYMENT_REASON_MIN): number =>
  Math.max(0, min - cleanReason(reason).length);

/** ¿Se puede guardar? Hay revisión, el cambio se permite y el motivo alcanza. */
export function canSavePaymentChange(preview: PaymentChangePreview | null | undefined, reason: string): boolean {
  return !!preview && preview.allowed && reasonIsEnough(reason, preview.reasonMinLength);
}

/** Qué le queda por hacer a Contabilidad, en corto (para el aviso al guardar). */
export function fiscalFollowUp(action: PaymentFiscalAction, folio: string | null): string {
  if (action === 'reissue_global') {
    return `La factura global${folio ? ` ${folio}` : ''} quedó por reexpedir: avisa a Contabilidad.`;
  }
  if (action === 'replace_nominative') {
    return `La factura${folio ? ` ${folio}` : ''} del cliente quedó por sustituir: avisa a Contabilidad.`;
  }
  return '';
}

/** Resultado de una corrección en bloque, en una frase. */
export function bulkSummary(result: PaymentBulkResult, targetLabel: string): string {
  const moved =
    result.changed === 1 ? `1 ticket pasó a ${targetLabel}` : `${result.changed} tickets pasaron a ${targetLabel}`;
  const pending =
    result.pendingInvoices > 0
      ? `; ${result.pendingInvoices} ${result.pendingInvoices === 1 ? 'dejó' : 'dejaron'} una factura por corregir`
      : '';
  return `${moved}${pending}`;
}

/** Los que no se pudieron, con su motivo (folio: motivo). */
export function bulkFailures(result: PaymentBulkResult, folioOf: (saleId: string) => string): string[] {
  return result.results
    .filter((r) => !r.ok)
    .map((r) => `${r.saleNumber ?? folioOf(r.saleId)}: ${r.message ?? 'no se pudo mover'}`);
}

/** Color del estado de la factura en el historial. */
export const FISCAL_STATE_CLASS: Record<string, string> = {
  not_needed: 'border-gray-200 bg-gray-50 text-gray-600',
  pending_reissue: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_declare: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_replace: 'border-amber-200 bg-amber-50 text-amber-800',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};
