// React Query hooks para promociones de temporada (mig 186).

import { useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { seasonalPromotionsService } from '@/services/seasonal-promotions.service';
import { isMigrationMissingError } from '@/lib/membership-campaigns';
import { seasonalFilterName, seasonalProductBadges, type SeasonalProductBadge } from '@/lib/seasonal-promotions';
import type {
  CreatePromoSeasonDto,
  CreateSeasonPromotionDto,
  PromoSeasonListQueryParams,
  SeasonUsageListQueryParams,
  UpdatePromoSeasonDto,
  UpdateSeasonPromotionDto,
} from '@/types/seasonal-promotion';

export const seasonalPromotionKeys = {
  all: ['seasonal-promotions'] as const,
  lists: () => [...seasonalPromotionKeys.all, 'list'] as const,
  list: (params: PromoSeasonListQueryParams) => [...seasonalPromotionKeys.lists(), params] as const,
  details: () => [...seasonalPromotionKeys.all, 'detail'] as const,
  detail: (id: string) => [...seasonalPromotionKeys.details(), id] as const,
  usages: (id: string, params: SeasonUsageListQueryParams = {}) =>
    [...seasonalPromotionKeys.detail(id), 'usages', params] as const,
  storefront: (country: string) => [...seasonalPromotionKeys.all, 'storefront', country] as const,
};

/** Sin la mig 186 el API contesta 503 siempre: reintentar solo retrasa el aviso. */
const retryUnlessMigrationMissing = (failureCount: number, error: unknown) =>
  !isMigrationMissingError(error) && failureCount < 1;

export const usePromoSeasons = (params: PromoSeasonListQueryParams = {}) =>
  useQuery({
    queryKey: seasonalPromotionKeys.list(params),
    queryFn: () => seasonalPromotionsService.listSeasons(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    retry: retryUnlessMigrationMissing,
  });

export const usePromoSeason = (id: string | undefined) =>
  useQuery({
    queryKey: id ? seasonalPromotionKeys.detail(id) : seasonalPromotionKeys.detail('disabled'),
    queryFn: () => seasonalPromotionsService.getSeason(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
    retry: retryUnlessMigrationMissing,
  });

export const useSeasonUsages = (id: string | undefined, params: SeasonUsageListQueryParams = {}) =>
  useQuery({
    queryKey: id
      ? seasonalPromotionKeys.usages(id, params)
      : seasonalPromotionKeys.usages('disabled', params),
    queryFn: () => seasonalPromotionsService.listUsages(id!, params),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
    retry: retryUnlessMigrationMissing,
  });

function useInvalidateSeason() {
  const queryClient = useQueryClient();
  return (seasonId?: string) => {
    if (seasonId) queryClient.invalidateQueries({ queryKey: seasonalPromotionKeys.detail(seasonId) });
    queryClient.invalidateQueries({ queryKey: seasonalPromotionKeys.lists() });
  };
}

export const useCreatePromoSeason = () => {
  const invalidate = useInvalidateSeason();
  return useMutation({
    mutationFn: (dto: CreatePromoSeasonDto) => seasonalPromotionsService.createSeason(dto),
    onSuccess: () => invalidate(),
  });
};

export const useUpdatePromoSeason = () => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSeason();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePromoSeasonDto }) =>
      seasonalPromotionsService.updateSeason(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(seasonalPromotionKeys.detail(id), data);
      invalidate(id);
    },
  });
};

export const useDeletePromoSeason = () => {
  const invalidate = useInvalidateSeason();
  return useMutation({
    mutationFn: (id: string) => seasonalPromotionsService.deleteSeason(id),
    onSuccess: () => invalidate(),
  });
};

/** Sube el arte; NO pisa el detalle (el formulario toma la liga de la respuesta). */
export const useUploadSeasonImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: string; file: File; onProgress?: (p: number) => void }) =>
      seasonalPromotionsService.uploadSeasonImage(id, file, onProgress),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: seasonalPromotionKeys.lists() }),
  });
};

export const useCreateSeasonPromotion = (seasonId: string) => {
  const invalidate = useInvalidateSeason();
  return useMutation({
    mutationFn: (dto: CreateSeasonPromotionDto) => seasonalPromotionsService.createPromotion(seasonId, dto),
    onSuccess: () => invalidate(seasonId),
  });
};

export const useUpdateSeasonPromotion = (seasonId: string) => {
  const invalidate = useInvalidateSeason();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSeasonPromotionDto }) =>
      seasonalPromotionsService.updatePromotion(id, dto),
    onSuccess: () => invalidate(seasonId),
  });
};

export const useDeleteSeasonPromotion = (seasonId: string) => {
  const invalidate = useInvalidateSeason();
  return useMutation({
    mutationFn: (id: string) => seasonalPromotionsService.deletePromotion(id),
    onSuccess: () => invalidate(seasonId),
  });
};

export const useUploadPromotionImage = (seasonId: string) => {
  const invalidate = useInvalidateSeason();
  return useMutation({
    mutationFn: ({ id, file, onProgress }: { id: string; file: File; onProgress?: (p: number) => void }) =>
      seasonalPromotionsService.uploadPromotionImage(id, file, onProgress),
    onSuccess: () => invalidate(seasonId),
  });
};

/** Tienda: temporadas vigentes/próximas del país (público). */
export const useStorefrontSeasonalPromotions = (country: string | undefined) =>
  useQuery({
    queryKey: seasonalPromotionKeys.storefront(country ?? 'none'),
    queryFn: () => seasonalPromotionsService.storefrontBundle(country!),
    enabled: !!country,
    staleTime: 60 * 1000,
    retry: 1,
  });

/**
 * Tienda: qué productos están HOY en una promoción de temporada del país y con qué insignia,
 * más el nombre de la temporada para el filtro del catálogo. Sale del mismo paquete que el
 * aviso de la tienda (una sola consulta compartida). Sin temporadas: mapa vacío y `null`.
 */
export function useSeasonalProductBadges(country: string | undefined): {
  badges: Map<string, SeasonalProductBadge>;
  seasonName: string | null;
} {
  const { data } = useStorefrontSeasonalPromotions(country);
  return useMemo(
    () => ({ badges: seasonalProductBadges(data?.seasons), seasonName: seasonalFilterName(data?.seasons) }),
    [data],
  );
}
