import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { distributorApi } from '@/services/distributorApi';
import type { CommissionPaymentFilters } from '@/types/payment-data';

const keys = {
  paymentData: ['distributor', 'payment-data'] as const,
  commissionPayments: (filters?: CommissionPaymentFilters) =>
    ['distributor', 'commission-payments', filters] as const,
};

export function usePaymentData() {
  return useQuery({
    queryKey: keys.paymentData,
    queryFn: () => distributorApi.getPaymentData(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdatePaymentData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => distributorApi.updatePaymentData(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.paymentData });
    },
  });
}

export function useCommissionPayments(filters?: CommissionPaymentFilters) {
  return useQuery({
    queryKey: keys.commissionPayments(filters),
    queryFn: () => distributorApi.getCommissionPayments(filters),
    staleTime: 1000 * 60 * 5,
  });
}
