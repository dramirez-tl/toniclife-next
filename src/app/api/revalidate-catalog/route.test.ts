import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

const T0 = 1_800_000_000_000;

function jwt(name: string): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256' })}.${encode({ sub: name })}.firma`;
}

function post(token: string, body: unknown = { slugs: ['3025-crema'] }): Request {
  return new Request('http://localhost/api/revalidate-catalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

/** Módulo fresco por prueba: los mapas de la ruta viven en memoria del módulo. */
async function loadRoute() {
  vi.resetModules();
  return import('./route');
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  revalidateTag.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('POST /api/revalidate-catalog — caché negativo por hash del token (L-1)', () => {
  it('un token rechazado (401) no vuelve a gastar una llamada al API durante 60 s', async () => {
    const api = vi.fn().mockImplementation(async () => new Response('{}', { status: 401 }));
    vi.stubGlobal('fetch', api);
    const { POST } = await loadRoute();
    const token = jwt('falso');

    for (let i = 0; i < 5; i += 1) {
      const response = await POST(post(token));
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ revalidated: false });
    }
    expect(api).toHaveBeenCalledTimes(1);
    expect(revalidateTag).not.toHaveBeenCalled();

    vi.setSystemTime(T0 + 59_999);
    await POST(post(token));
    expect(api).toHaveBeenCalledTimes(1);

    vi.setSystemTime(T0 + 60_000);
    expect((await POST(post(token))).status).toBe(401);
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('403 también se recuerda, con su estado; cada token distinto cuenta aparte', async () => {
    const api = vi.fn().mockImplementation(async () => new Response('{}', { status: 403 }));
    vi.stubGlobal('fetch', api);
    const { POST } = await loadRoute();

    expect((await POST(post(jwt('sin-permiso')))).status).toBe(403);
    expect((await POST(post(jwt('sin-permiso')))).status).toBe(403);
    expect(api).toHaveBeenCalledTimes(1);
    expect((await POST(post(jwt('otro')))).status).toBe(403);
    expect(api).toHaveBeenCalledTimes(2);
  });

  it('503 (API caído, con límite o sin red) NO se recuerda: el siguiente intento vuelve a preguntar', async () => {
    const api = vi
      .fn()
      .mockImplementationOnce(async () => new Response('{}', { status: 429 }))
      .mockImplementationOnce(async () => {
        throw new TypeError('fetch failed');
      })
      .mockImplementation(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', api);
    const { POST } = await loadRoute();
    const token = jwt('admin');

    expect((await POST(post(token))).status).toBe(503);
    expect((await POST(post(token))).status).toBe(503);
    expect((await POST(post(token))).status).toBe(200);
    expect(api).toHaveBeenCalledTimes(3);
    expect(revalidateTag.mock.calls.map((call) => call[0])).toEqual(['catalog', 'product:3025-crema']);

    // El visto bueno se sigue recordando 60 s.
    expect((await POST(post(token))).status).toBe(200);
    expect(api).toHaveBeenCalledTimes(3);
  });

  it('una ráfaga de tokens falsos no desaloja el visto bueno de un admin legítimo', async () => {
    const good = jwt('admin');
    const api = vi.fn().mockImplementation(async (_url: string, init: { headers: Record<string, string> }) =>
      new Response('{}', { status: init.headers.Authorization === `Bearer ${good}` ? 200 : 401 }),
    );
    vi.stubGlobal('fetch', api);
    const { POST } = await loadRoute();

    expect((await POST(post(good))).status).toBe(200);
    for (let i = 0; i < 1100; i += 1) await POST(post(jwt(`falso-${i}`)));
    const callsBefore = api.mock.calls.length;
    expect((await POST(post(good))).status).toBe(200);
    expect(api.mock.calls.length).toBe(callsBefore);
  });

  it('sin token, o con más de 50 slugs: responde sin llamar al API', async () => {
    const api = vi.fn();
    vi.stubGlobal('fetch', api);
    const { POST } = await loadRoute();

    const anonymous = new Request('http://localhost/api/revalidate-catalog', { method: 'POST' });
    expect((await POST(anonymous)).status).toBe(401);
    const tooMany = Array.from({ length: 51 }, (_, i) => `producto-${i}`);
    expect((await POST(post(jwt('admin'), { slugs: tooMany }))).status).toBe(400);
    expect(api).not.toHaveBeenCalled();
  });
});
