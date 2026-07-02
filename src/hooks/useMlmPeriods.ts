// hooks/useMlmPeriods.ts - React Query hooks for MLM periods
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mlmPeriodsService } from '@/services/mlm-periods.service';
import type {
  MlmPeriod,
  CreatePeriodDto,
  UpdatePeriodDto,
  PeriodPreview,
  PeriodExchangeRatesResponse,
} from '@/types/mlm-periods';

// Query keys
export const mlmPeriodKeys = {
  all: ['mlm-periods'] as const,
  lists: () => [...mlmPeriodKeys.all, 'list'] as const,
  current: () => [...mlmPeriodKeys.all, 'current'] as const,
  detail: (id: string) => [...mlmPeriodKeys.all, 'detail', id] as const,
  preview: (year: number) => [...mlmPeriodKeys.all, 'preview', year] as const,
  exchangeRates: (id: string) =>
    [...mlmPeriodKeys.all, 'exchange-rates', id] as const,
};

/**
 * Hook to get all periods
 */
export function usePeriods() {
  return useQuery<MlmPeriod[]>({
    queryKey: mlmPeriodKeys.lists(),
    queryFn: () => mlmPeriodsService.getPeriods(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get current active period
 */
export function useCurrentPeriod() {
  return useQuery<MlmPeriod>({
    queryKey: mlmPeriodKeys.current(),
    queryFn: () => mlmPeriodsService.getCurrentPeriod(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to get period by ID
 */
export function usePeriodById(id: string, enabled = true) {
  return useQuery<MlmPeriod>({
    queryKey: mlmPeriodKeys.detail(id),
    queryFn: () => mlmPeriodsService.getPeriodById(id),
    enabled: enabled && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to preview a year's periods with the business-day close rule applied.
 */
export function usePeriodPreview(year: number, enabled = true) {
  return useQuery<PeriodPreview[]>({
    queryKey: mlmPeriodKeys.preview(year),
    queryFn: () => mlmPeriodsService.previewYear(year),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a period
 */
export function useCreatePeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreatePeriodDto) => mlmPeriodsService.createPeriod(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlmPeriodKeys.all });
    },
  });
}

/**
 * Hook to update a period
 */
export function useUpdatePeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePeriodDto }) =>
      mlmPeriodsService.updatePeriod(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: mlmPeriodKeys.all });
      queryClient.invalidateQueries({ queryKey: mlmPeriodKeys.detail(id) });
    },
  });
}

/**
 * Hook to generate periods automatically
 */
export function useGeneratePeriods() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => mlmPeriodsService.generatePeriods(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlmPeriodKeys.all });
    },
  });
}

/**
 * Hook to close a period
 */
export function useClosePeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mlmPeriodsService.closePeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlmPeriodKeys.all });
    },
  });
}

/**
 * Hook to reopen a period
 */
export function useReopenPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => mlmPeriodsService.reopenPeriod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mlmPeriodKeys.all });
    },
  });
}

/**
 * Hook to get the frozen exchange rates (X→MXN) of a period
 */
export function usePeriodExchangeRates(periodId: string, enabled = true) {
  return useQuery<PeriodExchangeRatesResponse>({
    queryKey: mlmPeriodKeys.exchangeRates(periodId),
    queryFn: () => mlmPeriodsService.getExchangeRates(periodId),
    enabled: enabled && !!periodId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook to manually override one currency rate of an open period
 */
export function useSetPeriodExchangeRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      periodId,
      currencyCode,
      rateToMxn,
    }: {
      periodId: string;
      currencyCode: string;
      rateToMxn: number;
    }) => mlmPeriodsService.setExchangeRate(periodId, currencyCode, rateToMxn),
    onSuccess: (_, { periodId }) => {
      queryClient.invalidateQueries({
        queryKey: mlmPeriodKeys.exchangeRates(periodId),
      });
      queryClient.invalidateQueries({ queryKey: mlmPeriodKeys.lists() });
    },
  });
}

/**
 * Hook to fetch live rates from the FX provider (fills missing + refreshes
 * auto rates; never touches manual ones)
 */
export function useRefreshPeriodExchangeRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (periodId: string) =>
      mlmPeriodsService.refreshExchangeRates(periodId),
    onSuccess: (_, periodId) => {
      queryClient.invalidateQueries({
        queryKey: mlmPeriodKeys.exchangeRates(periodId),
      });
      queryClient.invalidateQueries({ queryKey: mlmPeriodKeys.lists() });
    },
  });
}
