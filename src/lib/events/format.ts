// format.ts - Formato de fechas, horas y dinero del módulo Eventos.
//
// Las fechas del evento viajan como texto YYYY-MM-DD: se parten como cadena y
// NUNCA se construye `new Date('YYYY-MM-DD')` (eso las interpreta en UTC y en
// México se recorren un día).

import { apiErrorMessage } from '@/lib/api-error';
import { formatDateTimeLocal } from '@/lib/timezone-utils';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** '2026-10-15' → '15/10/2026'. Si no es YYYY-MM-DD, regresa el texto tal cual. */
export function formatEventDate(ymd: string | null | undefined): string {
  if (!ymd) return '—';
  const m = ymd.match(DATE_ONLY);
  if (!m) return ymd;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** '2026-10-15' → 'jueves 15 de octubre de 2026' (sin coma, como se imprime en el boleto). */
export function formatEventDateLong(ymd: string | null | undefined): string {
  if (!ymd) return '';
  const m = ymd.match(DATE_ONLY);
  if (!m) return ymd;
  // Se arma en UTC y se formatea en UTC: así el día es el del texto, sin
  // importar la zona del navegador.
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const text = date.toLocaleDateString('es-MX', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  // es-MX produce "jueves, 15 de octubre de 2026"; el boleto lo lleva sin coma.
  return text.replace(/^(\p{L}+),\s/u, '$1 ');
}

/** 'HH:MM' → '11:00 a. m.' (hora de 12 con sufijo, como la imprime el API). */
export function formatEventTime(hhmm: string | null | undefined): string {
  if (!hhmm) return '';
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const suffix = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

/** Línea de horario: "Registro 10:30 a. m. · Inicio 11:00 a. m." (solo las horas capturadas). */
export function formatEventSchedule(ev: {
  doorsTime: string | null;
  startTime: string | null;
  endTime?: string | null;
}): string {
  const parts: string[] = [];
  if (ev.doorsTime) parts.push(`Registro ${formatEventTime(ev.doorsTime)}`);
  if (ev.startTime) parts.push(`Inicio ${formatEventTime(ev.startTime)}`);
  if (ev.endTime) parts.push(`Término ${formatEventTime(ev.endTime)}`);
  return parts.join(' · ');
}

/** Dinero con la moneda del evento (Intl es-MX). */
export function formatEventMoney(amount: number | null | undefined, currencyCode: string): string {
  const safe = Number.isFinite(amount as number) ? (amount as number) : 0;
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: (currencyCode || 'MXN').toUpperCase(),
    }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${(currencyCode || '').toUpperCase()}`.trim();
  }
}

/** Marca de tiempo ISO → "13 oct 11:45 p.m." en la zona del evento. */
export function formatEventTimestamp(
  iso: string | null | undefined,
  timezone: string,
): string {
  if (!iso) return '—';
  try {
    return formatDateTimeLocal(iso, timezone);
  } catch {
    return iso;
  }
}

/** Asignación: 100000 se muestra como "Sin límite". */
export function formatAllotment(allotment: number, unlimited: number): string {
  return allotment >= unlimited ? 'Sin límite' : allotment.toLocaleString('es-MX');
}

// ================================
// Errores del API (códigos conocidos del módulo)
// ================================

const EVENT_ERROR_LABEL: Record<string, string> = {
  EVENT_CODE_TAKEN: 'La clave ya existe (otro evento la usa).',
  PRD_CODE_TAKEN: 'La clave ya existe como producto en el catálogo.',
  EVENT_BRANCH_COUNTRY: 'Una de las sucursales es de otro país que el evento.',
  EVENT_ALLOTMENT_BELOW_SOLD:
    'No se puede asignar menos boletos de los que la sucursal ya vendió o tiene reservados.',
  EVENT_CAPACITY_EXCEEDED: 'La asignación supera el aforo del evento.',
  EVENT_EMAIL_MISSING: 'El boleto no tiene correo: captura uno para reenviarlo.',
  // Producto vinculado (evento sobre un producto existente del catálogo).
  EVENT_LINKED_PRODUCT:
    'Este evento usa un producto existente: se vende donde haya existencia del producto (muévela con traspasos de inventario) y el precio se edita en Productos.',
  EVENT_PRODUCT_NOT_FOUND: 'El producto elegido ya no existe en el catálogo.',
  EVENT_PRODUCT_LINKED: 'Ese producto ya genera boletos de otro evento.',
  EVENT_MAIN_PRODUCT: 'La clave principal del evento no se puede quitar.',
  EVENT_PRODUCT_IS_EVENT: 'Ese producto ya es un boleto de evento; elige otro.',
  EVENT_CODE_REQUIRED: 'Captura la clave del evento (o vincula un producto existente).',
  EVENT_PRICE_REQUIRED: 'Captura el precio del boleto (o vincula un producto existente).',
  // Imagen / flyer.
  EVENT_IMAGE_INVALID: 'La imagen debe ser JPG, PNG o WebP de máximo 5 MB.',
  EVENT_NOT_FOUND: 'El evento ya no existe.',
};

/** Mensaje legible de un error de axios, traduciendo los códigos del módulo. */
export function eventErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    response?: { data?: { message?: unknown; code?: unknown; error?: unknown } };
  } | null;
  const data = e?.response?.data;
  const candidates = [data?.code, data?.error, data?.message]
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((v): v is string => typeof v === 'string');
  for (const c of candidates) {
    for (const code of Object.keys(EVENT_ERROR_LABEL)) {
      if (c === code || c.includes(code)) return EVENT_ERROR_LABEL[code];
    }
  }
  return apiErrorMessage(err, fallback, {
    forbidden: 'Tu rol no tiene permiso para esta acción en Eventos.',
    notFound: 'El evento ya no existe (o el API aún no expone esta función).',
  });
}
