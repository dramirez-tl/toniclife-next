// slug.ts — gemela de lectura de `slug.lib.ts` del API (contrato §5.1).
// El slug canónico es `codigo-nombre`; SOLO se usa para proponer un valor:
// la validación y la unicidad las decide el API (`/catalog-admin/slug-check`).

const MAX_SLUG = 250;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(text: string): string {
  const base = (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, 'n')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, MAX_SLUG).replace(/-+$/g, '');
}

export function buildProductSlug(code: string, name: string): string {
  return slugify(`${code ?? ''} ${name ?? ''}`);
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= MAX_SLUG && SLUG_RE.test(slug);
}

export const SLUG_FORMAT_MESSAGE = 'Solo minúsculas, números y guiones (sin acentos ni espacios)';

/**
 * Error del campo URL en la ficha, o `null` si se puede guardar.
 * El formato SOLO se exige cuando el usuario cambió la URL: un producto con una
 * URL heredada fuera de formato (p. ej. terminada en guion) debe poder guardar
 * sus metadatos sin que se le obligue a cambiarla (el PATCH ni siquiera la manda).
 */
export function slugFieldError(value: string, savedSlug: string | null | undefined): string | null {
  const next = (value ?? '').trim();
  if (next === '' || next === (savedSlug ?? '').trim()) return null;
  return isValidSlug(next) ? null : SLUG_FORMAT_MESSAGE;
}

/** ¿La URL guardada está fuera de formato? (aviso NO bloqueante en "SEO y URL"). */
export function isLegacyInvalidSlug(savedSlug: string | null | undefined): boolean {
  const saved = (savedSlug ?? '').trim();
  return saved !== '' && !isValidSlug(saved);
}
