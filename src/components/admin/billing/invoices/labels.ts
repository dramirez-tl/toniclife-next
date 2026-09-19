// labels.ts — Textos en español para Contabilidad: tipos de comprobante,
// motivos de cancelación, estados de "ventas por facturar", días de la global,
// exclusiones y bloqueadores. Los códigos son los del contrato de la Fase 2.

import {
  InvoiceStatus,
  type CancellationReason,
  type GlobalBlockerCode,
  type GlobalDayState,
  type GlobalExclusionReason,
  type InvoiceSummary,
  type InvoiceType,
  type InvoiceableBlocker,
  type InvoiceableStatus,
  type SatStatus,
} from '@/types/billing';

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  sale: 'Venta',
  global: 'Global',
  payment: 'Pago',
  commission: 'Comisión',
  weekly_bonus: 'Bono semanal',
  cedea: 'CEDEA',
  credit_note: 'Nota de crédito',
  payroll: 'Nómina',
};

/** `sale` se etiqueta Venta/Pedido según el origen; una sustituta se marca aparte. */
export function invoiceTypeLabel(
  inv: Pick<InvoiceSummary, 'invoiceType' | 'posSaleId' | 'orderId' | 'isReplacement'>,
): string {
  if (inv.isReplacement) return 'Sustituta';
  if (inv.invoiceType === 'sale') return inv.orderId && !inv.posSaleId ? 'Pedido' : 'Venta';
  return INVOICE_TYPE_LABELS[inv.invoiceType] ?? inv.invoiceType;
}

export const INVOICE_TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: 'sale', label: 'Venta / Pedido' },
  { value: 'global', label: 'Global' },
  { value: 'payment', label: 'Complemento de pago' },
];

export const INVOICE_STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: InvoiceStatus.PENDING, label: 'Pendiente' },
  { value: InvoiceStatus.STAMPING, label: 'Timbrando' },
  { value: InvoiceStatus.STAMPED, label: 'Timbrada' },
  { value: InvoiceStatus.SENT, label: 'Enviada' },
  { value: InvoiceStatus.ERROR, label: 'Con error' },
  { value: InvoiceStatus.CANCEL_PENDING, label: 'Cancelación en proceso' },
  { value: InvoiceStatus.CANCELLED, label: 'Cancelada' },
];

export const SAT_STATUS_LABELS: Record<SatStatus, string> = {
  vigente: 'Vigente',
  cancelado: 'Cancelado',
  no_encontrado: 'No encontrado',
};

export const CANCELLATION_REASON_INFO: Record<
  CancellationReason,
  { label: string; help: string }
> = {
  '01': {
    label: '01 — Comprobante emitido con errores con relación',
    help: 'Ya existe (o se emitirá) una factura que sustituye a esta: se exige el UUID de la sustituta.',
  },
  '02': {
    label: '02 — Comprobante emitido con errores sin relación',
    help: 'La factura tiene errores y no habrá otra que la sustituya.',
  },
  '03': {
    label: '03 — No se llevó a cabo la operación',
    help: 'La venta no ocurrió o se devolvió por completo.',
  },
  '04': {
    label: '04 — Operación nominativa relacionada en una factura global',
    help: 'Solo para facturas globales: un ticket incluido ya se facturó de forma nominativa.',
  },
};

export const INVOICEABLE_STATUS_INFO: Record<
  InvoiceableStatus,
  { label: string; badge: 'warning' | 'info' | 'success' | 'secondary' }
> = {
  sin_factura: { label: 'Sin factura', badge: 'warning' },
  en_global: { label: 'En global', badge: 'info' },
  nominativa: { label: 'Facturada', badge: 'success' },
  no_facturable: { label: 'No facturable', badge: 'secondary' },
};

export const INVOICEABLE_STATUS_OPTIONS: { value: InvoiceableStatus; label: string }[] = (
  Object.keys(INVOICEABLE_STATUS_INFO) as InvoiceableStatus[]
).map((value) => ({ value, label: INVOICEABLE_STATUS_INFO[value].label }));

export const GLOBAL_DAY_STATUS_INFO: Record<
  GlobalDayState,
  { label: string; className: string }
> = {
  not_eligible: { label: 'No elegible', className: 'bg-gray-100 text-gray-500 border-gray-200' },
  no_sales: { label: 'Sin ventas', className: 'bg-gray-50 text-gray-500 border-gray-200' },
  ready: { label: 'Lista para emitir', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  blocked: { label: 'Bloqueada', className: 'bg-red-50 text-red-800 border-red-200' },
  open: { label: 'Día abierto', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  emitted: { label: 'Emitida', className: 'bg-[#C8DDF2] text-[#2f5165] border-[#3E667D]/30' },
  cancelled: { label: 'Cancelada', className: 'bg-orange-50 text-orange-800 border-orange-200' },
  pending_reissue: { label: 'Por reexpedir', className: 'bg-purple-50 text-purple-800 border-purple-200' },
};

export const GLOBAL_EXCLUSION_LABELS: Record<GlobalExclusionReason, string> = {
  nominative_invoiced: 'Ya tiene factura nominativa',
  zero_total: 'Total en cero',
  credit_sale: 'Venta a crédito (PPD)',
  already_in_global: 'Ya está en otra global',
};

export const GLOBAL_BLOCKER_LABELS: Record<GlobalBlockerCode, string> = {
  nominative_in_progress: 'Factura nominativa en curso',
  tax_unresolved: 'Producto sin regla de IVA',
  payment_form_unresolved: 'Forma de pago no resoluble',
  amount_mismatch: 'Las líneas no cuadran con el total',
  product_not_ready: 'Producto sin clave SAT',
  stale_error: 'Intento anterior con error (desechar)',
};

export function globalBlockerLabel(code: string): string {
  return (GLOBAL_BLOCKER_LABELS as Record<string, string>)[code] ?? code;
}

export function globalExclusionLabel(reason: string): string {
  return (GLOBAL_EXCLUSION_LABELS as Record<string, string>)[reason] ?? reason;
}

/** Texto de un bloqueador de "ventas por facturar" (código suelto u objeto). */
export function invoiceableBlockerText(b: InvoiceableBlocker): string {
  if (typeof b === 'string') return globalBlockerLabel(b);
  return b.message || globalBlockerLabel(b.code);
}

export const CONCEPT_MODE_OPTIONS = [
  { value: 'ticket', label: 'Por ticket (guía SAT: un concepto por venta)' },
  { value: 'product', label: 'Por producto (agrupado por SKU, como el sistema anterior)' },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PUE: 'PUE — Pago en una sola exhibición',
  PPD: 'PPD — Pago en parcialidades o diferido',
};
