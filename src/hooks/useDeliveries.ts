// useDeliveries.ts - React Query hooks de entregas a domicilio (pos/deliveries)

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
