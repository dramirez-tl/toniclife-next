// hooks/useMlmRollover.ts - React Query hooks for MLM rollover
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mlmRolloverService } from '@/services/mlm-rollover.service';
import type {
  RolloverStatus,
  RolloverStats,
  RolloverHistory,
  EffectiveSponsor,
} from '@/types/mlm-rollover';

// Query keys
export const mlmRolloverKeys = {
  all: ['mlm-rollover'] as const,
  status: (periodId: string) => [...mlmRolloverKeys.all, 'status', periodId] as const,
  stats: (periodId: string) => [...mlmRolloverKeys.all, 'stats', periodId] as const,
  history: (customerId: string) => [...mlmRolloverKeys.all, 'history', customerId] as const,
  effectiveSponsor: (customerId: string) =>
    [...mlmRolloverKeys.all, 'effective-sponsor', customerId] as const,
};

/**
 * Hook to get rollover status for a period
 */
export function useRolloverStatus(periodId: string, enabled = true) {
  return useQuery<RolloverStatus>({
    queryKey: mlmRolloverKeys.status(periodId),
    queryFn: () => mlmRolloverService.getStatus(periodId),
    enabled: enabled && !!periodId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get rollover stats for a period
 */
export function useRolloverStats(periodId: string, enabled = true) {
  return useQuery<RolloverStats>({
    queryKey: mlmRolloverKeys.stats(periodId),
    queryFn: () => mlmRolloverService.getStats(periodId),
    enabled: enabled && !!periodId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get rollover history for a customer
 */
export function useRolloverHistory(customerId: string, enabled = true) {
  return useQuery<RolloverHistory[]>({
    queryKey: mlmRolloverKeys.history(customerId),
    queryFn: () => mlmRolloverService.getHistory(customerId),
    enabled: enabled && !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get effective sponsor for a customer
 */
export function useEffectiveSponsor(customerId: string, enabled = true) {
  return useQuery<EffectiveSponsor>({
    queryKey: mlmRolloverKeys.effectiveSponsor(customerId),
    queryFn: () => mlmRolloverService.getEffectiveSponsor(customerId),
    enabled: enabled && !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to trigger rollover calculation
 */
export function useCalculateRollover() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (periodId: string) => mlmRolloverService.calculate(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlmRolloverKeys.all });
    },
  });
}
