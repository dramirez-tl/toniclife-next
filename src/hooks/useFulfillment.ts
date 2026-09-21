// hooks/useFulfillment.ts — React Query de las rutas de surtido (contrato §6/§7.5).

'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fulfillmentService } from '@/services/fulfillment.service';
import type {
  FulfillmentDiagnosticsResponse,
  FulfillmentHistoryResponse,
  FulfillmentRoutesResponse,
  FulfillmentSimulatePayload,
  FulfillmentSimulateResponse,
  FulfillmentWarehouseOption,
  SaveFulfillmentRoutesPayload,
  SaveFulfillmentRoutesResponse,
} from '@/types/fulfillment';

export const fulfillmentKeys = {
  all: ['fulfillment'] as const,
  routes: () => [...fulfillmentKeys.all, 'routes'] as const,
  diagnostics: () => [...fulfillmentKeys.all, 'diagnostics'] as const,
  warehouseOptions: () => [...fulfillmentKeys.all, 'warehouse-options'] as const,
  history: () => [...fulfillmentKeys.all, 'history'] as const,
};

const STALE_ROUTES = 30 * 1000;
const STALE_DIAGNOSTICS = 60 * 1000;
const STALE_OPTIONS = 10 * 60 * 1000;
const GC = 5 * 60 * 1000;

interface QueryOptions {
  enabled?: boolean;
  /** false = no reintenta (p. ej. el badge de sucursales no debe insistir si el API aún no lo tiene). */
  retry?: boolean;
}

export function useFulfillmentRoutes(options: QueryOptions = {}) {
  return useQuery<FulfillmentRoutesResponse>({
    queryKey: fulfillmentKeys.routes(),
    queryFn: () => fulfillmentService.getRoutes(),
    enabled: options.enabled ?? true,
    retry: options.retry === false ? false : 1,
    staleTime: STALE_ROUTES,
    gcTime: GC,
  });
}

export function useFulfillmentDiagnostics(options: QueryOptions = {}) {
  return useQuery<FulfillmentDiagnosticsResponse>({
    queryKey: fulfillmentKeys.diagnostics(),
    queryFn: () => fulfillmentService.getDiagnostics(),
    enabled: options.enabled ?? true,
    retry: options.retry === false ? false : 1,
    staleTime: STALE_DIAGNOSTICS,
    gcTime: GC,
  });
}

export function useFulfillmentWarehouseOptions(options: QueryOptions = {}) {
  return useQuery<FulfillmentWarehouseOption[]>({
    queryKey: fulfillmentKeys.warehouseOptions(),
    queryFn: () => fulfillmentService.getWarehouseOptions(),
    enabled: options.enabled ?? true,
    staleTime: STALE_OPTIONS,
    gcTime: STALE_OPTIONS,
  });
}

export function useFulfillmentHistory(enabled: boolean, limit = 50) {
  return useInfiniteQuery<FulfillmentHistoryResponse>({
    queryKey: [...fulfillmentKeys.history(), limit],
    queryFn: ({ pageParam }) =>
      fulfillmentService.getHistory({ limit, cursor: (pageParam as string | null) ?? null }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled,
    staleTime: STALE_ROUTES,
    gcTime: GC,
  });
}

/** Guarda rutas. El componente decide el toast y maneja los 409 (`FUL_*`). */
export function useSaveFulfillmentRoutes() {
  const queryClient = useQueryClient();
  return useMutation<SaveFulfillmentRoutesResponse, unknown, SaveFulfillmentRoutesPayload>({
    mutationFn: (payload) => fulfillmentService.saveRoutes(payload),
    onSuccess: (data) => {
      // El PUT responde el cuerpo del GET: se pinta de inmediato, sin esperar el refetch.
      const { applied: _applied, ...routes } = data;
      void _applied;
      queryClient.setQueryData<FulfillmentRoutesResponse>(fulfillmentKeys.routes(), routes);
      queryClient.invalidateQueries({ queryKey: fulfillmentKeys.diagnostics() });
      queryClient.invalidateQueries({ queryKey: fulfillmentKeys.history() });
      queryClient.invalidateQueries({ queryKey: fulfillmentKeys.warehouseOptions() });
    },
  });
}

/** Simulador: solo lectura en el API, por eso es mutation sin invalidaciones. */
export function useSimulateFulfillment() {
  return useMutation<FulfillmentSimulateResponse, unknown, FulfillmentSimulatePayload>({
    mutationFn: (payload) => fulfillmentService.simulate(payload),
  });
}
