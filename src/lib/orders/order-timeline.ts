// order-timeline.ts - Reglas de presentación del historial del pedido (ficha del admin). Puro:
// fechas legibles, colores por estado y qué tramo de la línea ya se recorrió. Lo que pasó y
// lo que falta lo decide el servidor (GET /orders/:id/timeline); aquí solo se pinta.

import type {
  OrderTimelinePayment,
  OrderTimelineStep,
  TimelinePaymentState,
  TimelineStepState,
  TimelineTone,
} from '@/types/order-timeline';

export interface DateOptions {
  /** Para pruebas; en la pantalla se usa la hora del navegador, como el resto de la ficha. */
  timeZone?: string;
  now?: Date;
}

/** "15 nov, 8:37 p.m." (con año si no es el año en curso). null si no hay fecha. */
export function formatTimelineDate(iso: string | null | undefined, options: DateOptions = {}): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const year = (d: Date) =>
    new Intl.DateTimeFormat('es-MX', { year: 'numeric', timeZone: options.timeZone }).format(d);
  const sameYear = year(date) === year(options.now ?? new Date());
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: options.timeZone,
  })
    .format(date)
    .replace(/\s+/g, ' ');
}

/** "Vence 19 nov, 11:59 p.m." o "Venció 16 nov, 11:59 p.m." según la hora actual. */
export function dueText(dueAt: string | null | undefined, options: DateOptions = {}): string | null {
  const text = formatTimelineDate(dueAt, options);
  if (!text || !dueAt) return null;
  const overdue = (options.now ?? new Date()).getTime() > new Date(dueAt).getTime();
  return `${overdue ? 'Venció' : 'Vence'} ${text}`;
}

export function isOverdue(dueAt: string | null | undefined, now: Date = new Date()): boolean {
  return !!dueAt && now.getTime() > new Date(dueAt).getTime();
}

/** Texto bajo el título cuando el paso no tiene fecha. */
export function stepWhen(step: OrderTimelineStep, options: DateOptions = {}): string {
  const date = formatTimelineDate(step.at, options);
  if (date) return date;
  if (step.state === 'current') return 'En curso';
  if (step.state === 'upcoming') return 'Pendiente';
  if (step.state === 'problem') return 'Sin fecha registrada';
  return 'Fecha no registrada';
}

/** Un paso "alcanzado" pinta su tramo de la línea: ya pasó, está en curso o se atoró ahí. */
export function isReached(state: TimelineStepState): boolean {
  return state !== 'upcoming';
}

export const STEP_DOT: Record<TimelineStepState, string> = {
  done: 'bg-emerald-600 text-white border-emerald-600',
  current: 'bg-white text-[#3E667D] border-[#3E667D] ring-4 ring-[#3E667D]/15',
  upcoming: 'bg-white text-gray-300 border-gray-300',
  problem: 'bg-red-600 text-white border-red-600',
};

export const STEP_TITLE: Record<TimelineStepState, string> = {
  done: 'text-gray-900',
  current: 'text-[#3E667D]',
  upcoming: 'text-gray-400',
  problem: 'text-red-700',
};

export const TONE_BADGE: Record<TimelineTone, string> = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-800 border-red-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
};

const PAYMENT_TONE: Record<TimelinePaymentState, TimelineTone> = {
  paid: 'success',
  awaiting: 'warning',
  voucher_issued: 'warning',
  voucher_overdue: 'danger',
  failed: 'danger',
  refunded: 'neutral',
  none: 'neutral',
};

export function paymentBadgeClass(state: TimelinePaymentState): string {
  return TONE_BADGE[PAYMENT_TONE[state] ?? 'neutral'];
}

/** "cs_live_bc7W4K…VNQH": suficiente para buscar el cobro en Stripe sin llenar la tarjeta. */
export function shortId(id: string | null | undefined, head = 14, tail = 4): string | null {
  if (!id) return null;
  return id.length <= head + tail + 1 ? id : `${id.slice(0, head)}…${id.slice(-tail)}`;
}

const STRIPE_ACCOUNT: Record<string, string> = { mx: 'Stripe México', us: 'Stripe Estados Unidos' };

export function stripeAccountLabel(account: string | null | undefined): string | null {
  if (!account) return null;
  return STRIPE_ACCOUNT[account.toLowerCase()] ?? `Stripe ${account.toUpperCase()}`;
}

export function timelineMoney(amount: number | null, currencyCode: string | null): string | null {
  if (amount === null) return null;
  const currency = (currencyCode ?? 'MXN').trim().toUpperCase() || 'MXN';
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)} ${currency}`;
  }
}

export interface PaymentFact {
  label: string;
  value: string;
  /** Texto completo para copiar (referencia de OXXO, cobro de Stripe). */
  copy?: string;
  mono?: boolean;
  tone?: 'danger';
}

/** Renglones de la tarjeta "Pago", en el orden en que pasaron. Solo lo que sí se sabe. */
export function paymentFacts(payment: OrderTimelinePayment, options: DateOptions = {}): PaymentFact[] {
  const facts: PaymentFact[] = [];
  const add = (label: string, value: string | null, extra: Partial<PaymentFact> = {}) => {
    if (value) facts.push({ label, value, ...extra });
  };
  add('Inició el pago', formatTimelineDate(payment.startedAt, options));
  if (payment.kind === 'oxxo') {
    add('Ficha generada', formatTimelineDate(payment.voucherIssuedAt, options));
    add('Referencia', payment.reference, { copy: payment.reference ?? undefined, mono: true });
    if (payment.state !== 'paid') {
      add(
        isOverdue(payment.voucherExpiresAt, options.now) ? 'Venció' : 'Vence',
        formatTimelineDate(payment.voucherExpiresAt, options),
        isOverdue(payment.voucherExpiresAt, options.now) ? { tone: 'danger' } : {},
      );
    }
  }
  add('Pagado', formatTimelineDate(payment.paidAt, options));
  if (payment.attempts > 1) add('Intentos de pago', String(payment.attempts));
  add('Cobro en Stripe', shortId(payment.gatewayId), { copy: payment.gatewayId ?? undefined, mono: true });
  add('Cuenta', stripeAccountLabel(payment.gatewayAccount));
  return facts;
}
