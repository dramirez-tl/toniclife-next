// Estado del catálogo en la URL (contrato, decisión 11). Claves estables en ambos
// idiomas: q, categoria, tipo, min, max, agotados, orden, pagina.
// Funciones puras: parsean lo que llegue (nunca lanzan) y serializan omitiendo
// los valores por defecto para que la URL canónica sea corta.

import type { StorefrontLang, StorefrontProductType } from './types';

export const CATALOG_SORTS = ['featured', 'newest', 'price_asc', 'price_desc', 'name_asc'] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_PAGE_SIZES = [12, 24, 48] as const;
export const DEFAULT_PAGE_SIZE = 24;

export interface CatalogState {
  q: string;
  categoria: string | null;
  tipo: StorefrontProductType | null;
  min: number | null;
  max: number | null;
  /** true = incluir agotados (availability=all). */
  agotados: boolean;
  orden: CatalogSort;
  pagina: number;
}

export const DEFAULT_CATALOG_STATE: CatalogState = {
  q: '',
  categoria: null,
  tipo: null,
  min: null,
  max: null,
  agotados: false,
  orden: 'featured',
  pagina: 1,
};

export type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

function read(params: RawSearchParams, key: string): string {
  if (!params) return '';
  if (params instanceof URLSearchParams) return (params.get(key) ?? '').trim();
  const value = params[key];
  return ((Array.isArray(value) ? value[0] : value) ?? '').trim();
}

const CATEGORY_SLUG_RE = /^[a-z0-9-]{1,120}$/;

/** Mismo tope que el API (`@Max(99_999_999)` en minPrice/maxPrice): pasarlo daría 400. */
export const CATALOG_PRICE_MAX = 99_999_999;
// Solo decimal simple ("1500", "1500.5", ".5"). Fuera: signo, notación científica
// ("1e12"), hexadecimal ("0x10"), "Infinity", separadores de miles y espacios internos.
const PRICE_RE = /^(?:\d{1,12}(?:\.\d{0,6})?|\.\d{1,6})$/;

/** Precio de la URL: `null` si no es un decimal simple >= 0; nunca lanza ni excede el tope del API. */
export function parsePrice(raw: string | null | undefined): number | null {
  const text = (raw ?? '').trim();
  if (!text || !PRICE_RE.test(text)) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(CATALOG_PRICE_MAX, Math.round(n * 100) / 100);
}

export function parseCatalogParams(params: RawSearchParams): CatalogState {
  const q = read(params, 'q').replace(/\s+/g, ' ').slice(0, 80);
  const categoriaRaw = read(params, 'categoria').toLowerCase();
  const tipoRaw = read(params, 'tipo').toLowerCase();
  const ordenRaw = read(params, 'orden').toLowerCase();
  const paginaRaw = Number.parseInt(read(params, 'pagina'), 10);
  const agotadosRaw = read(params, 'agotados').toLowerCase();

  let min = parsePrice(read(params, 'min'));
  let max = parsePrice(read(params, 'max'));
  // Rango invertido: se intercambia en vez de provocar un 400 del API.
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  return {
    q: q.length >= 2 ? q : '',
    categoria: CATEGORY_SLUG_RE.test(categoriaRaw) ? categoriaRaw : null,
    tipo: tipoRaw === 'product' || tipoRaw === 'pack' ? tipoRaw : null,
    min,
    max,
    agotados: agotadosRaw === '1' || agotadosRaw === 'true',
    orden: (CATALOG_SORTS as readonly string[]).includes(ordenRaw)
      ? (ordenRaw as CatalogSort)
      : 'featured',
    pagina: Number.isFinite(paginaRaw) && paginaRaw >= 1 ? Math.min(paginaRaw, 10_000) : 1,
  };
}

/** Query string SIN "?" (vacía si todo es default). Orden de claves fijo. */
export function serializeCatalogParams(state: Partial<CatalogState>): string {
  const s = { ...DEFAULT_CATALOG_STATE, ...state };
  const out = new URLSearchParams();
  if (s.q) out.set('q', s.q);
  if (s.categoria) out.set('categoria', s.categoria);
  if (s.tipo) out.set('tipo', s.tipo);
  if (s.min !== null) out.set('min', String(s.min));
  if (s.max !== null) out.set('max', String(s.max));
  if (s.agotados) out.set('agotados', '1');
  if (s.orden !== 'featured') out.set('orden', s.orden);
  if (s.pagina > 1) out.set('pagina', String(s.pagina));
  return out.toString();
}

/** Ruta + query del catálogo (sin locale): `/productos?categoria=cremas&pagina=2`. */
export function catalogHref(state: Partial<CatalogState> = {}): string {
  const qs = serializeCatalogParams(state);
  return qs ? `/productos?${qs}` : '/productos';
}

/**
 * Indexable solo sin filtros, o con `categoria` y/o `pagina`. Cualquier otra
 * combinación (q, tipo, min, max, agotados u orden distinto) => noindex,follow.
 */
export function isIndexable(state: CatalogState): boolean {
  return (
    !state.q &&
    !state.tipo &&
    state.min === null &&
    state.max === null &&
    !state.agotados &&
    state.orden === 'featured'
  );
}

/** Solo lo que forma parte de la URL canónica. */
export function canonicalCatalogState(
  state: Pick<CatalogState, 'categoria' | 'pagina'>,
): Partial<CatalogState> {
  return { categoria: state.categoria, pagina: state.pagina };
}

export function activeFilterCount(state: CatalogState): number {
  return (
    (state.categoria ? 1 : 0) +
    (state.tipo ? 1 : 0) +
    (state.min !== null || state.max !== null ? 1 : 0) +
    (state.agotados ? 1 : 0)
  );
}

/** Query de `GET /storefront/products` a partir del estado de la URL. */
export function toStorefrontQuery(
  state: CatalogState,
  ctx: { country: string; lang: StorefrontLang; pageSize?: number },
): Record<string, string> {
  const requested = ctx.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageSize = (CATALOG_PAGE_SIZES as readonly number[]).includes(requested)
    ? requested
    : DEFAULT_PAGE_SIZE;
  const query: Record<string, string> = {
    country: ctx.country.toUpperCase(),
    lang: ctx.lang,
    sort: state.orden,
    page: String(state.pagina),
    pageSize: String(pageSize),
    availability: state.agotados ? 'all' : 'in_stock',
  };
  if (state.q) query.q = state.q;
  if (state.categoria) query.category = state.categoria;
  if (state.tipo) query.type = state.tipo;
  if (state.min !== null) query.minPrice = String(state.min);
  if (state.max !== null) query.maxPrice = String(state.max);
  return query;
}

/** 1 … 4 [5] 6 … 12 (siempre primera, última y vecinas de la actual). */
export function pageWindow(current: number, totalPages: number): (number | 'gap')[] {
  const pages = new Set<number>([1, totalPages, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push('gap');
    out.push(page);
  });
  return out;
}
