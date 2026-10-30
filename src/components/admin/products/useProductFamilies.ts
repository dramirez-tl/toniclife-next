'use client';

// useProductFamilies.ts - hooks de TanStack Query de familias de producto,
// variantes y guías de tallas (mig 178). Las mutaciones invalidan familias Y
// guías a la vez: la familia muestra el nombre de su guía y la guía cuenta las
// familias que la usan.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isMigrationPendingError } from '@/lib/product-families';
import { productFamiliesService } from '@/services/product-families.service';
import type {
  CreateProductFamilyDto,
  CreateSizeGuideDto,
  ProductFamilyListParams,
  SizeGuideListParams,
  UpdateProductFamilyDto,
  UpdateSizeGuideDto,
} from '@/types/product-family';

export const productFamilyKeys = {
  all: ['product-families'] as const,
  lists: () => [...productFamilyKeys.all, 'list'] as const,
  list: (params: ProductFamilyListParams) => [...productFamilyKeys.lists(), params] as const,
  detail: (id: string) => [...productFamilyKeys.all, 'detail', id] as const,
  variants: (id: string) => [...productFamilyKeys.all, 'variants', id] as const,
};

export const sizeGuideKeys = {
  all: ['size-guides'] as const,
  lists: () => [...sizeGuideKeys.all, 'list'] as const,
  list: (params: SizeGuideListParams) => [...sizeGuideKeys.lists(), params] as const,
  detail: (id: string) => [...sizeGuideKeys.all, 'detail', id] as const,
};

/** Sin la mig 178 el API contesta 503 siempre: reintentar solo retrasa el aviso. */
const retryUnlessMigrationPending = (failureCount: number, error: unknown) =>
  !isMigrationPendingError(error) && failureCount < 1;

// ================================
// Lectura
// ================================

export function useProductFamilies(params: ProductFamilyListParams = {}, enabled = true) {
  return useQuery({
    queryKey: productFamilyKeys.list(params),
    queryFn: () => productFamiliesService.listFamilies(params),
    enabled,
    staleTime: 60 * 1000,
    retry: retryUnlessMigrationPending,
  });
}

export function useProductFamily(id: string | null | undefined) {
  return useQuery({
    queryKey: productFamilyKeys.detail(id ?? 'disabled'),
    queryFn: () => productFamiliesService.getFamily(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
    retry: retryUnlessMigrationPending,
  });
}

/** Variantes hermanas de una familia; apagado sin familia. */
export function useFamilyVariants(familyId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: productFamilyKeys.variants(familyId ?? 'disabled'),
    queryFn: () => productFamiliesService.listFamilyVariants(familyId!),
    enabled: enabled && !!familyId,
    staleTime: 30 * 1000,
    retry: retryUnlessMigrationPending,
  });
}

export function useSizeGuides(params: SizeGuideListParams = {}, enabled = true) {
  return useQuery({
    queryKey: sizeGuideKeys.list(params),
    queryFn: () => productFamiliesService.listSizeGuides(params),
    enabled,
    staleTime: 60 * 1000,
    retry: retryUnlessMigrationPending,
  });
}

export function useSizeGuide(id: string | null | undefined) {
  return useQuery({
    queryKey: sizeGuideKeys.detail(id ?? 'disabled'),
    queryFn: () => productFamiliesService.getSizeGuide(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
    retry: retryUnlessMigrationPending,
  });
}

// ================================
// Escritura
// ================================

/** Tras guardar variantes desde la ficha: hermanas y contadores de la familia. */
export function useInvalidateProductFamilies() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: productFamilyKeys.all });
    queryClient.invalidateQueries({ queryKey: sizeGuideKeys.all });
  };
}

export function useCreateProductFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProductFamilyDto) => productFamiliesService.createFamily(dto),
    onSuccess: (family) => {
      queryClient.setQueryData(productFamilyKeys.detail(family.id), family);
      queryClient.invalidateQueries({ queryKey: productFamilyKeys.all });
      queryClient.invalidateQueries({ queryKey: sizeGuideKeys.all });
    },
  });
}

export function useUpdateProductFamily() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductFamilyDto }) =>
      productFamiliesService.updateFamily(id, dto),
    onSuccess: (family) => {
      queryClient.setQueryData(productFamilyKeys.detail(family.id), family);
      queryClient.invalidateQueries({ queryKey: productFamilyKeys.all });
      queryClient.invalidateQueries({ queryKey: sizeGuideKeys.all });
    },
  });
}

export function useCreateSizeGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSizeGuideDto) => productFamiliesService.createSizeGuide(dto),
    onSuccess: (guide) => {
      queryClient.setQueryData(sizeGuideKeys.detail(guide.id), guide);
      queryClient.invalidateQueries({ queryKey: sizeGuideKeys.all });
      queryClient.invalidateQueries({ queryKey: productFamilyKeys.all });
    },
  });
}

export function useUpdateSizeGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSizeGuideDto }) =>
      productFamiliesService.updateSizeGuide(id, dto),
    onSuccess: (guide) => {
      queryClient.setQueryData(sizeGuideKeys.detail(guide.id), guide);
      queryClient.invalidateQueries({ queryKey: sizeGuideKeys.all });
      queryClient.invalidateQueries({ queryKey: productFamilyKeys.all });
    },
  });
}
