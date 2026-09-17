// hr-utils.ts - Ayudas compartidas por las pantallas de RRHH.
//
// Mismo patrón que admin/comercial/formularios/components/induccion-utils.ts:
// utilidades locales al módulo, sin textos de otra pantalla.

import { DEFAULT_TIMEZONE } from '@/lib/timezone-utils';

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
