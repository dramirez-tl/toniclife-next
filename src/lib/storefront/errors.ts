// Errores de la tienda (contrato, decisión 16): el API responde
// `{ code, message (es), field?, details? }` con prefijos STF_ (tienda), CART_ y
// PRD_. El front DECIDE por `code` y usa `message` solo como texto. Patrón de
// `src/lib/billing-error.ts`. Nunca un toast genérico si hay algo mejor que decir.

export interface CatalogErrorBody {
  statusCode?: number;
  code?: string;
  message?: string | string[];
  field?: string;
  details?: Record<string, unknown>;
}

type AxiosLikeError = {
  message?: unknown;
  response?: { status?: number; data?: unknown };
};

function bodyOf(err: unknown): CatalogErrorBody | null {
  const data = (err as AxiosLikeError | null | undefined)?.response?.data;
  return typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as CatalogErrorBody) : null;
}

/** Código estable del error (`STF_PRODUCT_NOT_FOUND`, `CART_QTY_EXCEEDS_STOCK`…) o `null`. */
export function catalogErrorCode(err: unknown): string | null {
  const code = bodyOf(err)?.code;
  return typeof code === 'string' && /^[A-Z][A-Z0-9_]{2,60}$/.test(code) ? code : null;
}

export function catalogErrorStatus(err: unknown): number | null {
  const status = (err as AxiosLikeError | null | undefined)?.response?.status;
  return typeof status === 'number' ? status : null;
}

export function catalogErrorDetails(err: unknown): Record<string, unknown> {
  const details = bodyOf(err)?.details;
  return typeof details === 'object' && details !== null ? details : {};
}

const GENERIC_MESSAGES = [
  'internal server error',
  'request failed',
  'network error',
  'bad request',
  'not found',
  'service unavailable',
  'cannot get',
];

function apiMessage(err: unknown): string | null {
  const raw = bodyOf(err)?.message;
  const text = (Array.isArray(raw) ? raw.join(', ') : raw ?? '').trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  return GENERIC_MESSAGES.some((generic) => lower.startsWith(generic)) ? null : text;
}

export interface CatalogErrorMessageOptions {
  /**
   * Texto por código ya traducido al idioma de la UI (p. ej. desde
   * `storefront.errors.*`). Tiene prioridad sobre el mensaje del API.
   */
  byCode?: Partial<Record<string, string>>;
  /**
   * El `message` del API viene en español: solo se usa cuando la UI está en
   * español (en inglés se prefiere el respaldo traducido).
   */
  useApiMessage?: boolean;
}

/** Mensaje para el visitante: por código → mensaje del API (es) → respaldo. */
export function catalogErrorMessage(
  err: unknown,
  fallback: string,
  options: CatalogErrorMessageOptions = {},
): string {
  const code = catalogErrorCode(err);
  const translated = code ? options.byCode?.[code] : undefined;
  if (translated) return translated;
  if (options.useApiMessage !== false) {
    const message = apiMessage(err);
    if (message) return message;
  }
  return fallback;
}

/** Fallo del API de tienda en el SERVIDOR de Next (lo captura `error.tsx`). */
export class StorefrontUnavailableError extends Error {
  readonly status: number | null;

  constructor(resource: string, status: number | null) {
    super(`Storefront API no disponible (${resource}, estado ${status ?? 'sin respuesta'})`);
    this.name = 'StorefrontUnavailableError';
    this.status = status;
  }
}
