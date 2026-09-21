// Lecturas ANÓNIMAS del API `/storefront/*` desde el servidor de Next (sitemap,
// y después el SSR de catálogo y detalle). Sin cookies ni Authorization: son
// respuestas públicas cacheables (Data Cache de Next con `revalidate` + tags).
//
// TOLERANCIA: `/storefront/*` se despliega en el API en un paso posterior. Mientras
// no exista (404), falle o tarde, estas funciones devuelven `null`/listas vacías
// y el llamador degrada (sitemap sin productos) en vez de romper el build.

import type { CountryCode } from '@/i18n/config';
import { toStorefrontQuery, type CatalogState } from './catalog-params';
import { normalizeDetailResponse, normalizeListResponse } from './normalize';
import { currencyForCountry } from './price';
import { CATALOG_TAG, productTag } from './revalidate-input';
import { isValidSlug } from './slug';
import { BoundedTtlMap } from './ttl-map';
import type {
  StorefrontCategory,
  StorefrontDetailResponse,
  StorefrontLang,
  StorefrontListResponse,
  StorefrontSitemapItem,
} from './types';

const DEFAULT_API_URL = 'http://localhost:3001/api/v1';
const FETCH_TIMEOUT_MS = 8000;
const SITEMAP_MAX_ITEMS = 5000;

export function storefrontApiBase(env: Record<string, string | undefined> = process.env): string {
  return (env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
}

interface FetchOptions {
  revalidate: number;
  tags: string[];
}

/** GET JSON tolerante: `null` ante red caída, timeout, estado != 2xx o JSON inválido. */
async function getJson(path: string, query: Record<string, string>, options: FetchOptions): Promise<unknown> {
  const url = `${storefrontApiBase()}${path}?${new URLSearchParams(query).toString()}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: options.revalidate, tags: options.tags },
    });
    if (!response.ok) return null;
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Acepta `[...]` o `{ data: [...] }` (según el endpoint). */
function rows(payload: unknown): Record<string, unknown>[] {
  const list = Array.isArray(payload) ? payload : isRecord(payload) ? payload.data : null;
  return Array.isArray(list) ? list.filter(isRecord) : [];
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Productos del candado de tienda del país (`GET /storefront/sitemap`). Vacío si aún no existe. */
export async function fetchStorefrontSitemap(country: CountryCode): Promise<StorefrontSitemapItem[]> {
  const payload = await getJson(
    '/storefront/sitemap',
    { country },
    { revalidate: 3600, tags: [CATALOG_TAG, `${CATALOG_TAG}:${country}`] },
  );
  const items: StorefrontSitemapItem[] = [];
  for (const row of rows(payload)) {
    const slug = str(row.slug);
    if (!slug) continue;
    items.push({ slug, updatedAt: str(row.updatedAt), imageUrl: str(row.imageUrl) });
    if (items.length >= SITEMAP_MAX_ITEMS) break;
  }
  return items;
}

/** Categorías con productos vendibles en el país (`GET /storefront/categories`). */
export async function fetchStorefrontCategories(
  country: CountryCode,
  lang: StorefrontLang = 'es',
): Promise<StorefrontCategory[]> {
  const payload = await getJson(
    '/storefront/categories',
    { country, lang },
    { revalidate: 3600, tags: [CATALOG_TAG, `${CATALOG_TAG}:${country}`] },
  );
  const categories: StorefrontCategory[] = [];
  for (const row of rows(payload)) {
    const slug = str(row.slug);
    const count = typeof row.count === 'number' ? row.count : Number(row.count);
    if (!slug || !Number.isFinite(count) || count <= 0) continue;
    categories.push({
      slug,
      name: str(row.name) ?? slug,
      description: str(row.description),
      imageUrl: str(row.imageUrl),
      count,
    });
  }
  return categories;
}

// ─── SSR de catálogo y detalle ───────────────────────────────────────────────
// A diferencia del sitemap (que degrada a vacío), aquí el llamador necesita
// distinguir 404 (notFound real) de una caída del API (error.tsx): se devuelve
// el estado HTTP en vez de tragarlo.

/** TTL de garantía del Data Cache (contrato, decisión 15). */
export const STOREFRONT_REVALIDATE_SECONDS = 120;

export type StorefrontFetch<T> =
  /** `fetchedAt` (ms) = cuando el servidor leyo la respuesta: siembra `initialDataUpdatedAt` en el cliente. */
  | { ok: true; data: T; fetchedAt: number }
  /** `status` = estado HTTP del API; `null` = sin respuesta (red, timeout, JSON inválido). */
  | { ok: false; status: number | null };

/** Estados que ameritan UN reintento corto: throttle del API (429) y fallos transitorios (5xx). */
const RETRYABLE_STATUSES: readonly number[] = [429, 500, 502, 503, 504];
const RETRY_MIN_MS = 250;
const RETRY_MAX_MS = 1500;
const RETRY_DEFAULT_429_MS = 700;
/** Un fallo de red que ya consumió este tiempo fue (casi seguro) un timeout: reintentar duplicaría la espera. */
const RETRY_NETWORK_BUDGET_MS = 2000;

/**
 * Espera antes del ÚNICO reintento, o `null` si no se reintenta. El SSR sale por
 * pocas IPs de Vercel y comparte la cuota del throttle del API (120/min en el
 * listado): un 429 es esperable bajo rastreo y casi siempre cede en < 1 s.
 * `Retry-After` se respeta, acotado: jamás se retiene el render más de 1.5 s.
 */
export function retryDelayMs(status: number | null, retryAfter: string | null, elapsedMs: number): number | null {
  if (status === null) return elapsedMs < RETRY_NETWORK_BUDGET_MS ? RETRY_MIN_MS : null;
  if (!RETRYABLE_STATUSES.includes(status)) return null;
  if (status !== 429) return RETRY_MIN_MS;
  const seconds = retryAfter && /^\d{1,4}$/.test(retryAfter.trim()) ? Number(retryAfter.trim()) : null;
  const wanted = seconds === null ? RETRY_DEFAULT_429_MS : seconds * 1000;
  return Math.min(RETRY_MAX_MS, Math.max(RETRY_MIN_MS, wanted));
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface StatusResponse {
  status: number | null;
  body: unknown;
  retryAfter: string | null;
}

async function getJsonOnce(url: string, options: FetchOptions): Promise<StatusResponse> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: options.revalidate, tags: options.tags },
    });
    if (!response.ok) return { status: response.status, body: null, retryAfter: response.headers.get('retry-after') };
    return { status: response.status, body: (await response.json()) as unknown, retryAfter: null };
  } catch {
    return { status: null, body: null, retryAfter: null };
  }
}

/** GET con estado HTTP y UN reintento corto ante 429/5xx/red (Next no guarda en el Data Cache respuestas != 2xx). */
async function getJsonWithStatus(
  path: string,
  query: Record<string, string>,
  options: FetchOptions,
): Promise<StatusResponse> {
  const url = `${storefrontApiBase()}${path}?${new URLSearchParams(query).toString()}`;
  const startedAt = Date.now();
  const first = await getJsonOnce(url, options);
  if (first.body !== null) return first;
  const delay = retryDelayMs(first.status, first.retryAfter, Date.now() - startedAt);
  if (delay === null) return first;
  await sleep(delay);
  return getJsonOnce(url, options);
}

/**
 * Las búsquedas libres (`q`) NO se piden en el servidor: van `noindex`, su espacio
 * de claves es ilimitado (no sirven al Data Cache) y cada una gastaría la cuota del
 * throttle del API que comparten TODOS los visitantes detrás de la IP de Vercel.
 * Las resuelve el navegador (`useQuery`, desde la IP del visitante).
 */
export function shouldFetchListOnServer(state: Pick<CatalogState, 'q'>): boolean {
  return !state.q;
}

/**
 * Página del catálogo, ANÓNIMA (precio público). Con `q` responde `{ ok:false,
 * status:null }` sin tocar el API (ver `shouldFetchListOnServer`).
 */
export async function fetchStorefrontList(
  country: CountryCode,
  lang: StorefrontLang,
  state: CatalogState,
): Promise<StorefrontFetch<StorefrontListResponse>> {
  if (!shouldFetchListOnServer(state)) return { ok: false, status: null };
  const { status, body } = await getJsonWithStatus(
    '/storefront/products',
    toStorefrontQuery(state, { country, lang }),
    { revalidate: STOREFRONT_REVALIDATE_SECONDS, tags: [CATALOG_TAG, `${CATALOG_TAG}:${country}`] },
  );
  const data = normalizeListResponse(body, currencyForCountry(country));
  return data ? { ok: true, data, fetchedAt: Date.now() } : { ok: false, status: body === null ? status : null };
}

// ─── Memoria corta de fallos del detalle (hallazgo L-3) ───────────────────────
// Cuando la página del detalle LANZA (429/5xx), Next la renderiza dos veces en la
// misma petición y `cache()` de React no deduplica entre esos renders: 2 llamadas
// (intento + reintento) se volvían 4 justo cuando el API ya estaba limitando. El
// fallo se recuerda unos segundos por país+slug en memoria del módulo: el segundo
// render (y cualquier visita inmediata al mismo producto) responde el MISMO estado
// sin tocar el API. Solo fallos transitorios (429, 5xx, sin respuesta): un 404 no se
// recuerda y un fallo recordado NUNCA se convierte en 404. Es memoria del proceso
// (cada instancia tiene la suya) y de tamaño acotado: optimización, no garantía.

export const DETAIL_FAILURE_MEMORY_MS = 5 * 1000;
/** Con `Retry-After` se recuerda lo que pide el API, acotado: la ficha nunca queda "caída" más de 15 s por esto. */
export const DETAIL_FAILURE_MEMORY_MAX_MS = 15 * 1000;
const DETAIL_FAILURE_MEMORY_ENTRIES = 500;
const detailFailures = new BoundedTtlMap<{ status: number | null }>(
  DETAIL_FAILURE_MEMORY_MS,
  DETAIL_FAILURE_MEMORY_ENTRIES,
);

/** Cuánto recordar el fallo, o `null` si no es transitorio (404, 400…: no se recuerda). */
export function detailFailureMemoryMs(status: number | null, retryAfter: string | null): number | null {
  if (status !== null && !RETRYABLE_STATUSES.includes(status)) return null;
  const seconds = status === 429 && retryAfter && /^\d{1,4}$/.test(retryAfter.trim()) ? Number(retryAfter.trim()) : null;
  if (seconds === null) return DETAIL_FAILURE_MEMORY_MS;
  return Math.min(DETAIL_FAILURE_MEMORY_MAX_MS, Math.max(DETAIL_FAILURE_MEMORY_MS, seconds * 1000));
}

/** Solo para pruebas. */
export function resetDetailFailureMemoryForTests(): void {
  detailFailures.clear();
}

/**
 * Detalle por slug, ANÓNIMO. Un slug con formato inválido responde 404 sin ir al
 * API (nunca 500). Respuesta discriminada: ok | moved | unavailable_in_country.
 */
export async function fetchStorefrontDetail(
  country: CountryCode,
  lang: StorefrontLang,
  slug: string,
): Promise<StorefrontFetch<StorefrontDetailResponse>> {
  if (!isValidSlug(slug)) return { ok: false, status: 404 };
  const memoryKey = `${country}:${slug}`;
  const remembered = detailFailures.get(memoryKey, Date.now());
  if (remembered) return { ok: false, status: remembered.status };

  const { status, body, retryAfter } = await getJsonWithStatus(
    `/storefront/products/${encodeURIComponent(slug)}`,
    { country, lang },
    { revalidate: STOREFRONT_REVALIDATE_SECONDS, tags: [CATALOG_TAG, productTag(slug)] },
  );
  if (body === null) {
    const rememberMs = detailFailureMemoryMs(status, retryAfter);
    if (rememberMs !== null) detailFailures.set(memoryKey, { status }, Date.now(), rememberMs);
    return { ok: false, status };
  }
  const data = normalizeDetailResponse(body, currencyForCountry(country));
  return data ? { ok: true, data, fetchedAt: Date.now() } : { ok: false, status: null };
}
