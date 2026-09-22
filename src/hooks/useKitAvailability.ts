'use client';

// useKitAvailability.ts — TanStack Query para la disponibilidad de kits (solo
// lectura). `data === null` significa que el servidor aún no expone el
// endpoint (404): la UI lo muestra como "no disponible en este servidor".
// Sin reintentos: un 404 no se arregla reintentando y un error real se ve rápido.

import { useQuery } from '@tanstack/react-query';
import { kitAvailabilityService } from '@/services/kit-availability.service';

export const kitAvailabilityKeys = {
  all: ['kit-availability'] as const,
  lists: () => [...kitAvailabilityKeys.all, 'list'] as const,
  list: (countryId?: string, onlyActive = true) => [...kitAvailabilityKeys.lists(), countryId ?? 'all', onlyActive] as const,
  details: () => [...kitAvailabilityKeys.all, 'detail'] as const,
  detail: (productId: string, branchId?: string) => [...kitAvailabilityKeys.details(), productId, branchId ?? 'all'] as const,
};

export function useKitsAvailability(countryId?: string, options: { enabled?: boolean; onlyActive?: boolean } = {}) {
  const onlyActive = options.onlyActive ?? true;
  return useQuery({
    queryKey: kitAvailabilityKeys.list(countryId, onlyActive),
    queryFn: () => kitAvailabilityService.listAvailability({ countryId, onlyActive }),
    enabled: options.enabled ?? true,
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useKitAvailability(productId: string | undefined, branchId?: string, enabled = true) {
  return useQuery({
    queryKey: kitAvailabilityKeys.detail(productId ?? 'disabled', branchId),
    queryFn: () => kitAvailabilityService.getKitAvailability(productId!, branchId),
    enabled: enabled && !!productId,
    staleTime: 30 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
