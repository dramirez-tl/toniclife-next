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

/** Estado de onboarding (needsKit) para gating del panel. */
export const useOnboardingStatus = (enabled = true) => {
  return useQuery({
    queryKey: myOrdersKeys.onboarding,
    queryFn: () => distributorApi.getOnboardingStatus(),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};
