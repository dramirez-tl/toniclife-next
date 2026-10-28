// checkout-confirmation.service.ts - Confirmación pública del pedido pagado
// (28-oct-2026, Bloque 1). No exige token: el session_id de Stripe es la llave.

import api from '@/lib/api';
import type { CheckoutConfirmation } from '@/types/checkout-confirmation';

export async function getCheckoutConfirmation(
  orderId: string,
  sessionId: string,
): Promise<CheckoutConfirmation> {
  const params = new URLSearchParams({ session_id: sessionId });
  const { data } = await api.get<CheckoutConfirmation>(
    `/checkout/confirmation/${encodeURIComponent(orderId)}?${params.toString()}`,
  );
  return data;
}

export const checkoutConfirmationService = { getCheckoutConfirmation };
