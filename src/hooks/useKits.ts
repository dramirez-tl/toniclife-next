// React Query hooks for kits (products con product_type='kit')

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kitsService } from '@/services/kits.service';
import type {
  BulkReplaceComponentsDto,
  KitEnrollmentRequest,
  KitListQueryParams,
} from '@/types/kit';
import { productKeys } from './useProducts';

export const kitKeys = {
  all: ['kits'] as const,
  lists: () => [...kitKeys.all, 'list'] as const,
  list: (params: KitListQueryParams) => [...kitKeys.lists(), params] as const,
  details: () => [...kitKeys.all, 'detail'] as const,
  detail: (id: string) => [...kitKeys.details(), id] as const,
  components: (id: string) => [...kitKeys.detail(id), 'components'] as const,
};

/**
 * Listado de kits con filtros.
 */
export const useKits = (params: KitListQueryParams = {}) => {
  return useQuery({
    queryKey: kitKeys.list(params),
    queryFn: () => kitsService.listKits(params),
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Detalle de un kit por id.
 */
export const useKit = (id: string | undefined) => {
  return useQuery({
    queryKey: id ? kitKeys.detail(id) : kitKeys.detail('disabled'),
    queryFn: () => kitsService.getKit(id!),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
};

/**
 * Componentes (BoM) del kit.
 */
export const useKitComponents = (kitId: string | undefined) => {
  return useQuery({
    queryKey: kitId ? kitKeys.components(kitId) : kitKeys.components('disabled'),
    queryFn: () => kitsService.getComponents(kitId!),
    enabled: !!kitId,
    staleTime: 60 * 1000,
  });
};

/**
 * Reemplaza componentes del kit de golpe (UI tipo "compositor").
 */
export const useReplaceKitComponents = (kitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: BulkReplaceComponentsDto) =>
      kitsService.replaceComponents(kitId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitKeys.components(kitId) });
      queryClient.invalidateQueries({ queryKey: kitKeys.detail(kitId) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(kitId) });
    },
  });
};

/**
 * Inscribe un prospecto desde el POS: crea customer pendiente con sponsor.
 * Retorna customerId que se usa luego para cobrar el kit.
 */
export const useEnrollKitProspect = () => {
  return useMutation({
    mutationFn: (dto: KitEnrollmentRequest) => kitsService.enrollProspect(dto),
  });
};
