// useTaxRules.ts - React Query hooks for Tax Rules API

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxRulesService } from '@/services/tax-rules.service';
import type { TaxRuleQueryParams, BranchTaxRule } from '@/services/tax-rules.service';
import type { TaxRule, CreateTaxRuleDto, UpdateTaxRuleDto } from '@/types/config';
import type { Branch } from '@/types/branch';
import { branchKeys } from './useBranches';

export const taxRuleKeys = {
  all: ['taxRules'] as const,
  lists: () => [...taxRuleKeys.all, 'list'] as const,
  list: (params?: TaxRuleQueryParams) => [...taxRuleKeys.lists(), params] as const,
  active: () => [...taxRuleKeys.all, 'active'] as const,
  detail: (id: string) => [...taxRuleKeys.all, 'detail', id] as const,
  branches: (id: string) => [...taxRuleKeys.all, 'branches', id] as const,
  branchRules: (branchId: string) => ['branchTaxRules', branchId] as const,
};

// ================================
// QUERY HOOKS
// ================================

export function useTaxRules(params?: TaxRuleQueryParams) {
  return useQuery({
    queryKey: taxRuleKeys.list(params),
    queryFn: () => taxRulesService.getTaxRules(params),
  });
}

export function useActiveTaxRules() {
  return useQuery({
    queryKey: taxRuleKeys.active(),
    queryFn: () => taxRulesService.getActiveTaxRules(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useTaxRule(id: string) {
  return useQuery({
    queryKey: taxRuleKeys.detail(id),
    queryFn: () => taxRulesService.getTaxRuleById(id),
    enabled: !!id,
  });
}

export function useTaxRuleBranches(taxRuleId: string) {
  return useQuery({
    queryKey: taxRuleKeys.branches(taxRuleId),
    queryFn: () => taxRulesService.getTaxRuleBranches(taxRuleId),
    enabled: !!taxRuleId,
  });
}

export function useBranchTaxRules(branchId: string) {
  return useQuery({
    queryKey: taxRuleKeys.branchRules(branchId),
    queryFn: () => taxRulesService.getBranchTaxRules(branchId),
    enabled: !!branchId,
  });
}

// ================================
// MUTATION HOOKS
// ================================

interface MutationOptions<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export function useCreateTaxRule(options?: MutationOptions<TaxRule>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTaxRuleDto) => taxRulesService.createTaxRule(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
}

export function useUpdateTaxRule(options?: MutationOptions<TaxRule>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTaxRuleDto }) =>
      taxRulesService.updateTaxRule(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.active() });
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.detail(id) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
}

export function useDeleteTaxRule(options?: MutationOptions<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taxRulesService.deleteTaxRule(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
}

export function useAssignBranchTaxRule(options?: MutationOptions<BranchTaxRule[]>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, taxRuleId, sortOrder }: { branchId: string; taxRuleId: string; sortOrder?: number }) =>
      taxRulesService.assignTaxRuleToBranch(branchId, taxRuleId, sortOrder),
    onSuccess: (data, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.branchRules(branchId) });
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(branchId) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
}

export function useRemoveBranchTaxRule(options?: MutationOptions<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, taxRuleId }: { branchId: string; taxRuleId: string }) =>
      taxRulesService.removeTaxRuleFromBranch(branchId, taxRuleId),
    onSuccess: (data, { branchId }) => {
      queryClient.invalidateQueries({ queryKey: taxRuleKeys.branchRules(branchId) });
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(branchId) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
}
