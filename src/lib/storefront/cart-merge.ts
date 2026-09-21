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

interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues?: <T extends Uint8Array>(array: T) => T;
}

/**
 * `x-session-id` de un invitado NUEVO. Quien lo conoce puede leer, modificar y (con C3) absorber
 * ese carrito, así que debe ser impredecible: `crypto.randomUUID()`; sin él (contexto no seguro
 * o navegador viejo), 16 bytes de `crypto.getRandomValues`; y solo sin `crypto`, el formato
 * histórico. Los identificadores YA guardados en el navegador no se tocan. Cabe en `varchar(100)`.
 */
export function newGuestSessionId(
  cryptoApi: CryptoLike | null | undefined = (globalThis as { crypto?: CryptoLike }).crypto,
  now: () => number = Date.now,
): string {
  try {
    if (typeof cryptoApi?.randomUUID === 'function') return `guest_${cryptoApi.randomUUID()}`;
    if (typeof cryptoApi?.getRandomValues === 'function') {
      const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
      return `guest_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    }
  } catch {
    // Un `crypto` roto no debe impedir tener carrito: cae al respaldo.
  }
  return `guest_${now()}_${Math.random().toString(36).substring(2, 15)}`;
}

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
  /** Líneas del carrito de invitado que SÍ pasaron, si el API lo dice (`merge.addedLines`); `null` = sin dato. */
  addedLines: number | null;
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

const EMPTY_SUMMARY: MergeSummary = { merged: true, addedLines: null, skipReason: null, adjusted: [], rejected: [] };

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
      addedLines: firstNumber(info, ['addedLines']),
      skipReason: skippedByCountry ? 'country_mismatch' : null,
      adjusted: lineNotes(info.adjusted ?? info.adjustedItems ?? info.clamped),
      rejected: lineNotes(info.rejected ?? info.rejectedItems ?? info.skipped ?? info.skippedItems),
    },
  };
}

/** `true` = el API dijo que NINGUNA línea pasó (todas rechazadas): el aviso no puede decir "pasamos tu carrito". */
export function mergeMovedNothing(summary: MergeSummary): boolean {
  return summary.addedLines === 0;
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
 * - `not_applicable`: 403 `CART_MERGE_CUSTOMER_REQUIRED` (la sesión no es de cliente): silencio y
 *   se marca como hecho, para no repetirlo en cada carga.
 * - `retry_later`: red, 401, 5xx…: silencio; se reintenta en la siguiente carga de página.
 */
export type MergeFailure = 'unsupported' | 'country_mismatch' | 'not_applicable' | 'retry_later';

export function classifyMergeError(err: unknown): MergeFailure {
  const status = catalogErrorStatus(err);
  if (status === 404 || status === 405) return 'unsupported';
  const code = catalogErrorCode(err);
  if (status === 403 && code === 'CART_MERGE_CUSTOMER_REQUIRED') return 'not_applicable';
  if (code && /COUNTRY/.test(code) && (status === 409 || status === 422)) return 'country_mismatch';
  return 'retry_later';
}
