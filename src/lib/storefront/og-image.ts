// Imagen Open Graph de producto servida desde ESTE dominio (/og/imagen/<clave>).
//
// WhatsApp, Facebook, iMessage y Telegram descartan la vista previa cuando la
// og:image pesa más de ~300 KB o tarda en llegar; las fotos del catálogo son
// PNG de hasta 4 MB en el proxy del API (/storage/file/products/…). La ruta
// `app/og/imagen/[...key]` lee la foto del API, la reencoda a JPEG ≤ 1200 px y
// ≤ OG_IMAGE_MAX_BYTES y la deja cacheada en el CDN. Aquí viven los helpers
// PUROS (sin sharp ni fetch) que comparten la ficha, la ruta y las pruebas.

import { storefrontApiBase } from './server';
import { absoluteUrl } from './site';

type Env = Record<string, string | undefined>;

export const OG_IMAGE_ROUTE = '/og/imagen';
/** Lado mayor de la imagen OG (WhatsApp pide ≥ 300 px; Facebook recomienda 1200). */
export const OG_IMAGE_MAX_PX = 1200;
/** Tope de peso con margen bajo los ~300 KB que tolera WhatsApp. */
export const OG_IMAGE_MAX_BYTES = 280 * 1024;

const KEY_MAX_LENGTH = 300;
// products/<carpeta>/<archivo>.<ext>: solo letras, dígitos, punto, guion y guion bajo;
// cada segmento empieza con letra o dígito.
const KEY_RE = /^products(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)+\.(?:jpe?g|png|webp|gif|avif|tiff?)$/i;
const STORAGE_PATH_RE = /\/storage\/file\/(products\/[^?#]+)$/i;
// Hosts del API cuyas fotos se reescriben: Railway (producción y staging) o el host configurado.
const API_HOST_RE = /(^|\.)up\.railway\.app$/i;

function hostnameOf(base: string): string | null {
  try {
    return new URL(base).hostname;
  } catch {
    return null;
  }
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

/** Clave de almacenamiento aceptable: `products/<carpeta>/<archivo>.<ext>`, sin `..` ni `//`. */
export function isValidStorageKey(key: string): boolean {
  return key.length <= KEY_MAX_LENGTH && KEY_RE.test(key) && !key.includes('..') && !key.includes('//');
}

/** Clave `products/…` si la URL es una foto pública del API; null para cualquier otro origen o prefijo. */
export function storageKeyFromImageUrl(imageUrl: string, env: Env = process.env): string | null {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const apiHost = hostnameOf(storefrontApiBase(env));
  if (!API_HOST_RE.test(url.hostname) && url.hostname !== apiHost) return null;
  const match = STORAGE_PATH_RE.exec(url.pathname);
  if (!match) return null;
  let key: string;
  try {
    key = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  return isValidStorageKey(key) ? key : null;
}

/** Ruta relativa de la imagen OG en este sitio. */
export function ogImagePathForKey(key: string): string {
  return `${OG_IMAGE_ROUTE}/${encodeKey(key)}`;
}

/** URL absoluta de la imagen OG en este sitio, o null si la foto no vive en el API. */
export function ogImageUrlFor(imageUrl: string | null | undefined, env: Env = process.env): string | null {
  if (!imageUrl) return null;
  const key = storageKeyFromImageUrl(imageUrl, env);
  return key ? absoluteUrl(ogImagePathForKey(key), env) : null;
}

/**
 * URL del API de donde la ruta lee la foto original: siempre el API configurado
 * (NEXT_PUBLIC_API_URL), nunca el host que venga en la URL guardada.
 */
export function upstreamUrlForKey(key: string, env: Env = process.env): string {
  return `${storefrontApiBase(env)}/storage/file/${encodeKey(key)}`;
}

/** Une los segmentos del catch-all `[...key]` y valida; null si no es una clave aceptable. */
export function keyFromSegments(segments: readonly string[] | undefined): string | null {
  if (!segments || segments.length < 2) return null;
  const parts: string[] = [];
  for (const segment of segments) {
    try {
      parts.push(decodeURIComponent(segment));
    } catch {
      return null;
    }
  }
  const key = parts.join('/');
  return isValidStorageKey(key) ? key : null;
}
