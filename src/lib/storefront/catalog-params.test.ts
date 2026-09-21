import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CATALOG_STATE,
  activeFilterCount,
  catalogHref,
  isIndexable,
  parseCatalogParams,
  serializeCatalogParams,
  toStorefrontQuery,
} from './catalog-params';

describe('parseCatalogParams', () => {
  it('sin parámetros = estado por defecto', () => {
    expect(parseCatalogParams(undefined)).toEqual(DEFAULT_CATALOG_STATE);
    expect(parseCatalogParams({})).toEqual(DEFAULT_CATALOG_STATE);
    expect(parseCatalogParams(new URLSearchParams(''))).toEqual(DEFAULT_CATALOG_STATE);
  });

  it('lee todas las claves estables', () => {
    const state = parseCatalogParams(
      new URLSearchParams(
        'q=crema%20%20spectra&categoria=Cremas&tipo=pack&min=100&max=900.555&agotados=1&orden=price_asc&pagina=3',
      ),
    );
    expect(state).toEqual({
      q: 'crema spectra',
      categoria: 'cremas',
      tipo: 'pack',
      min: 100,
      max: 900.56,
      agotados: true,
      orden: 'price_asc',
      pagina: 3,
    });
  });

  it('acepta el objeto searchParams de Next (valores repetidos => el primero)', () => {
    const state = parseCatalogParams({ categoria: ['polvos', 'cremas'], pagina: '2', otra: 'x' });
    expect(state.categoria).toBe('polvos');
    expect(state.pagina).toBe(2);
  });

  it('descarta basura sin lanzar', () => {
    const state = parseCatalogParams({
      q: 'a',
      categoria: '../etc/passwd',
      tipo: 'kit',
      min: '-5',
      max: 'abc',
      agotados: 'si',
      orden: 'basePrice',
      pagina: '-2',
    });
    expect(state).toEqual(DEFAULT_CATALOG_STATE);
  });

  it('rango invertido se intercambia; q se recorta a 80', () => {
    const state = parseCatalogParams({ min: '900', max: '100', q: 'x'.repeat(200) });
    expect([state.min, state.max]).toEqual([100, 900]);
    expect(state.q).toHaveLength(80);
  });
});

describe('serializeCatalogParams', () => {
  it('omite los valores por defecto', () => {
    expect(serializeCatalogParams(DEFAULT_CATALOG_STATE)).toBe('');
    expect(catalogHref()).toBe('/productos');
  });

  it('orden de claves fijo e ida y vuelta estable', () => {
    const qs = 'q=col%C3%A1geno&categoria=polvos&tipo=product&min=50&max=500&agotados=1&orden=newest&pagina=2';
    const state = parseCatalogParams(new URLSearchParams(qs));
    expect(serializeCatalogParams(state)).toBe(qs);
    expect(catalogHref({ categoria: 'cremas' })).toBe('/productos?categoria=cremas');
  });
});

describe('isIndexable', () => {
  it('indexable sin filtros, con categoria y/o pagina', () => {
    expect(isIndexable(DEFAULT_CATALOG_STATE)).toBe(true);
    expect(isIndexable({ ...DEFAULT_CATALOG_STATE, categoria: 'cremas' })).toBe(true);
    expect(isIndexable({ ...DEFAULT_CATALOG_STATE, categoria: 'cremas', pagina: 4 })).toBe(true);
  });

  it('con q, tipo, min, max, agotados u orden distinto => no indexable', () => {
    expect(isIndexable({ ...DEFAULT_CATALOG_STATE, q: 'crema' })).toBe(false);
    expect(isIndexable({ ...DEFAULT_CATALOG_STATE, tipo: 'pack' })).toBe(false);
    expect(isIndexable({ ...DEFAULT_CATALOG_STATE, min: 10 })).toBe(false);
    expect(isIndexable({ ...DEFAULT_CATALOG_STATE, max: 10 })).toBe(false);
    expect(isIndexable({ ...DEFAULT_CATALOG_STATE, agotados: true })).toBe(false);
    expect(isIndexable({ ...DEFAULT_CATALOG_STATE, orden: 'price_desc' })).toBe(false);
  });
});

describe('toStorefrontQuery / activeFilterCount', () => {
  it('traduce el estado a la query del API', () => {
    const state = parseCatalogParams({ q: 'crema', categoria: 'cremas', agotados: '1', min: '10' });
    expect(toStorefrontQuery(state, { country: 'mx', lang: 'en', pageSize: 1000 })).toEqual({
      country: 'MX',
      lang: 'en',
      sort: 'featured',
      page: '1',
      pageSize: '24',
      availability: 'all',
      q: 'crema',
      category: 'cremas',
      minPrice: '10',
    });
    expect(toStorefrontQuery(DEFAULT_CATALOG_STATE, { country: 'US', lang: 'es', pageSize: 48 })).toEqual({
      country: 'US',
      lang: 'es',
      sort: 'featured',
      page: '1',
      pageSize: '48',
      availability: 'in_stock',
    });
  });

  it('cuenta filtros activos (precio cuenta una vez; q y orden no son filtros)', () => {
    expect(activeFilterCount(DEFAULT_CATALOG_STATE)).toBe(0);
    expect(
      activeFilterCount({
        ...DEFAULT_CATALOG_STATE,
        q: 'crema',
        orden: 'newest',
        categoria: 'cremas',
        min: 1,
        max: 2,
        agotados: true,
      }),
    ).toBe(3);
  });
});
