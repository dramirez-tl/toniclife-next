// format.ts — Formato de números y fechas de "Mi red" por idioma (contrato
// /distribuidor/red §3.2). Lógica pura: sin React ni next-intl.
//
// Reglas:
// - `locale` acepta lo que devuelve `useLocale()` ('es-mx', 'en-us') o solo el
//   idioma ('es', 'en'); el idioma decide el locale de Intl (es-MX / en-US).
// - Las fechas `YYYY-MM-DD` (start_date/end_date de commission_periods,
//   enrollment_date) se interpretan como día CALENDARIO, sin desfase de zona:
//   nunca `new Date('2026-09-25')` (eso es UTC y en CDMX cae al día 24).
// - Los periodos son 26→25: aquí solo se FORMATEA; el rango y `daysLeft` los
//   calcula el servidor con CURRENT_DATE. `daysLeft` de esta lib es un apoyo
//   para fechas ya resueltas (texto), no una fuente de verdad.

import { localeLanguage } from '@/i18n/config';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

/** Componentes de `YYYY-MM-DD` validados (mes 1..12, día real del mes); null si no aplica. */
function dateOnlyParts(value: string | null | undefined): { y: number; m: number; d: number } | null {
  const match = value ? DATE_ONLY.exec(value.trim()) : null;
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // Un día que no existe (30-feb) se desborda al mes siguiente: se rechaza.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return { y, m, d };
}

/** Locale de Intl a partir del locale de la app ('es-mx' | 'en-us' | 'es' | 'en'). */
export function intlLocale(locale: string | null | undefined): 'es-MX' | 'en-US' {
  return localeLanguage(locale ?? '') === 'en' ? 'en-US' : 'es-MX';
}

/**
 * Convierte `YYYY-MM-DD` (día calendario, sin zona) o un ISO completo en Date.
 * Devuelve null si no se puede interpretar.
 */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const text = value.trim();
  if (DATE_ONLY.test(text)) {
    const parts = dateOnlyParts(text);
    return parts ? new Date(parts.y, parts.m - 1, parts.d) : null;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Entero con separador de miles del idioma ("80,603"). NaN/null ⇒ "0". */
export function fmtInt(value: number | null | undefined, locale: string): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }).format(n);
}

/** Puntos con hasta 2 decimales y miles ("3,300" · "1,234.5"). */
export function fmtPoints(value: number | null | undefined, locale: string): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 }).format(n);
}

export type DateStyle = 'medium' | 'dayMonth' | 'time' | 'dateTime';

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  /** "22 sep 2026" / "Sep 22, 2026" */
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  /** "26 ago" / "Aug 26" (línea de periodo del encabezado) */
  dayMonth: { day: 'numeric', month: 'short' },
  /** "18:42" / "6:42 PM" ("Disponible hasta las …") */
  time: { hour: '2-digit', minute: '2-digit' },
  /** "22 sep 2026, 18:42" */
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/**
 * Fecha por idioma. `YYYY-MM-DD` se muestra tal cual como día calendario; un ISO
 * con hora se muestra en la zona del navegador. Inválida ⇒ "".
 */
export function fmtDate(
  value: string | Date | null | undefined,
  locale: string,
  style: DateStyle = 'medium',
): string {
  const date = value instanceof Date ? value : parseDateInput(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(intlLocale(locale), DATE_OPTIONS[style]).format(date);
}

/** "26 ago – 25 sep" / "Aug 26 – Sep 25" (valores {start} y {end} de header.periodLine). */
export function fmtPeriodRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  locale: string,
): { start: string; end: string } {
  return { start: fmtDate(startDate, locale, 'dayMonth'), end: fmtDate(endDate, locale, 'dayMonth') };
}

/**
 * Días que faltan entre dos fechas `YYYY-MM-DD` (texto, sin zona): end - today.
 * Negativo si ya pasó; null si alguna es inválida. NO consulta el reloj: el
 * "hoy" lo decide quien llama (idealmente el servidor con CURRENT_DATE).
 */
export function daysLeft(endDate: string | null | undefined, todayCdmx: string | null | undefined): number | null {
  const end = dateOnlyParts(endDate);
  const today = dateOnlyParts(todayCdmx);
  if (!end || !today) return null;
  const endUtc = Date.UTC(end.y, end.m - 1, end.d);
  const todayUtc = Date.UTC(today.y, today.m - 1, today.d);
  return Math.round((endUtc - todayUtc) / DAY_MS);
}

/** Día calendario `YYYY-MM-DD` en America/Mexico_City para un instante dado (solo apoyo visual). */
export function todayInCdmx(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

/** Minutos enteros transcurridos desde `iso` (≥ 0); null si es inválido. */
export function minutesSince(iso: string | null | undefined, now: number = Date.now()): number | null {
  const date = parseDateInput(iso);
  if (!date) return null;
  return Math.max(0, Math.floor((now - date.getTime()) / 60_000));
}

/**
 * "hace 5 min" / "5 min ago", "hace 2 h", "hace 3 días" con Intl.RelativeTimeFormat.
 * Inválido ⇒ "".
 */
export function fmtRelativeTime(iso: string | null | undefined, locale: string, now: number = Date.now()): string {
  const date = parseDateInput(iso);
  if (!date) return '';
  const diffMs = date.getTime() - now;
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto', style: 'short' });
  if (abs < 60_000) return rtf.format(0, 'minute');
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), 'minute');
  if (abs < DAY_MS) return rtf.format(Math.round(diffMs / 3_600_000), 'hour');
  return rtf.format(Math.round(diffMs / DAY_MS), 'day');
}
