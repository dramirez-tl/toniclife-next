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

// ═══════════════════════════════════════════════════════════════════════════
// Retenciones (§4.4) y Dispersión y pagos (§4.2) — pasos 9 y 10 (Next).
// Claves colgadas de `treasuryKeys.all` para que `useInvalidateTreasury`
// las refresque; las mutaciones también invalidan `commissionKeys.all`.
// (El hook viejo `useWithholdings` y su servicio se retiraron en el paso 12.)
// ═══════════════════════════════════════════════════════════════════════════

import {
  paymentsLedgerService,
  payoutBatchesService,
  withholdingsTreasuryService,
} from '@/services/treasury.service';
import type {
  ConfirmBatchPayload,
  CreatePayoutBatchPayload,
  CreateWithholdingPayload,
  LayoutFormatInfo,
  MarkBatchSentPayload,
  PayoutBatchDetail,
  PayoutBatchItemsFilters,
  PayoutBatchListFilters,
  PayoutBatchListResponse,
  UpdateWithholdingPayload,
  WithholdingAgreementRow,
  WithholdingListFilters,
  WithholdingListResponse,
  WithholdingPreview,
  WithholdingStatement,
} from '@/types/treasury';

export const withholdingV2Keys = {
  all: [...treasuryKeys.all, 'withholdings'] as const,
  list: (filters: WithholdingListFilters) => [...withholdingV2Keys.all, 'list', filters] as const,
  statement: (id: string) => [...withholdingV2Keys.all, 'statement', id] as const,
  preview: (periodId: string, commissionIds?: string[]) =>
    [...withholdingV2Keys.all, 'preview', periodId, commissionIds ?? []] as const,
};

export const payoutBatchKeys = {
  all: [...treasuryKeys.all, 'payout-batches'] as const,
  list: (filters: PayoutBatchListFilters) => [...payoutBatchKeys.all, 'list', filters] as const,
  detail: (id: string, filters: PayoutBatchItemsFilters) =>
    [...payoutBatchKeys.all, 'detail', id, filters] as const,
  formats: () => [...payoutBatchKeys.all, 'formats'] as const,
};

function useInvalidateTreasuryAndWithholdings() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: treasuryKeys.all });
    void queryClient.invalidateQueries({ queryKey: commissionKeys.all });
  };
}

// ── Retenciones ──────────────────────────────────────────────────────────

/** Listado paginado/ordenado en servidor con KPIs; conserva la página anterior. */
export function useWithholdingList(filters: WithholdingListFilters, enabled = true) {
  return useQuery<WithholdingListResponse>({
    queryKey: withholdingV2Keys.list(filters),
    queryFn: () => withholdingsTreasuryService.list(filters),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_SHORT,
  });
}

/** Estado de cuenta del convenio (abonos por periodo + eventos). */
export function useWithholdingStatement(agreement: WithholdingAgreementRow | null) {
  return useQuery<WithholdingStatement>({
    queryKey: withholdingV2Keys.statement(agreement?.id ?? ''),
    queryFn: () => withholdingsTreasuryService.statement(agreement as WithholdingAgreementRow),
    enabled: !!agreement,
    staleTime: STALE_SHORT,
  });
}

/** Preview de aplicación del periodo (tope global multi-fila). Sin reintentos: 403/404 se explican. */
export function useWithholdingPreviewV2(
  periodId: string | undefined,
  commissionIds?: string[],
  enabled = true,
) {
  return useQuery<WithholdingPreview>({
    queryKey: withholdingV2Keys.preview(periodId ?? '', commissionIds),
    queryFn: () => withholdingsTreasuryService.preview(periodId as string, commissionIds),
    enabled: enabled && !!periodId,
    retry: false,
    staleTime: 30 * 1000,
  });
}

export function useCreateWithholdingV2() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: (payload: CreateWithholdingPayload) => withholdingsTreasuryService.create(payload),
    onSettled: invalidate,
  });
}

export function useUpdateWithholdingV2() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWithholdingPayload }) =>
      withholdingsTreasuryService.update(id, payload),
    onSettled: invalidate,
  });
}

export function useUploadWithholdingAttachment() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      withholdingsTreasuryService.uploadAttachment(id, file),
    onSettled: invalidate,
  });
}

// ── Lotes de dispersión ──────────────────────────────────────────────────

export function usePayoutBatchList(filters: PayoutBatchListFilters, enabled = true) {
  return useQuery<PayoutBatchListResponse>({
    queryKey: payoutBatchKeys.list(filters),
    queryFn: () => payoutBatchesService.list(filters),
    enabled,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: STALE_SHORT,
  });
}

export function usePayoutBatchDetail(id: string | null, filters: PayoutBatchItemsFilters = {}) {
  return useQuery<PayoutBatchDetail>({
    queryKey: payoutBatchKeys.detail(id ?? '', filters),
    queryFn: () => payoutBatchesService.detail(id as string, filters),
    enabled: !!id,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: STALE_SHORT,
  });
}

export function useLayoutFormats(enabled = true) {
  return useQuery<LayoutFormatInfo[]>({
    queryKey: payoutBatchKeys.formats(),
    queryFn: () => payoutBatchesService.formats(),
    enabled,
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreatePayoutBatch() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: (payload: CreatePayoutBatchPayload) => payoutBatchesService.create(payload),
    onSettled: invalidate,
  });
}

export function useMarkBatchSent() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MarkBatchSentPayload }) =>
      payoutBatchesService.markSent(id, payload),
    onSettled: invalidate,
  });
}

/** Vista previa del resultado del banco: NO escribe nada, por eso no invalida. */
export function usePreviewBankResult() {
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      payoutBatchesService.previewResult(id, file),
  });
}

/** Aplica el resultado: el MISMO archivo de la vista previa + su applyToken (sha256). */
export function useApplyBankResult() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: ({ id, file, applyToken }: { id: string; file: File; applyToken: string }) =>
      payoutBatchesService.applyResult(id, file, applyToken),
    onSettled: invalidate,
  });
}

/** Libera filas pendientes (WITHHOLDING_CHANGED) de un lote enviado; mlm:pay. Motivo 5-300 obligatorio. */
export function useReleasePendingRows() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      payoutBatchesService.releasePending(id, reason),
    onSettled: invalidate,
  });
}

export function useConfirmBatch() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ConfirmBatchPayload }) =>
      payoutBatchesService.confirm(id, payload),
    onSettled: invalidate,
  });
}

export function useReconcileBatch() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: (id: string) => payoutBatchesService.reconcile(id),
    onSettled: invalidate,
  });
}

export function useCancelBatch() {
  const invalidate = useInvalidateTreasuryAndWithholdings();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      payoutBatchesService.cancel(id, reason),
    onSettled: invalidate,
  });
}

/** Export del ledger (CSV del API). Se expone como mutación para el estado de descarga. */
export function useExportPayments() {
  return useMutation({
    mutationFn: (filters: PaymentsLedgerFilters) => paymentsLedgerService.export(filters),
  });
}
