// useSupplies.ts - Hooks de React Query de los INSUMOS de TI.
// Misma convención que useAssets.ts: key factory + query hooks + mutations que
// invalidan. Los toasts se disparan desde el componente, no aquí.

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { suppliesService } from '@/services/supplies.service';
import { assetLabelKeys } from '@/hooks/useAssets';
import type {
  CreateSupplyDto,
  CreateSupplyMovementDto,
  SupplyMovementQueryParams,
  SupplyQueryParams,
  UpdateSupplyDto,
} from '@/types/supply';

// ================================
// KEY FACTORY
// ================================

export const supplyKeys = {
  all: ['it-supplies'] as const,
  lists: () => [...supplyKeys.all, 'list'] as const,
  list: (params: SupplyQueryParams) => [...supplyKeys.lists(), params] as const,
  details: () => [...supplyKeys.all, 'detail'] as const,
  detail: (id: string) => [...supplyKeys.details(), id] as const,
  stats: () => [...supplyKeys.all, 'stats'] as const,
  movements: (id: string, params: SupplyMovementQueryParams) =>
    [...supplyKeys.all, 'movements', id, params] as const,
};

// ================================
// QUERIES
// ================================

export function useSupplies(params: SupplyQueryParams = {}) {
  return useQuery({
    queryKey: supplyKeys.list(params),
    queryFn: () => suppliesService.getSupplies(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useSupply(id: string | undefined) {
  return useQuery({
    queryKey: supplyKeys.detail(id ?? ''),
    queryFn: () => suppliesService.getSupplyById(id as string),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useSupplyStats() {
  return useQuery({
    queryKey: supplyKeys.stats(),
    queryFn: () => suppliesService.getStats(),
    staleTime: 60 * 1000,
  });
}

export function useSupplyMovements(id: string | undefined, params: SupplyMovementQueryParams = {}) {
  return useQuery({
    queryKey: supplyKeys.movements(id ?? '', params),
    queryFn: () => suppliesService.getMovements(id as string, params),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}

// ================================
// MUTATIONS
// ================================

/** Invalida listas + estadísticas (y opcionalmente el detalle de un insumo). */
function useInvalidateSupplies() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: supplyKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: supplyKeys.stats() });
    if (id) {
      void queryClient.invalidateQueries({ queryKey: supplyKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: [...supplyKeys.all, 'movements', id] });
    }
  };
}

export function useCreateSupply() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: (dto: CreateSupplyDto) => suppliesService.createSupply(dto),
    onSuccess: (_data, dto) => {
      invalidate();
      // Si vino con etiqueta, el inventario de etiquetas también cambió.
      if (dto.labelCode) void queryClient.invalidateQueries({ queryKey: assetLabelKeys.all });
    },
  });
}

export function useUpdateSupply() {
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSupplyDto }) =>
      suppliesService.updateSupply(id, dto),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useDeleteSupply() {
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: (id: string) => suppliesService.deleteSupply(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export function useRestoreSupply() {
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: (id: string) => suppliesService.restoreSupply(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}

export function useAddSupplyMovement() {
  const invalidate = useInvalidateSupplies();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateSupplyMovementDto }) =>
      suppliesService.addMovement(id, dto),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

// ================================
// ETIQUETA
// ================================

/** Las operaciones de etiqueta tocan dos inventarios: insumos y etiquetas. */
function useInvalidateSupplyLabels() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateSupplies();
  return (id: string) => {
    invalidate(id);
    void queryClient.invalidateQueries({ queryKey: assetLabelKeys.all });
  };
}

export function useLinkSupplyLabel() {
  const invalidate = useInvalidateSupplyLabels();
  return useMutation({
    mutationFn: ({ supplyId, code }: { supplyId: string; code: string }) =>
      suppliesService.linkLabel(supplyId, code),
    onSuccess: (_data, { supplyId }) => invalidate(supplyId),
  });
}

export function useUnlinkSupplyLabel() {
  const invalidate = useInvalidateSupplyLabels();
  return useMutation({
    mutationFn: ({
      supplyId,
      voidLabel,
      reason,
    }: {
      supplyId: string;
      voidLabel?: boolean;
      reason?: string;
    }) => suppliesService.unlinkLabel(supplyId, { void: voidLabel, reason }),
    onSuccess: (_data, { supplyId }) => invalidate(supplyId),
  });
}

export function useMarkSupplyLabelPrinted() {
  const invalidate = useInvalidateSupplyLabels();
  return useMutation({
    mutationFn: (supplyId: string) => suppliesService.markLabelPrinted(supplyId),
    onSuccess: (_data, supplyId) => invalidate(supplyId),
  });
}
