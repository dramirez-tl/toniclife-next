import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  closeCartCountryDialog,
  getCartCountryDialog,
  getServerCartCountryDialog,
  openCartCountryChange,
  reportCheckoutCountryMismatch,
  resetCartCountryDialogForTests,
  subscribeCartCountryDialog,
  takeCartCountryDialogReturnFocus,
} from './cart-country-dialog-store';

const apiError = (status: number, data: unknown) => ({ response: { status, data } });

afterEach(() => resetCartCountryDialogForTests());

describe('cart-country-dialog-store', () => {
  it('en el servidor siempre está cerrado', () => {
    openCartCountryChange({ cartCountry: 'MX', requestedCountry: 'US' }, { productId: 'p1', quantity: 1 });
    expect(getServerCartCountryDialog()).toBeNull();
  });

  it('CART_COUNTRY_CHANGE: guarda los países y el alta pendiente para "Vaciar y cambiar"', () => {
    const listener = vi.fn();
    subscribeCartCountryDialog(listener);
    openCartCountryChange({ cartCountry: 'MX', requestedCountry: 'US' }, { productId: 'p1', quantity: 3 });
    expect(getCartCountryDialog()).toEqual({
      kind: 'cart_country_change',
      cartCountry: 'MX',
      requestedCountry: 'US',
      pending: { productId: 'p1', quantity: 3 },
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('checkout: SOLO el 409 CHK_COUNTRY_MISMATCH abre el aviso y devuelve true', () => {
    const err = apiError(409, { code: 'CHK_COUNTRY_MISMATCH', message: 'x', details: { cartCountry: 'MX', requestedCountry: 'US' } });
    expect(reportCheckoutCountryMismatch(err)).toBe(true);
    expect(getCartCountryDialog()).toEqual({ kind: 'checkout_country_mismatch', cartCountry: 'MX', requestedCountry: 'US' });
  });

  it('checkout: cualquier otro error devuelve false y NO abre nada (el checkout sigue con su toast de siempre)', () => {
    expect(reportCheckoutCountryMismatch(apiError(400, { message: 'Dirección inválida' }))).toBe(false);
    expect(reportCheckoutCountryMismatch(apiError(409, { code: 'CHK_STOCK' }))).toBe(false);
    expect(reportCheckoutCountryMismatch(new Error('Network Error'))).toBe(false);
    expect(reportCheckoutCountryMismatch(undefined)).toBe(false);
    expect(getCartCountryDialog()).toBeNull();
  });

  it('cierra y avisa solo cuando cambia; la baja de la suscripción funciona', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCartCountryDialog(listener);
    closeCartCountryDialog();
    expect(listener).not.toHaveBeenCalled();
    openCartCountryChange({ cartCountry: null, requestedCountry: 'US' }, { productId: 'p1', quantity: 1 });
    closeCartCountryDialog();
    expect(getCartCountryDialog()).toBeNull();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    openCartCountryChange({ cartCountry: null, requestedCountry: 'US' }, { productId: 'p1', quantity: 1 });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('sin DOM no hay a quién devolver el foco', () => {
    openCartCountryChange({ cartCountry: 'MX', requestedCountry: 'US' }, { productId: 'p1', quantity: 1 });
    expect(takeCartCountryDialogReturnFocus()).toBeNull();
  });
});
