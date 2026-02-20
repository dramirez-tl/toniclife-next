// hooks/useMlmRanks.ts - React Query hooks for MLM ranks
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mlmRanksService } from '@/services/mlm-ranks.service';
import type {
  MlmRank,
  RankQualification,
  RankSummary,
  CreateRankDto,
  UpdateRankDto,
} from '@/types/mlm-ranks';

// Query keys
export const mlmRankKeys = {
  all: ['mlm-ranks'] as const,
  lists: () => [...mlmRankKeys.all, 'list'] as const,
  detail: (id: string) => [...mlmRankKeys.all, 'detail', id] as const,
  qualification: (customerId: string, periodId: string) =>
    [...mlmRankKeys.all, 'qualification', customerId, periodId] as const,
  summary: (periodId: string) => [...mlmRankKeys.all, 'summary', periodId] as const,
};

/**
 * Hook to get all ranks
 */
export function useRanks() {
  return useQuery<MlmRank[]>({
    queryKey: mlmRankKeys.lists(),
    queryFn: () => mlmRanksService.getRanks(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get rank by ID
 */
export function useRankById(id: string, enabled = true) {
  return useQuery<MlmRank>({
    queryKey: mlmRankKeys.detail(id),
    queryFn: () => mlmRanksService.getRankById(id),
    enabled: enabled && !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to create a rank
 */
export function useCreateRank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRankDto) => mlmRanksService.createRank(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlmRankKeys.all });
    },
  });
}

/**
 * Hook to update a rank
 */
export function useUpdateRank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRankDto }) =>
      mlmRanksService.updateRank(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: mlmRankKeys.all });
      queryClient.invalidateQueries({ queryKey: mlmRankKeys.detail(id) });
    },
  });
}

/**
 * Hook to get rank qualification
 */
export function useRankQualification(customerId: string, periodId: string, enabled = true) {
  return useQuery<RankQualification>({
    queryKey: mlmRankKeys.qualification(customerId, periodId),
    queryFn: () => mlmRanksService.getQualification(customerId, periodId),
    enabled: enabled && !!customerId && !!periodId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get rank summary for a period
 */
export function useRankSummary(periodId: string, enabled = true) {
  return useQuery<RankSummary>({
    queryKey: mlmRankKeys.summary(periodId),
    queryFn: () => mlmRanksService.getSummary(periodId),
    enabled: enabled && !!periodId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to trigger rank calculation
 */
export function useCalculateRanks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mlmRanksService.calculateRanks(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlmRankKeys.all });
    },
  });
}
