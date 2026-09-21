import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addPendingToCartCountryChange,
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
      itemCount: null,
      pending: [{ productId: 'p1', quantity: 3 }],
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('checkout: SOLO el 409 CHK_COUNTRY_MISMATCH abre el aviso y devuelve true', () => {
    const err = apiError(409, { code: 'CHK_COUNTRY_MISMATCH', message: 'x', details: { cartCountry: 'MX', requestedCountry: 'US' } });
    expect(reportCheckoutCountryMismatch(err)).toBe(true);
    expect(getCartCountryDialog()).toEqual({ kind: 'checkout_country_mismatch', cartCountry: 'MX', requestedCountry: 'US', itemCount: null });
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

  it('guarda cuántos productos se pierden si el API lo dijo (details.itemCount)', () => {
    openCartCountryChange({ cartCountry: 'MX', requestedCountry: 'US', itemCount: 4 }, { productId: 'p1', quantity: 1 });
    expect(getCartCountryDialog()).toMatchObject({ itemCount: 4 });
  });

  it('paquete del quiz: tras el PRIMER 409 el diálogo recuerda TODOS los productos pendientes, sin duplicar', () => {
    const listener = vi.fn();
    subscribeCartCountryDialog(listener);
    openCartCountryChange({ cartCountry: 'MX', requestedCountry: 'US' }, { productId: 'p1', quantity: 1 });
    const total = addPendingToCartCountryChange([
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 1 },
      { productId: 'p3', quantity: 1 },
    ]);
    expect(total).toBe(3);
    expect(getCartCountryDialog()).toMatchObject({
      kind: 'cart_country_change',
      pending: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
        { productId: 'p3', quantity: 1 },
      ],
    });
    expect(listener).toHaveBeenCalledTimes(2);
    // Nada nuevo: no se re-emite.
    expect(addPendingToCartCountryChange([{ productId: 'p2', quantity: 5 }])).toBe(3);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('pendientes: descarta cantidades inválidas y entradas sin producto', () => {
    openCartCountryChange({ cartCountry: 'MX', requestedCountry: 'US' }, [
      { productId: 'p1', quantity: 2 },
      { productId: '', quantity: 1 },
      { productId: 'p2', quantity: 0 },
      { productId: 'p3', quantity: Number.NaN },
      { productId: 'p1', quantity: 9 },
    ]);
    expect(getCartCountryDialog()).toMatchObject({ pending: [{ productId: 'p1', quantity: 2 }] });
  });

  it('el aviso del carrito lo abre SIN alta pendiente: solo vaciar', () => {
    openCartCountryChange({ cartCountry: 'US', requestedCountry: 'MX' }, []);
    expect(getCartCountryDialog()).toEqual({
      kind: 'cart_country_change',
      cartCountry: 'US',
      requestedCountry: 'MX',
      itemCount: null,
      pending: [],
    });
  });

  it('sin diálogo de cambio de país abierto, anotar pendientes no hace nada', () => {
    expect(addPendingToCartCountryChange([{ productId: 'p1', quantity: 1 }])).toBe(0);
    expect(getCartCountryDialog()).toBeNull();
    reportCheckoutCountryMismatch(apiError(409, { code: 'CHK_COUNTRY_MISMATCH', details: { cartCountry: 'MX', orderCountry: 'US' } }));
    expect(addPendingToCartCountryChange([{ productId: 'p1', quantity: 1 }])).toBe(0);
    expect(getCartCountryDialog()).toMatchObject({ kind: 'checkout_country_mismatch' });
  });

  it('sin DOM no hay a quién devolver el foco', () => {
    openCartCountryChange({ cartCountry: 'MX', requestedCountry: 'US' }, { productId: 'p1', quantity: 1 });
    expect(takeCartCountryDialogReturnFocus()).toBeNull();
  });
});
