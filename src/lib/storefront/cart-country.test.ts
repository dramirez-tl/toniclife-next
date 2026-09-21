import { describe, expect, it, vi } from 'vitest';
import {
  addWithStoreCountry,
  cartCountryKnown,
  cartCountryMismatch,
  cartDisplayCurrency,
  conflictItemCount,
  countryConflictAction,
  countryConflictOf,
  countryDisplayName,
  createCountrySupportMemo,
  effectiveCartCountry,
  isCheckoutCountryMismatch,
  isUnknownCountryFieldError,
  mismatchCheckoutLocale,
  normalizeCountryCode,
  normalizeCurrencyCode,
  pinnedCartCountry,
  storeLocaleFor,
  withoutCountry,
} from './cart-country';

const apiError = (status: number, data: unknown) => ({ response: { status, data } });
type AddBody = { productId: string; quantity: number; country?: string };
/** 400 real del `ValidationPipe` (`forbidNonWhitelisted`) de un API que aún no conoce `country`. */
const unknownCountry400 = apiError(400, {
  statusCode: 400,
  message: ['property country should not exist'],
  error: 'Bad Request',
});

describe('normalizadores', () => {
  it('país: ISO2 en mayúsculas o null', () => {
    expect(normalizeCountryCode(' mx ')).toBe('MX');
    expect(normalizeCountryCode('USA')).toBeNull();
    expect(normalizeCountryCode('')).toBeNull();
    expect(normalizeCountryCode(null)).toBeNull();
    expect(normalizeCountryCode(52)).toBeNull();
  });

  it('moneda: ISO 4217 en mayúsculas o null (un código inválido rompería Intl)', () => {
    expect(normalizeCurrencyCode('usd')).toBe('USD');
    expect(normalizeCurrencyCode('US$')).toBeNull();
    expect(normalizeCurrencyCode(undefined)).toBeNull();
  });
});

describe('cartDisplayCurrency (los importes del carrito van en SU moneda)', () => {
  it('con cart.currencyCode manda el carrito aunque la tienda visitada sea otra', () => {
    expect(cartDisplayCurrency('USD', 'MXN')).toBe('USD');
    expect(cartDisplayCurrency('mxn', 'USD')).toBe('MXN');
  });

  it('sin el campo (API previo a C2) o inválido: la moneda del país de la tienda, como antes', () => {
    expect(cartDisplayCurrency(undefined, 'MXN')).toBe('MXN');
    expect(cartDisplayCurrency(null, 'USD')).toBe('USD');
    expect(cartDisplayCurrency('dólares', 'USD')).toBe('USD');
  });
});

describe('pinnedCartCountry (C2 solo aplica al carrito con país FIJADO)', () => {
  it('con countryId: el ISO2 del carrito', () => {
    expect(pinnedCartCountry({ countryId: '0b0c-uuid', countryCode: 'us' })).toBe('US');
  });

  it('el API de C2 manda countryCode SIEMPRE: sin countryId es el país DEDUCIDO y no cuenta', () => {
    expect(pinnedCartCountry({ countryCode: 'MX' })).toBeNull();
    expect(pinnedCartCountry({ countryId: null, countryCode: 'MX' })).toBeNull();
    expect(pinnedCartCountry({ countryId: '  ', countryCode: 'MX' })).toBeNull();
  });

  it('API previo a C2 (sin ninguno de los dos) o sin carrito: null', () => {
    expect(pinnedCartCountry({})).toBeNull();
    expect(pinnedCartCountry(undefined)).toBeNull();
    expect(pinnedCartCountry(null)).toBeNull();
    expect(pinnedCartCountry({ countryId: '0b0c-uuid', countryCode: 'Mexico' })).toBeNull();
  });
});

describe('país efectivo del carrito', () => {
  it('cartCountryKnown: solo con un ISO2 válido', () => {
    expect(cartCountryKnown('US')).toBe(true);
    expect(cartCountryKnown(null)).toBe(false);
    expect(cartCountryKnown(undefined)).toBe(false);
  });

  it('effectiveCartCountry: el del carrito o, sin dato, el de la tienda', () => {
    expect(effectiveCartCountry('us', 'MX')).toBe('US');
    expect(effectiveCartCountry(null, 'mx')).toBe('MX');
  });
});

describe('cartCountryMismatch (aviso no bloqueante en el drawer y en /carrito)', () => {
  it('carrito MX con líneas en la tienda US: aviso', () => {
    expect(cartCountryMismatch({ cartCountryCode: 'MX', storeCountryCode: 'US', itemCount: 2 })).toEqual({
      cartCountry: 'MX',
      storeCountry: 'US',
    });
  });

  it('mismo país, carrito vacío o carrito SIN país: sin aviso', () => {
    expect(cartCountryMismatch({ cartCountryCode: 'mx', storeCountryCode: 'MX', itemCount: 2 })).toBeNull();
    expect(cartCountryMismatch({ cartCountryCode: 'MX', storeCountryCode: 'US', itemCount: 0 })).toBeNull();
    expect(cartCountryMismatch({ cartCountryCode: undefined, storeCountryCode: 'US', itemCount: 3 })).toBeNull();
    expect(cartCountryMismatch({ cartCountryCode: null, storeCountryCode: 'US', itemCount: 3 })).toBeNull();
  });
});

describe('nombres y enlaces de tienda', () => {
  it('nombre del país en el idioma de la UI', () => {
    expect(countryDisplayName('US', 'es')).toBe('Estados Unidos');
    expect(countryDisplayName('us', 'en')).toBe('United States');
    expect(countryDisplayName('MX', 'en')).toBe('Mexico');
    expect(countryDisplayName('BR', 'es')).toBe('BR');
  });

  it('locale de la tienda del país conservando el idioma; país sin tienda = null', () => {
    expect(storeLocaleFor('es', 'MX')).toBe('es-mx');
    expect(storeLocaleFor('en', 'mx')).toBe('en-mx');
    expect(storeLocaleFor('es', 'US')).toBe('es-us');
    expect(storeLocaleFor('es', 'BR')).toBeNull();
    expect(storeLocaleFor('es', null)).toBeNull();
  });
});

describe('countryConflictOf (409 CART_COUNTRY_CHANGE / CHK_COUNTRY_MISMATCH)', () => {
  it('details del API primero', () => {
    const err = apiError(409, { code: 'CART_COUNTRY_CHANGE', details: { cartCountryCode: 'mx', requestedCountryCode: 'us' } });
    expect(countryConflictOf(err, { cartCountry: 'CO', requestedCountry: 'GT' })).toEqual({ cartCountry: 'MX', requestedCountry: 'US' });
  });

  it('CHK_COUNTRY_MISMATCH del checkout: details { cartCountry, orderCountry }', () => {
    const err = apiError(409, { code: 'CHK_COUNTRY_MISMATCH', details: { cartCountry: 'MX', orderCountry: 'US' } });
    expect(countryConflictOf(err)).toEqual({ cartCountry: 'MX', requestedCountry: 'US' });
  });

  it('sin details: el respaldo (carrito en caché y país enviado)', () => {
    const err = apiError(409, { code: 'CART_COUNTRY_CHANGE' });
    expect(countryConflictOf(err, { cartCountry: 'MX', requestedCountry: 'us' })).toEqual({ cartCountry: 'MX', requestedCountry: 'US' });
    expect(countryConflictOf(err)).toEqual({ cartCountry: null, requestedCountry: null });
  });

  it('details con basura no se usan (nunca un UUID ni un texto como país)', () => {
    const err = apiError(409, { code: 'CHK_COUNTRY_MISMATCH', details: { cartCountry: '7b8e6758-aaaa', country: 'Mexico' } });
    expect(countryConflictOf(err)).toEqual({ cartCountry: null, requestedCountry: null });
  });

  it('isCheckoutCountryMismatch decide SOLO por código', () => {
    expect(isCheckoutCountryMismatch(apiError(409, { code: 'CHK_COUNTRY_MISMATCH' }))).toBe(true);
    expect(isCheckoutCountryMismatch(apiError(409, { message: 'El país no coincide' }))).toBe(false);
    expect(isCheckoutCountryMismatch(apiError(409, { code: 'CART_COUNTRY_CHANGE' }))).toBe(false);
    expect(isCheckoutCountryMismatch(new Error('red'))).toBe(false);
  });
});

describe('compatibilidad con un API que aún no conoce `country`', () => {
  it('reconoce SOLO el 400 del validador sobre la propiedad country', () => {
    expect(isUnknownCountryFieldError(unknownCountry400)).toBe(true);
    expect(isUnknownCountryFieldError(apiError(400, { message: 'property country should not exist' }))).toBe(true);
    // Otro 400 de validación, otro estado o un error con código: NO se reintenta.
    expect(isUnknownCountryFieldError(apiError(400, { message: ['quantity must not be less than 1'] }))).toBe(false);
    expect(isUnknownCountryFieldError(apiError(400, { message: ['property countryId should not exist'] }))).toBe(false);
    expect(isUnknownCountryFieldError(apiError(422, { message: ['property country should not exist'] }))).toBe(false);
    expect(isUnknownCountryFieldError(apiError(400, { code: 'CART_NOT_SELLABLE', message: 'property country should not exist' }))).toBe(false);
    expect(isUnknownCountryFieldError(new Error('Network Error'))).toBe(false);
  });

  it('withoutCountry deja el cuerpo EXACTO de antes de C2', () => {
    expect(withoutCountry({ productId: 'p1', quantity: 2, country: 'US' })).toEqual({ productId: 'p1', quantity: 2 });
    const plain: AddBody = { productId: 'p1', quantity: 2 };
    expect(Object.keys(withoutCountry(plain))).toEqual(['productId', 'quantity']);
  });

  it('API con C2: manda el país normalizado y no reintenta', async () => {
    const send = vi.fn().mockResolvedValue('cart');
    const memo = createCountrySupportMemo(1000, () => 0);
    await expect(addWithStoreCountry({ productId: 'p1', quantity: 1, country: 'us' }, send, memo)).resolves.toEqual({
      result: 'cart',
      countrySent: true,
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ productId: 'p1', quantity: 1, country: 'US' });
  });

  it('API previo a C2: UN reintento sin país y lo recuerda hasta que caduca', async () => {
    let now = 0;
    const memo = createCountrySupportMemo(1000, () => now);
    const send = vi.fn(async (body: AddBody) => {
      if (body.country) throw unknownCountry400;
      return 'cart';
    });
    const data: AddBody = { productId: 'p1', quantity: 1, country: 'US' };

    await expect(addWithStoreCountry(data, send, memo)).resolves.toEqual({ result: 'cart', countrySent: false });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ productId: 'p1', quantity: 1 });

    // Siguiente alta dentro de la ventana: directo sin país (no paga otro 400).
    await addWithStoreCountry(data, send, memo);
    expect(send).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenLastCalledWith({ productId: 'p1', quantity: 1 });

    // Caducó (pudo desplegarse C2): vuelve a intentar con país.
    now = 1000;
    await addWithStoreCountry(data, send, memo);
    expect(send).toHaveBeenCalledTimes(5);
  });

  it('cualquier OTRO error sigue su camino sin reintento (409 CART_COUNTRY_CHANGE, 422…)', async () => {
    const conflict = apiError(409, { code: 'CART_COUNTRY_CHANGE' });
    const send = vi.fn().mockRejectedValue(conflict);
    const memo = createCountrySupportMemo(1000, () => 0);
    await expect(addWithStoreCountry({ productId: 'p1', quantity: 1, country: 'US' }, send, memo)).rejects.toBe(conflict);
    expect(send).toHaveBeenCalledTimes(1);
    expect(memo.shouldSend()).toBe(true);
  });

  it('si el reintento sin país también falla, sale ESE error', async () => {
    const soldOut = apiError(409, { code: 'CART_QTY_EXCEEDS_STOCK', details: { maxQuantity: 0 } });
    const send = vi.fn(async (body: AddBody) => {
      throw body.country ? unknownCountry400 : soldOut;
    });
    const memo = createCountrySupportMemo(1000, () => 0);
    const data: AddBody = { productId: 'p1', quantity: 1, country: 'US' };
    await expect(addWithStoreCountry(data, send, memo)).rejects.toBe(soldOut);
  });

  it('sin país o con país inválido: la petición de antes, sin tocar la memoria', async () => {
    const send = vi.fn().mockResolvedValue('cart');
    const memo = createCountrySupportMemo(1000, () => 0);
    const plain: AddBody = { productId: 'p1', quantity: 1 };
    await addWithStoreCountry(plain, send, memo);
    await addWithStoreCountry({ productId: 'p1', quantity: 1, country: 'Mexico' }, send, memo);
    expect(send).toHaveBeenNthCalledWith(1, { productId: 'p1', quantity: 1 });
    expect(send).toHaveBeenNthCalledWith(2, { productId: 'p1', quantity: 1 });
    expect(memo.shouldSend()).toBe(true);
  });
});

describe('countryConflictAction (con sesión manda la CUENTA)', () => {
  it('cuenta con tienda propia distinta a la del carrito: la salida es vaciar y fijar el país de la cuenta', () => {
    expect(countryConflictAction({ accountStoreCountry: 'MX', cartCountry: 'US' })).toEqual({ kind: 'empty_for_account', accountCountry: 'MX' });
    expect(countryConflictAction({ accountStoreCountry: 'us', cartCountry: 'MX' })).toEqual({ kind: 'empty_for_account', accountCountry: 'US' });
  });

  it('carrito de país desconocido cuenta como distinto (el API ya dijo que no coincide)', () => {
    expect(countryConflictAction({ accountStoreCountry: 'MX', cartCountry: null })).toEqual({ kind: 'empty_for_account', accountCountry: 'MX' });
    expect(countryConflictAction({ accountStoreCountry: 'MX', cartCountry: undefined })).toEqual({ kind: 'empty_for_account', accountCountry: 'MX' });
  });

  it('invitado, o cuenta sin tienda propia (FN, CO, GT: manda el locale): se conserva el enlace a la tienda del carrito', () => {
    expect(countryConflictAction({ accountStoreCountry: undefined, cartCountry: 'US' })).toEqual({ kind: 'cart_store_link' });
    expect(countryConflictAction({ accountStoreCountry: null, cartCountry: 'MX' })).toEqual({ kind: 'cart_store_link' });
    expect(countryConflictAction({ accountStoreCountry: '', cartCountry: 'MX' })).toEqual({ kind: 'cart_store_link' });
  });

  it('el carrito YA es del país de la cuenta: nada que vaciar por la cuenta', () => {
    expect(countryConflictAction({ accountStoreCountry: 'MX', cartCountry: 'mx' })).toEqual({ kind: 'cart_store_link' });
  });
});

describe('mismatchCheckoutLocale ("Pagar" con carrito de otro país)', () => {
  const mismatch = { cartCountry: 'US', storeCountry: 'MX' };

  it('invitado: al checkout de la tienda DEL CARRITO, en el idioma actual', () => {
    expect(mismatchCheckoutLocale('es', mismatch, undefined)).toBe('es-us');
    expect(mismatchCheckoutLocale('en', mismatch, null)).toBe('en-us');
  });

  it('sesión con tienda propia de la cuenta: sin salto de locale (no serviría: manda la cuenta)', () => {
    expect(mismatchCheckoutLocale('es', mismatch, 'MX')).toBeUndefined();
  });

  it('sin carrito de otro país, o país sin tienda: sin salto', () => {
    expect(mismatchCheckoutLocale('es', null, undefined)).toBeUndefined();
    expect(mismatchCheckoutLocale('es', { cartCountry: 'AR', storeCountry: 'MX' }, undefined)).toBeUndefined();
  });
});

describe('conflictItemCount (cuántos productos se pierden al vaciar)', () => {
  it('lee details.itemCount del 409 CART_COUNTRY_CHANGE', () => {
    const err = apiError(409, { code: 'CART_COUNTRY_CHANGE', details: { cartCountry: 'MX', requestedCountry: 'US', itemCount: 3 } });
    expect(conflictItemCount(err)).toBe(3);
  });

  it('sin dato, cero, negativo, decimal o texto: null (el diálogo usa el carrito en caché)', () => {
    expect(conflictItemCount(apiError(409, { code: 'CHK_COUNTRY_MISMATCH', details: { cartCountry: 'MX' } }))).toBeNull();
    for (const itemCount of [0, -1, 1.5, '3', null]) {
      expect(conflictItemCount(apiError(409, { code: 'CART_COUNTRY_CHANGE', details: { itemCount } }))).toBeNull();
    }
    expect(conflictItemCount(new Error('Network Error'))).toBeNull();
    expect(conflictItemCount(undefined)).toBeNull();
  });
});
