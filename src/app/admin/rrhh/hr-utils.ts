// hr-utils.ts - Ayudas compartidas por las pantallas de RRHH.
//
// Mismo patrón que admin/comercial/formularios/components/induccion-utils.ts:
// utilidades locales al módulo, sin textos de otra pantalla.

import { DEFAULT_TIMEZONE } from '@/lib/timezone-utils';
import {
  WORK_DAYS,
  type WorkScheduleBreakMode,
  type WorkScheduleDayOverride,
  type WorkScheduleDayOverrides,
} from '@/types/hr';

/**
 * Mensaje legible de un error del API. NestJS manda `message` como string o
 * como arreglo (errores de validación).
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown } }; message?: string } | null;
  const raw = e?.response?.data?.message;
  const msg = Array.isArray(raw) ? String(raw[0] ?? '') : typeof raw === 'string' ? raw : '';
  return msg || e?.message || fallback;
}

/** Código HTTP de un error de axios (para distinguir 409, 404…). */
export function apiErrorStatus(err: unknown): number | null {
  const e = err as { response?: { status?: number } } | null;
  return typeof e?.response?.status === 'number' ? e.response.status : null;
}

/**
 * Neutraliza fórmulas (CWE-1236) en texto capturado por usuarios: Excel
 * ejecutaría una celda que empiece con = + - @. El entrecomillado lo hace
 * exportToCsv, por eso aquí solo se antepone el apóstrofo.
 */
export function csvSafe(v: string | number | null | undefined): string {
  const s = (v ?? '').toString().replace(/[\r\n\t]/g, ' ');
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

/** 'YYYY-MM-DD' de hoy en CDMX (misma zona que usa el API por defecto). */
export function todayCdmx(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: DEFAULT_TIMEZONE });
}

/** Suma días a una fecha 'YYYY-MM-DD' sin salirse del día calendario. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const base = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * Formatea una fecha sin hora ('YYYY-MM-DD' o ISO). Se parsea la parte de
 * fecha como LOCAL para evitar el corrimiento de un día que produce un DATE
 * serializado a medianoche UTC.
 */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** 'HH:MM' a partir de 'HH:MM' o 'HH:MM:SS' (el API manda HH:MM). */
export function shortTime(value: string | null | undefined): string {
  if (!value) return '—';
  return value.slice(0, 5);
}

/**
 * Cómo se lee la comida de un horario en una línea.
 *
 * Desde 17-sep-2026 la comida puede ser LIBRE (cada quien la toma cuando
 * quiera, con una duración máxima) o FIJA (hora de salida y de regreso).
 */
export function breakSummary(schedule: {
  breakMode: WorkScheduleBreakMode;
  breakMinutes: number;
  breakOutTime: string | null;
  breakInTime: string | null;
}): string {
  // Se lee "fija" solo si hay ventana capturada; cualquier otro caso es libre.
  if (schedule.breakMode !== 'flexible' && schedule.breakOutTime && schedule.breakInTime) {
    return `${shortTime(schedule.breakOutTime)} - ${shortTime(schedule.breakInTime)}`;
  }
  return `Libre · ${schedule.breakMinutes} min`;
}

// ---------------------------------------------------------------------------
// Excepciones por día
// ---------------------------------------------------------------------------
//
// Decisión del cliente (17-sep-2026): "en corporativo los sábados son de 9 a
// 2:00 pm". Un horario puede traer excepciones por día ISO ('1'..'7'): lo que
// no venga en la excepción hereda del horario base y ESE día la comida siempre
// es libre con la duración de la excepción (0 = sin comida). Las tolerancias
// nunca cambian: son las del horario base.

/** Horario efectivo de un día (ya resuelta la excepción). */
export interface ScheduleDayTimes {
  checkInTime: string;
  checkOutTime: string;
  breakMinutes: number;
}

/** Abreviatura del día ISO: 1 = Lun … 7 = Dom. */
export function dayAbbr(day: number | string): string {
  const n = Number(day);
  return WORK_DAYS.find((d) => d.value === n)?.abbr ?? String(day);
}

/** Nombre completo del día ISO: 1 = Lunes … 7 = Domingo. */
export function dayLabel(day: number | string): string {
  const n = Number(day);
  return WORK_DAYS.find((d) => d.value === n)?.label ?? String(day);
}

/** Aplica la excepción sobre el horario base: lo que no venga se hereda. */
export function resolveDayOverride(
  base: ScheduleDayTimes,
  override: WorkScheduleDayOverride,
): ScheduleDayTimes {
  return {
    checkInTime: shortTime(override.checkInTime ?? base.checkInTime),
    checkOutTime: shortTime(override.checkOutTime ?? base.checkOutTime),
    breakMinutes: override.breakMinutes ?? base.breakMinutes,
  };
}

/**
 * Cómo se lee el horario de un día:
 * - 'short': "09:00-14:00 · sin comida" (chips y badges).
 * - 'long':  "09:00 a 14:00, sin comida" (expediente).
 */
export function dayTimesSummary(
  times: {
    checkInTime: string | null;
    checkOutTime: string | null;
    breakMinutes: number | null;
  },
  format: 'short' | 'long' = 'short',
): string {
  const range =
    format === 'long'
      ? `${shortTime(times.checkInTime)} a ${shortTime(times.checkOutTime)}`
      : `${shortTime(times.checkInTime)}-${shortTime(times.checkOutTime)}`;
  // 0 minutos (o sin dato) = ese día no se toma comida.
  const lunch = times.breakMinutes ? `comida ${times.breakMinutes} min` : 'sin comida';
  return format === 'long' ? `${range}, ${lunch}` : `${range} · ${lunch}`;
}

/** "Sáb 09:00-14:00 · sin comida" / "Sábado: 09:00 a 14:00, sin comida". */
export function dayOverrideSummary(
  day: number | string,
  override: WorkScheduleDayOverride,
  base: ScheduleDayTimes,
  format: 'short' | 'long' = 'short',
): string {
  const times = resolveDayOverride(base, override);
  return format === 'long'
    ? `${dayLabel(day)}: ${dayTimesSummary(times, 'long')}`
    : `${dayAbbr(day)} ${dayTimesSummary(times, 'short')}`;
}

/**
 * Excepciones de un horario ordenadas por día ISO. Ignora llaves que no sean
 * '1'..'7' (el API ya las valida, pero la pantalla no debe romperse por eso).
 */
export function dayOverrideEntries(
  overrides: WorkScheduleDayOverrides | null | undefined,
): { day: number; override: WorkScheduleDayOverride }[] {
  return Object.entries(overrides ?? {})
    .map(([key, override]) => ({ day: Number(key), override }))
    .filter((e) => Number.isInteger(e.day) && e.day >= 1 && e.day <= 7 && !!e.override)
    .sort((a, b) => a.day - b.day);
}

/** hr:manage (con comodines) o super_admin. Misma lógica que PermissionGuard. */
export function hasManagePermission(permissions: string[], roles: string[]): boolean {
  if (roles.includes('super_admin')) return true;
  return permissions.some((p) => p === 'hr:manage' || p === 'hr:*' || p === '*' || p === '*:*');
}

/** Formatea un salario que Postgres puede mandar como string. */
export function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}
