import { describe, expect, it, vi } from 'vitest';
import {
  beginCartMerge,
  cartMayStillFill,
  getCartMergeStatus,
  getServerCartMergeStatus,
  subscribeCartMergeStatus,
} from './cart-merge-status';

describe('storefront/cart-merge-status · mezcla del carrito de invitado en curso', () => {
  it('sin mezclas en curso está libre, también en el servidor', () => {
    expect(getCartMergeStatus()).toBe('idle');
    expect(getServerCartMergeStatus()).toBe('idle');
  });

  it('avisa al empezar y al terminar, una vez cada uno', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCartMergeStatus(listener);

    const finish = beginCartMerge();
    expect(getCartMergeStatus()).toBe('merging');
    expect(listener).toHaveBeenCalledTimes(1);

    finish();
    expect(getCartMergeStatus()).toBe('idle');
    expect(listener).toHaveBeenCalledTimes(2);

    // Terminar dos veces la misma mezcla no descuenta de más ni vuelve a avisar.
    finish();
    expect(getCartMergeStatus()).toBe('idle');
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    beginCartMerge()();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('con dos mezclas a la vez sigue ocupado hasta que termina la última', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCartMergeStatus(listener);
    const first = beginCartMerge();
    const second = beginCartMerge();
    expect(listener).toHaveBeenCalledTimes(1);

    first();
    expect(getCartMergeStatus()).toBe('merging');
    expect(listener).toHaveBeenCalledTimes(1);

    second();
    expect(getCartMergeStatus()).toBe('idle');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});

describe('storefront/cart-merge-status · ¿el checkout espera antes de dar el carrito por vacío?', () => {
  it('espera mientras no se sabe quién compra y mientras se mezcla el carrito de invitado', () => {
    expect(cartMayStillFill({ authInitialized: false, mergeStatus: 'idle' })).toBe(true);
    expect(cartMayStillFill({ authInitialized: true, mergeStatus: 'merging' })).toBe(true);
    expect(cartMayStillFill({ authInitialized: false, mergeStatus: 'merging' })).toBe(true);
  });

  it('con la sesión leída y sin mezcla en curso, un carrito vacío está vacío', () => {
    expect(cartMayStillFill({ authInitialized: true, mergeStatus: 'idle' })).toBe(false);
  });
});
