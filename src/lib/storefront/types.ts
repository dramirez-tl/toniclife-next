// Tipos del contrato público `/storefront/*` (API, sección 6.1 del contrato
// ecommerce). DTOs en camelCase, números como `number`, opcionales como `null`.

// 'unknown' NO lo emite el API: es el valor del front cuando la disponibilidad no
// llega o no se reconoce (no se promete existencia ni se marca Agotado).
export type StorefrontAvailability = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
export type StorefrontPriceTier = 'public' | 'preferred' | 'distributor';
export type StorefrontProductType = 'product' | 'pack';
export type StorefrontLang = 'es' | 'en';

export interface StorefrontCategoryRef {
  slug: string;
  name: string;
}

export interface StorefrontProductCard {
  id: string;
  code: string;
  slug: string;
  name: string;
  shortName: string | null;
  type: StorefrontProductType;
  category: StorefrontCategoryRef | null;
  imageUrl: string | null;
  imageAlt: string | null;
  price: number;
  publicPrice: number | null;
  savings: number | null;
  priceTier: StorefrontPriceTier;
  points: number | null;
  taxIncluded: boolean;
  availability: StorefrontAvailability;
  stockLeft: number | null;
  maxQuantity: number;
  isFeatured: boolean;
  isNew: boolean;
}

export interface StorefrontProductContent {
  lang: StorefrontLang;
  tagline: string | null;
  presentation: string | null;
  benefits: string[];
  ingredients: string | null;
  usageInstructions: string | null;
  warnings: string | null;
}

export interface StorefrontProductImage {
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

export interface StorefrontProductComponent {
  slug: string | null;
  name: string;
  quantity: number;
  imageUrl: string | null;
  availability: StorefrontAvailability;
}

export interface StorefrontProductDetail extends StorefrontProductCard {
  /**
   * Moneda del precio. El contrato del detalle no la trae suelta: el front la toma
   * de `currencyCode` si el API la manda, si no de `shipping.currencyCode` (misma
   * moneda: ambas salen de `countries.currency_code`) y, en ultimo caso, del pais.
   */
  currencyCode: string;
  description: string | null;
  longDescription: string | null;
  content: StorefrontProductContent;
  images: StorefrontProductImage[];
  components: StorefrontProductComponent[];
  seo: { title: string | null; description: string | null };
  sellableCountries: string[];
  shipping: {
    freeThreshold: number | null;
    flatCost: number | null;
    currencyCode: string;
    /** `false` = el checkout NUNCA le da envío gratis por monto a este viewer (distribuidor). Ausente en el API previo. */
    freeShippingEligible?: boolean;
  };
  disclaimer: string | null;
  updatedAt: string;
}

export interface StorefrontFacets {
  categories: { slug: string; name: string; count: number }[];
  types: { type: StorefrontProductType; count: number }[];
  price: { min: number | null; max: number | null };
  availability: { inStock: number; outOfStock: number };
}

/**
 * Con qué lista cotizó el API: el tipo de precio del viewer y, si su cuenta
 * pertenece a una ZONA de precios con lista propia dentro de la tienda del país
 * (hoy solo Frontera MX-USA, `FN`, dentro de la tienda de México), la zona.
 * `priceZone`/`priceZoneName` no viajan para anónimos ni cuentas de país: ausentes.
 */
export interface StorefrontViewerInfo {
  tier: StorefrontPriceTier;
  showPoints: boolean;
  /** Código de la zona (p. ej. 'FN'). Solo cuando la cuenta cotiza con lista de zona. */
  priceZone?: string;
  /** Nombre de la zona que manda el API (en el idioma pedido), si lo manda. */
  priceZoneName?: string;
}

export interface StorefrontListResponse {
  data: StorefrontProductCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currencyCode: string;
  viewer: StorefrontViewerInfo;
  facets: StorefrontFacets;
}

/** Respuesta discriminada de `GET /storefront/products/:slug`. */
export type StorefrontDetailResponse =
  /** `viewer` llega junto al producto (API con zonas); el API previo no lo manda. */
  | { status: 'ok'; product: StorefrontProductDetail; viewer?: StorefrontViewerInfo }
  | { status: 'moved'; canonicalSlug: string }
  | {
      status: 'unavailable_in_country';
      product: { name: string; imageUrl: string | null; slug: string };
      sellableCountries: string[];
    };

export interface StorefrontCategory {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  count: number;
}

export interface StorefrontSitemapItem {
  slug: string;
  updatedAt: string | null;
  imageUrl: string | null;
}

export interface StorefrontSuggestProduct {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  currencyCode: string;
}

/** `GET /storefront/products/suggest`. */
export interface StorefrontSuggestResponse {
  products: StorefrontSuggestProduct[];
  categories: StorefrontCategoryRef[];
}

/** Contexto común de toda lectura de tienda: país ISO2 + idioma. */
export interface StorefrontContext {
  country: string;
  lang: StorefrontLang;
}
