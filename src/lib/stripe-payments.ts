// Cobros de Stripe en Reportes › Ventas (Sistemas, 23-nov-2026, a pedido de Contabilidad: "agregar el
// tipo de pago Stripe… con el detalle del id de la transacción para que Contabilidad lo pueda buscar
// bien y conciliar", y que NO aparezca en el POS).
//
// "Stripe" aquí es SOLO una opción del filtro de este reporte: no se agrega a las formas de pago del
// POS ni al diálogo de corregir el método de una venta. Lista los cobros que la tienda en línea hizo
// por Stripe (tarjeta u OXXO); son pedidos, no ventas de caja. Reglas puras: textos, fechas y el CSV.

/** Valor del filtro "Método de pago" que cambia el reporte a los cobros de Stripe. */
export const STRIPE_FILTER_VALUE = 'stripe';
export const STRIPE_FILTER_LABEL = 'Stripe (tienda en línea)';

export type StripePaymentMethodKind = 'card' | 'oxxo' | 'other';
export type StripeSearchKind = 'none' | 'text' | 'session' | 'intent' | 'too_short';

export interface StripePaymentRow {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  /** Día del pedido, YYYY-MM-DD. */
  orderDate: string | null;
  orderStatus: string;
  /** Momento del cobro (ISO, UTC). */
  paidAt: string | null;
  amount: number;
  currencyCode: string;
  method: StripePaymentMethodKind;
  gatewayAccount: string | null;
  /** "PaymentIntent ID" del archivo de Stripe (pi_…). */
  paymentIntentId: string | null;
  /** Sesión de Checkout (cs_…). */
  checkoutSessionId: string | null;
  oxxoReference: string | null;
  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;
  customerNumber: string | null;
  customerName: string | null;
  invoiced: boolean;
}

export interface StripePaymentsTotal {
  currencyCode: string;
  count: number;
  amount: number;
}

export interface StripePaymentsResponse {
  data: StripePaymentRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totals: StripePaymentsTotal[];
  search: StripeSearchKind;
}

export interface StripePaymentsQuery {
  fromDate?: string;
  toDate?: string;
  branchId?: string;
  customerNumber?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export function isStripeFilter(value?: string | null): boolean {
  return value === STRIPE_FILTER_VALUE;
}

export function stripeMethodLabel(method: StripePaymentMethodKind): string {
  if (method === 'card') return 'Stripe · Tarjeta';
  if (method === 'oxxo') return 'Stripe · OXXO';
  return 'Stripe';
}

/** Cuenta de Stripe que cobró (el API manda mx, us…). */
export function stripeAccountLabel(account?: string | null): string {
  const key = (account ?? '').trim().toLowerCase();
  if (key === 'mx') return 'México';
  if (key === 'us') return 'Estados Unidos';
  return key ? key.toUpperCase() : '—';
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Pagado',
  paid: 'Pagado',
  processing: 'En preparación',
  shipped: 'Enviado',
  in_transit: 'En camino',
  delivered: 'Entregado',
  completed: 'Completado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};

export function stripeOrderStatusLabel(status?: string | null): string {
  const key = (status ?? '').trim().toLowerCase();
  return ORDER_STATUS_LABELS[key] ?? (key || '—');
}

/** ¿El pedido ya no cuenta como venta (cancelado o reembolsado) aunque Stripe lo haya cobrado? */
export function isStripeOrderVoided(status?: string | null): boolean {
  const key = (status ?? '').trim().toLowerCase();
  return key === 'cancelled' || key === 'refunded';
}

const p2 = (n: number): string => String(n).padStart(2, '0');

/**
 * "14/11/2026 23:56" en UTC: el MISMO formato y la misma hora que la columna "Created date (UTC)" del
 * archivo que Contabilidad baja de Stripe, para comparar renglón contra renglón.
 */
export function formatStripeUtc(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${p2(d.getUTCDate())}/${p2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
}

/** "14/11/2026 17:56" en hora Centro (la fecha con la que filtra el reporte). */
export function formatStripeCentro(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`;
}

/** YYYY-MM-DD → DD/MM/YYYY (fecha del pedido; no lleva zona horaria). */
export function formatStripeOrderDate(day?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(day ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/**
 * Qué decirle a quien buscó: un cargo ch_… no se guarda tal cual, se encuentra por el inicio que
 * comparte con su PaymentIntent; y un identificador demasiado corto no busca.
 */
export function stripeSearchHint(kind: StripeSearchKind, text?: string | null): string | null {
  const value = (text ?? '').trim();
  if (kind === 'too_short') {
    return 'Ese identificador está incompleto: pega el id de Stripe completo (pi_…, ch_… o cs_…) o al menos sus primeros 6 caracteres después del guion bajo.';
  }
  if (kind === 'intent' && /^(ch|py)_/i.test(value)) {
    return 'Buscaste un cargo (ch_…). El sistema guarda el PaymentIntent (pi_…), que empieza igual: se muestra el cobro cuyo PaymentIntent coincide en ese inicio. Confírmalo con el monto y la hora (UTC).';
  }
  if (kind === 'text') {
    return 'Buscando por folio del pedido o referencia de OXXO. Para buscar un cobro pega el id de Stripe (pi_…, ch_… o cs_…).';
  }
  return null;
}

export const STRIPE_CSV_HEADERS = [
  'Pedido',
  'Fecha del pedido',
  'Cobrado (hora Centro)',
  'Cobrado (UTC como en Stripe)',
  'Sucursal',
  'No. distribuidor',
  'Cliente',
  'Forma de cobro',
  'Monto',
  'Moneda',
  'PaymentIntent ID (pi_)',
  'Sesion de Checkout (cs_)',
  'Referencia OXXO',
  'Cuenta de Stripe',
  'Estado del pedido',
  'Facturado',
] as const;

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV para cruzarlo con el archivo de Stripe por "PaymentIntent ID" (con BOM para que Excel lea acentos). */
export function buildStripePaymentsCsv(rows: readonly StripePaymentRow[]): string {
  const lines = rows.map((r) =>
    [
      r.orderNumber,
      formatStripeOrderDate(r.orderDate),
      formatStripeCentro(r.paidAt),
      formatStripeUtc(r.paidAt),
      [r.branchCode, r.branchName].filter(Boolean).join(' '),
      r.customerNumber ?? '',
      r.customerName ?? '',
      stripeMethodLabel(r.method),
      r.amount.toFixed(2),
      r.currencyCode,
      r.paymentIntentId ?? '',
      r.checkoutSessionId ?? '',
      r.oxxoReference ?? '',
      stripeAccountLabel(r.gatewayAccount),
      stripeOrderStatusLabel(r.orderStatus),
      r.invoiced ? 'Sí' : 'No',
    ]
      .map(csvCell)
      .join(','),
  );
  return `﻿${[STRIPE_CSV_HEADERS.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`;
}

export function stripeCsvFilename(fromDate?: string | null, toDate?: string | null): string {
  return `cobros_stripe_${fromDate || 'inicio'}_${toDate || 'hoy'}.csv`;
}
