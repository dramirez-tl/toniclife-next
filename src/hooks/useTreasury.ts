// hooks/useTreasury.ts — React Query de Tesorería (claves `treasuryKeys`).
//
// Toda mutación invalida `treasuryKeys.all` y las claves viejas de comisiones
// (`commissionKeys.all`) para que las pantallas que aún las usan (ficha del
// distribuidor, panel distribuidor) vean el cambio de estado.

'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { treasuryService } from '@/services/treasury.service';
import { commissionKeys } from '@/hooks/useCommissions';
import type {
  ApprovePeriodPayload,
  CommissionDetail,
  CommissionListFilters,
  CommissionListResponse,
  CommissionSummary,
  MarkPaidPayload,
  PaymentsLedgerFilters,
  PaymentsLedgerResponse,
  PayoutBatch,
  ReasonPayload,
  TaxRegimeCatalogItem,
  TreasurySettings,
  TreasurySettingsPatch,
} from '@/types/treasury';

export const treasuryKeys = {
  all: ['treasury'] as const,
  commissions: () => [...treasuryKeys.all, 'commissions'] as const,
  commissionList: (filters: CommissionListFilters) =>
    [...treasuryKeys.commissions(), 'list', filters] as const,
  commissionSummary: (periodId: string) =>
    [...treasuryKeys.commissions(), 'summary', periodId] as const,
  commissionDetail: (id: string) => [...treasuryKeys.commissions(), 'detail', id] as const,
  payments: (filters: PaymentsLedgerFilters) =>
    [...treasuryKeys.all, 'payments', filters] as const,
  batches: (params: { periodId?: string; status?: string; limit?: number }) =>
    [...treasuryKeys.all, 'batches', params] as const,
  taxRegimes: (periodId?: string) => [...treasuryKeys.all, 'tax-regimes', periodId ?? ''] as const,
  settings: () => [...treasuryKeys.all, 'settings'] as const,
};

const STALE_SHORT = 60 * 1000;

/** Listado paginado/ordenado en servidor; conserva la página anterior mientras carga. */
export function useTreasuryCommissions(filters: CommissionListFilters, enabled = true) {
  return useQuery<CommissionListResponse>({
    queryKey: treasuryKeys.commissionList(filters),
    queryFn: () => treasuryService.listCommissions(filters),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_SHORT,
  });
}

/** Resumen por moneda/etapa/régimen/readiness del periodo (26→25). */
export function useTreasurySummary(periodId: string | undefined) {
  return useQuery<CommissionSummary>({
    queryKey: treasuryKeys.commissionSummary(periodId ?? ''),
    queryFn: () => treasuryService.getSummary(periodId as string),
    enabled: !!periodId,
    staleTime: STALE_SHORT,
  });
}

export function useTreasuryCommissionDetail(id: string | null) {
  return useQuery<CommissionDetail>({
    queryKey: treasuryKeys.commissionDetail(id ?? ''),
    queryFn: () => treasuryService.getDetail(id as string),
    enabled: !!id,
    staleTime: STALE_SHORT,
  });
}

export function useTreasuryPayments(filters: PaymentsLedgerFilters, enabled = true) {
  return useQuery<PaymentsLedgerResponse>({
    queryKey: treasuryKeys.payments(filters),
    queryFn: () => treasuryService.listPayments(filters),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_SHORT,
  });
}

/** Lotes de dispersión (solo lectura). Sin reintentos: si el endpoint aún no existe, la tarjeta lo dice. */
export function useTreasuryPayoutBatches(
  params: { periodId?: string; status?: string; limit?: number },
  enabled = true,
) {
  return useQuery<PayoutBatch[]>({
    queryKey: treasuryKeys.batches(params),
    queryFn: () => treasuryService.listPayoutBatches(params),
    enabled,
    retry: false,
    staleTime: STALE_SHORT,
  });
}

export function useTaxRegimes(periodId?: string) {
  return useQuery<TaxRegimeCatalogItem[]>({
    queryKey: treasuryKeys.taxRegimes(periodId),
    queryFn: () => treasuryService.listTaxRegimes(periodId),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTreasurySettings(enabled = true) {
  return useQuery<TreasurySettings>({
    queryKey: treasuryKeys.settings(),
    queryFn: () => treasuryService.getSettings(),
    enabled,
    retry: false,
    staleTime: STALE_SHORT,
  });
}

function useInvalidateTreasury() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: treasuryKeys.all });
    void queryClient.invalidateQueries({ queryKey: commissionKeys.all });
  };
}

export function useApproveCommissionIds() {
  const invalidate = useInvalidateTreasury();
  return useMutation({
    mutationFn: (commissionIds: string[]) => treasuryService.approve(commissionIds),
    onSettled: invalidate,
  });
}

export function useApprovePeriod() {
  const invalidate = useInvalidateTreasury();
  return useMutation({
    mutationFn: (payload: ApprovePeriodPayload) => treasuryService.approvePeriod(payload),
    onSettled: invalidate,
  });
}

export function useCancelCommission() {
  const invalidate = useInvalidateTreasury();
  return useMutation({
    mutationFn: ({ id, reason }: ReasonPayload & { id: string }) =>
      treasuryService.cancel(id, { reason }),
    onSettled: invalidate,
  });
}

export function useRestoreCommission() {
  const invalidate = useInvalidateTreasury();
  return useMutation({
    mutationFn: ({ id, reason }: ReasonPayload & { id: string }) =>
      treasuryService.restore(id, { reason }),
    onSettled: invalidate,
  });
}

export function useMarkCommissionsPaid() {
  const invalidate = useInvalidateTreasury();
  return useMutation({
    mutationFn: (payload: MarkPaidPayload) => treasuryService.markPaid(payload),
    onSettled: invalidate,
  });
}

export function useUpdateTreasurySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: TreasurySettingsPatch) => treasuryService.updateSettings(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(treasuryKeys.settings(), data);
      void queryClient.invalidateQueries({ queryKey: treasuryKeys.all });
    },
  });
}
