// hooks/useMyOrders.ts - Pedidos del distribuidor ("Mis Pedidos") + estado de
// onboarding (gating del panel). Patrón key-factory + hook de React Query.

import { useQuery } from '@tanstack/react-query';
import { distributorApi } from '@/services/distributorApi';

export const myOrdersKeys = {
  all: ['distributor-orders'] as const,
  lists: () => [...myOrdersKeys.all, 'list'] as const,
  list: (params: { page?: number; limit?: number }) =>
    [...myOrdersKeys.lists(), params] as const,
  onboarding: ['distributor-onboarding'] as const,
  enrollmentKits: ['distributor-enrollment-kits'] as const,
  pickupBranches: ['distributor-pickup-branches'] as const,
};

/** Pedidos paginados del distribuidor autenticado. */
export const useMyOrders = (params: { page?: number; limit?: number } = {}) => {
  return useQuery({
    queryKey: myOrdersKeys.list(params),
    queryFn: () => distributorApi.getMyOrders(params),
    staleTime: 60 * 1000, // 1 min
    gcTime: 5 * 60 * 1000,
  });
};

/**
 * Estado de onboarding (needsKit) para gating del panel.
 * `refetchMs` activa polling (se usa en la pantalla de "confirmando pago").
 */
export const useOnboardingStatus = (enabled = true, refetchMs?: number) => {
  return useQuery({
    queryKey: myOrdersKeys.onboarding,
    queryFn: () => distributorApi.getOnboardingStatus(),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    refetchInterval: refetchMs ?? false,
  });
};

/** Kits de inscripción disponibles para el miembro. */
export const useEnrollmentKits = (enabled = true) => {
  return useQuery({
    queryKey: myOrdersKeys.enrollmentKits,
    queryFn: () => distributorApi.getEnrollmentKits(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/** Sucursales para recoger el kit. */
export const usePickupBranches = (enabled = true) => {
  return useQuery({
    queryKey: myOrdersKeys.pickupBranches,
    queryFn: () => distributorApi.getPickupBranches(),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};
