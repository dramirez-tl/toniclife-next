// useCheckoutConfirmation.ts - Confirmación del pedido tras pagar en Stripe
// (28-oct-2026, Bloque 1). Stripe redirige al comprador ANTES de que llegue el
// webhook que confirma el pago, así que mientras el pedido siga "pendiente" se
// vuelve a consultar cada 3 s, a lo más 20 veces; después la página dice que el
// pago está en proceso y que se avisa por correo. El conteo de intentos sale de
// `dataUpdateCount` de React Query (una actualización por consulta exitosa):
// sin estado ni efectos propios.

import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { getCheckoutConfirmation } from '@/services/checkout-confirmation.service';
import type { CheckoutConfirmation } from '@/types/checkout-confirmation';

export const CONFIRMATION_POLL_MS = 3_000;
export const CONFIRMATION_MAX_POLLS = 20;

/** Lo que React Query entrega a `refetchInterval` (solo lo que se usa). */
export type RefetchIntervalFn<T> = (query: {
  state: { data?: T; dataUpdateCount: number };
}) => number | false;

/**
 * `refetchInterval` que vuelve a consultar cada 3 s mientras el dato esté
 * "pendiente" según `isPendingData`, hasta 20 actualizaciones; después (o en
 * cuanto deja de estar pendiente) se detiene.
 */
export function pendingRefetchInterval<T>(isPendingData: (data: T | undefined) => boolean): RefetchIntervalFn<T> {
  return (query) =>
    isPendingData(query.state.data) && query.state.dataUpdateCount < CONFIRMATION_MAX_POLLS
      ? CONFIRMATION_POLL_MS
      : false;
}

/**
 * true cuando el dato sigue pendiente y ya se agotaron los reintentos de esa consulta.
 *
 * Recibe el RESULTADO de `useQuery` (no solo la clave) a propósito (28-oct-2026):
 * React Query 5 solo vuelve a renderizar el componente por las propiedades del
 * resultado que este lee, y un pedido que sigue pendiente devuelve `data` con la
 * MISMA referencia (structural sharing), así que un componente que solo leía
 * `data` / `isError` / `isLoading` no se enteraba de los sondeos y, al agotarse,
 * se quedaba con "Estamos confirmando tu pago…" para siempre. Leer `dataUpdatedAt`
 * aquí registra la propiedad: cada sondeo exitoso vuelve a renderizar y a calcular
 * esto. El conteo sigue saliendo de `dataUpdateCount` (el mismo que usa
 * `pendingRefetchInterval` para detenerse).
 */
export function usePollingExhausted(
  queryKey: QueryKey,
  result: { dataUpdatedAt: number },
  isPending: boolean,
): boolean {
  const client = useQueryClient();
  // Sin ningún dato todavía no hay sondeos que contar (y la lectura registra la propiedad).
  if (!result.dataUpdatedAt) return false;
  const count = client.getQueryState(queryKey)?.dataUpdateCount ?? 0;
  return isPending && count >= CONFIRMATION_MAX_POLLS;
}

export const checkoutConfirmationKeys = {
  detail: (orderId: string, sessionId: string) =>
    ['checkout', 'confirmation', orderId, sessionId] as const,
};

export function isConfirmationPending(data: CheckoutConfirmation | undefined): boolean {
  return !!data && data.status !== 'cancelled' && data.paymentStatus === 'pending';
}

export function useCheckoutConfirmation(
  orderId: string | null | undefined,
  sessionId: string | null | undefined,
  options: { enabled?: boolean; pollWhilePending?: boolean } = {},
) {
  const enabled = (options.enabled ?? true) && !!orderId && !!sessionId;
  const queryKey = checkoutConfirmationKeys.detail(orderId ?? '', sessionId ?? '');
  const query = useQuery({
    queryKey,
    queryFn: () => getCheckoutConfirmation(orderId as string, sessionId as string),
    enabled,
    // 404 = session_id que no es de este pedido: no tiene caso reintentar.
    retry: (count, err) => {
      const status = (err as { response?: { status?: number } } | null)?.response?.status;
      return status !== 404 && status !== 400 && count < 2;
    },
    refetchInterval: options.pollWhilePending === false ? false : pendingRefetchInterval(isConfirmationPending),
    staleTime: 10_000,
  });
  const pollingExhausted = usePollingExhausted(queryKey, query, isConfirmationPending(query.data));
  return { ...query, pollingExhausted };
}
