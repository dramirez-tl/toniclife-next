// product-thumb.ts — De dónde sale la miniatura de un producto en las listas de inventario (lógica PURA).
//
// La lista de existencias (GET /inventory/branches/:id) puede traer la foto principal de cada
// producto (`imageUrl` / `thumbnailUrl`). Un API que todavía no la manda deja esos campos
// AUSENTES: entonces la miniatura se busca en la galería del producto
// (GET /products/:id/images). `null` = el API sí respondió y el producto no tiene foto.

import type { ProductImage } from '@/types/product';

/** Lo que una fila de la lista sabe de la foto de su producto. */
export interface ThumbRow {
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
}

export type ThumbState =
  /** Hay foto: `small` para la miniatura y `large` para verla en grande. */
  | { kind: 'ready'; small: string; large: string }
  /** El producto no tiene foto. */
  | { kind: 'none' }
  /** La lista no trae el dato: hay que consultar la galería del producto. */
  | { kind: 'lookup' };

/** Solo rutas del sitio o direcciones http(s): cualquier otra cosa no se pinta. */
function usable(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const src = value.trim();
  return src.startsWith('/') || /^https?:\/\//i.test(src) ? src : null;
}

function ready(image: string | null, thumbnail: string | null): ThumbState {
  const large = image ?? thumbnail;
  if (!large) return { kind: 'none' };
  return { kind: 'ready', small: thumbnail ?? large, large };
}

/** Miniatura según la fila de la lista. Campos ausentes = consultar la galería. */
export function thumbFromRow(row: ThumbRow): ThumbState {
  if (row.imageUrl === undefined && row.thumbnailUrl === undefined) return { kind: 'lookup' };
  return ready(usable(row.imageUrl), usable(row.thumbnailUrl));
}

/** Foto principal de la galería del producto: activa, la principal primero y luego por orden. */
export function thumbFromGallery(images: readonly ProductImage[] | null | undefined): ThumbState {
  const active = (images ?? []).filter((image) => image && image.isActive !== false && usable(image.imageUrl));
  if (active.length === 0) return { kind: 'none' };
  const [best] = [...active].sort(
    (a, b) => Number(b.isPrimary === true) - Number(a.isPrimary === true) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  return ready(usable(best.imageUrl), usable(best.thumbnailUrl));
}

// Mismos orígenes que `images.remotePatterns` de next.config.ts: solo esos se pueden
// achicar con el optimizador; cualquier otro se sirve tal cual (nunca revienta el render).
const OPTIMIZABLE_HOSTS = [
  /^storage\.googleapis\.com$/,
  /\.googleusercontent\.com$/,
  /^images\.unsplash\.com$/,
  /^ui-avatars\.com$/,
  /\.up\.railway\.app$/,
  /\.amazonaws\.com$/,
  /\.cloudfront\.net$/,
];

/** ¿El optimizador de imágenes puede servir una versión pequeña de esta foto? */
export function canOptimizeImage(src: string): boolean {
  if (src.startsWith('/')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && OPTIMIZABLE_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

/** Una forma de pedir la foto: la dirección y si pasa por el optimizador. */
export interface ImageAttempt {
  src: string;
  optimized: boolean;
}

/**
 * Intentos para pintar una foto, en orden: primero `src` achicada por el optimizador (si su
 * origen lo permite) y, si esa carga falla, `fallback` tal cual (por defecto la misma foto
 * sin optimizar). Sin repetidos: agotados los intentos se pinta el respaldo, nunca un bucle.
 */
export function imageAttempts(src: string, fallback: string = src): ImageAttempt[] {
  const attempts: ImageAttempt[] = [{ src, optimized: canOptimizeImage(src) }];
  if (!attempts.some((attempt) => attempt.src === fallback && !attempt.optimized)) {
    attempts.push({ src: fallback, optimized: false });
  }
  return attempts;
}
