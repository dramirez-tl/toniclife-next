// usePilot.ts - Hooks del gating del piloto (admin, panel y tienda).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  pilotService,
  type PilotFeature,
} from '@/services/pilot.service';

export const pilotKeys = {
  all: ['pilot'] as const,
  distributors: () => [...pilotKeys.all, 'distributors'] as const,
  search: (num: string) => [...pilotKeys.all, 'search', num] as const,
  checkout: () => [...pilotKeys.all, 'checkout'] as const,
  myFeatures: () => [...pilotKeys.all, 'my-features'] as const,
  publicState: () => [...pilotKeys.all, 'public'] as const,
};

// ===== Admin =====

export const usePilotDistributors = () =>
  useQuery({
    queryKey: pilotKeys.distributors(),
    queryFn: () => pilotService.listDistributors(),
    staleTime: 30 * 1000,
  });

export const usePilotCheckout = () =>
  useQuery({
    queryKey: pilotKeys.checkout(),
    queryFn: () => pilotService.getCheckout(),
    staleTime: 30 * 1000,
  });

export const useSetPilotCheckout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => pilotService.setCheckout(enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pilotKeys.checkout() });
      void qc.invalidateQueries({ queryKey: pilotKeys.publicState() });
    },
  });
};

export const useSetPilotFeature = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      customerId: string;
      feature: PilotFeature;
      enabled: boolean;
    }) =>
      pilotService.setFeature(input.customerId, input.feature, input.enabled),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pilotKeys.distributors() });
      void qc.invalidateQueries({ queryKey: pilotKeys.all });
    },
  });
};

// ===== Panel del distribuidor =====

/** Features liberadas para MI cuenta. Ante error asume todo bloqueado
 *  (fail-closed, espejo del server). */
export const useMyPilotFeatures = () =>
  useQuery({
    queryKey: pilotKeys.myFeatures(),
    queryFn: () => pilotService.getMyFeatures(),
    staleTime: 60 * 1000,
    retry: 1,
    placeholderData: {
      shareCart: false,
      publicRegistration: false,
      registerMember: false,
    },
  });

// ===== Tienda (público) =====

export const usePilotPublicState = () =>
  useQuery({
    queryKey: pilotKeys.publicState(),
    queryFn: () => pilotService.getPublicState(),
    staleTime: 60 * 1000,
    retry: 1,
    // Fail-closed también en la tienda: sin respuesta, compras bloqueadas.
    placeholderData: { checkoutEnabled: false },
  });
