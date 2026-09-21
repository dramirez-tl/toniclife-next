import { describe, expect, it } from 'vitest';
import {
  REVALIDATE_MAX_SLUGS,
  extractBearerToken,
  parseRevalidateBody,
  slugsForRevalidateRequest,
  tagsToRevalidate,
} from './revalidate-input';

describe('parseRevalidateBody', () => {
  it('sin cuerpo, {} o slugs null = solo el catálogo', () => {
    expect(parseRevalidateBody(undefined)).toEqual({ ok: true, slugs: [] });
    expect(parseRevalidateBody(null)).toEqual({ ok: true, slugs: [] });
    expect(parseRevalidateBody({})).toEqual({ ok: true, slugs: [] });
    expect(parseRevalidateBody({ slugs: null })).toEqual({ ok: true, slugs: [] });
  });

  it('normaliza, quita duplicados y descarta lo que no tiene formato de slug', () => {
    const result = parseRevalidateBody({
      slugs: [
        '3025-crema-corporal-spectra-500ml',
        ' 3025-CREMA-corporal-spectra-500ml ',
        'membresia-premium-cortesia-', // slug real inválido en BD (termina en guion)
        '../../etc/passwd',
        'a b',
        'product:otro',
        '',
        'x'.repeat(251),
        '4025-body-lotion',
      ],
    });
    expect(result).toEqual({ ok: true, slugs: ['3025-crema-corporal-spectra-500ml', '4025-body-lotion'] });
  });

  it('rechaza cuerpos y tipos fuera de contrato', () => {
    expect(parseRevalidateBody('catalog')).toEqual({ ok: false, reason: 'body' });
    expect(parseRevalidateBody(['a'])).toEqual({ ok: false, reason: 'body' });
    expect(parseRevalidateBody(7)).toEqual({ ok: false, reason: 'body' });
    expect(parseRevalidateBody({ slugs: 'a' })).toEqual({ ok: false, reason: 'slugs_type' });
    expect(parseRevalidateBody({ slugs: { 0: 'a' } })).toEqual({ ok: false, reason: 'slugs_type' });
    expect(parseRevalidateBody({ slugs: ['a', 5] })).toEqual({ ok: false, reason: 'slugs_type' });
    expect(parseRevalidateBody({ slugs: ['a', { toString: () => 'b' }] })).toEqual({ ok: false, reason: 'slugs_type' });
  });

  it('acota la cantidad de slugs', () => {
    const many = Array.from({ length: REVALIDATE_MAX_SLUGS + 1 }, (_, i) => `p-${i}`);
    expect(parseRevalidateBody({ slugs: many })).toEqual({ ok: false, reason: 'slugs_too_many' });
    const limit = parseRevalidateBody({ slugs: many.slice(0, REVALIDATE_MAX_SLUGS) });
    expect(limit.ok && limit.slugs.length).toBe(REVALIDATE_MAX_SLUGS);
  });

  it('ignora propiedades desconocidas (no se usan para nada)', () => {
    expect(parseRevalidateBody({ tags: ['layout'], paths: ['/'], slugs: ['abc'] })).toEqual({ ok: true, slugs: ['abc'] });
  });
});

describe('tagsToRevalidate', () => {
  it('usa exactamente las etiquetas de server.ts', () => {
    expect(tagsToRevalidate([])).toEqual(['catalog']);
    expect(tagsToRevalidate(['3025-crema'])).toEqual(['catalog', 'product:3025-crema']);
  });
});

describe('extractBearerToken', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl';

  it('acepta solo Bearer con forma de JWT', () => {
    expect(extractBearerToken(`Bearer ${jwt}`)).toBe(jwt);
    expect(extractBearerToken(`  Bearer ${jwt}  `)).toBe(jwt);
  });

  it('rechaza ausente, otro esquema, basura y tamaños absurdos', () => {
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
    expect(extractBearerToken(jwt)).toBeNull();
    expect(extractBearerToken(`Basic ${jwt}`)).toBeNull();
    expect(extractBearerToken('Bearer abc')).toBeNull();
    expect(extractBearerToken(`Bearer ${jwt} extra`)).toBeNull();
    expect(extractBearerToken(`Bearer ${jwt}\r\nX-Injected: 1`)).toBeNull();
    expect(extractBearerToken(`Bearer ${'a'.repeat(20000)}.b.c`)).toBeNull();
  });
});

describe('slugsForRevalidateRequest (lo que manda el admin, M-1)', () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => `producto-${i + 1}`);

  it('quita vacíos, nulos y duplicados', () => {
    expect(slugsForRevalidateRequest(['a-1', null, undefined, '', '  ', 'a-1', ' b-2 '])).toEqual(['a-1', 'b-2']);
    expect(slugsForRevalidateRequest([])).toEqual([]);
  });

  it('hasta 50 slugs viajan tal cual y la ruta los acepta', () => {
    const slugs = slugsForRevalidateRequest(many(REVALIDATE_MAX_SLUGS));
    expect(slugs).toHaveLength(REVALIDATE_MAX_SLUGS);
    expect(parseRevalidateBody({ slugs })).toEqual({ ok: true, slugs });
  });

  it('más de 50 (página de 100 filas) = [] → la ruta invalida el catálogo en vez de responder 400', () => {
    expect(parseRevalidateBody({ slugs: many(100) })).toEqual({ ok: false, reason: 'slugs_too_many' });
    const slugs = slugsForRevalidateRequest(many(100));
    expect(slugs).toEqual([]);
    const parsed = parseRevalidateBody({ slugs });
    expect(parsed).toEqual({ ok: true, slugs: [] });
    expect(tagsToRevalidate(parsed.ok ? parsed.slugs : ['x'])).toEqual(['catalog']);
  });

  it('el tope se mide DESPUÉS de quitar duplicados', () => {
    expect(slugsForRevalidateRequest([...many(40), ...many(40)])).toHaveLength(40);
    expect(slugsForRevalidateRequest(many(REVALIDATE_MAX_SLUGS + 1))).toEqual([]);
  });
});
