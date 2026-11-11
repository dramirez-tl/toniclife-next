// online-sales.ts — Ingresos de la tienda en línea por país (lógica PURA).
//
// `GET /reports/online-sales/by-country?from=&to=` responde, por país de la tienda
// (México incluye Frontera), lo cobrado en pedidos en línea ya pagados. Son INGRESOS,
// no ganancias: el sistema no guarda el costo de los productos.
//
// El rango lo pone la pantalla y sale de los PERIODOS DE NEGOCIO del API
// (`tonic.commission_periods`: hasta sep-2026 del 26 al 25, octubre-2026 hasta el 31 y
// desde noviembre el mes calendario). Aquí NUNCA se calcula un mes a mano: solo se
// leen las fechas del periodo que manda el API, o las que la persona escribe.

import type { MlmPeriod } from '@/types/mlm-periods';
import type { OnlineSalesByCountryResponse, OnlineSalesCountry, OnlineSalesGateway } from '@/types/reports';

/** Tope del rango en el API (un año, contando los dos extremos). */
export const ONLINE_SALES_MAX_DAYS = 366;

/** Pedidos importados de la tienda del sistema anterior: no traen por dónde se cobraron. */
export const PREVIOUS_STORE_GATEWAY = 'previous';

export interface DateRange {
  from: string;
  to: string;
}

// ===== fechas =====

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Día calendario válido "AAAA-MM-DD" (2026-02-30 no lo es). */
export function isCalendarDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Los primeros 10 caracteres de una fecha del API ("2026-11-01T06:00:00.000Z" → "2026-11-01"); null si no es un día. */
export function toDateOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const day = value.trim().slice(0, 10);
  return isCalendarDay(day) ? day : null;
}

/** Días que abarca el rango, contando los dos extremos. */
export function rangeDays(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export type DateRangeError = 'missing' | 'invalid_day' | 'inverted' | 'too_long';

/** Revisa un rango escrito a mano con las mismas reglas del API; null = se puede consultar. */
export function checkDateRange(from: string | null | undefined, to: string | null | undefined): DateRangeError | null {
  if (!from?.trim() || !to?.trim()) return 'missing';
  if (!isCalendarDay(from) || !isCalendarDay(to)) return 'invalid_day';
  if (from > to) return 'inverted';
  if (rangeDays(from, to) > ONLINE_SALES_MAX_DAYS) return 'too_long';
  return null;
}

export function dateRangeMessage(error: DateRangeError): string {
  switch (error) {
    case 'missing':
      return 'Elige la fecha inicial y la final.';
    case 'inverted':
      return 'La fecha inicial no puede ser posterior a la final.';
    case 'too_long':
      return `El rango admite como máximo ${ONLINE_SALES_MAX_DAYS} días (un año).`;
    default:
      return 'Revisa las fechas: alguna no es un día válido.';
  }
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-09-26" → "26 sep 2026". Se arma con el texto del día: sin zonas horarias de por medio. */
export function formatDay(day: string): string {
  if (!isCalendarDay(day)) return day;
  const [year, month, date] = day.split('-');
  return `${Number(date)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/** "26 sep 2026 – 31 oct 2026" (o un solo día si empieza y termina el mismo). */
export function formatRange(range: DateRange): string {
  return range.from === range.to ? formatDay(range.from) : `${formatDay(range.from)} – ${formatDay(range.to)}`;
}

// ===== periodos de negocio (los da el API) =====

/** Rango del periodo tal como lo guarda el API; null si sus fechas no se pueden leer. */
export function periodRange(period: Pick<MlmPeriod, 'startDate' | 'endDate'> | null | undefined): DateRange | null {
  const from = toDateOnly(period?.startDate);
  const to = toDateOnly(period?.endDate);
  return from && to && from <= to ? { from, to } : null;
}

/**
 * Periodo ANTERIOR a uno dado, buscado en la lista del API: el de `periodNumber - 1`
 * o, si la lista no trae números, el que termina más cerca antes de que empiece el
 * actual. Nunca se calcula restando un mes.
 */
export function previousPeriod(
  periods: readonly MlmPeriod[] | null | undefined,
  current: MlmPeriod | null | undefined,
): MlmPeriod | null {
  if (!current || !periods?.length) return null;
  if (typeof current.periodNumber === 'number') {
    const byNumber = periods.find((p) => p.periodNumber === (current.periodNumber as number) - 1);
    if (byNumber) return byNumber;
  }
  const start = toDateOnly(current.startDate);
  if (!start) return null;
  let best: MlmPeriod | null = null;
  let bestEnd = '';
  for (const period of periods) {
    if (period.id === current.id) continue;
    const end = toDateOnly(period.endDate);
    if (!end || end >= start) continue;
    if (end > bestEnd) {
      best = period;
      bestEnd = end;
    }
  }
  return best;
}

/** "Octubre 2026 · 26 sep 2026 – 31 oct 2026". */
export function periodLabel(period: Pick<MlmPeriod, 'name' | 'startDate' | 'endDate'>): string {
  const range = periodRange(period);
  const name = (period.name ?? '').trim();
  if (!range) return name;
  return name ? `${name} · ${formatRange(range)}` : formatRange(range);
}

// ===== respuesta del API =====

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function count(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Importe como texto decimal ("64575.00"); lo ilegible queda en "0.00". */
function money(value: unknown): string {
  const n = typeof value === 'number' || (typeof value === 'string' && value.trim()) ? Number(value) : NaN;
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

function gatewayFrom(raw: unknown): OnlineSalesGateway | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const gateway = text(row.gateway).toLowerCase();
  if (!gateway) return null;
  const account = text(row.account).toLowerCase();
  return {
    gateway,
    account: account ? account : null,
    label: text(row.label) || (gateway === PREVIOUS_STORE_GATEWAY ? 'Tienda del sistema anterior' : 'Otro medio de pago'),
    orders: count(row.orders),
    total: money(row.total),
  };
}

function countryFrom(raw: unknown): OnlineSalesCountry | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const countryCode = text(row.countryCode).toUpperCase();
  if (!countryCode) return null;
  const gateways = Array.isArray(row.gateways)
    ? row.gateways.map(gatewayFrom).filter((g): g is OnlineSalesGateway => g !== null)
    : [];
  return {
    countryCode,
    countryName: text(row.countryName) || countryCode,
    currency: text(row.currency).toUpperCase(),
    paidOrders: count(row.paidOrders),
    units: count(row.units),
    subtotal: money(row.subtotal),
    discount: money(row.discount),
    shipping: money(row.shipping),
    tax: money(row.tax),
    total: money(row.total),
    points: count(row.points),
    gateways,
    pendingOrders: count(row.pendingOrders),
    pendingTotal: money(row.pendingTotal),
  };
}

/** Lee la respuesta sin fiarse de su forma; null si no trae la lista de países. */
export function normalizeOnlineSales(raw: unknown): OnlineSalesByCountryResponse | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const body = raw as Record<string, unknown>;
  if (!Array.isArray(body.countries)) return null;
  return {
    from: toDateOnly(body.from) ?? '',
    to: toDateOnly(body.to) ?? '',
    countries: body.countries.map(countryFrom).filter((c): c is OnlineSalesCountry => c !== null),
  };
}

/** Renglón de un país de la tienda; null si la respuesta no lo trae. */
export function onlineSalesOfCountry(
  data: OnlineSalesByCountryResponse | null | undefined,
  countryCode: string,
): OnlineSalesCountry | null {
  const code = countryCode.trim().toUpperCase();
  return data?.countries.find((c) => c.countryCode === code) ?? null;
}

/** Sin pedidos pagados ni pendientes en el rango. */
export function isEmptyOnlineSales(row: OnlineSalesCountry): boolean {
  return row.paidOrders === 0 && row.pendingOrders === 0;
}

/**
 * ¿Hay pedidos de la tienda del sistema anterior en el rango? En ellos el desglose
 * (productos, envío, impuestos) puede no sumar el total: se avisa.
 */
export function hasPreviousStoreOrders(row: OnlineSalesCountry): boolean {
  return row.gateways.some((g) => g.gateway === PREVIOUS_STORE_GATEWAY && g.orders > 0);
}

/** Porcentaje (0–100) que una pasarela representa del total cobrado; 0 si no hay total. */
export function gatewayShare(gateway: Pick<OnlineSalesGateway, 'total'>, row: Pick<OnlineSalesCountry, 'total'>): number {
  const total = Number(row.total);
  const part = Number(gateway.total);
  if (!(total > 0) || !Number.isFinite(part)) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}

export type OnlineSalesProblem =
  /** 403: la persona no puede ver reportes. */
  | 'forbidden'
  /** 404: el servidor todavía no tiene este reporte. */
  | 'not_available'
  /** 400: el rango no le gustó al servidor. */
  | 'bad_range'
  | 'error';

/** Qué pasó con la consulta, por su estado HTTP. */
export function onlineSalesProblem(error: unknown): OnlineSalesProblem {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_available';
  if (status === 400) return 'bad_range';
  return 'error';
}
