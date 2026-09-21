// Lógica PURA del merge del carrito de invitado (contrato ecommerce 6.4 C3). Sin React ni DOM.
//
// Tras un login/registro exitoso, si el navegador traía un `x-session-id` de invitado,
// se llama UNA vez a `POST /cart/merge`. Aquí vive: cuándo toca llamarlo, cómo se lee la
// respuesta (tolerante: el API de C3 se escribe en paralelo) y qué se le cuenta al usuario.
// Un API sin el endpoint (404/405) se ignora en silencio.

import { catalogErrorCode, catalogErrorStatus } from './errors';

/** Llave de `localStorage` con el `x-session-id` de invitado (la escribe `cart.service`). */
export const GUEST_SESSION_KEY = 'cart_session_id';
/** Llave de `localStorage`: `x-session-id` para el que YA se intentó el merge con esta sesión. */
export const MERGE_DONE_KEY = 'cart_merge_done_for';

/** Páginas donde se INICIA una sesión: ahí nunca se mezcla (el login puede revertirse) y se rearma el merge. */
const AUTH_ENTRY_PATHS = ['/login', '/registro', '/set-password', '/vincular-correo'] as const;

export function isAuthEntryPath(pathname: string | null | undefined): boolean {
  const path = pathname || '';
  return AUTH_ENTRY_PATHS.some((entry) => path === entry || path.startsWith(`${entry}/`));
}

export interface MergeViewerState {
  /** `auth.isInitialized`: antes de eso "sin sesión" no significa invitado. */
  authInitialized: boolean;
  /** Sesión de CLIENTE (usuario con `customerId`): el staff no tiene carrito web. */
  hasCustomerSession: boolean;
  pathname: string | null | undefined;
  /** `x-session-id` de invitado guardado en el navegador (`null` = nunca hubo carrito de invitado). */
  guestSessionId: string | null;
  /** Valor de `MERGE_DONE_KEY`. */
  mergedSessionId: string | null;
}

/**
 * - `merge`: hay sesión de cliente recién iniciada y un carrito de invitado sin mezclar.
 * - `rearm`: se olvida la marca para que el PRÓXIMO inicio de sesión vuelva a mezclar
 *   (en una página de acceso, o navegando como invitado con el mismo `x-session-id`).
 * - `none`: nada que hacer.
 */
export type MergeAction = 'merge' | 'rearm' | 'none';

export function mergeAction(state: MergeViewerState): MergeAction {
  if (!state.authInitialized) return 'none';
  const hasMark = !!state.mergedSessionId;
  if (isAuthEntryPath(state.pathname) || !state.hasCustomerSession) return hasMark ? 'rearm' : 'none';
  if (!state.guestSessionId || state.guestSessionId === state.mergedSessionId) return 'none';
  return 'merge';
}

// ---------------------------------------------------------------------------
// Respuesta de POST /cart/merge
// ---------------------------------------------------------------------------

export interface MergeLineNote {
  name: string;
  /** Piezas que traía el carrito de invitado (o la suma pedida), si el API lo dice. */
  requested: number | null;
  /** Piezas con las que quedó la línea, si el API lo dice. */
  quantity: number | null;
}

export type MergeSkipReason = 'country_mismatch';

export interface MergeSummary {
  /** `false` = el API dijo explícitamente que NO mezcló. */
  merged: boolean;
  skipReason: MergeSkipReason | null;
  /** Líneas recortadas (existencias o máximo por pedido). */
  adjusted: MergeLineNote[];
  /** Productos del carrito de invitado que no pasaron (sin precio en el país, no vendibles, agotados…). */
  rejected: MergeLineNote[];
}

export interface MergeResult<TCart> {
  /** Carrito resultante si la respuesta lo trae; `null` = hay que volver a pedirlo. */
  cart: TCart | null;
  summary: MergeSummary;
}

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Dict) : null;
}

function firstNumber(row: Dict, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.trunc(value);
  }
  return null;
}

function firstText(row: Dict, keys: readonly string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 120);
  }
  return '';
}

function lineNotes(value: unknown): MergeLineNote[] {
  if (!Array.isArray(value)) return [];
  const notes: MergeLineNote[] = [];
  for (const entry of value) {
    const row = asDict(entry);
    if (!row) continue;
    notes.push({
      name: firstText(row, ['productName', 'name', 'productCode', 'code']),
      requested: firstNumber(row, ['requestedQuantity', 'requested', 'fromQuantity']),
      quantity: firstNumber(row, ['quantity', 'finalQuantity', 'mergedQuantity', 'maxQuantity']),
    });
  }
  return notes.slice(0, 50);
}

function mentionsCountry(value: unknown): boolean {
  return typeof value === 'string' && /countr/i.test(value);
}

function looksLikeCart(value: Dict): boolean {
  return Array.isArray(value.items) && typeof value.id === 'string';
}

const EMPTY_SUMMARY: MergeSummary = { merged: true, skipReason: null, adjusted: [], rejected: [] };

/**
 * Lee la respuesta sin suponer una sola forma: `{ cart, merged, reason, adjusted, rejected }`,
 * el carrito con un bloque `merge`/`mergeSummary`, o el carrito a secas (sin resumen).
 */
export function normalizeMergeResponse<TCart>(data: unknown): MergeResult<TCart> {
  const root = asDict(data);
  if (!root) return { cart: null, summary: EMPTY_SUMMARY };

  const nestedCart = asDict(root.cart);
  const cart = nestedCart && looksLikeCart(nestedCart) ? nestedCart : looksLikeCart(root) ? root : null;
  const info = asDict(root.merge) ?? asDict(root.mergeSummary) ?? asDict(root.summary) ?? root;

  const skippedByCountry =
    mentionsCountry(info.reason) || mentionsCountry(info.skipReason) || mentionsCountry(info.skippedReason) || mentionsCountry(info.code);
  const merged = info.merged === false || skippedByCountry ? false : true;

  return {
    cart: cart as TCart | null,
    summary: {
      merged,
      skipReason: skippedByCountry ? 'country_mismatch' : null,
      adjusted: lineNotes(info.adjusted ?? info.adjustedItems ?? info.clamped),
      rejected: lineNotes(info.rejected ?? info.rejectedItems ?? info.skipped ?? info.skippedItems),
    },
  };
}

export function mergeHasNews(summary: MergeSummary): boolean {
  return summary.skipReason !== null || summary.adjusted.length > 0 || summary.rejected.length > 0;
}

// ---------------------------------------------------------------------------
// Errores de POST /cart/merge
// ---------------------------------------------------------------------------

/**
 * - `unsupported`: API sin el endpoint (404/405): silencio, y NO se marca como hecho.
 * - `country_mismatch`: el API respondió con error que el carrito de invitado es de otro país.
 * - `retry_later`: red, 401, 5xx…: silencio; se reintenta en la siguiente carga de página.
 */
export type MergeFailure = 'unsupported' | 'country_mismatch' | 'retry_later';

export function classifyMergeError(err: unknown): MergeFailure {
  const status = catalogErrorStatus(err);
  if (status === 404 || status === 405) return 'unsupported';
  const code = catalogErrorCode(err);
  if (code && /COUNTRY/.test(code) && (status === 409 || status === 422)) return 'country_mismatch';
  return 'retry_later';
}
