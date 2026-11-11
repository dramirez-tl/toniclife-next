// hooks/useStorePayments.ts — Cuentas de cobro de la tienda en línea (solo lectura).

'use client';

import { useQuery } from '@tanstack/react-query';
import { storePaymentsService } from '@/services/store-payments.service';
import type { StripeAccountsState } from '@/lib/store-country/countries';

export const storePaymentsKeys = {
  all: ['store-payments'] as const,
  stripeAccounts: () => [...storePaymentsKeys.all, 'stripe-accounts'] as const,
};

/** Qué cuentas de Stripe (México / Estados Unidos) tienen sus llaves en el servidor. */
export function useStripeAccounts() {
  return useQuery<StripeAccountsState>({
    queryKey: storePaymentsKeys.stripeAccounts(),
    queryFn: () => storePaymentsService.getStripeAccounts(),
    staleTime: 5 * 60 * 1000,
  });
}
