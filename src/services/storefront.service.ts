// storefront.service.ts — lecturas de la tienda pública (`/storefront/*`).
//
// DOS caminos, misma forma de respuesta (normalizada en lib/storefront/normalize):
//  - SERVIDOR (SSR/SEO): `fetchStorefrontList` / `fetchStorefrontDetail`, fetch
//    ANÓNIMO con Data Cache de Next (`revalidate: 120` + tags). Precio público.
//  - CLIENTE: `storefrontService` sobre axios. Si hay sesión viaja el Bearer y el
//    API responde el precio por rol (distribuidor/preferente) y los puntos.
// `priceTypeId` NO existe en esta superficie: el tipo de precio lo decide el API.

import api from '@/lib/api';
import { toStorefrontQuery, type CatalogState } from '@/lib/storefront/catalog-params';
import {
  normalizeCards,
  normalizeDetailResponse,
  normalizeListResponse,
  normalizeSuggest,
} from '@/lib/storefront/normalize';
import { COUNTRIES } from '@/i18n/config';
import type {
  StorefrontContext,
  StorefrontDetailResponse,
  StorefrontListResponse,
  StorefrontProductCard,
  StorefrontSuggestResponse,
} from '@/types/storefront';

export {
  fetchStorefrontCategories,
  fetchStorefrontDetail,
  fetchStorefrontList,
  fetchStorefrontSitemap,
  STOREFRONT_REVALIDATE_SECONDS,
} from '@/lib/storefront/server';

function fallbackCurrency(country: string): string {
  return COUNTRIES.find((c) => c.code === country.toUpperCase())?.currency ?? 'MXN';
}

function contextQuery(ctx: StorefrontContext): Record<string, string> {
  return { country: ctx.country.toUpperCase(), lang: ctx.lang };
}

/** Respuesta 2xx con un cuerpo fuera de contrato: se trata como error (la UI ofrece reintentar). */
class StorefrontShapeError extends Error {
  constructor(resource: string) {
    super(`Respuesta inesperada de ${resource}`);
    this.name = 'StorefrontShapeError';
  }
}

export const storefrontService = {
  async list(ctx: StorefrontContext, state: CatalogState, signal?: AbortSignal): Promise<StorefrontListResponse> {
    const response = await api.get<unknown>('/storefront/products', {
      params: toStorefrontQuery(state, ctx),
      signal,
    });
    const data = normalizeListResponse(response.data, fallbackCurrency(ctx.country));
    if (!data) throw new StorefrontShapeError('/storefront/products');
    return data;
  },

  async detail(ctx: StorefrontContext, slug: string, signal?: AbortSignal): Promise<StorefrontDetailResponse> {
    const response = await api.get<unknown>(`/storefront/products/${encodeURIComponent(slug)}`, {
      params: contextQuery(ctx),
      signal,
    });
    const data = normalizeDetailResponse(response.data, fallbackCurrency(ctx.country));
    if (!data) throw new StorefrontShapeError('/storefront/products/:slug');
    return data;
  },

  async related(
    ctx: StorefrontContext,
    slug: string,
    limit = 8,
    signal?: AbortSignal,
  ): Promise<StorefrontProductCard[]> {
    const response = await api.get<unknown>(`/storefront/products/${encodeURIComponent(slug)}/related`, {
      params: { ...contextQuery(ctx), limit: String(Math.min(12, Math.max(4, limit))) },
      signal,
    });
    return normalizeCards(response.data);
  },

  async suggest(
    ctx: StorefrontContext,
    q: string,
    limit = 6,
    signal?: AbortSignal,
  ): Promise<StorefrontSuggestResponse> {
    const query = q.trim().slice(0, 80);
    if (query.length < 2) return { products: [], categories: [] };
    const response = await api.get<unknown>('/storefront/products/suggest', {
      params: { ...contextQuery(ctx), q: query, limit: String(Math.min(8, Math.max(1, limit))) },
      signal,
    });
    return normalizeSuggest(response.data, fallbackCurrency(ctx.country));
  },
};
