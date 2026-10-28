// launch-countdown.ts - Lanzamiento oficial del sitio nuevo (28-oct-2026):
// el lunes 2 de noviembre de 2026 a las 6:00 a. m., hora de la Ciudad de
// México (UTC-6, sin horario de verano desde 2022). Hasta entonces producción
// muestra el mensaje "Estamos trabajando para ti" con un contador; el candado
// vive en middleware.ts (LAUNCH_DATE) y se apaga solo al llegar la hora.
// Puro, sin React: lo usan la página de mantenimiento y sus pruebas.

/** Fecha de lanzamiento por defecto (ISO con desfase de CDMX). */
export const DEFAULT_LAUNCH_AT = '2026-11-02T06:00:00-06:00';

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** true cuando ya se llegó (o pasó) la fecha. */
  done: boolean;
}

/** Fecha efectiva: NEXT_PUBLIC_LAUNCH_DATE si es válida; si no, la de código. */
export function resolveLaunchAt(raw: string | undefined | null): string {
  const text = (raw ?? '').trim();
  if (!text) return DEFAULT_LAUNCH_AT;
  return Number.isFinite(new Date(text).getTime()) ? text : DEFAULT_LAUNCH_AT;
}

/** Tiempo que falta para `launchAt` visto desde `now` (ms epoch). */
export function getTimeLeft(launchAt: string, now: number = Date.now()): TimeLeft {
  const diff = new Date(launchAt).getTime() - now;
  if (!Number.isFinite(diff) || diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    done: false,
  };
}

/**
 * "lunes 2 de noviembre · 6:00 a. m. (hora de la Ciudad de México)" para el
 * aviso debajo del contador; siempre en la zona de CDMX, venga de donde venga
 * el visitante.
 */
export function formatLaunchLabel(launchAt: string, locale = 'es-MX'): string {
  const date = new Date(launchAt);
  if (!Number.isFinite(date.getTime())) return '';
  const day = new Intl.DateTimeFormat(locale, {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: 'America/Mexico_City',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${day} · ${time} (hora de la Ciudad de México)`;
}
