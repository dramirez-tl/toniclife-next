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
