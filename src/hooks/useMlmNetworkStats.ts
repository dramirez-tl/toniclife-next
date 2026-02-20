// hooks/useMlmNetworkStats.ts - React Query hooks for MLM network stats
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mlmNetworkStatsService } from '@/services/mlm-network-stats.service';
import type {
  NetworkStats,
  NetworkStatsStatus,
  TopPerformer,
} from '@/types/mlm-network-stats';

// Query keys
export const mlmNetworkStatsKeys = {
  all: ['mlm-network-stats'] as const,
  customer: (customerId: string) =>
    [...mlmNetworkStatsKeys.all, 'customer', customerId] as const,
  status: () => [...mlmNetworkStatsKeys.all, 'status'] as const,
  topBusinessPoints: () => [...mlmNetworkStatsKeys.all, 'top', 'business-points'] as const,
  topNetworkSize: () => [...mlmNetworkStatsKeys.all, 'top', 'network-size'] as const,
};

/**
 * Hook to get stats for a specific customer
 */
export function useCustomerNetworkStats(customerId: string, enabled = true) {
  return useQuery<NetworkStats>({
    queryKey: mlmNetworkStatsKeys.customer(customerId),
    queryFn: () => mlmNetworkStatsService.getCustomerStats(customerId),
    enabled: enabled && !!customerId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook to get network stats refresh status
 */
export function useNetworkStatsStatus() {
  return useQuery<NetworkStatsStatus>({
    queryKey: mlmNetworkStatsKeys.status(),
    queryFn: () => mlmNetworkStatsService.getStatus(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to get top performers by business points
 */
export function useTopByBusinessPoints() {
  return useQuery<TopPerformer[]>({
    queryKey: mlmNetworkStatsKeys.topBusinessPoints(),
    queryFn: () => mlmNetworkStatsService.getTopByBusinessPoints(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get top performers by network size
 */
export function useTopByNetworkSize() {
  return useQuery<TopPerformer[]>({
    queryKey: mlmNetworkStatsKeys.topNetworkSize(),
    queryFn: () => mlmNetworkStatsService.getTopByNetworkSize(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to trigger network stats refresh
 */
export function useRefreshNetworkStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mlmNetworkStatsService.refresh(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlmNetworkStatsKeys.all });
    },
  });
}
