import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  closeCartDrawer,
  getCartDrawerOpen,
  getServerCartDrawerOpen,
  openCartDrawer,
  resetCartDrawerForTests,
  setCartDrawerOpen,
  subscribeCartDrawer,
  takeCartDrawerReturnFocus,
} from './cart-drawer-store';

afterEach(() => resetCartDrawerForTests());

describe('cart-drawer-store', () => {
  it('en el servidor siempre está cerrado', () => {
    openCartDrawer();
    expect(getServerCartDrawerOpen()).toBe(false);
  });

  it('abre, cierra y avisa SOLO cuando cambia', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCartDrawer(listener);

    openCartDrawer();
    openCartDrawer();
    expect(getCartDrawerOpen()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    closeCartDrawer();
    setCartDrawerOpen(false);
    expect(getCartDrawerOpen()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    openCartDrawer();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('sin DOM (o sin disparador) no hay a quién devolver el foco', () => {
    openCartDrawer(null);
    expect(takeCartDrawerReturnFocus()).toBeNull();
    openCartDrawer({} as Element);
    expect(takeCartDrawerReturnFocus()).toBeNull();
  });
});
