// hooks/useTreasuryReadiness.ts — React Query de Validación de Datos (§4.5).
//
// Toda escritura invalida la cola, el detalle del distribuidor, las claves de
// Tesorería (readiness de comisiones/summary) y la clave previa de la ficha
// (`['customer', id, 'payment-readiness']`) para que nada quede desfasado.

'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { treasuryReadinessService } from '@/services/treasury-readiness.service';
import { treasuryKeys } from '@/hooks/useTreasury';
import type {
  AssignTaxRegimePayload,
  DocumentUrlResult,
  PaymentDocumentKey,
  ReadinessCatalogs,
  ReadinessDetail,
  ReadinessListFilters,
  ReadinessListResponse,
  RemindPayload,
  RemindResult,
  ReviewPayload,
  ReviewResult,
  RevokePayload,
  SatSuggestionMap,
  TaxRegimeHistoryEntry,
} from '@/types/treasury-readiness';

export const readinessKeys = {
  all: ['treasury-readiness'] as const,
  list: (filters: ReadinessListFilters) => [...readinessKeys.all, 'list', filters] as const,
  detail: (customerId: string) => [...readinessKeys.all, 'detail', customerId] as const,
  catalogs: () => [...readinessKeys.all, 'catalogs'] as const,
  history: (customerId: string) => [...readinessKeys.all, 'tax-regime-history', customerId] as const,
  satSuggestions: () => [...readinessKeys.all, 'sat-suggestions'] as const,
};

const STALE_SHORT = 60 * 1000;
const STALE_LONG = 10 * 60 * 1000;

export function useReadinessList(filters: ReadinessListFilters, enabled = true) {
  return useQuery<ReadinessListResponse>({
    queryKey: readinessKeys.list(filters),
    queryFn: () => treasuryReadinessService.list(filters),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: STALE_SHORT,
  });
}

export function useReadinessDetail(customerId: string | null | undefined) {
  return useQuery<ReadinessDetail>({
    queryKey: readinessKeys.detail(customerId ?? ''),
    queryFn: () => treasuryReadinessService.detail(customerId as string),
    enabled: !!customerId,
    staleTime: STALE_SHORT,
  });
}

export function useReadinessCatalogs(enabled = true) {
  return useQuery<ReadinessCatalogs>({
    queryKey: readinessKeys.catalogs(),
    queryFn: () => treasuryReadinessService.catalogs(),
    enabled,
    retry: false,
    staleTime: STALE_LONG,
  });
}

export function useSatSuggestions(enabled = true) {
  return useQuery<SatSuggestionMap>({
    queryKey: readinessKeys.satSuggestions(),
    queryFn: () => treasuryReadinessService.satSuggestions(),
    enabled,
    retry: false,
    staleTime: STALE_LONG,
  });
}

export function useTaxRegimeHistory(customerId: string | null | undefined, enabled = true) {
  return useQuery<TaxRegimeHistoryEntry[]>({
    queryKey: readinessKeys.history(customerId ?? ''),
    queryFn: () => treasuryReadinessService.taxRegimeHistory(customerId as string),
    enabled: enabled && !!customerId,
    retry: false,
    staleTime: STALE_SHORT,
  });
}

/** URL firmada (15 min) de un documento; mutación porque cada llamada queda auditada (DOCUMENT_VIEW). */
export function useReadinessDocumentUrl() {
  return useMutation<DocumentUrlResult, unknown, { customerId: string; document: PaymentDocumentKey }>({
    mutationFn: ({ customerId, document }) => treasuryReadinessService.documentUrl(customerId, document),
  });
}

function useInvalidateReadiness() {
  const queryClient = useQueryClient();
  return (customerId?: string) => {
    void queryClient.invalidateQueries({ queryKey: readinessKeys.all });
    void queryClient.invalidateQueries({ queryKey: treasuryKeys.all });
    if (customerId) {
      void queryClient.invalidateQueries({ queryKey: ['customer', customerId, 'payment-readiness'] });
    }
  };
}

export function useReviewDocuments() {
  const invalidate = useInvalidateReadiness();
  return useMutation<ReviewResult, unknown, { customerId: string; payload: ReviewPayload }>({
    mutationFn: ({ customerId, payload }) => treasuryReadinessService.review(customerId, payload),
    onSuccess: (_r, vars) => invalidate(vars.customerId),
  });
}

export function useRevokeDocument() {
  const invalidate = useInvalidateReadiness();
  return useMutation<
    void,
    unknown,
    { customerId: string; document: PaymentDocumentKey; payload: RevokePayload }
  >({
    mutationFn: ({ customerId, document, payload }) =>
      treasuryReadinessService.revoke(customerId, document, payload),
    onSuccess: (_r, vars) => invalidate(vars.customerId),
  });
}

export function useRemindDistributors() {
  const invalidate = useInvalidateReadiness();
  return useMutation<RemindResult, unknown, RemindPayload>({
    mutationFn: (payload) => treasuryReadinessService.remind(payload),
    onSuccess: () => invalidate(),
  });
}

export function useAssignTaxRegime() {
  const invalidate = useInvalidateReadiness();
  return useMutation<void, unknown, { customerId: string; payload: AssignTaxRegimePayload }>({
    mutationFn: ({ customerId, payload }) => treasuryReadinessService.assignTaxRegime(customerId, payload),
    onSuccess: (_r, vars) => invalidate(vars.customerId),
  });
}
