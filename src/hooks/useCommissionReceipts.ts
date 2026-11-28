// useCommissionReceipts.ts - Pagos de comisiones registrados fuera de los lotes
// y su recibo de nómina (Tesorería › Comisiones › Pagos y recibos).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { applyStampResult } from '@/lib/treasury/commission-receipts';
import { commissionReceiptsService } from '@/services/commission-receipts.service';
import type { CommissionReceiptsList } from '@/types/commission-receipts';

export const commissionReceiptKeys = {
  // usePayrollReceiver invalida esta raíz al guardar datos fiscales.
  all: ['commission-receipts'] as const,
  list: (periodNumber: number) => [...commissionReceiptKeys.all, periodNumber] as const,
};

/** Comisiones ASIMILADOS del periodo con su pago y su recibo (una sola llamada por periodo). */
export function useCommissionReceipts(periodNumber: number | undefined, enabled = true) {
  return useQuery({
    queryKey: commissionReceiptKeys.list(periodNumber ?? 0),
    queryFn: () => commissionReceiptsService.list(periodNumber!),
    enabled: enabled && typeof periodNumber === 'number' && periodNumber > 0,
    staleTime: 30 * 1000,
    retry: false,
  });
}

/**
 * Timbrar el recibo de un pago. El resultado se aplica de inmediato al renglón
 * (sin recargar la lista entera, que son miles de renglones): quien llama
 * decide cuándo recargar (al terminar una tanda).
 */
export function useStampCommissionReceipt(periodNumber: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, sendEmail }: { paymentId: string; sendEmail?: boolean }) =>
      commissionReceiptsService.stamp(paymentId, sendEmail === true),
    onSuccess: (result, { paymentId }) => {
      if (!periodNumber) return;
      queryClient.setQueryData<CommissionReceiptsList>(commissionReceiptKeys.list(periodNumber), (old) =>
        applyStampResult(old, paymentId, result),
      );
    },
  });
}
