// POST /api/revalidate-catalog — invalida el Data Cache de la tienda tras un
// guardado en el admin (contrato §7.4 y §9). Es una OPTIMIZACIÓN: la garantía
// sigue siendo el TTL de 120 s (cron de precios y POS no pasan por aquí).
//
// Seguridad, sin secreto nuevo:
//  - Exige `Authorization: Bearer <jwt>` (viene del storage del admin, no de una
//    cookie: no hay CSRF posible).
//  - El token lo valida EL API con una llamada barata que requiere
//    `products:read` (`GET /catalog-admin/slug-check?slug=x`). Este servidor no
//    verifica firmas ni conoce el secreto del JWT.
//  - Entrada acotada: cuerpo <= 16 KB, `slugs` <= 50 con formato de slug. Las
//    etiquetas salen de una lista cerrada ('catalog', 'product:<slug>'): el
//    llamador nunca elige una etiqueta arbitraria.
//  - Respuestas sin detalle (ni el error del API ni qué se invalidó) y nunca
//    cacheables.

import { createHash } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import {
  REVALIDATE_MAX_BODY_BYTES,
  extractBearerToken,
  parseRevalidateBody,
  tagsToRevalidate,
} from '@/lib/storefront/revalidate-input';
import { storefrontApiBase } from '@/lib/storefront/server';
import { BoundedTtlMap } from '@/lib/storefront/ttl-map';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const AUTH_TIMEOUT_MS = 5000;
/** Un guardado del admin dispara varias invalidaciones seguidas: el visto bueno del API se recuerda 60 s. */
const AUTH_CACHE_MS = 60 * 1000;
const AUTH_CACHE_MAX = 200;
/**
 * Caché NEGATIVO (L-1): un token que el API rechazó (401/403) no vuelve a gastar una
 * llamada durante 60 s; se responde lo mismo desde memoria. Un 503 (API caído o con
 * límite) NO se recuerda. Mapa aparte del de vistos buenos para que una ráfaga de
 * tokens falsos no desaloje a los admins legítimos; ambos con tamaño acotado.
 * Igual que el visto bueno, el rechazo puede sobrevivir 60 s a un cambio de permisos:
 * solo retrasa una purga de caché que el TTL de 120 s cubre de todos modos.
 */
const DENIED_CACHE_MS = 60 * 1000;
const DENIED_CACHE_MAX = 1000;
const authorized = new BoundedTtlMap<true>(AUTH_CACHE_MS, AUTH_CACHE_MAX);
const denied = new BoundedTtlMap<401 | 403>(DENIED_CACHE_MS, DENIED_CACHE_MAX);

function reply(status: number, body: Record<string, unknown>): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}

function fingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 200 del API = JWT de usuario vigente con `products:read`. Devuelve el estado HTTP a responder. */
async function authorize(token: string): Promise<200 | 401 | 403 | 503> {
  const now = Date.now();
  const key = fingerprint(token);
  if (authorized.get(key, now)) return 200;
  const rejectedAs = denied.get(key, now);
  if (rejectedAs) return rejectedAs;

  try {
    const response = await fetch(`${storefrontApiBase()}/catalog-admin/slug-check?slug=x`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (response.status === 200) {
      authorized.set(key, true, now);
      return 200;
    }
    if (response.status === 401 || response.status === 403) {
      denied.set(key, response.status, now);
      return response.status;
    }
    return 503;
  } catch {
    return 503;
  }
}

async function readJsonBody(request: Request): Promise<{ ok: true; body: unknown } | { ok: false }> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > REVALIDATE_MAX_BODY_BYTES) return { ok: false };
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false };
  }
  if (text.length > REVALIDATE_MAX_BODY_BYTES) return { ok: false };
  if (!text.trim()) return { ok: true, body: undefined };
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const token = extractBearerToken(request.headers.get('authorization'));
  if (!token) return reply(401, { revalidated: false });

  // La entrada se valida ANTES de gastar la llamada al API.
  const raw = await readJsonBody(request);
  if (!raw.ok) return reply(400, { revalidated: false });
  const input = parseRevalidateBody(raw.body);
  if (!input.ok) return reply(400, { revalidated: false });

  const status = await authorize(token);
  if (status !== 200) return reply(status, { revalidated: false });

  // `{ expire: 0 }` = purga inmediata (con un perfil como 'max' Next serviría lo viejo una vez más).
  for (const tag of tagsToRevalidate(input.slugs)) revalidateTag(tag, { expire: 0 });
  return reply(200, { revalidated: true });
}
