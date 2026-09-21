import { describe, expect, it } from 'vitest';
import {
  buildAlternates,
  canonicalFor,
  hreflangFor,
  isReadyLocale,
  localizedPath,
  ogLocaleFor,
  readyCountries,
  readyLocales,
  truncate,
} from './seo';
import { absoluteUrl, isIndexingAllowed, siteBaseUrl } from './site';

const ENV = { NEXT_PUBLIC_BASE_URL: 'https://tienda.example.com' };

describe('site', () => {
  it('usa NEXT_PUBLIC_BASE_URL sin "/" final ni ruta', () => {
    expect(siteBaseUrl({ NEXT_PUBLIC_BASE_URL: 'https://tienda.example.com/' })).toBe(
      'https://tienda.example.com',
    );
    expect(siteBaseUrl({ NEXT_PUBLIC_BASE_URL: 'https://tienda.example.com/es-mx?x=1' })).toBe(
      'https://tienda.example.com',
    );
  });

  it('sin variable cae al dominio de Vercel (nunca localhost en un despliegue)', () => {
    expect(
      siteBaseUrl({ VERCEL_PROJECT_PRODUCTION_URL: 'tienda.vercel.app', VERCEL_URL: 'x-123.vercel.app' }),
    ).toBe('https://tienda.vercel.app');
    expect(siteBaseUrl({ VERCEL_URL: 'x-123.vercel.app' })).toBe('https://x-123.vercel.app');
  });

  it('localhost solo cuando no hay nada (desarrollo) o el valor es basura', () => {
    expect(siteBaseUrl({})).toBe('http://localhost:3000');
    expect(siteBaseUrl({ NEXT_PUBLIC_BASE_URL: '   ' })).toBe('http://localhost:3000');
    expect(siteBaseUrl({ NEXT_PUBLIC_BASE_URL: 'http://' })).toBe('http://localhost:3000');
  });

  it('indexación fail-closed: solo el literal "true"', () => {
    expect(isIndexingAllowed({})).toBe(false);
    expect(isIndexingAllowed({ NEXT_PUBLIC_ALLOW_INDEXING: 'TRUE' })).toBe(false);
    expect(isIndexingAllowed({ NEXT_PUBLIC_ALLOW_INDEXING: '1' })).toBe(false);
    expect(isIndexingAllowed({ NEXT_PUBLIC_ALLOW_INDEXING: 'true' })).toBe(true);
    // VERCEL_ENV=production NO basta (staging es "production" para Vercel).
    expect(isIndexingAllowed({ VERCEL_ENV: 'production' })).toBe(false);
  });

  it('absoluteUrl respeta URLs ya absolutas y no deja "/" final en la raíz', () => {
    expect(absoluteUrl('/', ENV)).toBe('https://tienda.example.com');
    expect(absoluteUrl('images/og-default.png', ENV)).toBe(
      'https://tienda.example.com/images/og-default.png',
    );
    expect(absoluteUrl('https://storage.googleapis.com/a.png', ENV)).toBe(
      'https://storage.googleapis.com/a.png',
    );
  });
});

describe('locales listos', () => {
  it('solo MX y US (CO/GT = "Muy pronto")', () => {
    expect(readyCountries()).toEqual(['MX', 'US']);
    expect(readyLocales()).toEqual(['es-mx', 'en-mx', 'es-us', 'en-us']);
    expect(isReadyLocale('en-us')).toBe(true);
    expect(isReadyLocale('es-co')).toBe(false);
    expect(isReadyLocale('es-gt')).toBe(false);
  });

  it('formatos de hreflang, og:locale y ruta', () => {
    expect(hreflangFor('es-mx')).toBe('es-MX');
    expect(ogLocaleFor('en-us')).toBe('en_US');
    expect(localizedPath('en-us', '/')).toBe('/en-us');
    expect(localizedPath('en-us', 'productos')).toBe('/en-us/productos');
  });
});

describe('canonicalFor', () => {
  it('home, catálogo y detalle', () => {
    expect(canonicalFor('es-mx', '/', null, ENV)).toBe('https://tienda.example.com/es-mx');
    expect(canonicalFor('en-us', '/productos', null, ENV)).toBe(
      'https://tienda.example.com/en-us/productos',
    );
    expect(canonicalFor('es-mx', '/productos/3025-crema-corporal-spectra-500ml', null, ENV)).toBe(
      'https://tienda.example.com/es-mx/productos/3025-crema-corporal-spectra-500ml',
    );
  });

  it('del catálogo solo conserva categoria y pagina', () => {
    expect(canonicalFor('es-mx', '/productos', { categoria: 'cremas', pagina: 3 }, ENV)).toBe(
      'https://tienda.example.com/es-mx/productos?categoria=cremas&pagina=3',
    );
    expect(canonicalFor('es-mx', '/productos', { categoria: null, pagina: 1 }, ENV)).toBe(
      'https://tienda.example.com/es-mx/productos',
    );
  });
});

describe('buildAlternates', () => {
  it('sin CO/GT y con x-default = es-mx', () => {
    const alternates = buildAlternates({ path: '/productos' }, ENV);
    expect(alternates).toEqual({
      'es-MX': 'https://tienda.example.com/es-mx/productos',
      'en-MX': 'https://tienda.example.com/en-mx/productos',
      'es-US': 'https://tienda.example.com/es-us/productos',
      'en-US': 'https://tienda.example.com/en-us/productos',
      'x-default': 'https://tienda.example.com/es-mx/productos',
    });
    expect(Object.keys(alternates).join(' ')).not.toMatch(/CO|GT/);
  });

  it('detalle: solo países donde el producto se vende; ignora países no listos', () => {
    const path = '/productos/4025-body-cream';
    expect(buildAlternates({ path, sellableCountries: ['us', 'CO'] }, ENV)).toEqual({
      'es-US': 'https://tienda.example.com/es-us/productos/4025-body-cream',
      'en-US': 'https://tienda.example.com/en-us/productos/4025-body-cream',
      'x-default': 'https://tienda.example.com/es-us/productos/4025-body-cream',
    });
  });

  it('vacío si no se vende en ningún país listo', () => {
    expect(buildAlternates({ path: '/productos/x', sellableCountries: ['CO', 'GT'] }, ENV)).toEqual({});
    expect(buildAlternates({ path: '/productos/x', sellableCountries: [] }, ENV)).toEqual({});
  });

  it('propaga categoria/pagina del catálogo', () => {
    const alternates = buildAlternates(
      { path: '/productos', state: { categoria: 'polvos', pagina: 2 } },
      ENV,
    );
    expect(alternates['en-US']).toBe(
      'https://tienda.example.com/en-us/productos?categoria=polvos&pagina=2',
    );
  });
});

describe('truncate', () => {
  it('no toca textos cortos y colapsa espacios', () => {
    expect(truncate('  Crema   corporal ', 60)).toBe('Crema corporal');
    expect(truncate(null, 60)).toBe('');
  });

  it('corta en límite de palabra, añade "…" y nunca excede el máximo', () => {
    const text = 'Crema corporal hidratante con colágeno, vitamina E y extractos naturales para todo tipo de piel';
    const out = truncate(text, 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('…')).toBe(true);
    expect(out).toBe('Crema corporal hidratante con colágeno, vitamina E y…');
  });

  it('palabra única larguísima: corte duro', () => {
    const out = truncate('x'.repeat(200), 20);
    expect(out).toBe(`${'x'.repeat(19)}…`);
  });
});
