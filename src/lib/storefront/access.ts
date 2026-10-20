// lib/storefront/access.ts — Candado de la tienda en línea (storefront.access_mode
// del API, 19-oct-2026).
//   public  = tienda abierta, como siempre.
//   members = solo distribuidores y clientes con sesión: el middleware manda a
//             /login las rutas de tienda sin cookie de sesión, las páginas no
//             hacen el fetch ANÓNIMO del SSR (el cliente consulta con su JWT) y
//             catálogo/productos/quiz salen del sitemap y van con noindex.
// FAIL-CLOSED: si el API no responde o responde algo raro se asume `members`
// (la tienda nunca se abre por error). Se cachea 60 s: el interruptor del admin
// aplica en menos de un minuto sin redeploy.

export type StorefrontAccessMode = 'public' | 'members';

export interface StorefrontAccess {
  mode: StorefrontAccessMode;
  membersOnly: boolean;
}

export const PUBLIC_ACCESS: StorefrontAccess = { mode: 'public', membersOnly: false };
export const MEMBERS_ONLY_ACCESS: StorefrontAccess = { mode: 'members', membersOnly: true };

/** Rutas de tienda (ya SIN el prefijo de locale) que exigen sesión en modo members. */
export const STORE_ROUTE_RE = /^\/(productos|carrito|checkout|quiz)(\/|$)/;

export const ACCESS_CACHE_SECONDS = 60;
const FETCH_TIMEOUT_MS = 5000;

/** Solo el valor exacto `public` abre la tienda; todo lo demás = members. */
export function parseStorefrontAccess(payload: unknown): StorefrontAccess {
  const mode =
    typeof payload === 'object' && payload !== null
      ? (payload as { mode?: unknown }).mode
      : undefined;
  return mode === 'public' ? PUBLIC_ACCESS : MEMBERS_ONLY_ACCESS;
}

function accessUrl(env: Record<string, string | undefined> = process.env): string {
  const base = (env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(/\/+$/, '');
  return `${base}/storefront/access`;
}

/**
 * Servidor de Next (páginas RSC, sitemap, robots): Data Cache con revalidate
 * de 60 s. Fail-closed ante cualquier falla.
 */
export async function fetchStorefrontAccess(): Promise<StorefrontAccess> {
  try {
    const response = await fetch(accessUrl(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: ACCESS_CACHE_SECONDS, tags: ['storefront-access'] },
    });
    if (!response.ok) return MEMBERS_ONLY_ACCESS;
    return parseStorefrontAccess(await response.json());
  } catch {
    return MEMBERS_ONLY_ACCESS;
  }
}

// ── Middleware (Edge): sin Data Cache; cache en memoria por instancia ──────
let edgeCache: { value: StorefrontAccess; expiresAt: number } | null = null;
let edgeInflight: Promise<StorefrontAccess> | null = null;

/**
 * Una petición al API por instancia cada 60 s (las demás leen el cache). Si el
 * API falla se conserva el último valor conocido (o members si nunca hubo) y
 * se reintenta a los 10 s.
 */
export async function getStorefrontAccessEdge(now: number = Date.now()): Promise<StorefrontAccess> {
  if (edgeCache && edgeCache.expiresAt > now) return edgeCache.value;
  if (!edgeInflight) {
    edgeInflight = (async () => {
      try {
        const response = await fetch(accessUrl(), {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const value = parseStorefrontAccess(await response.json());
        edgeCache = { value, expiresAt: now + ACCESS_CACHE_SECONDS * 1000 };
        return value;
      } catch {
        const value = edgeCache?.value ?? MEMBERS_ONLY_ACCESS;
        edgeCache = { value, expiresAt: now + 10_000 };
        return value;
      } finally {
        edgeInflight = null;
      }
    })();
  }
  return edgeInflight;
}

/** Solo pruebas: olvida el cache del middleware. */
export function __resetStorefrontAccessEdgeCache(): void {
  edgeCache = null;
  edgeInflight = null;
}
