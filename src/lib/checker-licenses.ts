// checker-licenses.ts — Licencias de los checadores de asistencia (lógica PURA de Admin ›
// Sistemas › Checadores, 16-nov-2026).
//
// El checador (app en tableta Android) se activa con una licencia y manda un latido cada
// minuto. Aquí vive lo que la pantalla no decide por su cuenta: en qué estado está cada
// licencia (sin activar, en línea, sin señal, cancelada), cómo se muestra la clave, qué
// tableta la usa y hace cuánto se le vio.

import type { PosLicense, PosLicenseHardwareInfo } from '@/types/posLicense';

export type CheckerLicenseState = 'unused' | 'online' | 'silent' | 'revoked';

/** Sin latido en este tiempo = "sin señal" (el checador late cada 60 s). */
export const CHECKER_SILENT_AFTER_MS = 3 * 60_000;

const toTime = (value: string | Date | null | undefined): number | null => {
  if (!value) return null;
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(t) ? t : null;
};

/**
 * Estado de una licencia de checador:
 *  - `revoked`: cancelada; la clave ya no sirve;
 *  - `unused`: creada pero todavía no se activa en ninguna tableta (o se liberó);
 *  - `online`: activa y con latido reciente;
 *  - `silent`: activa pero sin latido reciente (tableta apagada, sin internet o app cerrada).
 */
export function checkerLicenseState(
  license: Pick<PosLicense, 'status' | 'lastSeenAt'>,
  now: number = Date.now(),
): CheckerLicenseState {
  if (license.status === 'revoked') return 'revoked';
  if (license.status !== 'active') return 'unused';
  const seen = toTime(license.lastSeenAt);
  return seen !== null && now - seen <= CHECKER_SILENT_AFTER_MS ? 'online' : 'silent';
}

export const CHECKER_STATE_LABEL: Record<CheckerLicenseState, string> = {
  unused: 'Sin activar',
  online: 'En línea',
  silent: 'Sin señal',
  revoked: 'Cancelada',
};

/** Clave con solo el primer y el último bloque a la vista: "TONC-••••-••••-7K2M". */
export function maskCheckerKey(key: string | null | undefined): string {
  const parts = (key ?? '').trim().split('-');
  if (parts.length < 2) return key ? '••••' : '';
  return parts.map((part, i) => (i === 0 || i === parts.length - 1 ? part : '•'.repeat(part.length))).join('-');
}

/** Tableta donde está activa: "motorola moto g15 · Android 15". '' = no se sabe. */
export function checkerDeviceLabel(info: PosLicenseHardwareInfo | null | undefined): string {
  if (!info) return '';
  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const device = text(info.hostname) || text(info.cpuModel);
  const platform = text(info.osPlatform);
  const release = text(info.osRelease);
  const os = platform ? `${platform.charAt(0).toUpperCase()}${platform.slice(1)}${release ? ` ${release}` : ''}` : '';
  return [device, os].filter(Boolean).join(' · ');
}

/** Versión de la app del checador sin su prefijo: "checador-1.0.0" → "1.0.0". */
export function checkerAppVersion(appVersion: string | null | undefined): string {
  return (appVersion ?? '').trim().replace(/^checador-/i, '');
}

/** "hace un momento", "hace 5 min", "hace 3 h", "hace 2 días"; '' = nunca se le ha visto. */
export function checkerLastSeenText(lastSeenAt: string | Date | null | undefined, now: number = Date.now()): string {
  const seen = toTime(lastSeenAt);
  if (seen === null) return '';
  const minutes = Math.floor(Math.max(0, now - seen) / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}

export interface CheckerLicenseSummary {
  total: number;
  online: number;
  silent: number;
  unused: number;
  revoked: number;
}

export function checkerLicenseSummary(
  licenses: ReadonlyArray<Pick<PosLicense, 'status' | 'lastSeenAt'>> | null | undefined,
  now: number = Date.now(),
): CheckerLicenseSummary {
  const summary: CheckerLicenseSummary = { total: 0, online: 0, silent: 0, unused: 0, revoked: 0 };
  for (const license of licenses ?? []) {
    summary.total += 1;
    summary[checkerLicenseState(license, now)] += 1;
  }
  return summary;
}

/** Orden de la lista: primero las que piden atención (sin señal), luego en línea, sin activar y canceladas. */
const STATE_ORDER: Record<CheckerLicenseState, number> = { silent: 0, online: 1, unused: 2, revoked: 3 };

export function sortCheckerLicenses<T extends Pick<PosLicense, 'status' | 'lastSeenAt' | 'label' | 'branchName'>>(
  licenses: readonly T[] | null | undefined,
  now: number = Date.now(),
): T[] {
  const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
  return [...(licenses ?? [])].sort(
    (a, b) =>
      STATE_ORDER[checkerLicenseState(a, now)] - STATE_ORDER[checkerLicenseState(b, now)] ||
      collator.compare(a.branchName ?? '', b.branchName ?? '') ||
      collator.compare(a.label ?? '', b.label ?? ''),
  );
}
