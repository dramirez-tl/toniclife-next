'use client';

// useKitAdmin.ts — TanStack Query del editor único de kits (contrato de kits
// §5.2): "¿Está listo para vender?", ventas por periodo y vaciar existencia
// propia. `data === null` en las lecturas = el servidor no expone la ruta (404)
// o el producto no es kit/paquete. Sin reintentos: un 404 no se arregla
// reintentando y un error real se ve rápido.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { kitAdminService } from '@/services/kit-admin.service';
import { inventoryKeys } from './useInventory';
import { kitAvailabilityKeys } from './useKitAvailability';

export const kitAdminKeys = {
  all: ['kit-admin'] as const,
  readiness: (productId: string) => [...kitAdminKeys.all, 'readiness', productId] as const,
  sales: (productId: string, periods: number) => [...kitAdminKeys.all, 'sales', productId, periods] as const,
  ownStockPreview: (productId: string) => [...kitAdminKeys.all, 'own-stock-preview', productId] as const,
};

export function useKitReadiness(productId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: kitAdminKeys.readiness(productId ?? 'disabled'),
    queryFn: () => kitAdminService.getReadiness(productId!),
    enabled: enabled && !!productId,
    staleTime: 15 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useKitSales(productId: string | undefined, periods = 3, enabled = true) {
  return useQuery({
    queryKey: kitAdminKeys.sales(productId ?? 'disabled', periods),
    queryFn: () => kitAdminService.getSales(productId!, periods),
    enabled: enabled && !!productId,
    staleTime: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Solo se consulta al abrir el diálogo (`enabled`). */
export function useKitOwnStockPreview(productId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: kitAdminKeys.ownStockPreview(productId ?? 'disabled'),
    queryFn: () => kitAdminService.getOwnStockPreview(productId!),
    enabled: enabled && !!productId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

/** Tras una escritura que cambia la evaluación del kit (receta, bonos, modo, existencias). */
export function useInvalidateKitAdmin(productId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: kitAdminKeys.readiness(productId) });
    queryClient.invalidateQueries({ queryKey: kitAvailabilityKeys.all });
  };
}

export function useClearKitOwnStock(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => kitAdminService.clearOwnStock(productId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kitAdminKeys.readiness(productId) });
      queryClient.invalidateQueries({ queryKey: kitAdminKeys.ownStockPreview(productId) });
      queryClient.invalidateQueries({ queryKey: kitAvailabilityKeys.all });
      // Existencias propias del SKU (sección Inventario) y kardex.
      queryClient.invalidateQueries({ queryKey: inventoryKeys.productStock(productId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.kardex() });
    },
  });
}
