// network-error.ts — Errores `NET_*` de "Mi red" (contrato /distribuidor/red
// §4.3). El API responde `{ statusCode, code, message (es), details? }` con el
// mismo cuerpo uniforme de kits/fulfillment; aquí se lee `code` para DECIDIR y
// se devuelve la CLAVE i18n (relativa a `distributor.network`) para que el
// texto salga traducido (ES/EN) y nunca genérico ("Request failed with status
// code 429"). Lógica pura: sin React ni axios.
//
// Reglas del contrato:
// - Todo 429 sin `code` (throttler de Nest, 6 arranques/min) ⇒ "ocupado"
//   (`exportPanel.busyGlobal`), igual que NET_EXPORT_QUEUE_FULL / DISK_FULL.
// - Un 404 sin `code` al sondear un job ⇒ el servidor se reinició o el job
//   expiró (`exportPanel.phase.interrupted`; quien tiene `startedAt` afina
//   entre interrupted/expired con reconnectDecision de export-job.ts).

type AxiosLikeError = {
  message?: unknown;
  code?: unknown;
  response?: { status?: number; data?: unknown; headers?: unknown };
};

type Rec = Record<string, unknown>;

const rec = (value: unknown): Rec | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Rec) : null;

export type NetErrorCode =
  | 'NET_NOT_IN_NETWORK'
  | 'NET_PERIOD_NOT_FOUND'
  | 'NET_PARENTS_LIMIT'
  | 'NET_EXPORT_JOB_NOT_FOUND'
  | 'NET_EXPORT_NOT_READY'
  | 'NET_EXPORT_QUEUE_FULL'
  | 'NET_EXPORT_DISK_FULL'
  | 'NET_EXPORT_TOO_LARGE'
  | 'NET_EXPORT_NOT_CANCELLABLE';

/** Clave i18n (bajo `distributor.network`) por código NET_*. */
export const NETWORK_ERROR_KEYS: Record<NetErrorCode, string> = {
  NET_NOT_IN_NETWORK: 'errors.notInNetwork',
  NET_PERIOD_NOT_FOUND: 'errors.periodNotFound',
  NET_PARENTS_LIMIT: 'errors.parentsLimit',
  NET_EXPORT_JOB_NOT_FOUND: 'exportPanel.phase.interrupted',
  NET_EXPORT_NOT_READY: 'errors.notReady',
  NET_EXPORT_QUEUE_FULL: 'exportPanel.busyGlobal',
  NET_EXPORT_DISK_FULL: 'exportPanel.busyGlobal',
  NET_EXPORT_TOO_LARGE: 'exportPanel.tooLarge',
  NET_EXPORT_NOT_CANCELLABLE: 'errors.notCancellable',
};

export const NETWORK_ERROR_GENERIC_KEY = 'errors.generic';
export const NETWORK_ERROR_UNREACHABLE_KEY = 'errors.unreachable';
export const NETWORK_ERROR_BUSY_KEY = 'exportPanel.busyGlobal';
export const NETWORK_ERROR_INTERRUPTED_KEY = 'exportPanel.phase.interrupted';

export interface ParsedNetworkError {
  /** HTTP; null sin respuesta (red caída, CORS, timeout). */
  status: number | null;
  code: string | null;
  message: string | null;
  details: unknown;
  /** Header Retry-After en segundos (429 propios del export), si viene. */
  retryAfterS: number | null;
}

/** Busca el cuerpo `{ code, ... }` también cuando Nest lo anida en `message` o `error`. */
function findBody(data: unknown): Rec | null {
  const root = rec(data);
  if (!root) return null;
  if (typeof root.code === 'string') return root;
  for (const key of ['message', 'error', 'response']) {
    const nested = rec(root[key]);
    if (nested && typeof nested.code === 'string') return nested;
  }
  return null;
}

function readRetryAfter(headers: unknown): number | null {
  const h = rec(headers);
  if (!h) return null;
  const raw = h['retry-after'] ?? h['Retry-After'];
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseNetworkError(error: unknown): ParsedNetworkError {
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
    details: body?.details ?? null,
    retryAfterS: readRetryAfter(err.response?.headers),
  };
}

export function isNetworkErrorCode(error: unknown, code: NetErrorCode): boolean {
  return parseNetworkError(error).code === code;
}

export function isHttpStatus(error: unknown, status: number): boolean {
  return parseNetworkError(error).status === status;
}

/** ¿No hubo respuesta del servidor (red caída, timeout, CORS)? */
export function isUnreachable(error: unknown): boolean {
  return parseNetworkError(error).status === null;
}

/**
 * Clave i18n (relativa a `distributor.network`) para mostrar el error:
 * tabla por `code` → 429 = ocupado → 404 = interrumpido → sin respuesta =
 * inalcanzable → genérico.
 */
export function networkErrorKey(error: unknown): string {
  const parsed = parseNetworkError(error);
  if (parsed.code && parsed.code in NETWORK_ERROR_KEYS) {
    return NETWORK_ERROR_KEYS[parsed.code as NetErrorCode];
  }
  if (parsed.status === 429) return NETWORK_ERROR_BUSY_KEY;
  if (parsed.status === 404) return NETWORK_ERROR_INTERRUPTED_KEY;
  if (parsed.status === null) return NETWORK_ERROR_UNREACHABLE_KEY;
  return NETWORK_ERROR_GENERIC_KEY;
}
