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
