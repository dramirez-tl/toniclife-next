// hooks/useFulfillment.ts — React Query de las rutas de surtido (contrato §6/§7.5).

'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fulfillmentService } from '@/services/fulfillment.service';
import type {
  Carrier,
  CarriersResponse,
  CreateCarrierPayload,
  FulfillmentDiagnosticsResponse,
  FulfillmentHistoryResponse,
  FulfillmentRoutesResponse,
  FulfillmentSimulatePayload,
  FulfillmentSimulateResponse,
  FulfillmentWarehouseOption,
  SaveFulfillmentRoutesPayload,
  SaveFulfillmentRoutesResponse,
  UpdateCarrierPayload,
} from '@/types/fulfillment';

export const fulfillmentKeys = {
  all: ['fulfillment'] as const,
  routes: () => [...fulfillmentKeys.all, 'routes'] as const,
  diagnostics: () => [...fulfillmentKeys.all, 'diagnostics'] as const,
  warehouseOptions: () => [...fulfillmentKeys.all, 'warehouse-options'] as const,
  history: () => [...fulfillmentKeys.all, 'history'] as const,
  carriers: () => [...fulfillmentKeys.all, 'carriers'] as const,
  carriersOf: (country: string) => [...fulfillmentKeys.carriers(), 'country', country.trim().toUpperCase()] as const,
  /**
   * Paqueterías activas que se ofrecen al marcar un envío (Entregas a domicilio). Cuelgan
   * del catálogo para que se relean con él cuando alguien lo cambia.
   */
  carrierOptions: () => [...fulfillmentKeys.carriers(), 'delivery-options'] as const,
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

// ── Paqueterías por país de la tienda (mig 200) ──

/**
 * Paqueterías de un país de la tienda (MX incluye Frontera). Sin reintentos: un servidor
 * que aún no tiene el catálogo responde 404 y la pantalla lo dice en vez de insistir.
 */
export function useCarriers(country: string, options: QueryOptions = {}) {
  return useQuery<CarriersResponse>({
    queryKey: fulfillmentKeys.carriersOf(country),
    queryFn: () => fulfillmentService.getCarriers(country),
    enabled: (options.enabled ?? true) && !!country.trim(),
    retry: false,
    staleTime: STALE_ROUTES,
    gcTime: GC,
  });
}

/**
 * Agrega una paquetería. El componente decide el toast (errores `FUL_CARRIER_*`). Tras
 * guardar se relee el catálogo de todos los países (la predeterminada de uno cambia a las
 * demás) y, con él, las opciones de Entregas a domicilio.
 */
export function useCreateCarrier() {
  const queryClient = useQueryClient();
  return useMutation<Carrier, unknown, CreateCarrierPayload>({
    mutationFn: (payload) => fulfillmentService.createCarrier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fulfillmentKeys.carriers() });
    },
  });
}

/** Cambia una paquetería (datos, predeterminada, activar o desactivar). */
export function useUpdateCarrier() {
  const queryClient = useQueryClient();
  return useMutation<Carrier, unknown, { id: string; payload: UpdateCarrierPayload }>({
    mutationFn: ({ id, payload }) => fulfillmentService.updateCarrier(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fulfillmentKeys.carriers() });
    },
  });
}
