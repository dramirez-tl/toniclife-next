// fulfillment-error.ts — Mensajes en español de los errores `FUL_*` (contrato de rutas §2.17 / §6.3).
//
// El API responde `{ code, message (es), field?, details? }`. Aquí se lee
// `code` para DECIDIR (409 de versión, confirmación de país sin envío) y el
// texto sale de una tabla fija para que el aviso nunca sea genérico
// ("Request failed with status code 409"). Lógica pura: sin React ni axios.

import type { FulfillmentErrorBody } from '@/types/fulfillment';

type AxiosLikeError = {
  message?: unknown;
  response?: { status?: number; data?: unknown };
};

type Rec = Record<string, unknown>;

const rec = (value: unknown): Rec | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Rec) : null;

const GENERIC_MESSAGES = [
  'internal server error',
  'request failed',
  'network error',
  'bad request',
  'service unavailable',
  'conflict',
  'unprocessable entity',
  'forbidden',
];

export const FULFILLMENT_ERROR_LABELS: Record<string, string> = {
  FUL_VERSION_CONFLICT: 'Alguien más guardó cambios mientras editabas. Recarga para verlos y vuelve a hacer los tuyos.',
  FUL_COUNTRY_INVALID: 'Uno de los países ya no existe o está desactivado. Recarga la página.',
  FUL_BRANCH_INVALID: 'Una de las sucursales elegidas ya no existe. Recarga la página.',
  FUL_BRANCH_INACTIVE:
    'Una de las sucursales que quieres agregar o activar está desactivada. Actívala primero en Sucursales.',
  FUL_DUPLICATE_ROUTE: 'El mismo almacén aparece dos veces en la lista de un país.',
  FUL_TOO_MANY_ROUTES: 'Un país puede tener hasta 5 almacenes.',
  FUL_EMPTY_COUNTRY_CONFIRM_REQUIRED:
    'Con estos cambios un país se quedaría sin envío a domicilio. Revisa el resumen y confírmalo.',
  FUL_SETTING_INVALID: 'La opción elegida para "varios almacenes" no es válida.',
  FUL_NOTES_TOO_LONG: 'Las notas admiten hasta 300 caracteres.',
  FUL_PRODUCT_INVALID: 'Uno de los productos de la prueba no existe o no está activo.',
  FUL_USE_ROUTES_SCREEN: 'El almacén de envío ahora se configura en Almacenes y envíos.',
};

export interface ParsedFulfillmentError {
  status: number | null;
  code: string | null;
  message: string | null;
  field: string | null;
  details: unknown;
}

/** Busca el cuerpo `{ code, ... }` también cuando Nest lo anida en `message` o `error`. */
function findBody(data: unknown): FulfillmentErrorBody | null {
  const root = rec(data);
  if (!root) return null;
  if (typeof root.code === 'string') return root as FulfillmentErrorBody;
  for (const key of ['message', 'error', 'response']) {
    const nested = rec(root[key]);
    if (nested && typeof nested.code === 'string') return nested as FulfillmentErrorBody;
  }
  return null;
}

export function parseFulfillmentError(error: unknown): ParsedFulfillmentError {
  const err = (rec(error) ?? {}) as AxiosLikeError;
  const status = typeof err.response?.status === 'number' ? err.response.status : null;
  const data = err.response?.data;
  const body = findBody(data);
  const rawMessage = body?.message ?? rec(data)?.message;
  const message = Array.isArray(rawMessage)
    ? rawMessage.filter((m): m is string => typeof m === 'string').join(' ')
    : typeof rawMessage === 'string'
      ? rawMessage
      : null;
  return {
    status,
    code: typeof body?.code === 'string' ? body.code : null,
    message: message?.trim() ? message.trim() : null,
    field: typeof body?.field === 'string' ? body.field : null,
    details: body?.details ?? null,
  };
}

const isGeneric = (message: string) => {
  const lower = message.toLowerCase();
  return GENERIC_MESSAGES.some((g) => lower.startsWith(g)) || lower.includes('status code');
};

/** Texto para el usuario: tabla por código → mensaje del API (si no es genérico) → por estado HTTP. */
export function fulfillmentErrorMessage(error: unknown, fallback = 'No se pudo completar la acción.'): string {
  const parsed = parseFulfillmentError(error);
  if (parsed.code && FULFILLMENT_ERROR_LABELS[parsed.code]) return FULFILLMENT_ERROR_LABELS[parsed.code];
  if (parsed.message && !isGeneric(parsed.message)) return parsed.message;
  if (parsed.status === 403) return 'No tienes permiso para esta acción.';
  if (parsed.status === 404) return 'Esta función todavía no está disponible en el servidor.';
  if (parsed.status === null) return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  return fallback;
}

export function isVersionConflict(error: unknown): boolean {
  return parseFulfillmentError(error).code === 'FUL_VERSION_CONFLICT';
}

/**
 * Si el API pide confirmar países que se quedarían sin envío, devuelve sus
 * códigos (`details.countries`: string[] o [{ countryCode }]); si no, null.
 */
export function emptyCountriesToConfirm(error: unknown): string[] | null {
  const parsed = parseFulfillmentError(error);
  if (parsed.code !== 'FUL_EMPTY_COUNTRY_CONFIRM_REQUIRED') return null;
  const list = rec(parsed.details)?.countries;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => (typeof item === 'string' ? item : rec(item)?.countryCode))
    .filter((code): code is string => typeof code === 'string' && code.trim() !== '')
    .map((code) => code.trim().toUpperCase());
}
