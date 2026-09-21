import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CATALOG_STATE } from './catalog-params';
import { fetchStorefrontDetail, fetchStorefrontList, retryDelayMs, shouldFetchListOnServer } from './server';

const LIST_BODY = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 24,
  totalPages: 0,
  currencyCode: 'MXN',
  viewer: { tier: 'public', showPoints: false },
  facets: { categories: [], types: [], price: { min: null, max: null }, availability: { inStock: 0, outOfStock: 0 } },
};

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('retryDelayMs', () => {
  it('429: respeta Retry-After acotado; sin cabecera usa el valor por defecto', () => {
    expect(retryDelayMs(429, null, 10)).toBe(700);
    expect(retryDelayMs(429, '1', 10)).toBe(1000);
    expect(retryDelayMs(429, '0', 10)).toBe(250);
    expect(retryDelayMs(429, '60', 10)).toBe(1500);
    expect(retryDelayMs(429, 'Wed, 21 Oct 2026 07:28:00 GMT', 10)).toBe(700);
  });

  it('5xx transitorio: reintento corto', () => {
    for (const status of [500, 502, 503, 504]) expect(retryDelayMs(status, null, 10)).toBe(250);
  });

  it('4xx (400, 404) nunca se reintenta', () => {
    for (const status of [400, 401, 403, 404, 410]) expect(retryDelayMs(status, null, 10)).toBeNull();
  });

  it('sin respuesta: solo si el fallo fue rápido (un timeout no se duplica)', () => {
    expect(retryDelayMs(null, null, 50)).toBe(250);
    expect(retryDelayMs(null, null, 8000)).toBeNull();
  });
});

describe('fetchStorefrontList', () => {
  it('con q NO toca el API (lo resuelve el navegador)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(shouldFetchListOnServer({ q: 'colageno' })).toBe(false);
    expect(shouldFetchListOnServer({ q: '' })).toBe(true);
    const result = await fetchStorefrontList('MX', 'es', { ...DEFAULT_CATALOG_STATE, q: 'colageno' });
    expect(result).toEqual({ ok: false, status: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('429 y luego 200: un reintento y responde ok, con las etiquetas del contrato', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, { message: 'Too Many Requests' }, { 'Retry-After': '0' }))
      .mockResolvedValueOnce(jsonResponse(200, LIST_BODY));
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchStorefrontList('MX', 'es', DEFAULT_CATALOG_STATE);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const init = fetchMock.mock.calls[0][1] as { next?: { revalidate?: number; tags?: string[] }; cache?: string };
    expect(init.next).toEqual({ revalidate: 120, tags: ['catalog', 'catalog:MX'] });
    expect(init.cache).toBeUndefined();
  });

  it('429 persistente: exactamente un reintento y devuelve el estado (la página degrada a cliente)', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(429, {}, { 'Retry-After': '0' }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchStorefrontList('US', 'en', DEFAULT_CATALOG_STATE);
    expect(result).toEqual({ ok: false, status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('fetchStorefrontDetail', () => {
  it('slug inválido = 404 sin ir al API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchStorefrontDetail('MX', 'es', 'No Valido')).toEqual({ ok: false, status: 404 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('404 real: sin reintento; 429 persistente: NUNCA se convierte en 404', async () => {
    const notFound = vi.fn().mockImplementation(async () => jsonResponse(404, { code: 'STF_PRODUCT_NOT_FOUND' }));
    vi.stubGlobal('fetch', notFound);
    expect(await fetchStorefrontDetail('MX', 'es', 'no-existe')).toEqual({ ok: false, status: 404 });
    expect(notFound).toHaveBeenCalledTimes(1);

    const throttled = vi.fn().mockImplementation(async () => jsonResponse(429, {}, { 'Retry-After': '0' }));
    vi.stubGlobal('fetch', throttled);
    expect(await fetchStorefrontDetail('MX', 'es', '3025-crema')).toEqual({ ok: false, status: 429 });
    expect(throttled).toHaveBeenCalledTimes(2);
    const init = throttled.mock.calls[0][1] as { next?: { tags?: string[] } };
    expect(init.next?.tags).toEqual(['catalog', 'product:3025-crema']);
  });
});
