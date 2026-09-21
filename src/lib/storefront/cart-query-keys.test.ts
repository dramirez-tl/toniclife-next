import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { ShippingMethod } from '@/types/cart';
import { cartKeys, invalidateCartDerived } from './cart-query-keys';

describe('invalidateCartDerived (tras agregar, cambiar cantidad, quitar o vaciar)', () => {
  const seeded = () => {
    const queryClient = new QueryClient();
    const checkoutSummary = cartKeys.checkoutSummary(ShippingMethod.STANDARD, '64000', 'mx-uuid', 'NL');
    queryClient.setQueryData(cartKeys.cart(), { items: [] });
    queryClient.setQueryData(cartKeys.summary(), { itemCount: 1 });
    queryClient.setQueryData(checkoutSummary, { total: '100.00' });
    return { queryClient, checkoutSummary };
  };

  it('el resumen del checkout (envío, impuesto, total) queda invalidado: nunca la cantidad vieja tras un commit en blur', () => {
    const { queryClient, checkoutSummary } = seeded();
    expect(queryClient.getQueryState(checkoutSummary)?.isInvalidated).toBe(false);
    invalidateCartDerived(queryClient);
    expect(queryClient.getQueryState(checkoutSummary)?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(cartKeys.summary())?.isInvalidated).toBe(true);
  });

  it('cubre CUALQUIER combinación de envío / CP / país del resumen (prefijo cartKeys.checkout())', () => {
    const { queryClient } = seeded();
    const pickup = cartKeys.checkoutSummary(ShippingMethod.PICKUP);
    queryClient.setQueryData(pickup, { total: '90.00' });
    invalidateCartDerived(queryClient);
    expect(queryClient.getQueryState(pickup)?.isInvalidated).toBe(true);
  });

  it('el carrito NO se invalida: la mutación ya dejó ahí la respuesta del API', () => {
    const { queryClient } = seeded();
    invalidateCartDerived(queryClient);
    expect(queryClient.getQueryState(cartKeys.cart())?.isInvalidated).toBe(false);
  });

  it('las keys no cambiaron', () => {
    expect(cartKeys.cart()).toEqual(['cart', 'detail']);
    expect(cartKeys.summary()).toEqual(['cart', 'summary']);
    expect(cartKeys.checkout()).toEqual(['cart', 'checkout']);
    expect(cartKeys.addresses()).toEqual(['cart', 'checkout', 'addresses']);
  });
});
