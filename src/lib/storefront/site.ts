// Identidad del sitio para SEO: URL base absoluta e interruptor de indexación.
// Funciones puras sobre un `env` inyectable (por defecto process.env) para poder
// probarlas sin tocar el entorno real.

type Env = Record<string, string | undefined>;

const LOCAL_FALLBACK = 'http://localhost:3000';

/** Imagen Open Graph por defecto (PNG 1200x630 en /public). */
export const OG_DEFAULT_IMAGE = '/images/og-default.png';
/** Placeholder de marca para productos sin imagen (PNG 800x800 en /public). */
export const PRODUCT_PLACEHOLDER_IMAGE = '/images/product-placeholder.png';

function normalizeOrigin(raw: string | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    return url.origin; // sin ruta, query ni "/" final
  } catch {
    return null;
  }
}

/**
 * Origen absoluto del sitio (sin "/" final).
 * 1. NEXT_PUBLIC_BASE_URL (obligatorio en Vercel; dominio canónico).
 * 2. Respaldo seguro en Vercel: dominio de producción del proyecto o, si no, el
 *    del despliegue. Evita que og:image / canonical apunten a localhost cuando
 *    la variable falta.
 * 3. localhost solo en desarrollo local.
 */
export function siteBaseUrl(env: Env = process.env): string {
  return (
    normalizeOrigin(env.NEXT_PUBLIC_BASE_URL) ??
    normalizeOrigin(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeOrigin(env.VERCEL_URL) ??
    LOCAL_FALLBACK
  );
}

/**
 * Indexación fail-closed (contrato, decisión 12): solo el proyecto de producción
 * define NEXT_PUBLIC_ALLOW_INDEXING=true. Staging, previews y local => noindex.
 * No se usa VERCEL_ENV: el proyecto de staging es "production" para Vercel.
 */
export function isIndexingAllowed(env: Env = process.env): boolean {
  return env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';
}

/** URL absoluta a partir de una ruta ("/es-mx/productos") o URL ya absoluta. */
export function absoluteUrl(pathOrUrl: string, env: Env = process.env): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${siteBaseUrl(env)}${path === '/' ? '' : path}`;
}
