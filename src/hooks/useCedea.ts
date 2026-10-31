// useCedea.ts - datos de "Mi CEDEA" (mig 180).
import { useQuery } from '@tanstack/react-query';
import { cedeaService } from '@/services/cedea.service';
import type { CedeaEarningsQuery } from '@/types/cedea';

export const cedeaKeys = {
  all: ['cedea'] as const,
  earnings: (query: CedeaEarningsQuery) => [...cedeaKeys.all, 'earnings', query] as const,
};

/** Ventas, IVA, ventas netas, ganancia estimada y promociones del periodo (en curso o el pedido). */
export function useCedeaEarnings(query: CedeaEarningsQuery = {}) {
  return useQuery({
    queryKey: cedeaKeys.earnings(query),
    queryFn: () => cedeaService.getEarnings(query),
    staleTime: 60 * 1000,
  });
}
