import { describe, expect, it } from 'vitest';
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  buildProductJsonLd,
  safeJsonLd,
  type ProductJsonLdInput,
} from './json-ld';

const URL_3025 = 'https://tienda.example.com/es-mx/productos/3025-crema-corporal-spectra-500ml';

const PRODUCT: ProductJsonLdInput = {
  code: '3025',
  name: 'Crema Corporal Spectra 500ml',
  price: 1121,
  availability: 'in_stock',
  description: 'Crema corporal hidratante.',
  imageUrl: 'https://storage.googleapis.com/tl/3025.png',
  images: [
    { url: 'https://storage.googleapis.com/tl/3025.png', alt: 'Frente', isPrimary: true },
    { url: 'https://storage.googleapis.com/tl/3025-b.png', alt: null, isPrimary: false },
  ],
  category: { slug: 'cremas', name: 'Cremas' },
  seo: { title: null, description: null },
  content: { tagline: null },
};

describe('buildProductJsonLd', () => {
  it('Product + Offer completos (snapshot)', () => {
    expect(buildProductJsonLd(PRODUCT, URL_3025, 'mxn')).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "brand": {
          "@type": "Brand",
          "name": "Tonic Life",
        },
        "category": "Cremas",
        "description": "Crema corporal hidratante.",
        "image": [
          "https://storage.googleapis.com/tl/3025.png",
          "https://storage.googleapis.com/tl/3025-b.png",
        ],
        "name": "Crema Corporal Spectra 500ml",
        "offers": {
          "@type": "Offer",
          "availability": "https://schema.org/InStock",
          "itemCondition": "https://schema.org/NewCondition",
          "price": "1121.00",
          "priceCurrency": "MXN",
          "url": "https://tienda.example.com/es-mx/productos/3025-crema-corporal-spectra-500ml",
        },
        "sku": "3025",
        "url": "https://tienda.example.com/es-mx/productos/3025-crema-corporal-spectra-500ml",
      }
    `);
  });

  it('NUNCA incluye aggregateRating ni review (no hay reseñas reales)', () => {
    const json = JSON.stringify(buildProductJsonLd(PRODUCT, URL_3025, 'MXN'));
    expect(json).not.toContain('aggregateRating');
    expect(json).not.toContain('review');
  });

  it('disponibilidad: low_stock = InStock, out_of_stock = OutOfStock', () => {
    const offer = (availability: ProductJsonLdInput['availability']) =>
      (buildProductJsonLd({ ...PRODUCT, availability }, URL_3025, 'USD').offers as Record<string, string>);
    expect(offer('low_stock').availability).toBe('https://schema.org/InStock');
    expect(offer('out_of_stock').availability).toBe('https://schema.org/OutOfStock');
    expect(offer('out_of_stock').priceCurrency).toBe('USD');
  });

  it('sin imagen, descripción ni categoría: omite las claves (no inventa placeholders)', () => {
    const jsonLd = buildProductJsonLd(
      { ...PRODUCT, description: null, imageUrl: null, images: [], category: null },
      URL_3025,
      'MXN',
    );
    expect(jsonLd).not.toHaveProperty('image');
    expect(jsonLd).not.toHaveProperty('description');
    expect(jsonLd).not.toHaveProperty('category');
  });

  it('descripción de respaldo: seo.description y luego tagline', () => {
    const base = { ...PRODUCT, description: null };
    expect(
      buildProductJsonLd({ ...base, seo: { title: null, description: 'Meta' } }, URL_3025, 'MXN').description,
    ).toBe('Meta');
    expect(
      buildProductJsonLd({ ...base, content: { tagline: 'Piel suave' } }, URL_3025, 'MXN').description,
    ).toBe('Piel suave');
  });
});

describe('buildBreadcrumbJsonLd', () => {
  it('posiciones consecutivas desde 1 (snapshot)', () => {
    expect(
      buildBreadcrumbJsonLd([
        { name: 'Inicio', url: 'https://tienda.example.com/es-mx' },
        { name: 'Productos', url: 'https://tienda.example.com/es-mx/productos' },
        { name: 'Cremas', url: 'https://tienda.example.com/es-mx/productos?categoria=cremas' },
      ]),
    ).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "item": "https://tienda.example.com/es-mx",
            "name": "Inicio",
            "position": 1,
          },
          {
            "@type": "ListItem",
            "item": "https://tienda.example.com/es-mx/productos",
            "name": "Productos",
            "position": 2,
          },
          {
            "@type": "ListItem",
            "item": "https://tienda.example.com/es-mx/productos?categoria=cremas",
            "name": "Cremas",
            "position": 3,
          },
        ],
      }
    `);
  });
});

describe('buildItemListJsonLd', () => {
  it('URLs de detalle sobre la base del locale; posición continúa en páginas > 1 (snapshot)', () => {
    expect(
      buildItemListJsonLd(
        [
          { slug: '3025-crema-corporal-spectra-500ml', name: 'Crema Corporal Spectra 500ml' },
          { slug: '1010-colageno', name: 'Colágeno' },
        ],
        'https://tienda.example.com/es-mx/',
        25,
      ),
    ).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "name": "Crema Corporal Spectra 500ml",
            "position": 25,
            "url": "https://tienda.example.com/es-mx/productos/3025-crema-corporal-spectra-500ml",
          },
          {
            "@type": "ListItem",
            "name": "Colágeno",
            "position": 26,
            "url": "https://tienda.example.com/es-mx/productos/1010-colageno",
          },
        ],
        "numberOfItems": 2,
      }
    `);
  });
});

describe('safeJsonLd', () => {
  it('un </script> en el nombre no puede cerrar la etiqueta', () => {
    const evil = { ...PRODUCT, name: 'Crema </script><script>alert(1)</script>' };
    const out = safeJsonLd(buildProductJsonLd(evil, URL_3025, 'MXN'));
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(out).toContain('\\u003c/script>');
    // Sigue siendo JSON válido y conserva el texto original.
    expect((JSON.parse(out) as { name: string }).name).toBe(evil.name);
  });

  it('escapa separadores de línea U+2028/U+2029', () => {
    const out = safeJsonLd({ a: 'x\u2028y\u2029z' });
    expect(out).toBe('{"a":"x\\u2028y\\u2029z"}');
  });
});
