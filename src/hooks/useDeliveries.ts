// useDeliveries.ts - React Query hooks de entregas a domicilio (pos/deliveries)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fulfillmentKeys } from '@/hooks/useFulfillment';
import { deliveriesService } from '@/services/deliveries.service';
import type {
  DeliveryQuery,
  UpdateDeliveryPayload,
  UpdateDeliveryStatusPayload,
} from '@/types/deliveries';

export const deliveryKeys = {
  all: ['deliveries'] as const,
  list: (query: DeliveryQuery) => ['deliveries', 'list', query] as const,
  detail: (id: string) => ['deliveries', 'detail', id] as const,
};

/**
 * Paqueterías del catálogo para marcar un envío. Si el servidor aún no lo tiene (404)
 * o falla, queda la lista vacía y la pantalla conserva el campo de texto de siempre:
 * por eso no reintenta ni se trata como error. La clave cuelga del catálogo
 * (`fulfillmentKeys`), no de `deliveryKeys.all`: se relee cuando cambia el catálogo y no
 * cada vez que se marca un envío.
 */
export function useDeliveryCarriers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: fulfillmentKeys.carrierOptions(),
    queryFn: () => deliveriesService.getCarriers(),
    enabled: options?.enabled ?? true,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDeliveries(query: DeliveryQuery) {
  return useQuery({
    queryKey: deliveryKeys.list(query),
    queryFn: () => deliveriesService.getDeliveries(query),
    placeholderData: (prev) => prev,
    // Almacén deja la pantalla abierta: que aparezcan solas las nuevas.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useDelivery(id: string | null) {
  return useQuery({
    queryKey: deliveryKeys.detail(id ?? ''),
    queryFn: () => deliveriesService.getDelivery(id as string),
    enabled: !!id,
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDeliveryStatusPayload }) =>
      deliveriesService.updateStatus(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(id) });
    },
  });
}

export function useUpdateDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDeliveryPayload }) =>
      deliveriesService.update(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.detail(id) });
    },
  });
}
