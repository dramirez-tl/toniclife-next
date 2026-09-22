// React Query hooks for kits (products con product_type='kit')
//
// El detalle del kit ya no vive aquí: la ficha única (/admin/productos/[id]/
// editar?seccion=kit) lee el producto con useAdminProduct (contrato de kits
// §5.2). Quedan el listado de la pestaña Kits, la receta y los bonos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kitsService, type KitComponentsScope } from '@/services/kits.service';
import type {
  BulkReplaceComponentsDto,
  KitEnrollmentRequest,
  KitListQueryParams,
  CreateKitBonusInput,
  UpdateKitBonusInput,
} from '@/types/kit';
import { productKeys } from './useProducts';
import { kitAdminKeys } from './useKitAdmin';
import { kitAvailabilityKeys } from './useKitAvailability';

export const kitKeys = {
  all: ['kits'] as const,
  lists: () => [...kitKeys.all, 'list'] as const,
  list: (params: KitListQueryParams) => [...kitKeys.lists(), params] as const,
  details: () => [...kitKeys.all, 'detail'] as const,
  detail: (id: string) => [...kitKeys.details(), id] as const,
  components: (id: string, scope: KitComponentsScope = 'all') => [...kitKeys.detail(id), 'components', scope] as const,
  componentsRoot: (id: string) => [...kitKeys.detail(id), 'components'] as const,
  bonuses: (id: string) => [...kitKeys.detail(id), 'bonuses'] as const,
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
 * Componentes (BoM) del kit. `scope: 'global'` = solo la receta global
 * (la que edita la ficha y reemplaza PUT components/bulk sin país).
 */
export const useKitComponents = (kitId: string | undefined, scope: KitComponentsScope = 'all') => {
  return useQuery({
    queryKey: kitId ? kitKeys.components(kitId, scope) : kitKeys.components('disabled', scope),
    queryFn: () => kitsService.getComponents(kitId!, scope),
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
      queryClient.invalidateQueries({ queryKey: kitKeys.componentsRoot(kitId) });
      queryClient.invalidateQueries({ queryKey: kitKeys.detail(kitId) });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(kitId) });
      // La receta cambió: la disponibilidad (listado y ficha) y "listo para vender" se recalculan.
      queryClient.invalidateQueries({ queryKey: kitAvailabilityKeys.all });
      queryClient.invalidateQueries({ queryKey: kitAdminKeys.readiness(kitId) });
    },
  });
};

// ============================================================================
// BONOS DE INSCRIPCION DEL KIT
// ============================================================================

/** Reglas de bono del kit (vigentes e historicas). */
export const useKitBonuses = (kitId: string | undefined) => {
  return useQuery({
    queryKey: kitId ? kitKeys.bonuses(kitId) : kitKeys.bonuses('disabled'),
    queryFn: () => kitsService.getBonuses(kitId!),
    enabled: !!kitId,
    staleTime: 60 * 1000,
  });
};

export const useCreateKitBonus = (kitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateKitBonusInput) =>
      kitsService.createBonus(kitId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitKeys.bonuses(kitId) });
      queryClient.invalidateQueries({ queryKey: kitAdminKeys.readiness(kitId) });
    },
  });
};

export const useUpdateKitBonus = (kitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bonusId,
      dto,
    }: {
      bonusId: string;
      dto: UpdateKitBonusInput;
    }) => kitsService.updateBonus(kitId, bonusId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitKeys.bonuses(kitId) });
      queryClient.invalidateQueries({ queryKey: kitAdminKeys.readiness(kitId) });
    },
  });
};

export const useDeactivateKitBonus = (kitId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bonusId: string) =>
      kitsService.deactivateBonus(kitId, bonusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitKeys.bonuses(kitId) });
      queryClient.invalidateQueries({ queryKey: kitAdminKeys.readiness(kitId) });
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
