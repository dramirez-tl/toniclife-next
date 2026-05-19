// React Query hooks for promotions (products con product_type='promotional')

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { promotionsService } from '@/services/promotions.service';
import type {
  BulkReplacePromotionComponentsDto,
  PromotionListQueryParams,
  UpsertPromotionRuleDto,
} from '@/types/promotion';
import { productKeys } from './useProducts';

export const promotionKeys = {
  all: ['promotions'] as const,
  lists: () => [...promotionKeys.all, 'list'] as const,
  list: (params: PromotionListQueryParams) =>
    [...promotionKeys.lists(), params] as const,
  details: () => [...promotionKeys.all, 'detail'] as const,
  detail: (id: string) => [...promotionKeys.details(), id] as const,
  components: (id: string) => [...promotionKeys.detail(id), 'components'] as const,
  rules: (id: string) => [...promotionKeys.detail(id), 'rules'] as const,
  eligibility: (id: string, customerId: string, countryId: string) =>
    [...promotionKeys.detail(id), 'eligibility', customerId, countryId] as const,
  available: (customerId: string, countryId: string) =>
    [...promotionKeys.all, 'available', customerId, countryId] as const,
};

// ================================================================
// LIST / DETAIL
// ================================================================

export const usePromotions = (params: PromotionListQueryParams = {}) => {
  return useQuery({
    queryKey: promotionKeys.list(params),
    queryFn: () => promotionsService.listPromotions(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

export const usePromotion = (id: string | undefined) => {
  return useQuery({
    queryKey: id ? promotionKeys.detail(id) : promotionKeys.detail('disabled'),
    queryFn: () => promotionsService.getPromotion(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

export const usePromotionComponents = (promotionId: string | undefined) => {
  return useQuery({
    queryKey: promotionId
      ? promotionKeys.components(promotionId)
      : promotionKeys.components('disabled'),
    queryFn: () => promotionsService.getComponents(promotionId!),
    enabled: !!promotionId,
    staleTime: 60 * 1000,
  });
};

// ================================================================
// COMPONENTES (compositor)
// ================================================================

export const useReplacePromotionComponents = (promotionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: BulkReplacePromotionComponentsDto) =>
      promotionsService.replaceComponents(promotionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: promotionKeys.components(promotionId),
      });
      queryClient.invalidateQueries({
        queryKey: promotionKeys.detail(promotionId),
      });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(promotionId),
      });
    },
  });
};

// ================================================================
// REGLAS DE CANJE
// ================================================================

export const usePromotionRules = (promotionId: string | undefined) => {
  return useQuery({
    queryKey: promotionId
      ? promotionKeys.rules(promotionId)
      : promotionKeys.rules('disabled'),
    queryFn: () => promotionsService.getRules(promotionId!),
    enabled: !!promotionId,
    staleTime: 60 * 1000,
  });
};

export const useUpsertPromotionRule = (promotionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpsertPromotionRuleDto) =>
      promotionsService.upsertRule(promotionId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: promotionKeys.rules(promotionId),
      });
      // Listado tambien depende de las reglas para mostrar resumen.
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
    },
  });
};

export const useRemovePromotionRule = (promotionId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (countryId: string) =>
      promotionsService.removeRule(promotionId, countryId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: promotionKeys.rules(promotionId),
      });
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
    },
  });
};

// ================================================================
// ELEGIBILIDAD (POS / cart)
// ================================================================

/**
 * Verifica si un cliente puede canjear la promo. Util para POS y portal
 * distribuidor antes de meter la promo al carrito.
 */
export const usePromotionEligibility = (
  promotionId: string | undefined,
  customerId: string | undefined,
  countryId: string | undefined,
) => {
  return useQuery({
    queryKey:
      promotionId && customerId && countryId
        ? promotionKeys.eligibility(promotionId, customerId, countryId)
        : promotionKeys.eligibility('disabled', 'disabled', 'disabled'),
    queryFn: () =>
      promotionsService.checkEligibility(
        promotionId!,
        customerId!,
        countryId!,
      ),
    enabled: !!promotionId && !!customerId && !!countryId,
    // No cachear demasiado: los puntos del periodo cambian con cada venta.
    staleTime: 30 * 1000,
    gcTime: 60 * 1000,
  });
};

/**
 * Lista promos disponibles para canje hoy por un cliente en un pais.
 */
export const useAvailablePromotionsForCustomer = (
  customerId: string | undefined,
  countryId: string | undefined,
) => {
  return useQuery({
    queryKey:
      customerId && countryId
        ? promotionKeys.available(customerId, countryId)
        : promotionKeys.available('disabled', 'disabled'),
    queryFn: () =>
      promotionsService.listAvailableForCustomer(customerId!, countryId!),
    enabled: !!customerId && !!countryId,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
