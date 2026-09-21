// Slug canónico de producto `codigo-nombre`. Gemela de lectura de
// `toniclife-api/src/modules/products/lib/slug.lib.ts` (contrato 5.1): el slug se
// GENERA solo en el API; aquí se valida y se interpreta (p. ej. para responder
// 404 sin ir al servidor o para sugerir el slug en el admin).

const MAX_SLUG_LENGTH = 250;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DIACRITICS_RE = /[\u0300-\u036f]/g;

/** NFD sin diacríticos (ñ→n), minúsculas, no alfanumérico → "-", sin guiones en los bordes, máx. 250. */
export function slugify(text: string | null | undefined): string {
  const base = (text ?? '')
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
}

/** Convención de la carga masiva: `codigo-nombre`. */
export function buildProductSlug(code: string, name: string): string {
  return slugify(`${code} ${name}`);
}

export function isValidSlug(slug: string | null | undefined): slug is string {
  return typeof slug === 'string' && slug.length <= MAX_SLUG_LENGTH && SLUG_RE.test(slug);
}

/** Primer token del slug en mayúsculas = candidato a clave del producto ("3025-crema…" → "3025"). */
export function extractCodeCandidate(slug: string | null | undefined): string | null {
  if (!isValidSlug(slug)) return null;
  const first = slug.split('-')[0];
  return first ? first.toUpperCase() : null;
}

/** Ruta del detalle (sin locale): `/productos/<slug>`. */
export function productPath(slug: string): string {
  return `/productos/${slug}`;
}
