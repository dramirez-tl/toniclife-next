// carriers.ts — Paqueterías por país de la tienda (lógica PURA, mig 200).
//
// El catálogo vive en el API (`/fulfillment/carriers`): por país de la tienda (México
// incluye Frontera), con su enlace de rastreo, cuál es la predeterminada y si está
// activa. No hay borrado: se desactiva para conservar el historial. La entrega sigue
// guardando solo el NOMBRE de la paquetería; este catálogo da las opciones.
//
// Aquí vive lo que se puede probar sin pantalla: leer la respuesta (también la de un
// API que aún no tiene la migración), ordenar, validar el formulario con las mismas
// reglas del API (`fulfillment/lib/carriers.lib.ts`, para avisar ANTES de guardar) y
// armar el cuerpo de cada cambio. El API sigue siendo la autoridad.

import type {
  Carrier,
  CarrierIntegration,
  CarriersResponse,
  CreateCarrierPayload,
  UpdateCarrierPayload,
} from '@/types/fulfillment';

/** Marcador que se sustituye por el número de guía. */
export const TRACKING_PLACEHOLDER = '{guia}';
/** Guía de muestra para enseñar cómo queda el enlace. */
export const TRACKING_EXAMPLE_NUMBER = '123456789012';
/** Enlace de muestra para el formulario. */
export const TRACKING_EXAMPLE_TEMPLATE = 'https://www.fedex.com/fedextrack/?trknbr={guia}';

export const CARRIER_NAME_MAX = 100;
export const CARRIER_TRACKING_MAX = 500;
export const CARRIER_NOTES_MAX = 300;

// ===== respuesta del API =====

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function carrierFrom(raw: unknown): Carrier | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const id = text(row.id);
  const name = text(row.name);
  if (!id || !name) return null;
  const integration: CarrierIntegration = row.integration === 'fedex' ? 'fedex' : 'none';
  const sortOrder = Number(row.sortOrder);
  return {
    id,
    countryCode: (text(row.countryCode) ?? '').toUpperCase(),
    name,
    trackingUrlTemplate: text(row.trackingUrlTemplate),
    integration,
    isDefault: row.isDefault === true,
    // Solo un `false` expreso la da por inactiva.
    isActive: row.isActive !== false,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    notes: text(row.notes),
    updatedAt: text(row.updatedAt),
  };
}

/**
 * Lee `{ schemaReady, carriers }`. Tolera la lista suelta y lo que no sea una
 * paquetería; `schemaReady` solo es `false` si el API lo dice expresamente
 * (= falta aplicar la migración 200: lista vacía y no se puede guardar).
 */
export function normalizeCarriersResponse(raw: unknown): CarriersResponse {
  const body = typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const list = Array.isArray(raw) ? raw : Array.isArray(body?.carriers) ? (body.carriers as unknown[]) : [];
  const seen = new Set<string>();
  const carriers: Carrier[] = [];
  for (const item of list) {
    const carrier = carrierFrom(item);
    if (!carrier || seen.has(carrier.id)) continue;
    seen.add(carrier.id);
    carriers.push(carrier);
  }
  return { schemaReady: body?.schemaReady !== false, carriers };
}

// ===== lista =====

/**
 * Clave para comparar nombres como los escribe la gente: "Fed Ex", "FEDEX" y "FedEx"
 * son la misma (solo letras y dígitos, sin acentos, en minúsculas). Igual que el API.
 */
export function carrierKey(name: string | null | undefined): string {
  return (name ?? '')
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Activas primero; entre ellas la predeterminada arriba y luego el orden del catálogo y el nombre. */
export function sortCarriers(carriers: readonly Carrier[]): Carrier[] {
  return [...carriers].sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) ||
      Number(b.isDefault) - Number(a.isDefault) ||
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
  );
}

/** Paqueterías de un país de la tienda (el API ya filtra con `?country=`; esto cubre la lista completa). */
export function carriersOfCountry(carriers: readonly Carrier[], countryCode: string): Carrier[] {
  const code = countryCode.trim().toUpperCase();
  return carriers.filter((c) => c.countryCode === code);
}

export interface CarriersSummary {
  active: number;
  inactive: number;
  /** Nombre de la predeterminada (activa) o `null` si no hay. */
  defaultName: string | null;
}

export function carriersSummary(carriers: readonly Carrier[]): CarriersSummary {
  const active = carriers.filter((c) => c.isActive);
  return {
    active: active.length,
    inactive: carriers.length - active.length,
    defaultName: active.find((c) => c.isDefault)?.name ?? null,
  };
}

// ===== enlace de rastreo =====

/** `{GUIA}`, `{ guía }`… se aceptan y se guardan como `{guia}`; sin espacios en los bordes. */
export function normalizeTrackingTemplate(value: string): string {
  return value.trim().replace(/\{\s*gu[ií]a\s*\}/gi, TRACKING_PLACEHOLDER);
}

/** Cómo queda el enlace con una guía (por defecto, una de muestra); `null` si no hay enlace o no lleva `{guia}`. */
export function trackingUrlExample(template: string | null | undefined, guia = TRACKING_EXAMPLE_NUMBER): string | null {
  const clean = normalizeTrackingTemplate(template ?? '');
  if (!clean || !clean.includes(TRACKING_PLACEHOLDER)) return null;
  return clean.split(TRACKING_PLACEHOLDER).join(encodeURIComponent(guia.trim()));
}

// ===== formulario =====

export interface CarrierFormValues {
  name: string;
  trackingUrlTemplate: string;
  isDefault: boolean;
  notes: string;
}

export const EMPTY_CARRIER_FORM: CarrierFormValues = {
  name: '',
  trackingUrlTemplate: '',
  isDefault: false,
  notes: '',
};

export function carrierFormValues(carrier: Carrier): CarrierFormValues {
  return {
    name: carrier.name,
    trackingUrlTemplate: carrier.trackingUrlTemplate ?? '',
    isDefault: carrier.isDefault,
    notes: carrier.notes ?? '',
  };
}

export type CarrierFormField = 'name' | 'trackingUrlTemplate' | 'notes';
export type CarrierFormErrors = Partial<Record<CarrierFormField, string>>;

/** Nombre como se guarda: sin espacios de sobra. */
export const cleanCarrierName = (value: string): string => value.replace(/\s+/g, ' ').trim();

/**
 * Lo mismo que revisa el API, dicho antes de guardar:
 *  - nombre obligatorio y sin repetir entre las ACTIVAS del país ("Fed Ex" = "FEDEX").
 *    Al editar una inactiva no se revisa: el choque, si lo hay, lo dice el API al reactivarla;
 *  - el enlace es opcional; si viene, empieza con http(s)://, no lleva espacios y trae `{guia}`.
 * `others` = paqueterías del MISMO país; `editing` = la que se edita (se excluye).
 */
export function validateCarrierForm(
  values: CarrierFormValues,
  others: readonly Carrier[],
  editing?: Pick<Carrier, 'id' | 'isActive'> | null,
): CarrierFormErrors {
  const errors: CarrierFormErrors = {};

  const name = cleanCarrierName(values.name);
  if (!name) errors.name = 'Escribe el nombre de la paquetería.';
  else if (name.length > CARRIER_NAME_MAX) errors.name = `El nombre admite hasta ${CARRIER_NAME_MAX} caracteres.`;
  else if (!carrierKey(name)) errors.name = 'El nombre debe llevar letras o números.';
  else if (
    editing?.isActive !== false &&
    others.some((c) => c.isActive && c.id !== editing?.id && carrierKey(c.name) === carrierKey(name))
  ) {
    errors.name = 'Ya hay una paquetería activa con ese nombre en este país.';
  }

  const template = normalizeTrackingTemplate(values.trackingUrlTemplate);
  if (template) {
    if (template.length > CARRIER_TRACKING_MAX) {
      errors.trackingUrlTemplate = `El enlace admite hasta ${CARRIER_TRACKING_MAX} caracteres.`;
    } else if (!/^https?:\/\/[^\s]+$/i.test(template)) {
      errors.trackingUrlTemplate = 'El enlace debe empezar con https:// (o http://) y no llevar espacios.';
    } else if (!template.includes(TRACKING_PLACEHOLDER)) {
      errors.trackingUrlTemplate = `Falta ${TRACKING_PLACEHOLDER}: escríbelo en el lugar del enlace donde va el número de guía.`;
    }
  }

  if (values.notes.trim().length > CARRIER_NOTES_MAX) {
    errors.notes = `Las notas admiten hasta ${CARRIER_NOTES_MAX} caracteres.`;
  }
  return errors;
}

export const hasCarrierFormErrors = (errors: CarrierFormErrors): boolean => Object.keys(errors).length > 0;

// ===== cuerpos de guardado =====

const orNull = (value: string): string | null => {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean ? clean : null;
};

export function buildCreateCarrierPayload(countryCode: string, values: CarrierFormValues): CreateCarrierPayload {
  const template = normalizeTrackingTemplate(values.trackingUrlTemplate);
  const notes = orNull(values.notes);
  return {
    countryCode: countryCode.trim().toUpperCase(),
    name: cleanCarrierName(values.name),
    ...(template ? { trackingUrlTemplate: template } : {}),
    ...(values.isDefault ? { isDefault: true } : {}),
    ...(notes ? { notes } : {}),
  };
}

/** Solo lo que cambió respecto de lo guardado (un cuerpo vacío = nada que guardar). */
export function buildUpdateCarrierPayload(original: Carrier, values: CarrierFormValues): UpdateCarrierPayload {
  const payload: UpdateCarrierPayload = {};
  const name = cleanCarrierName(values.name);
  if (name !== original.name) payload.name = name;
  const template = normalizeTrackingTemplate(values.trackingUrlTemplate) || null;
  if (template !== (original.trackingUrlTemplate ?? null)) payload.trackingUrlTemplate = template;
  if (values.isDefault !== original.isDefault) payload.isDefault = values.isDefault;
  const notes = orNull(values.notes);
  if (notes !== (original.notes ?? null)) payload.notes = notes;
  return payload;
}

export const isEmptyCarrierPayload = (payload: UpdateCarrierPayload): boolean => Object.keys(payload).length === 0;
