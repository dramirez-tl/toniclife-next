import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CATALOG_STATE } from './catalog-params';
import {
  DETAIL_FAILURE_MEMORY_MAX_MS,
  DETAIL_FAILURE_MEMORY_MS,
  detailFailureMemoryMs,
  fetchStorefrontDetail,
  fetchStorefrontList,
  resetDetailFailureMemoryForTests,
  retryDelayMs,
  shouldFetchListOnServer,
} from './server';

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
  vi.useRealTimers();
  resetDetailFailureMemoryForTests();
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

describe('memoria corta de fallos del detalle (L-3)', () => {
  it('detailFailureMemoryMs: solo fallos transitorios; Retry-After acotado', () => {
    expect(detailFailureMemoryMs(429, null)).toBe(DETAIL_FAILURE_MEMORY_MS);
    expect(detailFailureMemoryMs(429, '0')).toBe(DETAIL_FAILURE_MEMORY_MS);
    expect(detailFailureMemoryMs(429, '8')).toBe(8000);
    expect(detailFailureMemoryMs(429, '3600')).toBe(DETAIL_FAILURE_MEMORY_MAX_MS);
    expect(detailFailureMemoryMs(429, 'Wed, 21 Oct 2026 07:28:00 GMT')).toBe(DETAIL_FAILURE_MEMORY_MS);
    expect(detailFailureMemoryMs(503, '3600')).toBe(DETAIL_FAILURE_MEMORY_MS);
    expect(detailFailureMemoryMs(null, null)).toBe(DETAIL_FAILURE_MEMORY_MS);
    expect(detailFailureMemoryMs(404, null)).toBeNull();
    expect(detailFailureMemoryMs(400, null)).toBeNull();
  });

  it('429 persistente + doble render del error: 2 llamadas en total, y sigue siendo 429 (nunca 404)', async () => {
    const throttled = vi.fn().mockImplementation(async () => jsonResponse(429, {}, { 'Retry-After': '0' }));
    vi.stubGlobal('fetch', throttled);
    // generateMetadata + página + segundo render de la página al lanzar el error.
    for (let render = 0; render < 3; render += 1) {
      expect(await fetchStorefrontDetail('MX', 'es', '3025-crema')).toEqual({ ok: false, status: 429 });
    }
    expect(throttled).toHaveBeenCalledTimes(2);
  });

  it('la memoria es por país+slug: otro producto u otro país sí consultan al API', async () => {
    const throttled = vi.fn().mockImplementation(async () => jsonResponse(429, {}, { 'Retry-After': '0' }));
    vi.stubGlobal('fetch', throttled);
    await fetchStorefrontDetail('MX', 'es', '3025-crema');
    await fetchStorefrontDetail('MX', 'es', '3025-crema');
    expect(throttled).toHaveBeenCalledTimes(2);
    await fetchStorefrontDetail('MX', 'es', 'otro-producto');
    expect(throttled).toHaveBeenCalledTimes(4);
    await fetchStorefrontDetail('US', 'es', '3025-crema');
    expect(throttled).toHaveBeenCalledTimes(6);
  });

  it('5xx y fallo de red también se recuerdan; un 404 NO (cada visita consulta)', async () => {
    const down = vi.fn().mockImplementation(async () => jsonResponse(503, {}));
    vi.stubGlobal('fetch', down);
    expect(await fetchStorefrontDetail('MX', 'es', 'caido')).toEqual({ ok: false, status: 503 });
    expect(await fetchStorefrontDetail('MX', 'es', 'caido')).toEqual({ ok: false, status: 503 });
    expect(down).toHaveBeenCalledTimes(2);

    const offline = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', offline);
    expect(await fetchStorefrontDetail('MX', 'es', 'sin-red')).toEqual({ ok: false, status: null });
    expect(await fetchStorefrontDetail('MX', 'es', 'sin-red')).toEqual({ ok: false, status: null });
    expect(offline).toHaveBeenCalledTimes(2);

    const notFound = vi.fn().mockImplementation(async () => jsonResponse(404, { code: 'STF_PRODUCT_NOT_FOUND' }));
    vi.stubGlobal('fetch', notFound);
    await fetchStorefrontDetail('MX', 'es', 'no-existe');
    await fetchStorefrontDetail('MX', 'es', 'no-existe');
    expect(notFound).toHaveBeenCalledTimes(2);
  });

  it('pasados los segundos de memoria se vuelve a consultar al API', async () => {
    const T0 = 1_800_000_000_000;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    const throttled = vi.fn().mockImplementation(async () => jsonResponse(429, {}, { 'Retry-After': '0' }));
    vi.stubGlobal('fetch', throttled);
    await fetchStorefrontDetail('MX', 'es', '3025-crema');
    expect(throttled).toHaveBeenCalledTimes(2);
    vi.setSystemTime(T0 + DETAIL_FAILURE_MEMORY_MS - 1);
    await fetchStorefrontDetail('MX', 'es', '3025-crema');
    expect(throttled).toHaveBeenCalledTimes(2);
    vi.setSystemTime(T0 + DETAIL_FAILURE_MEMORY_MS + 1);
    await fetchStorefrontDetail('MX', 'es', '3025-crema');
    expect(throttled).toHaveBeenCalledTimes(4);
  });
});
