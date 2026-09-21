// Datos estructurados (schema.org) de la tienda. Builders puros: reciben el DTO
// del storefront y URLs ABSOLUTAS; devuelven objetos serializables.
// REGLA: sin `aggregateRating` ni `review` — no existen reseñas reales.

import type { StorefrontAvailability, StorefrontProductCard, StorefrontProductDetail } from './types';
import { truncate } from './seo';

export const BRAND_NAME = 'Tonic Life';

type JsonLd = Record<string, unknown>;

const AVAILABILITY_URL: Record<StorefrontAvailability, string> = {
  in_stock: 'https://schema.org/InStock',
  low_stock: 'https://schema.org/InStock',
  out_of_stock: 'https://schema.org/OutOfStock',
};

/** Precio con 2 decimales y punto decimal, como pide schema.org ("1121.00"). */
function priceString(amount: number): string {
  return amount.toFixed(2);
}

export interface ProductJsonLdInput
  extends Pick<
    StorefrontProductDetail,
    'code' | 'name' | 'price' | 'availability' | 'description' | 'images' | 'imageUrl' | 'category'
  > {
  seo?: StorefrontProductDetail['seo'] | null;
  content?: Pick<StorefrontProductDetail['content'], 'tagline'> | null;
}

/**
 * `Product` + `Offer`. `url` = canónica absoluta del detalle en el locale actual;
 * `currencyCode` = moneda de la respuesta del API (nunca se asume MXN).
 */
export function buildProductJsonLd(
  product: ProductJsonLdInput,
  url: string,
  currencyCode: string,
): JsonLd {
  const images = [
    ...product.images.map((img) => img.url),
    ...(product.imageUrl ? [product.imageUrl] : []),
  ].filter((value, index, all) => !!value && all.indexOf(value) === index);

  const description = truncate(
    product.description ?? product.seo?.description ?? product.content?.tagline ?? '',
    500,
  );

  const jsonLd: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.code,
    brand: { '@type': 'Brand', name: BRAND_NAME },
    url,
    offers: {
      '@type': 'Offer',
      url,
      price: priceString(product.price),
      priceCurrency: currencyCode.toUpperCase(),
      availability: AVAILABILITY_URL[product.availability],
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
  if (description) jsonLd.description = description;
  if (images.length > 0) jsonLd.image = images;
  if (product.category) jsonLd.category = product.category.name;
  return jsonLd;
}

export interface BreadcrumbItem {
  name: string;
  /** URL absoluta. */
  url: string;
}

export function buildBreadcrumbJsonLd(items: readonly BreadcrumbItem[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * `ItemList` del catálogo. `baseUrl` = origen + locale SIN "/" final
 * ("https://toniclife.com/es-mx"); cada elemento apunta a su detalle.
 */
export function buildItemListJsonLd(
  cards: readonly Pick<StorefrontProductCard, 'slug' | 'name'>[],
  baseUrl: string,
  startPosition = 1,
): JsonLd {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: cards.length,
    itemListElement: cards.map((card, index) => ({
      '@type': 'ListItem',
      position: startPosition + index,
      name: card.name,
      url: `${base}/productos/${card.slug}`,
    })),
  };
}

/**
 * Serializa para `<script type="application/ld+json">`. Escapa `<` (y los
 * separadores de línea U+2028/2029) para que un nombre con `</script>` no pueda
 * cerrar la etiqueta ni inyectar HTML.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
