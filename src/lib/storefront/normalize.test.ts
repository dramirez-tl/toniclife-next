import { describe, expect, it } from 'vitest';
import {
  normalizeCard,
  normalizeCards,
  normalizeDetailResponse,
  normalizeListResponse,
  normalizeSuggest,
  normalizeViewer,
} from './normalize';
import { catalogErrorCode, catalogErrorMessage, catalogErrorStatus } from './errors';

const card = {
  id: '53f2d26c-1422-403f-ad1a-cb26c4f5302d',
  code: '3025',
  slug: '3025-crema-corporal-spectra-500ml',
  name: 'CREMA CORPORAL SPECTRA 500ML',
  shortName: null,
  type: 'product',
  category: { slug: 'cremas', name: 'Cremas' },
  imageUrl: 'https://storage.googleapis.com/x/3025.png',
  imageAlt: null,
  price: 1121,
  publicPrice: null,
  savings: null,
  priceTier: 'public',
  points: null,
  taxIncluded: true,
  availability: 'in_stock',
  stockLeft: null,
  maxQuantity: 20,
  isFeatured: true,
  isNew: false,
};

describe('normalizeCard', () => {
  it('acepta la tarjeta del contrato', () => {
    expect(normalizeCard(card)).toMatchObject({ slug: card.slug, price: 1121, availability: 'in_stock', maxQuantity: 20 });
  });

  it('descarta productos sin precio, con precio 0 o sin slug (nunca puntos como precio)', () => {
    expect(normalizeCard({ ...card, price: null, points: 624 })).toBeNull();
    expect(normalizeCard({ ...card, price: 0 })).toBeNull();
    expect(normalizeCard({ ...card, slug: '' })).toBeNull();
    expect(normalizeCard('x')).toBeNull();
  });

  it('precio como string numérica', () => {
    expect(normalizeCard({ ...card, price: '1121.50' })?.price).toBe(1121.5);
  });

  it('puntos y precio público tachado SOLO para tier distinto de público', () => {
    const pub = normalizeCard({ ...card, points: 624, publicPrice: 1500 });
    expect(pub?.points).toBeNull();
    expect(pub?.publicPrice).toBeNull();
    expect(pub?.savings).toBeNull();

    const dist = normalizeCard({ ...card, price: 723, priceTier: 'distributor', points: 624, publicPrice: 1121 });
    expect(dist?.points).toBe(624);
    expect(dist?.publicPrice).toBe(1121);
    expect(dist?.savings).toBe(398);
  });

  it('distribuidor con precio igual al público: sin tachado', () => {
    const same = normalizeCard({ ...card, priceTier: 'distributor', publicPrice: 1121 });
    expect(same?.publicPrice).toBeNull();
    expect(same?.savings).toBeNull();
  });

  it('disponibilidad: agotado => maxQuantity 0; desconocida => unknown', () => {
    expect(normalizeCard({ ...card, availability: 'out_of_stock', maxQuantity: 5 })?.maxQuantity).toBe(0);
    const unknown = normalizeCard({ ...card, availability: 'whatever', maxQuantity: undefined });
    expect(unknown?.availability).toBe('unknown');
    expect(unknown?.maxQuantity).toBe(20);
  });

  it('stockLeft solo con low_stock', () => {
    expect(normalizeCard({ ...card, stockLeft: 3 })?.stockLeft).toBeNull();
    expect(normalizeCard({ ...card, availability: 'low_stock', stockLeft: 3 })?.stockLeft).toBe(3);
  });
});

describe('normalizeListResponse', () => {
  const payload = {
    data: [card, { ...card, id: 'b', slug: 'sin-precio', price: null }],
    total: 286,
    page: 1,
    pageSize: 24,
    totalPages: 12,
    currencyCode: 'mxn',
    viewer: { tier: 'public', showPoints: true },
    facets: {
      categories: [{ slug: 'cremas', name: 'Cremas', count: '12' }, { name: 'sin slug', count: 1 }],
      types: [{ type: 'product', count: 280 }, { type: 'kit', count: 9 }],
      price: { min: 45, max: '3200' },
      availability: { inStock: 270, outOfStock: 16 },
    },
  };

  it('normaliza, descarta la tarjeta inválida y nunca muestra puntos al público', () => {
    const out = normalizeListResponse(payload, 'MXN');
    expect(out?.data).toHaveLength(1);
    expect(out?.currencyCode).toBe('MXN');
    expect(out?.viewer).toEqual({ tier: 'public', showPoints: false });
    expect(out?.facets.categories).toEqual([{ slug: 'cremas', name: 'Cremas', count: 12 }]);
    expect(out?.facets.types).toEqual([{ type: 'product', count: 280 }]);
    expect(out?.facets.price).toEqual({ min: 45, max: 3200 });
    expect(out?.totalPages).toBe(12);
  });

  it('cuerpo con otra forma => null', () => {
    expect(normalizeListResponse(null, 'MXN')).toBeNull();
    expect(normalizeListResponse({ statusCode: 404, message: 'Cannot GET' }, 'MXN')).toBeNull();
    expect(normalizeListResponse([], 'MXN')).toBeNull();
  });

  it('completa paginación y moneda de respaldo', () => {
    const out = normalizeListResponse({ data: [card], total: 50, pageSize: 24 }, 'USD');
    expect(out?.totalPages).toBe(3);
    expect(out?.currencyCode).toBe('USD');
    expect(out?.facets.categories).toEqual([]);
  });

  it('viewer de zona (Frontera): priceZone y priceZoneName solo cuando el API los manda', () => {
    const zone = normalizeListResponse(
      { ...payload, viewer: { tier: 'distributor', showPoints: true, priceZone: 'fn', priceZoneName: 'Frontera MX-USA' } },
      'MXN',
    );
    expect(zone?.viewer).toStrictEqual({ tier: 'distributor', showPoints: true, priceZone: 'FN', priceZoneName: 'Frontera MX-USA' });
    // Sin nombre: solo el código (nunca `priceZoneName: null`).
    const codeOnly = normalizeListResponse({ ...payload, viewer: { tier: 'distributor', showPoints: true, priceZone: 'FN' } }, 'MXN');
    expect(codeOnly?.viewer).toStrictEqual({ tier: 'distributor', showPoints: true, priceZone: 'FN' });
  });

  it('viewer sin zona (anónimo, cuenta de país, API previo): la forma de siempre, sin claves extra', () => {
    expect(normalizeListResponse(payload, 'MXN')?.viewer).toStrictEqual({ tier: 'public', showPoints: false });
    const country = normalizeListResponse({ ...payload, viewer: { tier: 'distributor', showPoints: true } }, 'MXN');
    expect(country?.viewer).toStrictEqual({ tier: 'distributor', showPoints: true });
    // Zona basura o nombre sin código: se ignoran.
    for (const junk of [null, '', 7, 'frontera mx-usa', 'X', {}]) {
      const out = normalizeListResponse({ ...payload, viewer: { tier: 'distributor', showPoints: true, priceZone: junk } }, 'MXN');
      expect(out?.viewer).toStrictEqual({ tier: 'distributor', showPoints: true });
    }
    expect(normalizeViewer({ tier: 'distributor', showPoints: true, priceZoneName: 'Frontera MX-USA' })).toStrictEqual({
      tier: 'distributor',
      showPoints: true,
    });
  });
});

describe('normalizeDetailResponse', () => {
  const product = {
    ...card,
    description: 'Humecta',
    longDescription: null,
    content: { lang: 'es', tagline: 'Piel suave', benefits: ['Uno', '', 2], ingredients: null },
    images: [
      { url: 'https://storage.googleapis.com/x/b.png', alt: null, isPrimary: false },
      { url: 'https://storage.googleapis.com/x/a.png', alt: 'Frente', isPrimary: true },
      { url: 'https://storage.googleapis.com/x/a.png', alt: 'dup', isPrimary: false },
    ],
    components: [{ slug: null, name: 'Jabón', quantity: '2', imageUrl: null, availability: 'in_stock' }, { quantity: 1 }],
    seo: { title: null, description: null },
    sellableCountries: ['mx', 'US', 'zzz'],
    shipping: { freeThreshold: 1500, flatCost: 150, currencyCode: 'MXN' },
    disclaimer: null,
    updatedAt: '2026-09-20T10:00:00.000Z',
  };

  it('ok: principal primero, sin duplicados, componentes válidos, países ISO2', () => {
    const out = normalizeDetailResponse({ status: 'ok', product }, 'MXN');
    expect(out?.status).toBe('ok');
    if (out?.status !== 'ok') return;
    expect(out.product.images.map((i) => i.url)).toEqual([
      'https://storage.googleapis.com/x/a.png',
      'https://storage.googleapis.com/x/b.png',
    ]);
    expect(out.product.content.benefits).toEqual(['Uno']);
    expect(out.product.components).toEqual([
      { slug: null, name: 'Jabón', quantity: 2, imageUrl: null, availability: 'in_stock' },
    ]);
    expect(out.product.sellableCountries).toEqual(['MX', 'US']);
    expect(out.product.shipping).toEqual({ freeThreshold: 1500, flatCost: 150, currencyCode: 'MXN' });
  });

  it('ok con viewer (API con zonas): se conserva normalizado; sin viewer (API previo) no se inventa', () => {
    const withZone = normalizeDetailResponse(
      { status: 'ok', product, viewer: { tier: 'distributor', showPoints: true, priceZone: 'FN' }, fulfillment: {} },
      'MXN',
    );
    expect(withZone?.status === 'ok' && withZone.viewer).toStrictEqual({ tier: 'distributor', showPoints: true, priceZone: 'FN' });
    const withoutZone = normalizeDetailResponse({ status: 'ok', product, viewer: { tier: 'distributor', showPoints: true } }, 'MXN');
    expect(withoutZone?.status === 'ok' && withoutZone.viewer).toStrictEqual({ tier: 'distributor', showPoints: true });
    const previous = normalizeDetailResponse({ status: 'ok', product }, 'MXN');
    expect(previous?.status === 'ok' && 'viewer' in previous).toBe(false);
  });

  it('ok sin galería: usa la imagen de la tarjeta', () => {
    const out = normalizeDetailResponse({ status: 'ok', product: { ...product, images: [] } }, 'MXN');
    expect(out?.status === 'ok' && out.product.images).toEqual([
      { url: card.imageUrl, alt: null, isPrimary: true },
    ]);
  });

  it('shipping.freeShippingEligible: solo si el API lo manda como booleano (false para distribuidores)', () => {
    const withFlag = (flag: unknown) =>
      normalizeDetailResponse({ status: 'ok', product: { ...product, shipping: { ...product.shipping, freeShippingEligible: flag } } }, 'MXN');
    const no = withFlag(false);
    expect(no?.status === 'ok' && no.product.shipping.freeShippingEligible).toBe(false);
    const yes = withFlag(true);
    expect(yes?.status === 'ok' && yes.product.shipping.freeShippingEligible).toBe(true);
    // API previo (sin el campo) o basura: ausente, y el front decide de forma provisional.
    for (const junk of [undefined, null, 'false', 0]) {
      const out = withFlag(junk);
      expect(out?.status === 'ok' && 'freeShippingEligible' in out.product.shipping).toBe(false);
    }
  });

  it('personalization (mig 179): tope entero 1..60 y etiqueta del producto; ausente, null o basura => null', () => {
    const withSpec = (personalization: unknown) =>
      normalizeDetailResponse({ status: 'ok', product: { ...product, personalization } }, 'MXN');
    const full = withSpec({ maxLength: 20, label: ' Tu nombre ' });
    expect(full?.status === 'ok' && full.product.personalization).toEqual({ maxLength: 20, label: 'Tu nombre' });
    const noLabel = withSpec({ maxLength: '12', label: null });
    expect(noLabel?.status === 'ok' && noLabel.product.personalization).toEqual({ maxLength: 12, label: null });
    const capped = withSpec({ maxLength: 500, label: '' });
    expect(capped?.status === 'ok' && capped.product.personalization).toEqual({ maxLength: 60, label: null });
    for (const junk of [undefined, null, {}, { maxLength: 0 }, { maxLength: 'veinte' }, { label: 'Solo etiqueta' }, 'x']) {
      const out = withSpec(junk);
      expect(out?.status === 'ok' && out.product.personalization).toBeNull();
    }
    // API previo a la mig 179 (sin el bloque): no se personaliza.
    const previous = normalizeDetailResponse({ status: 'ok', product }, 'MXN');
    expect(previous?.status === 'ok' && previous.product.personalization).toBeNull();
  });

  const variants = {
    family: { code: 'pn', name: 'Playera negra' },
    axes: { gender: true, color: false, size: true },
    current: { gender: 'mujer', color: 'Negra', colorHex: '#000000', size: 'ch', sizeLabel: 'CH', genderLabel: 'Mujer' },
    options: [
      { id: 'a', slug: 'a-playera', code: 'A', gender: 'mujer', color: 'Negra', colorHex: '#000', size: 'CH', sizeLabel: 'CH', genderLabel: 'Mujer', imageUrl: null, availability: 'in_stock', price: '350.00' },
      { id: 'b', slug: 'b-playera', code: 'B', gender: 'hombre', color: 'Negra', colorHex: '#0a0a0a', size: ' m ', sizeLabel: 'M', genderLabel: 'Hombre', imageUrl: null, availability: 'out_of_stock', price: 350 },
      { id: 'c', code: 'C', gender: 'otro', size: 'G' },
      { id: 'a', slug: 'repetida' },
    ],
    sizeGuide: {
      name: 'Playera mujer',
      unit: 'in',
      columns: [{ key: 'pecho', label: 'Pecho' }, { key: 'pecho', label: 'Repetida' }, { key: '', label: 'Sin clave' }, { label: 'Sin clave 2' }],
      rows: [{ size: 'm', sizeLabel: 'M', values: { pecho: 98, otra: 'x' } }, { size: 'ch', values: { pecho: '92' } }, { values: {} }],
      notes: ' Mide una prenda que te quede bien. ',
    },
  };

  it('variants: hex #RRGGBB en mayúsculas, talla sin espacios, opciones sin slug o repetidas fuera, guía saneada', () => {
    const out = normalizeDetailResponse({ status: 'ok', product: { ...product, variants } }, 'MXN');
    expect(out?.status === 'ok' && out.product.variants).toEqual({
      family: { code: 'pn', name: 'Playera negra' },
      axes: { gender: true, color: false, size: true },
      current: { gender: 'mujer', color: 'Negra', colorHex: '#000000', size: 'CH', sizeLabel: 'CH', genderLabel: 'Mujer' },
      options: [
        { id: 'a', slug: 'a-playera', code: 'A', gender: 'mujer', color: 'Negra', colorHex: null, size: 'CH', sizeLabel: 'CH', genderLabel: 'Mujer', imageUrl: null, availability: 'in_stock', price: 350 },
        { id: 'b', slug: 'b-playera', code: 'B', gender: 'hombre', color: 'Negra', colorHex: '#0A0A0A', size: 'M', sizeLabel: 'M', genderLabel: 'Hombre', imageUrl: null, availability: 'out_of_stock', price: 350 },
      ],
      sizeGuide: {
        name: 'Playera mujer',
        unit: 'in',
        columns: [{ key: 'pecho', label: 'Pecho' }],
        rows: [
          { size: 'M', sizeLabel: 'M', values: { pecho: '98' } },
          { size: 'CH', sizeLabel: 'CH', values: { pecho: '92' } },
        ],
        notes: 'Mide una prenda que te quede bien.',
      },
    });
  });

  it('variants: API previo, basura o nada que elegir ni guía => null; solo guía => viaja con el nombre del producto', () => {
    const sinNada = { family: { name: 'F' }, axes: { gender: false }, options: [], sizeGuide: { name: 'G', columns: [], rows: [] } };
    for (const junk of [undefined, null, 'x', {}, sinNada]) {
      const out = normalizeDetailResponse({ status: 'ok', product: { ...product, variants: junk } }, 'MXN');
      expect(out?.status === 'ok' && out.product.variants).toBeNull();
    }
    const onlyGuide = normalizeDetailResponse(
      { status: 'ok', product: { ...product, variants: { axes: { size: true }, options: [{ id: 'a', slug: 'a' }], sizeGuide: variants.sizeGuide } } },
      'MXN',
    );
    expect(onlyGuide?.status === 'ok' && onlyGuide.product.variants).toMatchObject({
      family: { code: '', name: product.name },
      axes: { gender: false, color: false, size: false },
      options: [{ id: 'a', slug: 'a', sizeLabel: '', availability: 'unknown', price: 0 }],
      sizeGuide: { unit: 'in' },
    });
  });

  it('moved y unavailable_in_country', () => {
    expect(normalizeDetailResponse({ status: 'moved', canonicalSlug: 'nuevo' }, 'MXN')).toEqual({
      status: 'moved',
      canonicalSlug: 'nuevo',
    });
    expect(
      normalizeDetailResponse(
        { status: 'unavailable_in_country', product: { name: 'X', slug: 'x', imageUrl: null }, sellableCountries: ['us'] },
        'MXN',
      ),
    ).toEqual({
      status: 'unavailable_in_country',
      product: { name: 'X', slug: 'x', imageUrl: null },
      sellableCountries: ['US'],
    });
  });

  it('cuerpos inválidos => null', () => {
    expect(normalizeDetailResponse({ status: 'ok', product: { ...product, price: null } }, 'MXN')).toBeNull();
    expect(normalizeDetailResponse({ status: 'moved' }, 'MXN')).toBeNull();
    expect(normalizeDetailResponse({ status: 'otro' }, 'MXN')).toBeNull();
    expect(normalizeDetailResponse(undefined, 'MXN')).toBeNull();
  });
});

describe('normalizeCards / normalizeSuggest', () => {
  it('acepta arreglo o { data }', () => {
    expect(normalizeCards([card])).toHaveLength(1);
    expect(normalizeCards({ data: [card, {}] })).toHaveLength(1);
    expect(normalizeCards(null)).toEqual([]);
  });

  it('sugerencias', () => {
    expect(
      normalizeSuggest(
        { products: [{ slug: 'a', name: 'A', price: '10', imageUrl: null }, { name: 'sin slug' }], categories: [{ slug: 'cremas' }] },
        'USD',
      ),
    ).toEqual({
      products: [{ slug: 'a', name: 'A', imageUrl: null, price: 10, currencyCode: 'USD' }],
      categories: [{ slug: 'cremas', name: 'cremas' }],
    });
    expect(normalizeSuggest(null, 'MXN')).toEqual({ products: [], categories: [] });
  });
});

describe('catalogErrorMessage', () => {
  const err = (status: number, data: unknown) => ({ response: { status, data } });

  it('prioriza el texto por código, luego el mensaje del API, luego el respaldo', () => {
    const e = err(409, { code: 'CART_QTY_EXCEEDS_STOCK', message: 'Solo quedan 3 piezas' });
    expect(catalogErrorCode(e)).toBe('CART_QTY_EXCEEDS_STOCK');
    expect(catalogErrorStatus(e)).toBe(409);
    expect(catalogErrorMessage(e, 'respaldo', { byCode: { CART_QTY_EXCEEDS_STOCK: 'Only 3 left' } })).toBe('Only 3 left');
    expect(catalogErrorMessage(e, 'respaldo')).toBe('Solo quedan 3 piezas');
    expect(catalogErrorMessage(e, 'fallback', { useApiMessage: false })).toBe('fallback');
  });

  it('ignora mensajes genéricos y errores sin cuerpo', () => {
    expect(catalogErrorMessage(err(500, { message: 'Internal server error' }), 'respaldo')).toBe('respaldo');
    expect(catalogErrorMessage(new Error('Network Error'), 'respaldo')).toBe('respaldo');
    expect(catalogErrorCode(err(400, { code: 'no válido' }))).toBeNull();
  });
});

describe('listado agrupado por familia (API mig 178)', () => {
  const card = {
    id: 'p-1',
    code: 'PLRCH',
    slug: 'playera-legado-talla-ch',
    name: 'Playera Oficial Tonic Life – Edición Legado 2004',
    price: 199,
    priceTier: 'public',
    availability: 'in_stock',
    maxQuantity: 20,
  };

  it('la tarjeta trae la familia saneada (hex en mayúsculas, tallas sin repetir, géneros válidos)', () => {
    const res = normalizeListResponse(
      {
        data: [
          {
            ...card,
            family: {
              code: 'PLR',
              name: 'Playera Legado 2004',
              variantCount: '4',
              fromPrice: '189.50',
              genders: ['mujer', 'ninos', 'mujer', 'hombre'],
              colors: [{ name: 'Rosa pastel', hex: '#f4b6c7' }, { name: '', hex: '#000000' }, { name: 'Negro', hex: 'rojo' }],
              sizes: ['CH', 'm', 'CH', ' xl '],
            },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 24,
        totalPages: 1,
        facets: { genders: [{ gender: 'mujer', label: 'Mujer', count: 3 }, { gender: 'otro', label: 'X', count: 1 }] },
      },
      'MXN',
    );
    expect(res).not.toBeNull();
    expect(res!.data[0].family).toEqual({
      code: 'PLR',
      name: 'Playera Legado 2004',
      variantCount: 4,
      fromPrice: 189.5,
      genders: ['mujer', 'hombre'],
      colors: [
        { name: 'Rosa pastel', hex: '#F4B6C7' },
        { name: 'Negro', hex: null },
      ],
      sizes: ['CH', 'M', 'XL'],
    });
    expect(res!.facets.genders).toEqual([{ gender: 'mujer', label: 'Mujer', count: 3 }]);
  });

  it('sin familia (API previo o producto suelto): family null y facetas de género vacías', () => {
    const res = normalizeListResponse({ data: [card], total: 1, page: 1, pageSize: 24, totalPages: 1, facets: {} }, 'MXN');
    expect(res!.data[0].family).toBeNull();
    expect(res!.facets.genders).toEqual([]);
    const sinPrecio = normalizeListResponse(
      { data: [{ ...card, family: { code: 'X', name: 'X', fromPrice: 0, variantCount: 2 } }], total: 1, page: 1, pageSize: 24, totalPages: 1 },
      'MXN',
    );
    expect(sinPrecio!.data[0].family).toBeNull();
  });
});
