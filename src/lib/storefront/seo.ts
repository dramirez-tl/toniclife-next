// SEO de la tienda: locales listos, canonical y hreflang propios.
// next-intl ya NO anuncia alternates (routing.alternateLinks=false) porque su
// cabecera `Link` incluía países sin precios (CO/GT). Aquí solo salen los locales
// cuyo país está `ready` y, en el detalle, solo países donde el producto se vende.

import {
  COUNTRIES,
  DEFAULT_LOCALE,
  LANGUAGES,
  buildLocale,
  parseLocale,
  type CountryCode,
} from '@/i18n/config';
import {
  canonicalCatalogState,
  serializeCatalogParams,
  type CatalogState,
} from './catalog-params';
import { absoluteUrl } from './site';

type Env = Record<string, string | undefined>;

/** Países con tienda abierta (precios cargados). CO/GT = "Muy pronto". */
export function readyCountries(): CountryCode[] {
  return COUNTRIES.filter((c) => c.ready).map((c) => c.code);
}

/** Locales indexables: idioma × país listo (hoy es-mx, en-mx, es-us, en-us). */
export function readyLocales(): string[] {
  return COUNTRIES.filter((c) => c.ready).flatMap((c) =>
    LANGUAGES.map((l) => buildLocale(l.code, c.code)),
  );
}

export function isReadyLocale(locale: string): boolean {
  return readyLocales().includes(locale);
}

/** 'es-mx' → 'es-MX' (formato BCP 47 que espera hreflang). */
export function hreflangFor(locale: string): string {
  const { lang, country } = parseLocale(locale);
  return `${lang}-${country}`;
}

/** 'es-mx' → 'es_MX' (formato de og:locale). */
export function ogLocaleFor(locale: string): string {
  const { lang, country } = parseLocale(locale);
  return `${lang}_${country}`;
}

/** Ruta con prefijo de locale: ('en-us', '/productos') → '/en-us/productos'. */
export function localizedPath(locale: string, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

/**
 * URL canónica absoluta. Con `state` (catálogo) solo conserva `categoria` y
 * `pagina`: búsquedas, rangos de precio y órdenes no generan canónicas propias.
 */
export function canonicalFor(
  locale: string,
  path: string,
  state?: Pick<CatalogState, 'categoria' | 'pagina'> | null,
  env: Env = process.env,
): string {
  const qs = state ? serializeCatalogParams(canonicalCatalogState(state)) : '';
  const url = absoluteUrl(localizedPath(locale, path), env);
  return qs ? `${url}?${qs}` : url;
}

export interface AlternatesInput {
  /** Ruta sin locale: '/', '/productos', '/productos/<slug>'. */
  path: string;
  /** Estado del catálogo: solo `categoria` y `pagina` viajan a los alternates. */
  state?: Pick<CatalogState, 'categoria' | 'pagina'> | null;
  /**
   * ISO2 de los países donde el recurso existe (detalle de producto). Sin valor
   * = todos los países listos. Países no listos se ignoran aunque vengan.
   */
  sellableCountries?: readonly string[] | null;
}

/**
 * Mapa hreflang → URL absoluta. `x-default` = es-mx; si el recurso no existe en
 * México, el primer locale disponible. Vacío si no se vende en ningún país listo.
 */
export function buildAlternates(
  input: AlternatesInput,
  env: Env = process.env,
): Record<string, string> {
  const sellable = input.sellableCountries
    ? new Set(input.sellableCountries.map((c) => c.toUpperCase()))
    : null;
  const locales = readyLocales().filter(
    (locale) => !sellable || sellable.has(parseLocale(locale).country),
  );
  if (locales.length === 0) return {};

  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[hreflangFor(locale)] = canonicalFor(locale, input.path, input.state, env);
  }
  const xDefault = locales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : locales[0];
  languages['x-default'] = canonicalFor(xDefault, input.path, input.state, env);
  return languages;
}

/** Recorta en límite de palabra y añade "…"; el resultado nunca excede `max`. */
export function truncate(text: string | null | undefined, max: number): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (max <= 0) return '';
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.replace(/[\s.,;:–—-]+$/u, '')}…`;
}
