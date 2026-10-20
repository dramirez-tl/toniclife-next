// access.test.ts — Candado de la tienda: parseo fail-closed y cache del middleware.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetStorefrontAccessEdgeCache,
  getStorefrontAccessEdge,
  parseStorefrontAccess,
  STORE_ROUTE_RE,
} from './access';

describe('parseStorefrontAccess (fail-closed)', () => {
  it('solo el valor exacto public abre la tienda', () => {
    expect(parseStorefrontAccess({ mode: 'public' }).membersOnly).toBe(false);
    for (const payload of [{ mode: 'members' }, { mode: 'PUBLIC' }, {}, null, 'public', 42]) {
      expect(parseStorefrontAccess(payload).membersOnly).toBe(true);
    }
  });
});

describe('STORE_ROUTE_RE (rutas bajo el locale que exigen sesión)', () => {
  it('cubre catálogo, detalle, carrito, checkout y quiz; no el home ni lo demás', () => {
    for (const path of ['/productos', '/productos/colageno-500', '/carrito', '/checkout/success', '/quiz']) {
      expect(STORE_ROUTE_RE.test(path)).toBe(true);
    }
    for (const path of ['/', '/productos-nuevos', '/faq', '/formulario', '/login']) {
      expect(STORE_ROUTE_RE.test(path)).toBe(false);
    }
  });
});

describe('getStorefrontAccessEdge (cache en memoria del middleware)', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    __resetStorefrontAccessEdgeCache();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const ok = (mode: string) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ mode }) });

  it('una sola petición por minuto; las demás leen el cache', async () => {
    fetchMock.mockImplementation(() => ok('members'));
    expect((await getStorefrontAccessEdge()).membersOnly).toBe(true);
    expect((await getStorefrontAccessEdge()).membersOnly).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('expirado el cache vuelve a consultar y refleja el cambio', async () => {
    fetchMock.mockImplementationOnce(() => ok('members')).mockImplementationOnce(() => ok('public'));
    await getStorefrontAccessEdge(1_000);
    expect((await getStorefrontAccessEdge(1_000 + 61_000)).membersOnly).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('API caído: conserva el último valor conocido; sin ninguno, members', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('down')));
    expect((await getStorefrontAccessEdge()).membersOnly).toBe(true);
    __resetStorefrontAccessEdgeCache();
    fetchMock.mockImplementationOnce(() => ok('public')).mockImplementation(() => Promise.reject(new Error('down')));
    await getStorefrontAccessEdge(1_000);
    expect((await getStorefrontAccessEdge(1_000 + 61_000)).membersOnly).toBe(false);
  });

  it('peticiones concurrentes comparten una sola llamada', async () => {
    fetchMock.mockImplementation(() => ok('public'));
    const [a, b] = await Promise.all([getStorefrontAccessEdge(), getStorefrontAccessEdge()]);
    expect(a.membersOnly).toBe(false);
    expect(b.membersOnly).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
