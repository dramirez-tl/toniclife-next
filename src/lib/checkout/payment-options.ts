// payment-options.ts — Pago en efectivo en OXXO en la tienda (lógica PURA, 12-nov-2026).
//
// La tienda cobra con tarjeta (Stripe). En la tienda de México puede ofrecer además pagar
// en efectivo en OXXO: el comprador genera una ficha con una referencia (página de Stripe),
// la paga en cualquier OXXO antes de que venza y el pedido se confirma cuando Stripe avisa
// del pago, normalmente al siguiente día hábil. Aquí se decide, sin tocar montos:
//  · si OXXO se ofrece (interruptor del servidor en GET /config/pilot-public, tienda de
//    México, pesos) y si se puede elegir con el total del pedido (Stripe: de $10 a $10,000);
//  · en qué va el pago en OXXO de un pedido ya creado, para la confirmación y "Mis pedidos";
//  · cómo se escriben la fecha límite (SIEMPRE en hora del centro de México, nunca en la
//    del navegador) y la referencia.
// Todo lo que manda el API es opcional: un API anterior no conoce OXXO y entonces nada
// cambia. La autoridad es el API (422 CHK_PAYMENT_METHOD_UNAVAILABLE); esto evita que el
// comprador elija algo que se le va a rechazar.

import type { LanguageCode } from '@/i18n/config';
import type { OrderOxxo } from '@/types/order';

/** La ficha vence a las 23:59 de ESTA zona; el negocio corre en hora del centro de México. */
export const OXXO_TIME_ZONE = 'America/Mexico_City';

export const OXXO_DEFAULT_EXPIRES_AFTER_DAYS = 2;
export const OXXO_MIN_EXPIRES_AFTER_DAYS = 1;
export const OXXO_MAX_EXPIRES_AFTER_DAYS = 7;
/** Vigencias que admite Stripe para una ficha, en días naturales. */
export const OXXO_EXPIRES_AFTER_DAYS_OPTIONS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

/** Límites de Stripe para un pago en OXXO, en pesos. */
export const OXXO_DEFAULT_MIN_AMOUNT = 10;
export const OXXO_DEFAULT_MAX_AMOUNT = 10_000;

// ===== helpers =====

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Número finito a partir de un número o de un texto numérico ("10000.00"); lo demás, `null`. */
function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function lower(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// ===== interruptor de OXXO (GET /config/pilot-public · GET /admin/pilot/checkout) =====

export interface OxxoConfig {
  enabled: boolean;
  /** Días naturales de vigencia de la ficha, de 1 a 7. */
  expiresAfterDays: number;
  /** Monto mínimo y máximo de un pago en OXXO, en pesos. */
  minAmount: number;
  maxAmount: number;
}

/** Vigencia de la ficha en días enteros de 1 a 7; algo ilegible = 2 (lo que usa el API). */
export function clampOxxoDays(value: unknown): number {
  const days = finiteNumber(value);
  if (days === null) return OXXO_DEFAULT_EXPIRES_AFTER_DAYS;
  return Math.min(OXXO_MAX_EXPIRES_AFTER_DAYS, Math.max(OXXO_MIN_EXPIRES_AFTER_DAYS, Math.round(days)));
}

/**
 * Bloque `oxxo` del estado del piloto. `null` = el API no lo manda (API anterior) o manda
 * algo que no es un objeto: OXXO no existe para esta tienda. Con el bloque presente solo un
 * `enabled: true` EXPRESO lo enciende; la vigencia se acota a 1–7 días y los límites
 * ilegibles (o invertidos) caen a los de Stripe: $10 y $10,000.
 */
export function readOxxoConfig(pilotState: unknown): OxxoConfig | null {
  const raw = isRecord(pilotState) ? pilotState.oxxo : undefined;
  if (!isRecord(raw)) return null;
  const min = finiteNumber(raw.minAmount);
  const max = finiteNumber(raw.maxAmount);
  const minAmount = min !== null && min > 0 ? min : OXXO_DEFAULT_MIN_AMOUNT;
  const maxAmount = max !== null && max > 0 ? max : OXXO_DEFAULT_MAX_AMOUNT;
  const sane = minAmount <= maxAmount;
  return {
    enabled: raw.enabled === true,
    expiresAfterDays: clampOxxoDays(raw.expiresAfterDays),
    minAmount: sane ? minAmount : OXXO_DEFAULT_MIN_AMOUNT,
    maxAmount: sane ? maxAmount : OXXO_DEFAULT_MAX_AMOUNT,
  };
}

// ===== OXXO como forma de pago del checkout =====

export type OxxoUnavailableReason = 'below_min' | 'above_max';

export interface OxxoOption {
  /** OXXO aparece entre las formas de pago. */
  offered: boolean;
  /** Se puede elegir con el total de este pedido. */
  selectable: boolean;
  /** Por qué aparece y no se puede elegir. */
  reason?: OxxoUnavailableReason;
}

/**
 * OXXO se ofrece SOLO en la tienda de México (ahí compra también la zona Frontera), en
 * pesos y con el interruptor del servidor encendido. Ofrecido, se puede elegir si el total
 * del pedido está entre el mínimo y el máximo (ambos inclusive); fuera de ese rango se
 * muestra apagado con su motivo. Sin total que comparar (los montos aún se calculan) no hay
 * motivo para apagarlo: se deja elegir y el API valida al crear el pedido.
 */
export function oxxoOption(input: {
  /** Bloque `oxxo` ya leído con `readOxxoConfig`. */
  pilotOxxo: OxxoConfig | null | undefined;
  /** País de la TIENDA (ISO2), no la zona de precios del comprador. */
  storeCountryCode: string | null | undefined;
  /** Moneda con la que se cobra el pedido. */
  currencyCode: string | null | undefined;
  /** Total del pedido que la página ya tiene; `null` = todavía no se sabe. */
  total: number | string | null | undefined;
}): OxxoOption {
  const config = input.pilotOxxo;
  const offered =
    !!config &&
    config.enabled === true &&
    lower(input.storeCountryCode) === 'mx' &&
    lower(input.currencyCode) === 'mxn';
  if (!offered) return { offered: false, selectable: false };
  const total = finiteNumber(input.total);
  if (total === null) return { offered: true, selectable: true };
  if (total < config.minAmount) return { offered: true, selectable: false, reason: 'below_min' };
  if (total > config.maxAmount) return { offered: true, selectable: false, reason: 'above_max' };
  return { offered: true, selectable: true };
}

// ===== pago en OXXO de un pedido ya creado =====

/** Solo enlaces http(s): lo que llegue con otro esquema no se pinta como enlace. */
function httpUrl(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;
  try {
    const { protocol } = new URL(text);
    return protocol === 'https:' || protocol === 'http:' ? text : null;
  } catch {
    return null;
  }
}

function instantOrNull(value: unknown): string | null {
  const text = cleanText(value);
  return text && Number.isFinite(Date.parse(text)) ? text : null;
}

/**
 * Campo `oxxo` de un pedido (GET /checkout/confirmation/:id, /orders/my-orders/:id y cada
 * renglón de /distributor/orders). `null` = el pedido no se paga en OXXO (o el API es
 * anterior). Un enlace que no es http(s) o una fecha ilegible quedan en `null`.
 */
export function readOrderOxxo(raw: unknown): OrderOxxo | null {
  if (!isRecord(raw)) return null;
  return {
    voucherUrl: httpUrl(raw.voucherUrl),
    expiresAt: instantOrNull(raw.expiresAt),
    reference: cleanText(raw.reference),
  };
}

/**
 * En qué va el pago en OXXO de un pedido, para decidir qué se le muestra al comprador:
 *  · `none`: nada de OXXO que mostrar (el pedido no es de OXXO, o se canceló);
 *  · `voucher_pending`: pedido de OXXO sin ficha todavía (Stripe la manda segundos después
 *    de que el comprador termina su página; si la abandonó, no llega);
 *  · `awaiting_payment`: ficha generada y vigente, falta que pase a pagar;
 *  · `deadline_passed`: la fecha límite ya pasó y el servidor aún no dice ni pagado ni
 *    vencido. NO es lo mismo que vencida: quien pagó el último día sigue "pendiente" hasta
 *    que OXXO avisa (siguiente día hábil), y decirle "venció sin pago" sería falso;
 *  · `expired`: Stripe avisó que la ficha venció sin pago (pago `failed`);
 *  · `paid`: el pago ya se recibió.
 */
export type OxxoOrderState =
  | 'none'
  | 'voucher_pending'
  | 'awaiting_payment'
  | 'deadline_passed'
  | 'expired'
  | 'paid';

/** Estados del cobro con el dinero ya recibido (un reembolso también pasó por ahí). */
const RECEIVED_PAYMENT = new Set(['paid', 'completed', 'refunded']);
/** Estados del pedido a los que solo se llega con el pago confirmado. */
const PAID_ORDER = new Set([
  'confirmed',
  'paid',
  'processing',
  'ready',
  'shipped',
  'in_transit',
  'delivered',
  'completed',
]);

export function oxxoOrderState(input: {
  /** Campo `oxxo` del pedido tal como llega del API (o ya leído con `readOrderOxxo`). */
  oxxo: unknown;
  paymentStatus?: string | null;
  status?: string | null;
  now?: Date;
}): OxxoOrderState {
  const oxxo = readOrderOxxo(input.oxxo);
  if (!oxxo) return 'none';
  const payment = lower(input.paymentStatus);
  const status = lower(input.status);
  if (RECEIVED_PAYMENT.has(payment) || PAID_ORDER.has(status)) return 'paid';
  if (payment === 'failed') return 'expired';
  // Cancelado sin que Stripe diga "vencida": se muestra como cualquier pedido cancelado.
  if (status === 'cancelled') return 'none';
  const deadline = oxxo.expiresAt ? Date.parse(oxxo.expiresAt) : NaN;
  const now = (input.now ?? new Date()).getTime();
  if (Number.isFinite(deadline) && now > deadline) return 'deadline_passed';
  return oxxo.voucherUrl ? 'awaiting_payment' : 'voucher_pending';
}

/**
 * ¿Tiene caso volver a consultar cada pocos segundos un pedido que sigue pendiente? Con
 * tarjeta sí: el aviso de Stripe llega en segundos. Con OXXO solo mientras la ficha se
 * genera; ya generada (o pasada su fecha límite) el pago llega cuando el comprador pasa a
 * la tienda, en horas o días, y la página se queda fija.
 */
export function shouldPollPendingPayment(
  order: { oxxo?: unknown; paymentStatus?: string | null; status?: string | null },
  now: Date = new Date(),
): boolean {
  const state = oxxoOrderState({ oxxo: order.oxxo, paymentStatus: order.paymentStatus, status: order.status, now });
  return state === 'none' || state === 'voucher_pending' || state === 'paid';
}

// ===== textos: fecha límite y referencia =====

const INTL_LOCALE: Record<LanguageCode, string> = { es: 'es-MX', en: 'en-US' };

function partsOf(format: Intl.DateTimeFormat, date: Date): (type: Intl.DateTimeFormatPartTypes) => string {
  const parts = format.formatToParts(date);
  return (type) => parts.find((part) => part.type === type)?.value ?? '';
}

/** "sábado 14 de noviembre" / "Saturday, November 14". */
function dayText(part: (type: Intl.DateTimeFormatPartTypes) => string, lang: LanguageCode): string {
  return lang === 'en'
    ? `${part('weekday')}, ${part('month')} ${part('day')}`
    : `${part('weekday')} ${part('day')} de ${part('month')}`;
}

/** Espacio de no separación: la hora y su "p. m." no se parten al final de un renglón. */
const NBSP = '\u00a0';

/**
 * Fecha límite de la ficha en hora del centro de México, sea cual sea la zona del
 * navegador: "sábado 14 de noviembre, 11:59 p. m." / "Saturday, November 14, 11:59 PM".
 * `null` si la fecha viene vacía o ilegible. El texto se arma por partes para que sea el
 * mismo en cualquier navegador; la hora va con espacios de no separación.
 */
export function formatOxxoDeadline(expiresAt: string | null | undefined, lang: LanguageCode = 'es'): string | null {
  const time = typeof expiresAt === 'string' && expiresAt.trim() ? Date.parse(expiresAt.trim()) : NaN;
  if (!Number.isFinite(time)) return null;
  const part = partsOf(
    new Intl.DateTimeFormat(INTL_LOCALE[lang] ?? INTL_LOCALE.es, {
      timeZone: OXXO_TIME_ZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h23',
    }),
    new Date(time),
  );
  const hour24 = Number(part('hour')) % 24;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = part('minute').padStart(2, '0');
  const period = lang === 'en' ? (hour24 < 12 ? 'AM' : 'PM') : `${hour24 < 12 ? 'a.' : 'p.'}${NBSP}m.`;
  return `${dayText(part, lang)}, ${hour12}:${minute}${NBSP}${period}`;
}

/**
 * Día en que vencería una ficha generada AHORA: la fecha de hoy en hora del centro de
 * México más los días de vigencia (la ficha vence a las 23:59 de ese día). Es un adelanto
 * para el checkout; la fecha real la pone Stripe al generar la ficha (`expiresAt`).
 * "sábado 14 de noviembre" / "Saturday, November 14".
 */
export function oxxoPreviewDeadlineDay(
  expiresAfterDays: unknown,
  lang: LanguageCode = 'es',
  now: Date = new Date(),
): string {
  // Hoy en México, no en el navegador ni en UTC (desde las 18:00 de México, UTC ya es mañana).
  const today = partsOf(
    new Intl.DateTimeFormat('en-US', { timeZone: OXXO_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric' }),
    now,
  );
  // Mediodía UTC de ese día natural: al formatearlo en UTC el día no se recorre.
  const day = new Date(
    Date.UTC(Number(today('year')), Number(today('month')) - 1, Number(today('day')) + clampOxxoDays(expiresAfterDays), 12),
  );
  const part = partsOf(
    new Intl.DateTimeFormat(INTL_LOCALE[lang] ?? INTL_LOCALE.es, {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    day,
  );
  return dayText(part, lang);
}

/**
 * Referencia de la ficha en grupos de 4 dígitos ("1234 5678 …"), más fácil de leer y de
 * dictar en caja. Si no son solo dígitos se muestra tal cual; vacía = `null`.
 */
export function formatOxxoReference(reference: string | null | undefined): string | null {
  const text = cleanText(reference);
  if (!text) return null;
  const digits = text.replace(/[\s-]+/g, '');
  return /^\d+$/.test(digits) ? (digits.match(/\d{1,4}/g) ?? [digits]).join(' ') : text;
}
