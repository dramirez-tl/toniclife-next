// useExternalSettlement.ts - Pasar a «Pagada» las comisiones ya depositadas
// fuera de los lotes de dispersión (Tesorería › Comisiones).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionKeys } from '@/hooks/useCommissions';
import { commissionReceiptKeys } from '@/hooks/useCommissionReceipts';
import { treasuryKeys } from '@/hooks/useTreasury';
import { externalSettlementService } from '@/services/external-settlement.service';

/** Vista previa: no escribe nada (es un POST porque así lo expone el API). */
export function usePreviewExternalSettlement() {
  return useMutation({
    mutationFn: (periodId: string) => externalSettlementService.preview(periodId),
  });
}

/** Asienta. Al terminar se recargan el embudo, la lista y los pagos y recibos. */
export function useApplyExternalSettlement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ periodId, expectedCount }: { periodId: string; expectedCount: number }) =>
      externalSettlementService.apply(periodId, expectedCount),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: treasuryKeys.all });
      void queryClient.invalidateQueries({ queryKey: commissionKeys.all });
      void queryClient.invalidateQueries({ queryKey: commissionReceiptKeys.all });
    },
  });
}
