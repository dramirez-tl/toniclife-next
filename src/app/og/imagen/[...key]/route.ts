// GET /og/imagen/products/<carpeta>/<archivo> — foto de producto para vistas
// previas de enlaces (og:image). Lee la foto del API (storage/file/products/…),
// la reencoda a JPEG ≤ 1200 px y ≤ 280 KB (WhatsApp descarta imágenes pesadas o
// lentas) y la deja cacheada en el CDN 7 días.
//
// No es un proxy abierto: solo acepta claves `products/…` validadas y siempre
// lee del API configurado (NEXT_PUBLIC_API_URL). Queda fuera del middleware
// (ver `matcher`) y con noindex para que no entre al buscador de imágenes.

import { NextResponse } from 'next/server';
import { keyFromSegments, upstreamUrlForKey } from '@/lib/storefront/og-image';
import { renderOgJpeg, type OgJpeg } from '@/lib/storefront/og-image.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UPSTREAM_TIMEOUT_MS = 8000;
/** Foto original más grande que se acepta (las del catálogo llegan a 4 MB). */
const UPSTREAM_MAX_BYTES = 15 * 1024 * 1024;
const CACHE_HIT = 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400';
const CACHE_MISS = 'public, max-age=300, s-maxage=300';

type RouteContext = { params: Promise<{ key?: string[] }> };

function empty(status: number, cacheControl: string): NextResponse {
  return new NextResponse(null, {
    status,
    headers: { 'Cache-Control': cacheControl, 'X-Robots-Tag': 'noindex' },
  });
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  const { key: segments } = await context.params;
  const key = keyFromSegments(segments);
  if (!key) return empty(404, CACHE_MISS);

  let source: Buffer;
  try {
    const upstream = await fetch(upstreamUrlForKey(key), {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (upstream.status === 404 || upstream.status === 400) return empty(404, CACHE_MISS);
    if (!upstream.ok) return empty(503, 'no-store');
    const type = upstream.headers.get('content-type') ?? '';
    const declared = Number(upstream.headers.get('content-length') ?? 0);
    if (!type.startsWith('image/') || declared > UPSTREAM_MAX_BYTES) return empty(404, CACHE_MISS);
    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength > UPSTREAM_MAX_BYTES) return empty(404, CACHE_MISS);
    source = Buffer.from(bytes);
  } catch {
    // Red caída o timeout del API: transitorio, sin cachear.
    return empty(503, 'no-store');
  }

  let jpeg: OgJpeg;
  try {
    jpeg = await renderOgJpeg(source);
  } catch {
    // Archivo corrupto o formato que sharp no lee: no es transitorio.
    return empty(415, CACHE_MISS);
  }

  return new NextResponse(new Uint8Array(jpeg.buffer), {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpeg.buffer.length),
      'Cache-Control': CACHE_HIT,
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}
