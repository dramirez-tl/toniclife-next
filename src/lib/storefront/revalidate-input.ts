// Validación de ENTRADA de `POST /api/revalidate-catalog` (contrato §7.4 y §9).
// Funciones puras (sin Next ni red) para poder probarlas con vitest.
//
// Las etiquetas del Data Cache son EXACTAMENTE las que usa `server.ts`:
//   'catalog'            → listado, categorías, sitemap y todos los detalles
//   'product:<slug>'     → un detalle
// Un slug que no pasa `isValidSlug` jamás generó una etiqueta (la página responde
// 404 sin ir al API), así que se descarta en vez de rechazar toda la petición.

import { isValidSlug } from './slug';

export const CATALOG_TAG = 'catalog';
export const REVALIDATE_MAX_SLUGS = 50;
export const REVALIDATE_MAX_BODY_BYTES = 16 * 1024;
const MAX_TOKEN_LENGTH = 16 * 1024;

export function productTag(slug: string): string {
  return `product:${slug}`;
}

export type RevalidateInput =
  | { ok: true; slugs: string[] }
  | { ok: false; reason: 'body' | 'slugs_type' | 'slugs_too_many' };

/**
 * Acepta `undefined`/`null`/`{}` (solo el catálogo) o `{ slugs: string[] }`.
 * Rechaza: cuerpo que no es objeto, `slugs` que no es arreglo, elementos que no
 * son texto y más de `REVALIDATE_MAX_SLUGS`. Normaliza (trim + minúsculas),
 * descarta los que no tienen formato de slug y quita duplicados.
 */
export function parseRevalidateBody(body: unknown): RevalidateInput {
  if (body === undefined || body === null) return { ok: true, slugs: [] };
  if (typeof body !== 'object' || Array.isArray(body)) return { ok: false, reason: 'body' };

  const raw = (body as Record<string, unknown>).slugs;
  if (raw === undefined || raw === null) return { ok: true, slugs: [] };
  if (!Array.isArray(raw)) return { ok: false, reason: 'slugs_type' };
  if (raw.length > REVALIDATE_MAX_SLUGS) return { ok: false, reason: 'slugs_too_many' };

  const slugs = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') return { ok: false, reason: 'slugs_type' };
    const slug = item.trim().toLowerCase();
    if (isValidSlug(slug)) slugs.add(slug);
  }
  return { ok: true, slugs: [...slugs] };
}

/**
 * Slugs que el ADMIN manda a la ruta. Quita vacíos y duplicados; si aun así pasan
 * de `REVALIDATE_MAX_SLUGS` (acción masiva sobre una página de 100 filas) manda
 * `[]`: la ruta rechazaría la petición ENTERA con 400 y no invalidaría nada, y la
 * etiqueta `catalog` ya cubre todos los detalles (`server.ts` etiqueta cada detalle
 * con `[CATALOG_TAG, productTag(slug)]`).
 */
export function slugsForRevalidateRequest(slugs: readonly (string | null | undefined)[]): string[] {
  const unique = new Set<string>();
  for (const slug of slugs) {
    if (typeof slug !== 'string') continue;
    const clean = slug.trim();
    if (clean.length > 0) unique.add(clean);
  }
  return unique.size > REVALIDATE_MAX_SLUGS ? [] : [...unique];
}

/** Etiquetas a invalidar: siempre el catálogo + una por slug válido. */
export function tagsToRevalidate(slugs: readonly string[]): string[] {
  return [CATALOG_TAG, ...slugs.map(productTag)];
}

const BEARER_RE = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

/**
 * Token del header `Authorization`. Solo acepta la FORMA de un JWT (tres
 * segmentos base64url): la basura se rechaza aquí, sin gastar una llamada al API.
 * La firma y los permisos los valida el API (nunca este servidor).
 */
export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header || header.length > MAX_TOKEN_LENGTH) return null;
  const match = BEARER_RE.exec(header.trim());
  return match ? match[1] : null;
}
