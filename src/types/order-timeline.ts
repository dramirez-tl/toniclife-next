// order-timeline.ts - Historial de un pedido para la ficha del admin (GET /orders/:id/timeline,
// 17-nov-2026): con qué se pagó (tarjeta u OXXO), cuándo se generó la ficha, cuándo se pagó y
// en qué va la entrega, con las palabras del punto de venta. Solo lectura.

export type TimelineStepState = 'done' | 'current' | 'upcoming' | 'problem';
export type TimelinePaymentKind = 'card' | 'oxxo' | 'other' | 'none';
export type TimelinePaymentState =
  | 'paid'
  | 'awaiting'
  | 'voucher_issued'
  | 'voucher_overdue'
  | 'failed'
  | 'refunded'
  | 'none';
export type TimelineTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export interface OrderTimelineStep {
  /** created | voucher | paid | requested | production | ready | shipped | delivered | delivery_cancelled | cancelled */
  key: string;
  title: string;
  detail: string | null;
  /** Cuándo pasó (ISO); null si no ha pasado o no se sabe. */
  at: string | null;
  /** Fecha límite del paso (vencimiento de la ficha de OXXO). */
  dueAt: string | null;
  state: TimelineStepState;
}

export interface OrderTimelinePayment {
  kind: TimelinePaymentKind;
  methodLabel: string;
  state: TimelinePaymentState;
  stateLabel: string;
  amount: number | null;
  currencyCode: string | null;
  startedAt: string | null;
  paidAt: string | null;
  /** Referencia de la ficha de OXXO. */
  reference: string | null;
  voucherUrl: string | null;
  voucherIssuedAt: string | null;
  voucherExpiresAt: string | null;
  /** Identificador del cobro en Stripe, para buscarlo en su panel. */
  gatewayId: string | null;
  gatewayAccount: string | null;
  /** Intentos de pago registrados (incluye los que no se completaron). */
  attempts: number;
}

export interface OrderTimeline {
  headline: { label: string; detail: string | null; tone: TimelineTone };
  payment: OrderTimelinePayment;
  steps: OrderTimelineStep[];
}
