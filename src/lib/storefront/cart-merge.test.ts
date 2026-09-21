import { describe, expect, it } from 'vitest';
import {
  classifyMergeError,
  isAuthEntryPath,
  mergeAction,
  mergeHasNews,
  mergeMovedNothing,
  newGuestSessionId,
  normalizeMergeResponse,
  type MergeViewerState,
} from './cart-merge';

const apiError = (status: number, data: unknown = {}) => ({ response: { status, data } });

const base: MergeViewerState = {
  authInitialized: true,
  hasCustomerSession: true,
  pathname: '/distribuidor',
  guestSessionId: 'guest_1_abc',
  mergedSessionId: null,
};

describe('mergeAction (cuándo se llama POST /cart/merge)', () => {
  it('sesión de cliente + carrito de invitado sin mezclar: merge', () => {
    expect(mergeAction(base)).toBe('merge');
    expect(mergeAction({ ...base, pathname: '/es-mx/carrito' })).toBe('merge');
  });

  it('UNA vez: el mismo x-session-id ya mezclado no se repite en cada carga de página', () => {
    expect(mergeAction({ ...base, mergedSessionId: 'guest_1_abc' })).toBe('none');
    // Otro x-session-id (carrito de invitado nuevo): sí.
    expect(mergeAction({ ...base, mergedSessionId: 'guest_0_old' })).toBe('merge');
  });

  it('antes de que auth termine de inicializar no se decide nada (sin sesión aún no significa invitado)', () => {
    expect(mergeAction({ ...base, authInitialized: false })).toBe('none');
    expect(mergeAction({ ...base, authInitialized: false, hasCustomerSession: false, mergedSessionId: 'guest_1_abc' })).toBe('none');
  });

  it('nunca hubo carrito de invitado: nada', () => {
    expect(mergeAction({ ...base, guestSessionId: null })).toBe('none');
  });

  it('invitado o staff (sin customerId): no se mezcla', () => {
    expect(mergeAction({ ...base, hasCustomerSession: false })).toBe('none');
  });

  it('páginas de acceso: nunca se mezcla ahí (el login puede revertirse) y se rearma para el próximo inicio de sesión', () => {
    expect(mergeAction({ ...base, pathname: '/login' })).toBe('none');
    expect(mergeAction({ ...base, pathname: '/login', mergedSessionId: 'guest_1_abc' })).toBe('rearm');
    expect(mergeAction({ ...base, pathname: '/registro/distribuidor', mergedSessionId: 'guest_1_abc' })).toBe('rearm');
  });

  it('navegando SIN sesión con la marca puesta (cerró sesión): se rearma', () => {
    expect(mergeAction({ ...base, hasCustomerSession: false, mergedSessionId: 'guest_1_abc' })).toBe('rearm');
  });

  it('isAuthEntryPath no confunde prefijos', () => {
    expect(isAuthEntryPath('/login')).toBe(true);
    expect(isAuthEntryPath('/set-password')).toBe(true);
    expect(isAuthEntryPath('/registro/distribuidor/exitoso')).toBe(true);
    expect(isAuthEntryPath('/login-ayuda')).toBe(false);
    expect(isAuthEntryPath('/es-mx/productos')).toBe(false);
    expect(isAuthEntryPath(null)).toBe(false);
  });
});

const cart = { id: 'c1', items: [{ id: 'i1' }], subtotal: '10.00' };

describe('normalizeMergeResponse (tolerante a la forma de la respuesta)', () => {
  it('{ cart, merged, adjusted, rejected }', () => {
    const result = normalizeMergeResponse<typeof cart>({
      cart,
      merged: true,
      adjusted: [{ productName: 'Crema Spectra', requestedQuantity: 30, quantity: 20 }],
      rejected: [{ productName: 'Kit Solo US', code: 'CART_NO_PRICE_IN_COUNTRY' }],
    });
    expect(result.cart).toBe(cart);
    expect(result.summary).toEqual({
      merged: true,
      addedLines: null,
      skipReason: null,
      adjusted: [{ name: 'Crema Spectra', requested: 30, quantity: 20 }],
      rejected: [{ name: 'Kit Solo US', requested: null, quantity: null }],
    });
    expect(mergeHasNews(result.summary)).toBe(true);
  });

  it('carrito con un bloque `merge` anidado', () => {
    const result = normalizeMergeResponse<typeof cart>({ ...cart, merge: { merged: true, adjustedItems: [{ name: 'A', quantity: 2 }] } });
    expect(result.cart).toMatchObject({ id: 'c1' });
    expect(result.summary.adjusted).toEqual([{ name: 'A', requested: null, quantity: 2 }]);
  });

  it('carrito a secas: se mezcló, sin novedades (no hay toast)', () => {
    const result = normalizeMergeResponse<typeof cart>(cart);
    expect(result.cart).toBe(cart);
    expect(mergeHasNews(result.summary)).toBe(false);
  });

  it('no se mezcló por ser de OTRO país (2xx con motivo)', () => {
    for (const body of [
      { merged: false, reason: 'country_mismatch' },
      { merged: false, skipReason: 'COUNTRY_MISMATCH', cart },
      { merged: false, code: 'CART_MERGE_COUNTRY_MISMATCH' },
    ]) {
      const { summary } = normalizeMergeResponse(body);
      expect(summary.merged).toBe(false);
      expect(summary.skipReason).toBe('country_mismatch');
      expect(mergeHasNews(summary)).toBe(true);
    }
  });

  it('`merged: false` sin motivo (no había carrito de invitado): sin novedades', () => {
    const { summary, cart: none } = normalizeMergeResponse({ merged: false, reason: 'no_guest_cart' });
    expect(summary).toEqual({ merged: false, addedLines: null, skipReason: null, adjusted: [], rejected: [] });
    expect(none).toBeNull();
    expect(mergeHasNews(summary)).toBe(false);
  });

  it('respuesta vacía o rara: no truena y no inventa novedades', () => {
    for (const body of [undefined, null, '', 'ok', 42, []]) {
      const result = normalizeMergeResponse(body);
      expect(result.cart).toBeNull();
      expect(mergeHasNews(result.summary)).toBe(false);
    }
    const weird = normalizeMergeResponse({ adjusted: 'muchos', rejected: [null, 3, { name: 7 }] });
    expect(weird.summary.adjusted).toEqual([]);
    expect(weird.summary.rejected).toEqual([{ name: '', requested: null, quantity: null }]);
  });
});

describe('classifyMergeError', () => {
  it('404/405 = API previo a C3: silencio', () => {
    expect(classifyMergeError(apiError(404, { message: 'Cannot POST /api/v1/cart/merge' }))).toBe('unsupported');
    expect(classifyMergeError(apiError(405))).toBe('unsupported');
  });

  it('409/422 con código de país: no se mezcló por ser de otro país', () => {
    expect(classifyMergeError(apiError(409, { code: 'CART_MERGE_COUNTRY_MISMATCH' }))).toBe('country_mismatch');
    expect(classifyMergeError(apiError(409, { code: 'CART_COUNTRY_CHANGE' }))).toBe('country_mismatch');
  });

  it('red, 401, 5xx u otro 409: se reintenta en otra carga, sin aviso', () => {
    expect(classifyMergeError(new Error('Network Error'))).toBe('retry_later');
    expect(classifyMergeError(apiError(401))).toBe('retry_later');
    expect(classifyMergeError(apiError(500))).toBe('retry_later');
    expect(classifyMergeError(apiError(409, { code: 'CART_LOCKED' }))).toBe('retry_later');
    expect(classifyMergeError(apiError(409, { message: 'otro país' }))).toBe('retry_later');
  });
});

describe('merge: qué título lleva el aviso (L1) y el 403 de sesión sin cliente (L6)', () => {
  it('`merge.addedLines` = 0 con rechazos: NO se puede decir "pasamos tu carrito"', () => {
    const { summary } = normalizeMergeResponse({
      id: 'c1',
      items: [],
      merge: { merged: true, addedLines: 0, adjusted: [], rejected: [{ productName: 'Kit Solo US' }] },
    });
    expect(summary.addedLines).toBe(0);
    expect(mergeHasNews(summary)).toBe(true);
    expect(mergeMovedNothing(summary)).toBe(true);
  });

  it('con líneas que sí pasaron, o sin el dato (API que no lo manda), el título de siempre', () => {
    const some = normalizeMergeResponse({ merge: { merged: true, addedLines: 2, rejected: [{ productName: 'X' }] } }).summary;
    expect(some.addedLines).toBe(2);
    expect(mergeMovedNothing(some)).toBe(false);
    const unknown = normalizeMergeResponse({ merged: true, rejected: [{ productName: 'X' }] }).summary;
    expect(unknown.addedLines).toBeNull();
    expect(mergeMovedNothing(unknown)).toBe(false);
    expect(mergeMovedNothing(normalizeMergeResponse({ merge: { addedLines: '0' } }).summary)).toBe(false);
  });

  it('403 CART_MERGE_CUSTOMER_REQUIRED: no aplica (se marca y no se reintenta); otro 403 se reintenta', () => {
    expect(classifyMergeError(apiError(403, { code: 'CART_MERGE_CUSTOMER_REQUIRED' }))).toBe('not_applicable');
    expect(classifyMergeError(apiError(403, { code: 'PILOT_DISABLED' }))).toBe('retry_later');
    expect(classifyMergeError(apiError(403))).toBe('retry_later');
    expect(classifyMergeError(apiError(409, { code: 'CART_MERGE_CUSTOMER_REQUIRED' }))).toBe('retry_later');
  });
});

describe('newGuestSessionId (identificador de invitado NUEVO, impredecible)', () => {
  it('usa crypto.randomUUID cuando existe', () => {
    const id = newGuestSessionId({ randomUUID: () => '3b241101-e2bb-4255-8caf-4136c566a962' });
    expect(id).toBe('guest_3b241101-e2bb-4255-8caf-4136c566a962');
  });

  it('sin randomUUID (contexto no seguro): 16 bytes de getRandomValues en hexadecimal', () => {
    const id = newGuestSessionId({
      getRandomValues: (array) => {
        array.forEach((_, index) => {
          array[index] = index * 17;
        });
        return array;
      },
    });
    expect(id).toBe('guest_00112233445566778899aabbccddeeff');
  });

  it('sin crypto, o con un crypto que truena: el formato histórico, nunca una excepción', () => {
    expect(newGuestSessionId(null, () => 1700000000000)).toMatch(/^guest_1700000000000_[a-z0-9]+$/);
    const broken = {
      randomUUID: () => {
        throw new Error('SecurityError');
      },
    };
    expect(newGuestSessionId(broken, () => 5)).toMatch(/^guest_5_[a-z0-9]+$/);
  });

  it('con el crypto real: único, con prefijo y dentro de varchar(100)', () => {
    const a = newGuestSessionId();
    const b = newGuestSessionId();
    expect(a).toMatch(/^guest_[0-9a-f-]{32,36}$/);
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(100);
  });
});
