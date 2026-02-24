// useBranches.ts - React Query hooks for Branches API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 4.2.4

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { branchesService } from '@/services/branches.service';
import type { Branch, BranchQueryParams, CreateBranchDto, UpdateBranchDto } from '@/types/branch';

// Query keys
export const branchKeys = {
  all: ['branches'] as const,
  lists: () => [...branchKeys.all, 'list'] as const,
  list: (params: BranchQueryParams) => [...branchKeys.lists(), params] as const,
  active: () => [...branchKeys.all, 'active'] as const,
  detail: (id: string) => [...branchKeys.all, 'detail', id] as const,
  byCode: (code: string) => [...branchKeys.all, 'code', code] as const,
};

/**
 * Hook to fetch active branches (for selects/dropdowns)
 */
export function useActiveBranches() {
  return useQuery({
    queryKey: branchKeys.active(),
    queryFn: () => branchesService.getActiveBranches(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch branches with pagination and filters (admin)
 */
export function useBranches(params: BranchQueryParams = {}) {
  return useQuery({
    queryKey: branchKeys.list(params),
    queryFn: () => branchesService.getBranches(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Hook to fetch a single branch by ID
 */
export function useBranch(id: string) {
  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => branchesService.getBranchById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch a branch by code
 */
export function useBranchByCode(code: string) {
  return useQuery({
    queryKey: branchKeys.byCode(code),
    queryFn: () => branchesService.getBranchByCode(code),
    enabled: !!code,
  });
}

// ================================
// MUTATION HOOKS
// ================================

interface MutationOptions<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to create a new branch
 */
export function useCreateBranch(options?: MutationOptions<Branch>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateBranchDto) => branchesService.createBranch(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Hook to update an existing branch
 */
export function useUpdateBranch(options?: MutationOptions<Branch>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBranchDto }) =>
      branchesService.updateBranch(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.lists() });
      queryClient.invalidateQueries({ queryKey: branchKeys.active() });
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(id) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

/**
 * Hook to delete a branch
 */
export function useDeleteBranch(options?: MutationOptions<void>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => branchesService.deleteBranch(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}
