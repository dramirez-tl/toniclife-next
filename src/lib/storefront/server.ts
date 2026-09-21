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
import { isValidSlug } from './slug';
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
    { revalidate: 3600, tags: ['catalog', `catalog:${country}`] },
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
    { revalidate: 3600, tags: ['catalog', `catalog:${country}`] },
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

async function getJsonWithStatus(
  path: string,
  query: Record<string, string>,
  options: FetchOptions | 'no-store',
): Promise<{ status: number | null; body: unknown }> {
  const url = `${storefrontApiBase()}${path}?${new URLSearchParams(query).toString()}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      ...(options === 'no-store'
        ? { cache: 'no-store' as const }
        : { next: { revalidate: options.revalidate, tags: options.tags } }),
    });
    if (!response.ok) return { status: response.status, body: null };
    return { status: response.status, body: (await response.json()) as unknown };
  } catch {
    return { status: null, body: null };
  }
}

/**
 * Página del catálogo, ANÓNIMA (precio público). Las búsquedas libres (`q`) no se
 * guardan en el Data Cache: su espacio de claves es ilimitado.
 */
export async function fetchStorefrontList(
  country: CountryCode,
  lang: StorefrontLang,
  state: CatalogState,
): Promise<StorefrontFetch<StorefrontListResponse>> {
  const { status, body } = await getJsonWithStatus(
    '/storefront/products',
    toStorefrontQuery(state, { country, lang }),
    state.q
      ? 'no-store'
      : { revalidate: STOREFRONT_REVALIDATE_SECONDS, tags: ['catalog', `catalog:${country}`] },
  );
  const data = normalizeListResponse(body, currencyForCountry(country));
  return data ? { ok: true, data, fetchedAt: Date.now() } : { ok: false, status: body === null ? status : null };
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
  const { status, body } = await getJsonWithStatus(
    `/storefront/products/${encodeURIComponent(slug)}`,
    { country, lang },
    { revalidate: STOREFRONT_REVALIDATE_SECONDS, tags: ['catalog', `product:${slug}`] },
  );
  const data = normalizeDetailResponse(body, currencyForCountry(country));
  return data ? { ok: true, data, fetchedAt: Date.now() } : { ok: false, status: body === null ? status : null };
}
