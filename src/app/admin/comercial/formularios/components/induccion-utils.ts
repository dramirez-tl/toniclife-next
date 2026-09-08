// induccion-utils.ts - Helpers compartidos del panel de campana del Taller de
// Induccion: fechas (siempre en CDMX), textos de estado de WhatsApp, errores
// del API y escape CSV con neutralizacion de formulas.

import type {
  InductionReminder,
  WhatsAppMessageStatus,
  WhatsAppTemplate,
  WhatsAppTemplateComponent,
} from '@/services/induction.service';

export const CDMX_TZ = 'America/Mexico_City';

export const WEEKDAY_LABELS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

export const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, value) => ({
  value,
  label: label.charAt(0).toUpperCase() + label.slice(1),
}));

// ---------------------------------------------------------------------------
// Fechas (YYYY-MM-DD como "fecha civil", sin desfaces de zona horaria)
// ---------------------------------------------------------------------------

/** Hoy en CDMX como YYYY-MM-DD. */
export function todayCdmx(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: CDMX_TZ });
}

/** YYYY-MM-DD -> Date local (mediodia, para que no cruce de dia). */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(ymd: string, days: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + days);
  return formatYmd(d);
}

export const isValidYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * Proximo <weekday> >= fecha de referencia (misma regla del API: si hoy es el
 * dia del taller, hoy).
 */
export function nextWorkshopDate(weekday: number, fromYmd = todayCdmx()): string {
  const d = parseYmd(fromYmd);
  const diff = (weekday - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return formatYmd(d);
}

/**
 * 'martes 8 de septiembre' (parametro {{2}} de la plantilla). Sin la coma que
 * mete V8 ('martes, 8 de septiembre') para que la vista previa coincida con
 * lo que manda el API (longDateEs).
 */
export function formatLongDateEs(ymd: string): string {
  if (!isValidYmd(ymd)) return ymd;
  return parseYmd(ymd)
    .toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    .replace(',', '');
}

/** 'martes 8 de septiembre de 2026'. */
export function formatLongDateYearEs(ymd: string): string {
  if (!isValidYmd(ymd)) return ymd;
  return parseYmd(ymd).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** '08 sep 2026'. */
export function formatShortDateEs(ymd?: string | null): string {
  if (!ymd || !isValidYmd(ymd.slice(0, 10))) return '-';
  return parseYmd(ymd.slice(0, 10)).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** ISO -> '08 sep 2026, 14:05' en CDMX. */
export function formatDateTimeCdmx(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-MX', {
    timeZone: CDMX_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 'HH:MM' (24 h) -> '8:00 p. m.' (parametro {{3}} de la plantilla). */
export function formatTime12(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
  if (!m) return hhmm;
  const h = Number(m[1]);
  const mm = m[2];
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${suffix}`;
}

export const isValidHhmm = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

// ---------------------------------------------------------------------------
// Telefonos de monitoreo (E.164 estricto, espejo de la validacion del API)
// ---------------------------------------------------------------------------

/**
 * '+' seguido de 11 a 15 digitos, sin espacios (espejo de MONITOR_PHONE_RE
 * del API). Minimo 11: el canal antepone la lada 52 a cualquier cadena de 10
 * digitos, asi que '+1234567890' saldria a otro numero.
 */
export const E164_RE = /^\+\d{11,15}$/;

export const isValidE164 = (s: string) => E164_RE.test(s);

/**
 * Lo tecleado/pegado ('+52 (477) 581-3450', '52 477...') -> '+524775813450'.
 * Solo digitos con '+' al frente; '' si no hay digitos (deja borrar).
 */
export function normalizeE164(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  return digits ? `+${digits.slice(0, 15)}` : '';
}

/** Solo digitos (numero de distribuidor del monitor). */
export const digitsOnly = (raw: string) => (raw || '').replace(/\D/g, '');

/** Primer nombre para {{1}}. */
export function firstName(fullName?: string | null): string {
  const n = (fullName || '').trim();
  if (!n) return '';
  return n.split(/\s+/)[0];
}

/** campaign_key del recordatorio: '<workshopDate>#rec-<weekday>-<HHMM>'. */
export function reminderKey(workshopDate: string, r: InductionReminder): string {
  return `${workshopDate}#rec-${r.weekday}-${(r.time || '').replace(':', '')}`;
}

/** Etiqueta corta de un recordatorio: 'Mié 14:00'. */
export function reminderLabel(r: InductionReminder): string {
  const wd = WEEKDAY_LABELS[r.weekday] ?? '?';
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1, 3)} ${r.time}`;
}

/** Fecha real (YYYY-MM-DD) en que cae un recordatorio para un taller dado. */
export function reminderDate(workshopDate: string, r: InductionReminder): string {
  // Los recordatorios caen dentro de la semana que termina en el taller.
  const w = parseYmd(workshopDate).getDay();
  const back = (w - r.weekday + 7) % 7;
  return addDays(workshopDate, -back);
}

// ---------------------------------------------------------------------------
// Plantillas de Meta
// ---------------------------------------------------------------------------

export const findComponent = (
  t: WhatsAppTemplate | undefined,
  type: string,
): WhatsAppTemplateComponent | undefined =>
  t?.components?.find((c) => (c.type || '').toUpperCase() === type);

/** Reemplaza {{1}}, {{2}}, ... por los parametros (los faltantes se dejan). */
export function resolveTemplateText(text: string, params: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (m, n) => {
    const v = params[Number(n) - 1];
    return v === undefined || v === '' ? m : v;
  });
}

/** Primer boton URL de la plantilla (o undefined). */
export function findUrlButton(t: WhatsAppTemplate | undefined) {
  const buttons = findComponent(t, 'BUTTONS')?.buttons ?? [];
  return buttons.find((b) => (b.type || '').toUpperCase() === 'URL');
}

/** URL a la que debe apuntar el boton para personalizar el enlace por persona. */
export const REQUIRED_BUTTON_URL = 'https://induccion.toniclife.com/?id={{1}}';

export const isApprovedTemplate = (t: WhatsAppTemplate) =>
  (t.status || '').toUpperCase() === 'APPROVED';

// ---------------------------------------------------------------------------
// Estados de WhatsApp (badges)
// ---------------------------------------------------------------------------

export interface StatusMeta {
  label: string;
  className: string;
}

export const STATUS_META: Record<WhatsAppMessageStatus, StatusMeta> = {
  queued: { label: 'En cola', className: 'bg-gray-100 text-gray-700' },
  accepted: { label: 'Aceptado', className: 'bg-sky-100 text-sky-700' },
  sent: { label: 'Enviado', className: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Entregado', className: 'bg-emerald-100 text-emerald-700' },
  read: { label: 'Leído', className: 'bg-emerald-200 text-emerald-900' },
  failed: { label: 'Falló', className: 'bg-red-100 text-red-700' },
  received: { label: 'Recibido', className: 'bg-violet-100 text-violet-700' },
};

export const statusMeta = (s?: string | null): StatusMeta =>
  (s && STATUS_META[s as WhatsAppMessageStatus]) || {
    label: s || 'Sin enviar',
    className: 'bg-gray-100 text-gray-500',
  };

/** Estados que cuentan como "invitacion vigente" (no se reenvia). */
export const LIVE_STATUSES: ReadonlySet<string> = new Set([
  'queued',
  'accepted',
  'sent',
  'delivered',
  'read',
]);

export const CAMPAIGN_KIND_LABELS: Record<string, string> = {
  manual: 'Manual',
  induccion_invitacion: 'Invitación',
  induccion_recordatorio: 'Recordatorio',
  induccion_monitor: 'Monitoreo',
  inbound: 'Entrante',
};

/** Copia corporativa de un envio de la campana (numeros de monitoreo). */
export const MONITOR_KIND = 'induccion_monitor';

export const KIT_LABELS: Record<string, string> = {
  basic: 'Básico',
  premium: 'Premium',
};

// ---------------------------------------------------------------------------
// Errores del API
// ---------------------------------------------------------------------------

export interface ApiErrorInfo {
  status?: number;
  message: string;
}

/**
 * Mensaje legible para un error de axios: 403 (sin permiso), 503 (funcion aun
 * no habilitada en el API: migraciones 130/131 o WhatsApp apagado) o el
 * mensaje del backend.
 */
export function apiErrorInfo(err: unknown, fallback: string): ApiErrorInfo {
  const e = err as {
    response?: { status?: number; data?: { message?: unknown } };
    message?: string;
  } | null;
  const status = e?.response?.status;
  const raw = e?.response?.data?.message;
  const backendMsg = Array.isArray(raw)
    ? String(raw[0] ?? '')
    : typeof raw === 'string'
      ? raw
      : '';
  if (status === 403) {
    return {
      status,
      message:
        'Tu rol no tiene acceso a la campaña de WhatsApp del taller. Pide a Sistemas que habilite el permiso Comercial.',
    };
  }
  if (status === 503) {
    return {
      status,
      message:
        backendMsg ||
        'La campaña de WhatsApp aún no está habilitada en el servidor (migraciones 130/131 o canal de WhatsApp apagado).',
    };
  }
  if (status === 404) {
    // Un 404 con mensaje es del negocio ('Cliente no encontrado'); solo el
    // 404 pelado (ruta inexistente) significa API sin desplegar.
    return {
      status,
      message:
        backendMsg ||
        'El API aún no expone la campaña del taller (despliegue pendiente).',
    };
  }
  return { status, message: backendMsg || e?.message || fallback };
}

export const apiErrorMessage = (err: unknown, fallback: string) =>
  apiErrorInfo(err, fallback).message;

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * Escape CSV + NEUTRALIZACION de formulas (CWE-1236): una celda que empiece
 * con = + - @ (o tab/CR) se ejecutaria como formula al abrir el CSV en Excel;
 * se antepone apostrofo para que Excel la trate como texto.
 */
export function csvCell(v: string | number | null | undefined): string {
  let s = (v ?? '').toString().replace(/[\r\n\t]/g, ' ');
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function downloadCsvFile(filename: string, lines: string[]): void {
  const blob = new Blob(['﻿' + lines.join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
