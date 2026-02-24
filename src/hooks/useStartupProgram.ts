// useStartupProgram.ts - React Query hooks for Startup Program API
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { startupProgramService } from '@/services/startupProgram.service';
import type {
  ProgramQueryParams,
  CreateProgramDto,
  UpdateProgramDto,
  ProgramStatus,
  BonusQueryParams,
  RecruitsQueryParams,
} from '@/types/startup-program';

// ================================
// QUERY KEYS
// ================================

export const startupProgramKeys = {
  all: ['startup-programs'] as const,
  lists: () => [...startupProgramKeys.all, 'list'] as const,
  list: (params?: ProgramQueryParams) => [...startupProgramKeys.lists(), params] as const,
  details: () => [...startupProgramKeys.all, 'detail'] as const,
  detail: (id: string) => [...startupProgramKeys.details(), id] as const,
  // Admin bonus keys
  bonuses: (programId: string) => [...startupProgramKeys.all, 'bonuses', programId] as const,
  bonusList: (programId: string, params?: BonusQueryParams) =>
    [...startupProgramKeys.bonuses(programId), 'list', params] as const,
  bonusSummary: (programId: string, periodId?: string) =>
    [...startupProgramKeys.bonuses(programId), 'summary', periodId] as const,
  progress: (programId: string, customerId: string) =>
    [...startupProgramKeys.all, 'progress', programId, customerId] as const,
  // Distributor keys
  distributor: () => [...startupProgramKeys.all, 'distributor'] as const,
  activePrograms: () => [...startupProgramKeys.distributor(), 'active'] as const,
  myProgress: (programId: string) => [...startupProgramKeys.distributor(), 'progress', programId] as const,
  myBonuses: (params?: BonusQueryParams) => [...startupProgramKeys.distributor(), 'bonuses', params] as const,
  myBonusSummary: () => [...startupProgramKeys.distributor(), 'bonus-summary'] as const,
  myRecruits: (programId: string, params?: RecruitsQueryParams) =>
    [...startupProgramKeys.distributor(), 'recruits', programId, params] as const,
};

// ================================
// QUERY HOOKS
// ================================

export function useStartupPrograms(params: ProgramQueryParams = {}) {
  return useQuery({
    queryKey: startupProgramKeys.list(params),
    queryFn: () => startupProgramService.listPrograms(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useStartupProgram(id: string, enabled = true) {
  return useQuery({
    queryKey: startupProgramKeys.detail(id),
    queryFn: () => startupProgramService.getProgram(id),
    enabled: enabled && !!id,
  });
}

// ================================
// MUTATION HOOKS
// ================================

export function useCreateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateProgramDto) => startupProgramService.createProgram(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: startupProgramKeys.all });
    },
  });
}

export function useUpdateProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProgramDto }) =>
      startupProgramService.updateProgram(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: startupProgramKeys.all });
      queryClient.invalidateQueries({ queryKey: startupProgramKeys.detail(id) });
    },
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProgramStatus }) =>
      startupProgramService.changeStatus(id, { status }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: startupProgramKeys.all });
      queryClient.invalidateQueries({ queryKey: startupProgramKeys.detail(id) });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => startupProgramService.deleteProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: startupProgramKeys.all });
    },
  });
}

// ================================
// ADMIN: BONUS QUERY HOOKS
// ================================

export function useBonusList(programId: string, params: BonusQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: startupProgramKeys.bonusList(programId, params),
    queryFn: () => startupProgramService.listBonuses(programId, params),
    enabled: enabled && !!programId,
    staleTime: 30_000,
  });
}

export function useBonusSummary(programId: string, periodId?: string, enabled = true) {
  return useQuery({
    queryKey: startupProgramKeys.bonusSummary(programId, periodId),
    queryFn: () => startupProgramService.getBonusSummary(programId, periodId),
    enabled: enabled && !!programId,
    staleTime: 30_000,
  });
}

export function useDistributorProgress(programId: string, customerId: string, enabled = true) {
  return useQuery({
    queryKey: startupProgramKeys.progress(programId, customerId),
    queryFn: () => startupProgramService.getDistributorProgress(programId, customerId),
    enabled: enabled && !!programId && !!customerId,
  });
}

// ================================
// ADMIN: BONUS MUTATION HOOKS
// ================================

export function useApproveBonuses(programId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bonusIds: string[]) =>
      startupProgramService.approveBonuses(programId, bonusIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: startupProgramKeys.bonuses(programId) });
    },
  });
}

export function useMarkBonusesPaid(programId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bonusIds: string[]) =>
      startupProgramService.markBonusesPaid(programId, bonusIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: startupProgramKeys.bonuses(programId) });
    },
  });
}

// ================================
// DISTRIBUTOR: QUERY HOOKS
// ================================

export function useActivePrograms(enabled = true) {
  return useQuery({
    queryKey: startupProgramKeys.activePrograms(),
    queryFn: () => startupProgramService.getActivePrograms(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useMyProgress(programId: string, enabled = true) {
  return useQuery({
    queryKey: startupProgramKeys.myProgress(programId),
    queryFn: () => startupProgramService.getMyProgress(programId),
    enabled: enabled && !!programId,
    staleTime: 60_000,
  });
}

export function useMyBonuses(params: BonusQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: startupProgramKeys.myBonuses(params),
    queryFn: () => startupProgramService.getMyBonuses(params),
    enabled,
    staleTime: 60_000,
  });
}

export function useMyBonusSummary(enabled = true) {
  return useQuery({
    queryKey: startupProgramKeys.myBonusSummary(),
    queryFn: () => startupProgramService.getMyBonusSummary(),
    enabled,
    staleTime: 60_000,
  });
}

export function useMyRecruits(programId: string, params: RecruitsQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: startupProgramKeys.myRecruits(programId, params),
    queryFn: () => startupProgramService.getMyRecruits(programId, params),
    enabled: enabled && !!programId,
    staleTime: 60_000,
  });
}
