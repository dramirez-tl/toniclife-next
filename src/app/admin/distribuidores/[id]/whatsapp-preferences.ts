// whatsapp-preferences.ts — lógica pura del bloque "WhatsApp" de la ficha del
// distribuidor (admin). Sin React: se prueba con vitest
// (`npx vitest run "src/app/admin/distribuidores/[id]"`).
//
// Columnas de customers (migs 130 y 175) tal como las expone el API:
//   whatsappOptOut / whatsappOptOutAt       baja TOTAL del canal (BAJA/STOP, botón
//                                           "No enviar nada" o Meta 131050)
//   whatsappMarketingOptIn (+At, +Source)   promociones: true = todo, false = solo
//                                           cuenta, null = nunca respondió
//   whatsappMarketingOptOutAt               cuándo pidió "solo mi cuenta"
//   whatsappUnreachableAt                   Meta 131026: el número no tiene WhatsApp
//                                           (es una marca de Meta, no una preferencia)
//   whatsappMarketingCappedUntil            Meta 131049: sin promociones hasta esa hora
//
// La preferencia la manda el API ya derivada en `whatsappMarketing` (misma regla
// que /distributor/preferences); si no viene (API viejo) se deriva aquí con el
// mismo contrato (spec §7): opt_out → 'none'; marketing_opt_out_at →
// 'account'; opt_in true → 'all'; null → 'unknown'.

import type { Customer, WhatsAppMarketingPreference } from '@/types/customer';

export type WhatsAppConsentFields = Pick<
  Customer,
  | 'whatsappMarketing'
  | 'whatsappOptOut'
  | 'whatsappOptOutAt'
  | 'whatsappMarketingOptIn'
  | 'whatsappMarketingOptInAt'
  | 'whatsappMarketingOptInSource'
  | 'whatsappMarketingOptOutAt'
  | 'whatsappUnreachableAt'
  | 'whatsappUnreachableCode'
  | 'whatsappMarketingCappedUntil'
>;

const PREFERENCES: readonly WhatsAppMarketingPreference[] = ['all', 'account', 'none', 'unknown'];

export const isWhatsAppPreference = (v: unknown): v is WhatsAppMarketingPreference =>
  typeof v === 'string' && (PREFERENCES as readonly string[]).includes(v);

export interface WhatsAppPreferenceOption {
  value: WhatsAppMarketingPreference;
  label: string;
  hint: string;
}

/** Opciones del Select de la ficha, en el orden del contrato del API. */
export const WHATSAPP_PREFERENCE_OPTIONS: readonly WhatsAppPreferenceOption[] = [
  {
    value: 'all',
    label: 'Todos los mensajes',
    hint: 'Avisos de su cuenta y promociones',
  },
  {
    value: 'account',
    label: 'Solo avisos de su cuenta',
    hint: 'Compras, puntos y cierre del periodo; sin promociones',
  },
  {
    value: 'none',
    label: 'No enviar nada (baja total)',
    hint: 'Ningún mensaje de Tonic Life por WhatsApp',
  },
  {
    value: 'unknown',
    label: 'Sin respuesta (restablecer)',
    hint: 'Como si nunca hubiera elegido: vuelve a recibir la pregunta',
  },
];

/** Fuentes previstas en la columna whatsapp_marketing_opt_in_source (mig 175). */
export const WHATSAPP_SOURCE_LABELS: Readonly<Record<string, string>> = {
  boton: 'Botón en WhatsApp',
  keyword: 'Palabra clave por WhatsApp (ALTA/BAJA)',
  pos: 'Alta en el POS',
  panel: 'Panel del distribuidor',
  formulario: 'Formulario de alta',
  admin: 'Administrador',
};

/** Variantes del Badge compartido que usa el estado. */
export type WhatsAppStatusTone = 'success' | 'info' | 'destructive' | 'warning' | 'outline';

export interface WhatsAppConsentView {
  /** Valor del Select: la preferencia tal como la lee el API. */
  preference: WhatsAppMarketingPreference;
  /** Estado que se muestra; incluye "Sin WhatsApp (131026)", que no es preferencia. */
  statusLabel: string;
  statusTone: WhatsAppStatusTone;
  /** Fuente de la última decisión (solo existe para 'all' y 'account'). */
  sourceLabel: string | null;
  /** Fecha ISO de la decisión mostrada (null si nunca respondió o no se conoce). */
  at: string | null;
  unreachableAt: string | null;
  /** Solo si la limitación de Meta (131049) sigue vigente. */
  cappedUntil: string | null;
  /** true cuando el API todavía no manda ningún campo de consentimiento. */
  dataMissing: boolean;
}

const STATUS: Record<WhatsAppMarketingPreference, { label: string; tone: WhatsAppStatusTone }> = {
  all: { label: 'Todos', tone: 'success' },
  account: { label: 'Solo cuenta', tone: 'info' },
  none: { label: 'Baja total', tone: 'destructive' },
  unknown: { label: 'Sin respuesta', tone: 'outline' },
};

export function preferenceLabel(value: WhatsAppMarketingPreference): string {
  return WHATSAPP_PREFERENCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Lectura derivada idéntica a la del API (la baja total manda). Respaldo para un API viejo. */
export function derivePreference(c: WhatsAppConsentFields): WhatsAppMarketingPreference {
  if (c.whatsappOptOut === true) return 'none';
  // opt_in=false siempre viene con opt_out_at (writer del API); se tolera sin fecha.
  if (c.whatsappMarketingOptOutAt || c.whatsappMarketingOptIn === false) return 'account';
  if (c.whatsappMarketingOptIn === true) return 'all';
  return 'unknown';
}

/** Preferencia vigente: la del API (`whatsappMarketing`) y, si no viene, la derivada. */
export function currentPreference(c: WhatsAppConsentFields): WhatsAppMarketingPreference {
  return isWhatsAppPreference(c.whatsappMarketing) ? c.whatsappMarketing : derivePreference(c);
}

export function sourceLabel(source: string | null | undefined): string | null {
  if (!source) return null;
  return WHATSAPP_SOURCE_LABELS[source] ?? source;
}

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** true si la limitación de Meta (131049) sigue vigente. */
export function isCappedNow(until: string | null | undefined, nowMs = Date.now()): boolean {
  const ms = parseMs(until);
  return ms !== null && ms > nowMs;
}

export function whatsappConsentView(
  c: WhatsAppConsentFields,
  nowMs = Date.now(),
): WhatsAppConsentView {
  const preference = currentPreference(c);
  const unreachableAt = c.whatsappUnreachableAt ?? null;
  const dataMissing =
    c.whatsappMarketing === undefined &&
    c.whatsappMarketingOptIn === undefined &&
    c.whatsappMarketingOptOutAt === undefined &&
    c.whatsappUnreachableAt === undefined;

  // La baja total se muestra aunque Meta haya marcado 131026: fue su decisión.
  const status =
    preference !== 'none' && unreachableAt
      ? { label: `Sin WhatsApp (${c.whatsappUnreachableCode || '131026'})`, tone: 'warning' as const }
      : STATUS[preference];

  let at: string | null = null;
  if (preference === 'all') at = c.whatsappMarketingOptInAt ?? null;
  else if (preference === 'account') at = c.whatsappMarketingOptOutAt ?? null;
  else if (preference === 'none') at = c.whatsappOptOutAt ?? null;

  const withSource = preference === 'all' || preference === 'account';

  return {
    preference,
    statusLabel: status.label,
    statusTone: status.tone,
    sourceLabel: withSource ? sourceLabel(c.whatsappMarketingOptInSource) : null,
    at,
    unreachableAt,
    cappedUntil: isCappedNow(c.whatsappMarketingCappedUntil, nowMs)
      ? (c.whatsappMarketingCappedUntil ?? null)
      : null,
    dataMissing,
  };
}

// Las fechas de negocio se muestran SIEMPRE en hora Centro (regla del workspace).
const CDMX = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "3 nov 2026, 17:30" en hora Centro; null si la fecha no es válida. */
export function formatCdmx(iso: string | null | undefined): string | null {
  const ms = parseMs(iso);
  return ms === null ? null : CDMX.format(ms);
}
