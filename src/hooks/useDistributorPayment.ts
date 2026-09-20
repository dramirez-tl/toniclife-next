// useDistributorPayment.ts — hooks TanStack Query de "Datos para Comisiones".
// Cada sección guarda por separado con la misma mutación; la respuesta trae
// `paymentData` completo y se escribe directo en la caché (sin refetch extra).

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { distributorPaymentService } from '@/services/distributor-payment.service';
import type {
  CommissionPaymentFilters,
  PaymentDataResponse,
  PaymentDocumentKey,
  UpdatePaymentDataInput,
} from '@/types/distributor-payment';

export const distributorPaymentKeys = {
  all: ['distributor', 'payment'] as const,
  data: ['distributor', 'payment', 'data'] as const,
  catalogs: ['distributor', 'payment', 'catalogs'] as const,
  payments: (filters?: CommissionPaymentFilters) =>
    ['distributor', 'payment', 'commission-payments', filters ?? {}] as const,
  withholdings: ['distributor', 'payment', 'withholdings'] as const,
};

export function useDistributorPaymentData() {
  return useQuery({
    queryKey: distributorPaymentKeys.data,
    queryFn: () => distributorPaymentService.getPaymentData(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useDistributorPaymentCatalogs() {
  return useQuery({
    queryKey: distributorPaymentKeys.catalogs,
    queryFn: () => distributorPaymentService.getCatalogs(),
    staleTime: 1000 * 60 * 30,
  });
}

/**
 * Guardado parcial (sección, documento o consentimiento). Al éxito reemplaza
 * la caché con `paymentData` de la respuesta y refresca la lista del home.
 */
export function useUpdateDistributorPaymentData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdatePaymentDataInput) =>
      distributorPaymentService.updatePaymentData(input),
    onSuccess: (result) => {
      if (result?.paymentData) {
        queryClient.setQueryData<PaymentDataResponse>(
          distributorPaymentKeys.data,
          result.paymentData,
        );
      } else {
        queryClient.invalidateQueries({ queryKey: distributorPaymentKeys.data });
      }
      // El home usa la clave vieja ['distributor','payment-data'] para el banner.
      queryClient.invalidateQueries({ queryKey: ['distributor', 'payment-data'] });
    },
  });
}

export function useDistributorDocumentUrl() {
  return useMutation({
    mutationFn: (document: PaymentDocumentKey) =>
      distributorPaymentService.getDocumentUrl(document),
  });
}

export function useDeleteDistributorDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (document: PaymentDocumentKey) =>
      distributorPaymentService.deleteDocument(document),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distributorPaymentKeys.data });
      queryClient.invalidateQueries({ queryKey: ['distributor', 'payment-data'] });
    },
  });
}

export function useDistributorCommissionPayments(filters?: CommissionPaymentFilters) {
  return useQuery({
    queryKey: distributorPaymentKeys.payments(filters),
    queryFn: () => distributorPaymentService.getCommissionPayments(filters),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}

export function useDistributorCommissionReceipt() {
  return useMutation({
    mutationFn: (commissionId: string) =>
      distributorPaymentService.getCommissionReceipt(commissionId),
  });
}

/** null = el ajuste está apagado (404): la sección no se pinta. */
export function useDistributorWithholdings() {
  return useQuery({
    queryKey: distributorPaymentKeys.withholdings,
    queryFn: () => distributorPaymentService.getWithholdings(),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}
