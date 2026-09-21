// Query keys del carrito y la invalidación de lo que DERIVA de sus líneas. Vive fuera
// de `useCart` (que lo re-exporta con el mismo nombre) para poder probarlo sin React.

import type { QueryClient } from '@tanstack/react-query';
import type { ShippingMethod } from '@/types/cart';

export const cartKeys = {
  all: ['cart'] as const,
  cart: () => [...cartKeys.all, 'detail'] as const,
  summary: () => [...cartKeys.all, 'summary'] as const,
  checkout: () => [...cartKeys.all, 'checkout'] as const,
  checkoutSummary: (
    shippingMethod?: ShippingMethod,
    postalCode?: string,
    countryId?: string,
    state?: string,
  ) =>
    [
      ...cartKeys.checkout(),
      'summary',
      { shippingMethod, postalCode, countryId, state },
    ] as const,
  addresses: () => [...cartKeys.checkout(), 'addresses'] as const,
};

/**
 * Tras CUALQUIER cambio de líneas (agregar, cambiar cantidad, quitar, vaciar): el
 * resumen del checkout (envío, impuesto, total; `staleTime` 60 s) no puede quedarse con
 * la cantidad vieja. Con el commit en blur el usuario puede pulsar "Proceder al pago"
 * con el PATCH aún en vuelo. Solo invalida caché: no toca la página de checkout ni sus
 * servicios. `cartKeys.cart()` NO se invalida: la mutación ya dejó ahí la respuesta.
 */
export function invalidateCartDerived(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
  void queryClient.invalidateQueries({ queryKey: cartKeys.checkout() });
}
