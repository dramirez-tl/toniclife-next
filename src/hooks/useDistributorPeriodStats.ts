// Hooks admin para ver la actividad de un distribuidor en un periodo específico.
import { useQuery } from '@tanstack/react-query';
import customersService from '@/services/customers.service';

export function usePeriodsForSelector(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'customers', 'periods', 'list'],
    queryFn: () => customersService.listPeriodsForSelector(),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCustomerStatsForPeriod(customerId: string, periodId: string | null) {
  return useQuery({
    queryKey: ['admin', 'customers', customerId, 'period-stats', periodId],
    queryFn: () => customersService.getCustomerStatsForPeriod(customerId, periodId as string),
    enabled: !!customerId && !!periodId,
    staleTime: 1000 * 60,
  });
}
