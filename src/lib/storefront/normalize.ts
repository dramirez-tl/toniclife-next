// Normalizadores DEFENSIVOS de las respuestas de `/storefront/*`. El servidor de
// Next y el cliente (axios) reciben `unknown` y solo de aquí salen los tipos del
// contrato: números como `number`, opcionales como `null`, enums validados.
// Un producto sin `id`, `slug` o precio > 0 se DESCARTA (nunca se pinta una
// tarjeta sin precio ni se usa otro campo como precio).

import type {
  StorefrontAvailability,
  StorefrontCategoryRef,
  StorefrontDetailResponse,
  StorefrontFacets,
  StorefrontListResponse,
  StorefrontPriceTier,
  StorefrontProductCard,
  StorefrontProductComponent,
  StorefrontProductContent,
  StorefrontProductDetail,
  StorefrontProductImage,
  StorefrontProductType,
  StorefrontSuggestResponse,
  StorefrontViewerInfo,
} from './types';

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function positive(value: unknown): number | null {
  const n = num(value);
  return n !== null && n > 0 ? n : null;
}

function int(value: unknown, fallback: number): number {
  const n = num(value);
  return n === null ? fallback : Math.trunc(n);
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(isRow) : [];
}

const AVAILABILITIES: readonly StorefrontAvailability[] = ['in_stock', 'low_stock', 'out_of_stock'];
const DEFAULT_MAX_QUANTITY = 20;
const TIERS: readonly StorefrontPriceTier[] = ['public', 'preferred', 'distributor'];

function availability(value: unknown): StorefrontAvailability {
  // Valor ausente o desconocido: ni "Disponible" ni "Agotado"; el carrito valida al agregar.
  return AVAILABILITIES.includes(value as StorefrontAvailability)
    ? (value as StorefrontAvailability)
    : 'unknown';
}

function tier(value: unknown): StorefrontPriceTier {
  return TIERS.includes(value as StorefrontPriceTier) ? (value as StorefrontPriceTier) : 'public';
}

function productType(value: unknown): StorefrontProductType {
  return value === 'pack' ? 'pack' : 'product';
}

function categoryRef(value: unknown): StorefrontCategoryRef | null {
  if (!isRow(value)) return null;
  const slug = str(value.slug);
  const name = str(value.name);
  return slug && name ? { slug, name } : null;
}

export function normalizeCard(value: unknown): StorefrontProductCard | null {
  if (!isRow(value)) return null;
  const id = str(value.id);
  const slug = str(value.slug);
  const name = str(value.name);
  const price = positive(value.price);
  if (!id || !slug || !name || price === null) return null;

  const cardTier = tier(value.priceTier);
  const publicPrice = positive(value.publicPrice);
  const showsPublic = cardTier !== 'public' && publicPrice !== null && publicPrice > price;
  const stockLeft = num(value.stockLeft);
  const maxQuantity = Math.max(0, int(value.maxQuantity, DEFAULT_MAX_QUANTITY));
  const state = availability(value.availability);

  return {
    id,
    code: str(value.code) ?? '',
    slug,
    name,
    shortName: str(value.shortName),
    type: productType(value.type),
    category: categoryRef(value.category),
    imageUrl: str(value.imageUrl),
    imageAlt: str(value.imageAlt),
    price,
    publicPrice: showsPublic ? publicPrice : null,
    savings: showsPublic ? Math.round((publicPrice - price) * 100) / 100 : null,
    priceTier: cardTier,
    // Puntos: solo viajan para viewer distribuidor (el API manda null al público).
    points: cardTier === 'public' ? null : num(value.points),
    taxIncluded: value.taxIncluded !== false,
    availability: state,
    stockLeft: state === 'low_stock' && stockLeft !== null && stockLeft > 0 ? Math.trunc(stockLeft) : null,
    maxQuantity: state === 'out_of_stock' ? 0 : Math.max(1, maxQuantity),
    isFeatured: value.isFeatured === true,
    isNew: value.isNew === true,
  };
}

function normalizeFacets(value: unknown): StorefrontFacets {
  const facets = isRow(value) ? value : {};
  const price = isRow(facets.price) ? facets.price : {};
  const avail = isRow(facets.availability) ? facets.availability : {};
  return {
    categories: rows(facets.categories).flatMap((row) => {
      const slug = str(row.slug);
      return slug ? [{ slug, name: str(row.name) ?? slug, count: Math.max(0, int(row.count, 0)) }] : [];
    }),
    types: rows(facets.types).flatMap((row) =>
      row.type === 'product' || row.type === 'pack'
        ? [{ type: row.type as StorefrontProductType, count: Math.max(0, int(row.count, 0)) }]
        : [],
    ),
    price: { min: num(price.min), max: num(price.max) },
    availability: {
      inStock: Math.max(0, int(avail.inStock, 0)),
      outOfStock: Math.max(0, int(avail.outOfStock, 0)),
    },
  };
}

// Código de zona de precios: corto, alfanumérico, en mayúsculas ('FN'). Otra cosa = sin zona.
const ZONE_CODE = /^[A-Z0-9]{2,8}$/;

function zoneCode(value: unknown): string | null {
  const code = str(value)?.toUpperCase() ?? null;
  return code && ZONE_CODE.test(code) ? code : null;
}

/**
 * `viewer` del listado y del detalle. `priceZone`/`priceZoneName` SOLO se agregan
 * cuando el API manda una zona válida: sin zona la forma es exactamente la de
 * siempre (`{ tier, showPoints }`), y el nombre nunca viaja sin su código.
 */
export function normalizeViewer(value: unknown): StorefrontViewerInfo {
  const viewer = isRow(value) ? value : {};
  const viewerTier = tier(viewer.tier);
  const base: StorefrontViewerInfo = { tier: viewerTier, showPoints: viewerTier !== 'public' && viewer.showPoints === true };
  const priceZone = zoneCode(viewer.priceZone);
  if (!priceZone) return base;
  const priceZoneName = str(viewer.priceZoneName);
  return { ...base, priceZone, ...(priceZoneName ? { priceZoneName } : {}) };
}

/** `GET /storefront/products`. `null` si el cuerpo no tiene la forma del contrato. */
export function normalizeListResponse(payload: unknown, fallbackCurrency: string): StorefrontListResponse | null {
  if (!isRow(payload) || !Array.isArray(payload.data)) return null;
  const data = payload.data.flatMap((item) => {
    const card = normalizeCard(item);
    return card ? [card] : [];
  });
  const pageSize = Math.max(1, int(payload.pageSize, 24));
  const total = Math.max(data.length, int(payload.total, data.length));
  return {
    data,
    total,
    page: Math.max(1, int(payload.page, 1)),
    pageSize,
    totalPages: Math.max(1, int(payload.totalPages, Math.ceil(total / pageSize))),
    currencyCode: (str(payload.currencyCode) ?? fallbackCurrency).toUpperCase(),
    viewer: normalizeViewer(payload.viewer),
    facets: normalizeFacets(payload.facets),
  };
}

function normalizeContent(value: unknown): StorefrontProductContent {
  const content = isRow(value) ? value : {};
  return {
    lang: content.lang === 'en' ? 'en' : 'es',
    tagline: str(content.tagline),
    presentation: str(content.presentation),
    benefits: Array.isArray(content.benefits)
      ? content.benefits.flatMap((item) => {
          const text = str(item);
          return text ? [text] : [];
        })
      : [],
    ingredients: str(content.ingredients),
    usageInstructions: str(content.usageInstructions),
    warnings: str(content.warnings),
  };
}

function normalizeImages(value: unknown): StorefrontProductImage[] {
  const seen = new Set<string>();
  const images: StorefrontProductImage[] = [];
  for (const row of rows(value)) {
    const url = str(row.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push({ url, alt: str(row.alt), isPrimary: row.isPrimary === true });
  }
  // La principal siempre va primero (la galería arranca en el índice 0 = LCP).
  return images.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

function normalizeComponents(value: unknown): StorefrontProductComponent[] {
  return rows(value).flatMap((row) => {
    const name = str(row.name);
    const quantity = num(row.quantity);
    if (!name) return [];
    return [
      {
        slug: str(row.slug),
        name,
        quantity: quantity !== null && quantity > 0 ? quantity : 1,
        imageUrl: str(row.imageUrl),
        availability: availability(row.availability),
      },
    ];
  });
}

function countries(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => (typeof item === 'string' && /^[A-Za-z]{2}$/.test(item) ? [item.toUpperCase()] : []))
    : [];
}

export function normalizeDetail(value: unknown, fallbackCurrency: string): StorefrontProductDetail | null {
  const card = normalizeCard(value);
  if (!card || !isRow(value)) return null;
  const seo = isRow(value.seo) ? value.seo : {};
  const shipping = isRow(value.shipping) ? value.shipping : {};
  const images = normalizeImages(value.images);
  const shippingCurrency = (str(shipping.currencyCode) ?? fallbackCurrency).toUpperCase();
  return {
    ...card,
    currencyCode: (str(value.currencyCode) ?? shippingCurrency).toUpperCase(),
    description: str(value.description),
    longDescription: str(value.longDescription),
    content: normalizeContent(value.content),
    images:
      images.length > 0
        ? images
        : card.imageUrl
          ? [{ url: card.imageUrl, alt: card.imageAlt, isPrimary: true }]
          : [],
    components: normalizeComponents(value.components),
    seo: { title: str(seo.title), description: str(seo.description) },
    sellableCountries: countries(value.sellableCountries),
    shipping: {
      freeThreshold: positive(shipping.freeThreshold),
      flatCost: num(shipping.flatCost),
      currencyCode: shippingCurrency,
      // Solo si el API lo manda como booleano: ausente = el front decide de forma provisional.
      ...(typeof shipping.freeShippingEligible === 'boolean' ? { freeShippingEligible: shipping.freeShippingEligible } : {}),
    },
    disclaimer: str(value.disclaimer),
    updatedAt: str(value.updatedAt) ?? '',
  };
}

/** `GET /storefront/products/:slug` (unión discriminada). `null` = cuerpo inválido. */
export function normalizeDetailResponse(payload: unknown, fallbackCurrency: string): StorefrontDetailResponse | null {
  if (!isRow(payload)) return null;
  if (payload.status === 'moved') {
    const canonicalSlug = str(payload.canonicalSlug);
    return canonicalSlug ? { status: 'moved', canonicalSlug } : null;
  }
  if (payload.status === 'unavailable_in_country') {
    const product = isRow(payload.product) ? payload.product : {};
    const name = str(product.name);
    const slug = str(product.slug);
    if (!name || !slug) return null;
    return {
      status: 'unavailable_in_country',
      product: { name, slug, imageUrl: str(product.imageUrl) },
      sellableCountries: countries(payload.sellableCountries),
    };
  }
  if (payload.status === 'ok') {
    const product = normalizeDetail(payload.product, fallbackCurrency);
    if (!product) return null;
    // `viewer` solo si el API lo manda (API previo: no). Sin él la forma no cambia.
    return isRow(payload.viewer) ? { status: 'ok', product, viewer: normalizeViewer(payload.viewer) } : { status: 'ok', product };
  }
  return null;
}

/** `GET /storefront/products/:slug/related` → tarjetas. */
export function normalizeCards(payload: unknown): StorefrontProductCard[] {
  const list = Array.isArray(payload) ? payload : isRow(payload) ? payload.data : null;
  return Array.isArray(list)
    ? list.flatMap((item) => {
        const card = normalizeCard(item);
        return card ? [card] : [];
      })
    : [];
}

/** `GET /storefront/products/suggest`. */
export function normalizeSuggest(payload: unknown, fallbackCurrency: string): StorefrontSuggestResponse {
  const body = isRow(payload) ? payload : {};
  return {
    products: rows(body.products).flatMap((row) => {
      const slug = str(row.slug);
      const name = str(row.name);
      if (!slug || !name) return [];
      return [
        {
          slug,
          name,
          imageUrl: str(row.imageUrl),
          price: positive(row.price),
          currencyCode: (str(row.currencyCode) ?? fallbackCurrency).toUpperCase(),
        },
      ];
    }),
    categories: rows(body.categories).flatMap((row) => {
      const slug = str(row.slug);
      return slug ? [{ slug, name: str(row.name) ?? slug }] : [];
    }),
  };
}
