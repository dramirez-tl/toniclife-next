// Tipos de la tienda pública (contrato `/storefront/*`, sección 6.1).
// Fuente única: `src/lib/storefront/types.ts` (la comparten los builders de SEO y
// JSON-LD y sus pruebas). Este módulo es la puerta de entrada para servicios,
// hooks y componentes.

export type {
  StorefrontAvailability,
  StorefrontCategory,
  StorefrontCategoryRef,
  StorefrontContext,
  StorefrontDetailResponse,
  StorefrontFacets,
  StorefrontLang,
  StorefrontListResponse,
  StorefrontPriceTier,
  StorefrontProductCard,
  StorefrontProductComponent,
  StorefrontProductContent,
  StorefrontProductDetail,
  StorefrontProductImage,
  StorefrontProductType,
  StorefrontSitemapItem,
  StorefrontSuggestProduct,
  StorefrontSuggestResponse,
} from '@/lib/storefront/types';
export type { CatalogSort, CatalogState } from '@/lib/storefront/catalog-params';
export type { ContentBlock } from '@/lib/storefront/content-format';
