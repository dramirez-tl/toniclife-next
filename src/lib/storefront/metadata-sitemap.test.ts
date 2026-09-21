import { describe, expect, it } from 'vitest';
import { DEFAULT_CATALOG_STATE } from './catalog-params';
import {
  buildCatalogMetadata,
  buildHomeMetadata,
  buildLocaleMetadata,
  buildNoIndexMetadata,
  buildProductMetadata,
  buildRootMetadata,
  type ProductMetadataInput,
} from './metadata';
import { buildSitemapEntries } from './sitemap';

const BASE = 'https://tienda.example.com';
const STAGING = { NEXT_PUBLIC_BASE_URL: BASE };
const PROD = { NEXT_PUBLIC_BASE_URL: BASE, NEXT_PUBLIC_ALLOW_INDEXING: 'true' };

const PRODUCT: ProductMetadataInput['product'] = {
  slug: '3025-crema-corporal-spectra-500ml',
  name: 'Crema Corporal Spectra 500ml',
  description: 'Crema corporal hidratante de uso diario.',
  seo: { title: null, description: null },
  content: {
    lang: 'es',
    tagline: null,
    presentation: null,
    benefits: [],
    ingredients: null,
    usageInstructions: null,
    warnings: null,
  },
  images: [{ url: 'https://storage.googleapis.com/tl/3025.png', alt: 'Crema Spectra', isPrimary: true }],
  imageUrl: 'https://storage.googleapis.com/tl/3025.png',
  imageAlt: null,
  sellableCountries: ['MX'],
};

describe('buildRootMetadata', () => {
  it('metadataBase real y og:image PNG (no localhost, no SVG)', () => {
    const meta = buildRootMetadata(STAGING);
    expect(meta.metadataBase?.toString()).toBe(`${BASE}/`);
    expect(meta.openGraph?.images).toEqual([
      { url: '/images/og-default.png', width: 1200, height: 630, alt: 'Tonic Life - Tu Centro de Bienestar Natural' },
    ]);
    expect(meta.twitter?.images).toEqual(['/images/og-default.png']);
  });

  it('staging = noindex,nofollow; producción = index,follow', () => {
    expect(buildRootMetadata(STAGING).robots).toEqual({ index: false, follow: false });
    expect(buildRootMetadata(PROD).robots).toEqual({ index: true, follow: true });
  });
});

describe('buildLocaleMetadata / buildHomeMetadata', () => {
  it('textos y og:locale por idioma; sin canonical en el layout', () => {
    const en = buildLocaleMetadata('en-us', PROD);
    expect(en.title).toBe('Tonic Life | Your Natural Wellness Center');
    expect(en.openGraph).toMatchObject({ locale: 'en_US', siteName: 'Tonic Life' });
    expect(en.alternates).toBeUndefined();
    expect(buildLocaleMetadata('es-mx', PROD).title).toBe('Tonic Life | Tu Centro de Bienestar Natural');
  });

  it('país sin tienda (CO/GT) nunca se indexa, aun en producción', () => {
    expect(buildLocaleMetadata('es-co', PROD).robots).toEqual({ index: false, follow: true });
    expect(buildLocaleMetadata('es-mx', PROD).robots).toEqual({ index: true, follow: true });
  });

  it('home: canonical + hreflang de países listos', () => {
    const meta = buildHomeMetadata('en-us', PROD);
    expect(meta.alternates?.canonical).toBe(`${BASE}/en-us`);
    expect(meta.alternates?.languages).toEqual({
      'es-MX': `${BASE}/es-mx`,
      'en-MX': `${BASE}/en-mx`,
      'es-US': `${BASE}/es-us`,
      'en-US': `${BASE}/en-us`,
      'x-default': `${BASE}/es-mx`,
    });
    expect(meta.openGraph).toMatchObject({ url: `${BASE}/en-us`, locale: 'en_US' });
  });
});

describe('buildCatalogMetadata', () => {
  it('título por país e idioma', () => {
    expect(buildCatalogMetadata({ locale: 'es-mx', state: DEFAULT_CATALOG_STATE }, PROD).title).toBe(
      'Productos Tonic Life en México | Tonic Life',
    );
    expect(buildCatalogMetadata({ locale: 'en-us', state: DEFAULT_CATALOG_STATE }, PROD).title).toBe(
      'Tonic Life products in United States | Tonic Life',
    );
  });

  it('categoría + página: título, canonical y alternates con categoria/pagina', () => {
    const state = { ...DEFAULT_CATALOG_STATE, categoria: 'cremas', pagina: 2 };
    const meta = buildCatalogMetadata({ locale: 'es-mx', state, categoryName: 'Cremas' }, PROD);
    expect(meta.title).toBe('Cremas | Productos Tonic Life (página 2)');
    expect(meta.alternates?.canonical).toBe(`${BASE}/es-mx/productos?categoria=cremas&pagina=2`);
    expect((meta.alternates?.languages as Record<string, string>)['en-US']).toBe(
      `${BASE}/en-us/productos?categoria=cremas&pagina=2`,
    );
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it('con búsqueda u orden: noindex,follow y canonical SIN esos parámetros', () => {
    const state = { ...DEFAULT_CATALOG_STATE, q: 'crema', orden: 'price_asc' as const, categoria: 'cremas' };
    const meta = buildCatalogMetadata({ locale: 'es-mx', state, categoryName: 'Cremas' }, PROD);
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe(`${BASE}/es-mx/productos?categoria=cremas`);
  });

  it('página de búsqueda: noindex,follow y canonical al catálogo (sin q ni su pagina)', () => {
    const state = { ...DEFAULT_CATALOG_STATE, q: 'colageno', pagina: 3 };
    const meta = buildCatalogMetadata({ locale: 'es-mx', state }, PROD);
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe(`${BASE}/es-mx/productos`);
    expect((meta.alternates?.languages as Record<string, string>)['en-US']).toBe(`${BASE}/en-us/productos`);
    expect(buildCatalogMetadata({ locale: 'es-mx', state }, STAGING).robots).toEqual({ index: false, follow: false });
  });

  it('description <= 155', () => {
    const meta = buildCatalogMetadata({ locale: 'en-us', state: DEFAULT_CATALOG_STATE }, PROD);
    expect((meta.description ?? '').length).toBeLessThanOrEqual(155);
  });
});

describe('buildProductMetadata', () => {
  it('título a 60 + marca, description de respaldo, canonical y OG con imagen principal', () => {
    const meta = buildProductMetadata({ locale: 'es-mx', product: PRODUCT }, PROD);
    expect(meta.title).toBe('Crema Corporal Spectra 500ml | Tonic Life');
    expect(meta.description).toBe('Crema corporal hidratante de uso diario.');
    expect(meta.alternates?.canonical).toBe(`${BASE}/es-mx/productos/3025-crema-corporal-spectra-500ml`);
    expect(meta.openGraph).toMatchObject({
      type: 'website',
      locale: 'es_MX',
      images: [{ url: 'https://storage.googleapis.com/tl/3025.png', alt: 'Crema Spectra' }],
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('hreflang solo de países donde se vende (MX): sin US, CO ni GT', () => {
    const meta = buildProductMetadata({ locale: 'es-mx', product: PRODUCT }, PROD);
    expect(Object.keys(meta.alternates?.languages ?? {})).toEqual(['es-MX', 'en-MX', 'x-default']);
  });

  it('seo.title/description mandan; título largo se recorta a 60 antes de la marca', () => {
    const meta = buildProductMetadata(
      {
        locale: 'es-mx',
        product: {
          ...PRODUCT,
          seo: { title: 'T'.repeat(90), description: 'Meta descripción' },
        },
      },
      PROD,
    );
    expect(meta.title).toBe(`${'T'.repeat(59)}… | Tonic Life`);
    expect(meta.description).toBe('Meta descripción');
  });

  it('sin imagen: og-default.png', () => {
    const meta = buildProductMetadata(
      { locale: 'es-mx', product: { ...PRODUCT, images: [], imageUrl: null } },
      PROD,
    );
    expect(meta.openGraph?.images).toEqual([
      { url: '/images/og-default.png', width: 1200, height: 630, alt: PRODUCT.name },
    ]);
    expect(meta.twitter?.images).toEqual(['/images/og-default.png']);
  });

  it('noindex helper', () => {
    expect(buildNoIndexMetadata('Muy pronto', PROD).robots).toEqual({ index: false, follow: true });
    expect(buildNoIndexMetadata('Muy pronto', STAGING).robots).toEqual({ index: false, follow: false });
  });
});

describe('buildSitemapEntries', () => {
  const data = {
    MX: {
      products: [
        { slug: '3025-crema-corporal-spectra-500ml', updatedAt: '2026-09-01T10:00:00.000Z', imageUrl: 'https://storage.googleapis.com/tl/3025.png' },
        { slug: '1010-colageno', updatedAt: null, imageUrl: null },
        { slug: 'SLUG INVALIDO', updatedAt: null, imageUrl: null },
      ],
      categories: [
        { slug: 'cremas', count: 12 },
        { slug: 'souvenirs', count: 0 },
      ],
    },
    US: {
      products: [{ slug: '1010-colageno', updatedAt: 'no-es-fecha', imageUrl: null }],
      categories: [{ slug: 'cremas', count: 3 }],
    },
  };

  it('API sin /storefront aún (todo vacío): solo home y catálogo de los 4 locales listos', () => {
    const urls = buildSitemapEntries({ MX: { products: [], categories: [] }, US: { products: [], categories: [] } }, PROD).map((e) => e.url);
    expect(urls).toEqual([
      `${BASE}/es-mx`, `${BASE}/es-mx/productos`,
      `${BASE}/en-mx`, `${BASE}/en-mx/productos`,
      `${BASE}/es-us`, `${BASE}/es-us/productos`,
      `${BASE}/en-us`, `${BASE}/en-us/productos`,
    ]);
    expect(buildSitemapEntries({}, PROD)).toHaveLength(8);
  });

  it('solo productos del candado de cada país; nunca CO/GT; slug inválido y categoría vacía fuera', () => {
    const entries = buildSitemapEntries(data, PROD);
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => /\/(es|en)-(co|gt)(\/|$)/.test(u))).toBe(false);
    expect(urls).toContain(`${BASE}/es-mx/productos/3025-crema-corporal-spectra-500ml`);
    expect(urls).not.toContain(`${BASE}/en-us/productos/3025-crema-corporal-spectra-500ml`);
    expect(urls).toContain(`${BASE}/en-us/productos/1010-colageno`);
    expect(urls).toContain(`${BASE}/es-mx/productos?categoria=cremas`);
    expect(urls.some((u) => u.includes('souvenirs'))).toBe(false);
    expect(urls.some((u) => u.includes('INVALIDO'))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('lastModified, imágenes y hreflang por producto', () => {
    const entries = buildSitemapEntries(data, PROD);
    const crema = entries.find((e) => e.url === `${BASE}/es-mx/productos/3025-crema-corporal-spectra-500ml`);
    expect(crema?.lastModified).toEqual(new Date('2026-09-01T10:00:00.000Z'));
    expect(crema?.images).toEqual(['https://storage.googleapis.com/tl/3025.png']);
    expect(Object.keys(crema?.alternates?.languages ?? {})).toEqual(['es-MX', 'en-MX', 'x-default']);

    const colagenoUs = entries.find((e) => e.url === `${BASE}/en-us/productos/1010-colageno`);
    expect(colagenoUs?.lastModified).toBeUndefined(); // fecha inválida => se omite
    expect(Object.keys(colagenoUs?.alternates?.languages ?? {})).toEqual([
      'es-MX', 'en-MX', 'es-US', 'en-US', 'x-default',
    ]);
  });
});
