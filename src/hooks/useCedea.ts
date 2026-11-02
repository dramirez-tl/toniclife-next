// useCedea.ts - datos de "Mi CEDEA" (mig 180) y Tesorería › CEDEAS (2-nov-2026).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cedeaService } from '@/services/cedea.service';
import type { CedeaEarningsQuery, UpsertCedeaContractInput } from '@/types/cedea';

export const cedeaKeys = {
  all: ['cedea'] as const,
  earnings: (query: CedeaEarningsQuery) => [...cedeaKeys.all, 'earnings', query] as const,
  payouts: (query: CedeaEarningsQuery) => [...cedeaKeys.all, 'payouts', query] as const,
};

/** Ventas, IVA, ventas netas, ganancia estimada y promociones del periodo (en curso o el pedido). */
export function useCedeaEarnings(query: CedeaEarningsQuery = {}) {
  return useQuery({
    queryKey: cedeaKeys.earnings(query),
    queryFn: () => cedeaService.getEarnings(query),
    staleTime: 60 * 1000,
  });
}

/** Tesorería › CEDEAS: bono por CEDEA del periodo (contrato + factura estimada). */
export function useCedeaPayouts(query: CedeaEarningsQuery = {}, enabled = true) {
  return useQuery({
    queryKey: cedeaKeys.payouts(query),
    queryFn: () => cedeaService.getPayouts(query),
    enabled,
    staleTime: 60 * 1000,
  });
}

/** Captura/actualiza el contrato CEDEA de una sucursal e invalida Mi CEDEA y CEDEAS. */
export function useUpsertCedeaContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ branchId, input }: { branchId: string; input: UpsertCedeaContractInput }) =>
      cedeaService.upsertContract(branchId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cedeaKeys.all });
    },
  });
}
