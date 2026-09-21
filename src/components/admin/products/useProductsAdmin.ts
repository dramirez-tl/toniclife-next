'use client';

// useProductsAdmin.ts — hooks de TanStack Query del catálogo admin
// (listado en servidor, salud, ficha por secciones). Invalida también las keys
// de `useProducts` para que el resto del admin vea los cambios.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/hooks/useProducts';
import {
  productsAdminService,
  type AdminProduct,
  type AdminSetPriceDto,
  type AdminUpdateProductDto,
  type CatalogAdminListParams,
  type CatalogBulkDto,
  type ContentLanguage,
  type DuplicateProductDto,
  type ProductContent,
  type StoreCountryCode,
} from '@/services/products-admin.service';

export const productsAdminKeys = {
  all: ['products-admin'] as const,
  lists: () => [...productsAdminKeys.all, 'list'] as const,
  list: (params: CatalogAdminListParams) => [...productsAdminKeys.lists(), params] as const,
  health: (country?: StoreCountryCode) => [...productsAdminKeys.all, 'health', country ?? 'all'] as const,
  healthRoot: () => [...productsAdminKeys.all, 'health'] as const,
  product: (id: string) => [...productsAdminKeys.all, 'product', id] as const,
  content: (id: string) => [...productsAdminKeys.all, 'content', id] as const,
  slugHistory: (id: string) => [...productsAdminKeys.all, 'slug-history', id] as const,
  slugCheck: (slug: string, excludeId?: string) =>
    [...productsAdminKeys.all, 'slug-check', slug, excludeId ?? ''] as const,
  prices: (id: string, activeOnly: boolean) => [...productsAdminKeys.all, 'prices', id, activeOnly] as const,
  pricesRoot: (id: string) => [...productsAdminKeys.all, 'prices', id] as const,
  history: (id: string, page: number) => [...productsAdminKeys.all, 'history', id, page] as const,
  historyRoot: (id: string) => [...productsAdminKeys.all, 'history', id] as const,
  storefrontStatus: (id: string) => [...productsAdminKeys.all, 'storefront-status', id] as const,
  rowHealth: (id: string) => [...productsAdminKeys.all, 'row-health', id] as const,
  units: () => ['products-admin-units'] as const,
};

// ================================
// Colección
// ================================
/**
 * Unidades de medida para el selector de la ficha. Sin reintentos: si el API aún
 * no expone GET /catalog-admin/units (404) o falla, la ficha degrada de inmediato
 * al campo libre en vez de quedarse esperando.
 */
export function useProductUnits(enabled = true) {
  return useQuery({
    queryKey: productsAdminKeys.units(),
    queryFn: () => productsAdminService.listUnits(),
    staleTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    enabled,
  });
}

export function useCatalogAdminProducts(params: CatalogAdminListParams, enabled = true) {
  return useQuery({
    queryKey: productsAdminKeys.list(params),
    queryFn: () => productsAdminService.listProducts(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    enabled,
  });
}

export function useCatalogHealth(country?: StoreCountryCode) {
  return useQuery({
    queryKey: productsAdminKeys.health(country),
    queryFn: () => productsAdminService.getHealth(country),
    staleTime: 60 * 1000,
  });
}

export function useCatalogBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CatalogBulkDto) => productsAdminService.bulk(dto),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productsAdminKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

// ================================
// Ficha
// ================================
export function useAdminProduct(id: string, enabled = true) {
  return useQuery<AdminProduct>({
    queryKey: productsAdminKeys.product(id),
    queryFn: () => productsAdminService.getProduct(id),
    enabled: enabled && !!id,
    staleTime: 0,
  });
}

/** Tras cualquier escritura de la ficha: refresca lo derivado (salud, estado en tienda, historial). */
export function useInvalidateProductDerived(id: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: productsAdminKeys.storefrontStatus(id) });
    queryClient.invalidateQueries({ queryKey: productsAdminKeys.rowHealth(id) });
    queryClient.invalidateQueries({ queryKey: productsAdminKeys.historyRoot(id) });
    queryClient.invalidateQueries({ queryKey: productsAdminKeys.lists() });
    queryClient.invalidateQueries({ queryKey: productsAdminKeys.healthRoot() });
    queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
  };
}

export function usePatchAdminProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AdminUpdateProductDto) => productsAdminService.updateProduct(id, dto),
    onSuccess: (product) => {
      queryClient.setQueryData(productsAdminKeys.product(id), product);
    },
  });
}

export function useDuplicateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: DuplicateProductDto) => productsAdminService.duplicate(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsAdminKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

export function useProductContent(id: string, enabled = true) {
  return useQuery({
    queryKey: productsAdminKeys.content(id),
    queryFn: () => productsAdminService.getContent(id),
    enabled: enabled && !!id,
    staleTime: 0,
  });
}

export function usePutProductContent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ language, content }: { language: ContentLanguage; content: ProductContent }) =>
      productsAdminService.putContent(id, language, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsAdminKeys.content(id) });
    },
  });
}

export function useSlugHistory(id: string, enabled = true) {
  return useQuery({
    queryKey: productsAdminKeys.slugHistory(id),
    queryFn: () => productsAdminService.getSlugHistory(id),
    enabled: enabled && !!id,
  });
}

export function useDeleteSlugHistory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => productsAdminService.deleteSlugHistory(id, slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsAdminKeys.slugHistory(id) });
    },
  });
}

/** Unicidad de la URL en vivo; `slug` ya debe venir con retraso (debounce) aplicado. */
export function useSlugCheck(slug: string, excludeId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: productsAdminKeys.slugCheck(slug, excludeId),
    queryFn: () => productsAdminService.checkSlug(slug, excludeId),
    enabled: enabled && slug.length > 0,
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function useReorderProductImages(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageIds: string[]) => productsAdminService.reorderImages(id, imageIds),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.images(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(id) });
    },
  });
}

export function useAdminProductPrices(id: string, activeOnly: boolean, enabled = true) {
  return useQuery({
    queryKey: productsAdminKeys.prices(id, activeOnly),
    queryFn: () => productsAdminService.getPrices(id, activeOnly),
    enabled: enabled && !!id,
    staleTime: 0,
  });
}

export function useSetAdminProductPrice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: AdminSetPriceDto) => productsAdminService.setPrice(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productsAdminKeys.pricesRoot(id) });
      queryClient.invalidateQueries({ queryKey: productKeys.prices(id) });
    },
  });
}

export function useProductHistory(id: string, page: number, limit: number, enabled = true) {
  return useQuery({
    queryKey: productsAdminKeys.history(id, page),
    queryFn: () => productsAdminService.getHistory(id, page, limit),
    enabled: enabled && !!id,
    placeholderData: keepPreviousData,
  });
}

export function useStorefrontStatus(id: string, enabled = true) {
  return useQuery({
    queryKey: productsAdminKeys.storefrontStatus(id),
    queryFn: () => productsAdminService.getStorefrontStatus(id),
    enabled: enabled && !!id,
    staleTime: 30 * 1000,
    retry: false,
  });
}

/**
 * Salud de UN producto para el chip "Ficha {score}%". No hay endpoint por id:
 * se pide el listado admin filtrado por clave exacta y se toma la fila del id.
 */
export function useProductRowHealth(id: string, code: string | undefined) {
  return useQuery({
    queryKey: productsAdminKeys.rowHealth(id),
    queryFn: async () => {
      const res = await productsAdminService.listProducts({ sku: code, limit: 10, page: 1 });
      return res.data.find((row) => row.id === id) ?? null;
    },
    enabled: !!id && !!code,
    staleTime: 30 * 1000,
    retry: false,
  });
}
