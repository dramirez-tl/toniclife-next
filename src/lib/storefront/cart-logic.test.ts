import { describe, expect, it } from 'vitest';
import {
  CART_LINE_HARD_MAX,
  ENROLLMENT_FALLBACK_HREF,
  QTY_DRAFT_ATTR,
  addedQuantity,
  bundleAddOutcome,
  buyNowDestination,
  capReason,
  cartBlockers,
  checkoutGate,
  clampQuantity,
  commitQuantityDraft,
  escapeCancelsQuantityDraft,
  freeShippingEligible,
  freeShippingProgress,
  knownCartCurrency,
  lineIssue,
  lineLimit,
  linePointsPerUnit,
  lineSlug,
  mapCartError,
  planStockAdjust,
  resolveShowPoints,
  safeInternalHref,
} from './cart-logic';

const apiError = (status: number, data: unknown) => ({ response: { status, data } });

describe('freeShippingProgress (umbral de envío gratis POR PAÍS)', () => {
  const mx = { freeThreshold: 1500, currencyCode: 'MXN' };
  const us = { freeThreshold: 100, currencyCode: 'usd' };

  it('MX: calcula lo que falta y el porcentaje con el umbral del país', () => {
    expect(freeShippingProgress({ shipping: mx, subtotal: 1121, eligible: true })).toEqual({
      threshold: 1500,
      remaining: 379,
      reached: false,
      percent: 74,
      currencyCode: 'MXN',
    });
  });

  it('US: usa SU umbral en USD (no compara dólares contra pesos)', () => {
    const progress = freeShippingProgress({ shipping: us, subtotal: 62.5, eligible: true });
    expect(progress).toMatchObject({ threshold: 100, remaining: 37.5, percent: 62, currencyCode: 'USD' });
  });

  it('alcanzado: remaining 0 y 100 %, también al pasarse', () => {
    expect(freeShippingProgress({ shipping: mx, subtotal: 1500, eligible: true })).toMatchObject({
      reached: true,
      remaining: 0,
      percent: 100,
    });
    expect(freeShippingProgress({ shipping: mx, subtotal: 9000, eligible: true })?.percent).toBe(100);
  });

  it('a un centavo del umbral NO marca 100 %', () => {
    const progress = freeShippingProgress({ shipping: mx, subtotal: 1499.99, eligible: true });
    expect(progress).toMatchObject({ reached: false, remaining: 0.01, percent: 99 });
  });

  it('sin dato del país (CO/GT) o umbral inválido: sin barra', () => {
    expect(freeShippingProgress({ shipping: null, subtotal: 500, eligible: true })).toBeNull();
    expect(freeShippingProgress({ shipping: undefined, subtotal: 500, eligible: true })).toBeNull();
    expect(freeShippingProgress({ shipping: { freeThreshold: null, currencyCode: 'COP' }, subtotal: 5, eligible: true })).toBeNull();
    expect(freeShippingProgress({ shipping: { freeThreshold: 0, currencyCode: 'MXN' }, subtotal: 5, eligible: true })).toBeNull();
    expect(freeShippingProgress({ shipping: { freeThreshold: Number.NaN, currencyCode: 'MXN' }, subtotal: 5, eligible: true })).toBeNull();
    expect(freeShippingProgress({ shipping: { freeThreshold: 100, currencyCode: '' }, subtotal: 5, eligible: true })).toBeNull();
  });

  it('distribuidor (el checkout nunca le da envío gratis por monto): sin barra', () => {
    expect(freeShippingProgress({ shipping: mx, subtotal: 5000, eligible: false })).toBeNull();
  });

  it('moneda del carrito (C2) distinta a la del envío: sin barra; igual o ausente: con barra', () => {
    expect(freeShippingProgress({ shipping: us, subtotal: 50, eligible: true, cartCurrencyCode: 'MXN' })).toBeNull();
    expect(freeShippingProgress({ shipping: us, subtotal: 50, eligible: true, cartCurrencyCode: 'usd' })).not.toBeNull();
    expect(freeShippingProgress({ shipping: us, subtotal: 50, eligible: true, cartCurrencyCode: null })).not.toBeNull();
  });

  it('subtotal basura se trata como 0', () => {
    expect(freeShippingProgress({ shipping: mx, subtotal: Number.NaN, eligible: true })).toMatchObject({
      remaining: 1500,
      percent: 0,
    });
    expect(freeShippingProgress({ shipping: mx, subtotal: -20, eligible: true })?.remaining).toBe(1500);
  });
});

describe('tope de cantidad', () => {
  it('API actual (solo availableStock) y API C1 (maxQuantity): gana el menor', () => {
    expect(lineLimit({ quantity: 1, availableStock: 7 })).toEqual({ max: 7, known: true, reason: 'stock' });
    expect(lineLimit({ quantity: 1, maxQuantity: 20 })).toEqual({ max: 20, known: true, reason: 'stock' });
    expect(lineLimit({ quantity: 1, maxQuantity: 20, availableStock: 3 })).toEqual({ max: 3, known: true, reason: 'stock' });
  });

  it('sin dato: tope del DTO (999) y known=false', () => {
    expect(lineLimit({ quantity: 1 })).toEqual({ max: CART_LINE_HARD_MAX, known: false, reason: 'stock' });
    expect(lineLimit({ quantity: 1, maxQuantity: null, availableStock: null })).toEqual({
      max: 999,
      known: false,
      reason: 'stock',
    });
  });

  it('motivo del tope: "Máximo N por pedido" SOLO si hay más existencias que el tope', () => {
    // CI6296: 403 armables y tope de tienda 20 → no se dice "solo hay 20".
    expect(lineLimit({ quantity: 20, maxQuantity: 20, availableStock: 403 })).toEqual({
      max: 20,
      known: true,
      reason: 'order_max',
    });
    expect(capReason({ quantity: 1, maxQuantity: 7, availableStock: 7 })).toBe('stock');
    expect(capReason({ quantity: 1, maxQuantity: 20 })).toBe('stock'); // sin existencias no se puede afirmar
    expect(capReason({ quantity: 1, availableStock: 50 })).toBe('stock');
    expect(capReason({ quantity: 1, maxQuantity: 0, availableStock: 9 })).toBe('stock'); // agotado, no "por pedido"
    // El API ya no manda la existencia exacta (viaja topada): el motivo lo dice él.
    expect(capReason({ quantity: 1, maxQuantity: 20, availableStock: 20, maxQuantityReason: 'order_max' })).toBe('order_max');
    expect(capReason({ quantity: 1, maxQuantity: 3, availableStock: 3, maxQuantityReason: 'stock' })).toBe('stock');
  });

  it('agotado o negativo nunca deja el campo en 0', () => {
    expect(lineLimit({ quantity: 2, availableStock: 0 })).toEqual({ max: 1, known: true, reason: 'stock' });
    expect(lineLimit({ quantity: 2, availableStock: -4 })).toEqual({ max: 999, known: false, reason: 'stock' });
    expect(lineLimit({ quantity: 2, maxQuantity: 5000 }).max).toBe(999);
  });

  it('clampQuantity: 1..max, enteros', () => {
    expect(clampQuantity(0, 10)).toBe(1);
    expect(clampQuantity(11, 10)).toBe(10);
    expect(clampQuantity(3.9, 10)).toBe(3);
    expect(clampQuantity(Number.NaN, 10)).toBe(1);
    expect(clampQuantity(5, 0)).toBe(1);
    expect(clampQuantity(5000, 5000)).toBe(999);
  });

  it('commitQuantityDraft: un solo valor final, recorta al tope y no manda si no cambió', () => {
    expect(commitQuantityDraft('12', 1, 20)).toEqual({ next: 12, clamped: false });
    expect(commitQuantityDraft('25', 1, 20)).toEqual({ next: 20, clamped: true });
    expect(commitQuantityDraft('25', 20, 20)).toEqual({ next: null, clamped: true });
    expect(commitQuantityDraft('3', 3, 20)).toEqual({ next: null, clamped: false });
    expect(commitQuantityDraft('0', 3, 20)).toEqual({ next: 1, clamped: true });
  });

  it('commitQuantityDraft: vacío o no numérico = sin petición (antes un vacío mandaba 1)', () => {
    expect(commitQuantityDraft('', 4, 20)).toEqual({ next: null, clamped: false });
    expect(commitQuantityDraft('  ', 4, 20)).toEqual({ next: null, clamped: false });
    expect(commitQuantityDraft('1e3', 4, 20)).toEqual({ next: null, clamped: false });
    expect(commitQuantityDraft('-2', 4, 20)).toEqual({ next: null, clamped: false });
    expect(commitQuantityDraft('99999', 4, 20)).toEqual({ next: null, clamped: false });
  });
});

describe('líneas que bloquean el pago', () => {
  it('lineIssue', () => {
    expect(lineIssue({ quantity: 1, inStock: false, availableStock: 9 })).toBe('sold_out');
    expect(lineIssue({ quantity: 1, availableStock: 0 })).toBe('sold_out');
    expect(lineIssue({ quantity: 1, maxQuantity: 0 })).toBe('sold_out');
    expect(lineIssue({ quantity: 5, availableStock: 3 })).toBe('exceeds_stock');
    expect(lineIssue({ quantity: 5, maxQuantity: 4, availableStock: 30 })).toBe('exceeds_stock');
    expect(lineIssue({ quantity: 3, availableStock: 3 })).toBeNull();
    expect(lineIssue({ quantity: 3 })).toBeNull();
    expect(lineIssue({ quantity: 3, inStock: true })).toBeNull();
  });

  it('cartBlockers cuenta por tipo y bloquea con cualquiera', () => {
    expect(cartBlockers([])).toEqual({ soldOut: 0, exceedsStock: 0, blocked: false });
    expect(cartBlockers([{ quantity: 1, availableStock: 5 }, { quantity: 2 }]).blocked).toBe(false);
    expect(
      cartBlockers([
        { quantity: 1, inStock: false },
        { quantity: 9, availableStock: 2 },
        { quantity: 1, availableStock: 2 },
      ]),
    ).toEqual({ soldOut: 1, exceedsStock: 1, blocked: true });
  });
});

describe('puntos y slug', () => {
  it('resolveShowPoints: manda el API; sin campo, solo sesión de cliente', () => {
    expect(resolveShowPoints(true, false)).toBe(true);
    expect(resolveShowPoints(false, true)).toBe(false);
    expect(resolveShowPoints(undefined, true)).toBe(true);
    expect(resolveShowPoints(undefined, false)).toBe(false);
    expect(resolveShowPoints(null, false)).toBe(false);
  });

  it('linePointsPerUnit: nunca sin showPoints; pointsPerUnit o total/cantidad', () => {
    expect(linePointsPerUnit({ quantity: 3, points: 1872, pointsPerUnit: 624 }, false)).toBeNull();
    expect(linePointsPerUnit({ quantity: 3, points: 1872, pointsPerUnit: 624 }, true)).toBe(624);
    expect(linePointsPerUnit({ quantity: 3, points: 1872 }, true)).toBe(624);
    expect(linePointsPerUnit({ quantity: 3, points: 100 }, true)).toBe(33.33);
    expect(linePointsPerUnit({ quantity: 3, points: 0 }, true)).toBeNull();
    expect(linePointsPerUnit({ quantity: 0, points: 10 }, true)).toBeNull();
    expect(linePointsPerUnit({ quantity: 2, pointsPerUnit: 0, points: 50 }, true)).toBeNull();
  });

  it('lineSlug: slug (C1) → productSlug (actual) → null; descarta basura', () => {
    expect(lineSlug({ quantity: 1, slug: '3025-crema-spectra', productSlug: 'otro' })).toBe('3025-crema-spectra');
    expect(lineSlug({ quantity: 1, productSlug: '3025-crema-spectra' })).toBe('3025-crema-spectra');
    expect(lineSlug({ quantity: 1 })).toBeNull();
    expect(lineSlug({ quantity: 1, slug: '', productSlug: null })).toBeNull();
    expect(lineSlug({ quantity: 1, slug: '../admin' })).toBeNull();
    expect(lineSlug({ quantity: 1, slug: 'a b' })).toBeNull();
  });
});

describe('mapCartError (por código, nunca por texto)', () => {
  it('CART_NOT_SELLABLE', () => {
    expect(mapCartError(apiError(422, { code: 'CART_NOT_SELLABLE', message: 'x' }))).toEqual({ kind: 'not_sellable' });
  });

  it('CART_ENROLLMENT_KIT: href interno del API o respaldo', () => {
    expect(
      mapCartError(apiError(422, { code: 'CART_ENROLLMENT_KIT', details: { href: '/registro/distribuidor' } })),
    ).toEqual({ kind: 'enrollment_kit', href: '/registro/distribuidor' });
    expect(mapCartError(apiError(422, { code: 'CART_ENROLLMENT_KIT' }))).toEqual({
      kind: 'enrollment_kit',
      href: ENROLLMENT_FALLBACK_HREF,
    });
    expect(
      mapCartError(apiError(422, { code: 'CART_ENROLLMENT_KIT', details: { href: 'https://evil.example/x' } })).href,
    ).toBe(ENROLLMENT_FALLBACK_HREF);
  });

  it('CART_QTY_EXCEEDS_STOCK: maxQuantity numérico, string, 0, ausente o basura', () => {
    expect(mapCartError(apiError(409, { code: 'CART_QTY_EXCEEDS_STOCK', details: { maxQuantity: 4 } }))).toEqual({
      kind: 'qty_exceeds_stock',
      maxQuantity: 4,
    });
    expect(mapCartError(apiError(409, { code: 'CART_QTY_EXCEEDS_STOCK', details: { maxQuantity: '7' } })).maxQuantity).toBe(7);
    expect(mapCartError(apiError(409, { code: 'CART_QTY_EXCEEDS_STOCK', details: { maxQuantity: 0 } })).maxQuantity).toBe(0);
    expect(mapCartError(apiError(409, { code: 'CART_QTY_EXCEEDS_STOCK' })).maxQuantity).toBeNull();
    expect(mapCartError(apiError(409, { code: 'CART_QTY_EXCEEDS_STOCK', details: { maxQuantity: -3 } })).maxQuantity).toBeNull();
    expect(mapCartError(apiError(409, { code: 'CART_QTY_EXCEEDS_STOCK', details: { maxQuantity: 'muchos' } })).maxQuantity).toBeNull();
  });

  it('API ACTUAL (sin code): 401 = sesión; lo demás = other', () => {
    expect(mapCartError(apiError(401, { message: 'Unauthorized' }))).toEqual({ kind: 'session_expired' });
    expect(mapCartError(apiError(400, { message: 'Producto no encontrado' }))).toEqual({ kind: 'other' });
    expect(mapCartError(new Error('Network Error'))).toEqual({ kind: 'other' });
    expect(mapCartError(null)).toEqual({ kind: 'other' });
    expect(mapCartError(apiError(422, { code: 'cart_not_sellable' }))).toEqual({ kind: 'other' });
  });

  it('safeInternalHref', () => {
    expect(safeInternalHref('/registro/distribuidor?ref=abc', '/x')).toBe('/registro/distribuidor?ref=abc');
    expect(safeInternalHref('//evil.example', '/x')).toBe('/x');
    expect(safeInternalHref('javascript:alert(1)', '/x')).toBe('/x');
    expect(safeInternalHref('/a\\b', '/x')).toBe('/x');
    expect(safeInternalHref('/a b', '/x')).toBe('/x');
    expect(safeInternalHref(42, '/x')).toBe('/x');
  });
});

describe('planStockAdjust (tras CART_QTY_EXCEEDS_STOCK)', () => {
  it('deja la línea en el máximo', () => {
    expect(planStockAdjust(4, 0)).toEqual({ action: 'set', quantity: 4 });
    expect(planStockAdjust(4, 2)).toEqual({ action: 'set', quantity: 4 });
  });

  it('línea que YA estaba por encima del tope: NO se baja en silencio (sale el error)', () => {
    expect(planStockAdjust(20, 30)).toEqual({ action: 'over_max', quantity: 20 });
    expect(planStockAdjust(4, 9)).toEqual({ action: 'over_max', quantity: 4 });
  });

  it('ya está en el máximo: no repite la petición', () => {
    expect(planStockAdjust(4, 4)).toEqual({ action: 'already_max', quantity: 4 });
  });

  it('agotado o sin dato', () => {
    expect(planStockAdjust(0, 2)).toEqual({ action: 'sold_out' });
    expect(planStockAdjust(null, 2)).toEqual({ action: 'none' });
    expect(planStockAdjust(undefined, 2)).toEqual({ action: 'none' });
  });
});

describe('freeShippingEligible (moneda garantizada + a quién el checkout SÍ le da envío gratis)', () => {
  const guest = { hasCustomerSession: false, distributorSession: false };
  const distributor = { hasCustomerSession: true, distributorSession: true };

  it('carrito SIN país (API previo a C2) de invitado: se resuelve como MX; solo se garantiza la moneda en la tienda MX', () => {
    expect(knownCartCurrency({ ...guest, countryCode: 'MX' })).toBe('MXN');
    expect(knownCartCurrency({ ...guest, countryCode: 'US' })).toBeNull();
    expect(freeShippingEligible({ ...guest, countryCode: 'MX', shippingCurrencyCode: 'MXN', priceTier: 'public' })).toBe(true);
    // /en-us: subtotal en pesos contra umbral de 100 USD → decía "alcanzado" con casi cualquier producto.
    expect(freeShippingEligible({ ...guest, countryCode: 'US', shippingCurrencyCode: 'USD', priceTier: 'public' })).toBe(false);
    // Ni aunque el API diga que es elegible: la moneda no está garantizada.
    expect(
      freeShippingEligible({ ...guest, countryCode: 'US', shippingCurrencyCode: 'USD', priceTier: 'public', apiEligible: true }),
    ).toBe(false);
    // La moneda de una cuenta SIN sesión de cliente no cuenta.
    expect(knownCartCurrency({ ...guest, countryCode: 'US', viewerCurrencyCode: 'USD' })).toBeNull();
  });

  it('con cart.currencyCode (C2) manda la moneda del carrito', () => {
    expect(knownCartCurrency({ ...guest, countryCode: 'US', cartCurrencyCode: ' usd ' })).toBe('USD');
    expect(
      freeShippingEligible({ ...guest, countryCode: 'US', cartCurrencyCode: 'USD', shippingCurrencyCode: 'usd', priceTier: 'public' }),
    ).toBe(true);
    expect(
      freeShippingEligible({ ...guest, countryCode: 'US', cartCurrencyCode: 'MXN', shippingCurrencyCode: 'USD', priceTier: 'public' }),
    ).toBe(false);
  });

  it('con sesión de cliente: la moneda es la de SU cuenta', () => {
    const us = { hasCustomerSession: true, distributorSession: true, viewerCurrencyCode: 'USD', countryCode: 'US' };
    expect(knownCartCurrency(us)).toBe('USD');
    expect(freeShippingEligible({ ...us, shippingCurrencyCode: 'USD', apiEligible: true })).toBe(true);
    // Cuenta de Colombia navegando la tienda MX: pesos colombianos contra umbral en MXN.
    expect(
      freeShippingEligible({ ...us, viewerCurrencyCode: 'COP', countryCode: 'MX', shippingCurrencyCode: 'MXN', apiEligible: true }),
    ).toBe(false);
  });

  it('manda shipping.freeShippingEligible del API cuando viene (false para distribuidores)', () => {
    const base = { ...distributor, viewerCurrencyCode: 'MXN', countryCode: 'MX', shippingCurrencyCode: 'MXN' };
    expect(freeShippingEligible({ ...base, apiEligible: false, priceTier: 'public' })).toBe(false);
    expect(freeShippingEligible({ ...base, apiEligible: true, priceTier: 'preferred' })).toBe(true);
    // Sesión de distribuidor cotizada como anónimo (token vencido): el `true` es de anónimo.
    // No se promete nada hasta recuperar la sesión: nunca prometer de más.
    expect(freeShippingEligible({ ...base, apiEligible: true, priceTier: 'public' })).toBe(false);
  });

  it('provisional sin el campo del API: sesión de distribuidor NO elegible aunque cotice a precio público', () => {
    const base = { ...distributor, viewerCurrencyCode: 'MXN', countryCode: 'MX', shippingCurrencyCode: 'MXN' };
    // Los 1,053 distribuidores sin kit activo: precio público, pero el checkout les cobra el estándar.
    expect(freeShippingEligible({ ...base, priceTier: 'public' })).toBe(false);
    expect(freeShippingEligible({ ...base, priceTier: 'distributor' })).toBe(false);
    expect(freeShippingEligible({ ...base, apiEligible: null, priceTier: 'public' })).toBe(false);
    // El rol no distingue al preferente: solo si el API ya lo cotizó como tal.
    expect(freeShippingEligible({ ...base, priceTier: 'preferred' })).toBe(true);
    // Colaborador (sesión sin cliente) en MX: como invitado.
    expect(
      freeShippingEligible({ hasCustomerSession: false, distributorSession: false, countryCode: 'MX', shippingCurrencyCode: 'MXN', priceTier: 'public' }),
    ).toBe(true);
  });

  it('sin moneda del envío: no elegible', () => {
    expect(freeShippingEligible({ ...guest, countryCode: 'MX', shippingCurrencyCode: '', priceTier: 'public' })).toBe(false);
  });
});

describe('checkoutGate (bloquea a la sesión de cliente y, con C2, al invitado con carrito de país conocido)', () => {
  const soldOut = cartBlockers([{ quantity: 1, inStock: false }]);
  const clean = cartBlockers([{ quantity: 1, availableStock: 5 }]);

  it('invitado con carrito SIN país (API previo a C2): aviso informativo, puede continuar a iniciar sesión', () => {
    expect(checkoutGate(soldOut, false)).toEqual({ showNotice: true, blocked: false });
    expect(checkoutGate(soldOut, false, false)).toEqual({ showNotice: true, blocked: false });
  });

  it('C2: invitado con carrito de país CONOCIDO vuelve a tener bloqueo por agotados', () => {
    expect(checkoutGate(soldOut, false, true)).toEqual({ showNotice: true, blocked: true });
    expect(checkoutGate(clean, false, true)).toEqual({ showNotice: false, blocked: false });
  });

  it('sesión de cliente: el bloqueo sigue', () => {
    expect(checkoutGate(soldOut, true)).toEqual({ showNotice: true, blocked: true });
  });

  it('sin agotados ni excesos: ni aviso ni bloqueo', () => {
    expect(checkoutGate(clean, true)).toEqual({ showNotice: false, blocked: false });
    expect(checkoutGate(clean, false)).toEqual({ showNotice: false, blocked: false });
  });
});

describe('mapCartError: códigos de país (C2)', () => {
  it('409 CART_COUNTRY_CHANGE trae los países de details', () => {
    const err = apiError(409, { code: 'CART_COUNTRY_CHANGE', message: 'x', details: { cartCountry: 'mx', requestedCountry: 'US' } });
    expect(mapCartError(err)).toEqual({ kind: 'country_change', cartCountry: 'MX', requestedCountry: 'US' });
  });

  it('409 CART_COUNTRY_CHANGE sin details: países null (el hook los completa con el carrito en caché)', () => {
    expect(mapCartError(apiError(409, { code: 'CART_COUNTRY_CHANGE' }))).toEqual({
      kind: 'country_change',
      cartCountry: null,
      requestedCountry: null,
    });
  });

  it('422 CART_NO_PRICE_IN_COUNTRY', () => {
    expect(mapCartError(apiError(422, { code: 'CART_NO_PRICE_IN_COUNTRY', details: { country: 'US' } }))).toEqual({
      kind: 'no_price_in_country',
      requestedCountry: 'US',
    });
    expect(mapCartError(apiError(422, { code: 'CART_NO_PRICE_IN_COUNTRY' }))).toEqual({
      kind: 'no_price_in_country',
      requestedCountry: null,
    });
  });

  it('400 CART_COUNTRY_INVALID: la tienda de ese país aún no vende en línea', () => {
    expect(mapCartError(apiError(400, { code: 'CART_COUNTRY_INVALID', details: { country: 'CO' } }))).toEqual({ kind: 'country_invalid' });
  });

  it('un 409 SIN código (API previo) sigue siendo "other"', () => {
    expect(mapCartError(apiError(409, { message: 'Conflicto' }))).toEqual({ kind: 'other' });
  });
});

describe('buyNowDestination ("Comprar ahora" con el carrito YA actualizado)', () => {
  const ok = [{ quantity: 1, availableStock: 5 }];
  const withSoldOut = [...ok, { quantity: 2, inStock: false }];
  const withExcess = [{ quantity: 30, maxQuantity: 20, availableStock: 400 }];

  it('carrito sano y pago encendido: al checkout', () => {
    expect(buyNowDestination({ checkoutEnabled: true, items: ok })).toEqual({ href: '/checkout', reason: 'ok' });
  });

  it('líneas agotadas o por encima del tope (aunque sean OTRAS líneas): a /carrito, que lo explica', () => {
    expect(buyNowDestination({ checkoutEnabled: true, items: withSoldOut })).toEqual({ href: '/carrito', reason: 'blocked_lines' });
    expect(buyNowDestination({ checkoutEnabled: true, items: withExcess })).toEqual({ href: '/carrito', reason: 'blocked_lines' });
  });

  it('piloto con el pago apagado (fail-closed): a /carrito con su aviso', () => {
    expect(buyNowDestination({ checkoutEnabled: false, items: ok })).toEqual({ href: '/carrito', reason: 'checkout_off' });
    expect(buyNowDestination({ checkoutEnabled: false, items: withSoldOut }).reason).toBe('checkout_off');
  });
});

describe('addedQuantity / bundleAddOutcome (no anunciar "agregado" si no entró nada)', () => {
  it('después − antes', () => {
    expect(addedQuantity(2, 3, 1)).toBe(1);
    expect(addedQuantity(0, 4, 10)).toBe(4); // el API ajustó al máximo
  });

  it('la línea ya estaba en su máximo: 0', () => {
    expect(addedQuantity(20, 20, 1)).toBe(0);
    expect(addedQuantity(20, 18, 1)).toBe(0); // nunca negativo
  });

  it('sin carrito en caché: lo pedido, acotado a lo que quedó', () => {
    expect(addedQuantity(null, 5, 1)).toBe(1);
    expect(addedQuantity(null, 2, 3)).toBe(2);
    expect(addedQuantity(null, null, 3)).toBe(3);
  });

  it('paquete del quiz: todo, parcial (un 409 no aborta el resto) o nada', () => {
    expect(bundleAddOutcome([1, 1, 1])).toBe('all');
    expect(bundleAddOutcome([1, 0, 1])).toBe('partial');
    expect(bundleAddOutcome([0, 0, 0])).toBe('none');
    expect(bundleAddOutcome([])).toBe('none');
  });
});

describe('escapeCancelsQuantityDraft (Escape en el campo de cantidad no cierra el drawer)', () => {
  const el = (value: string | null) => ({ getAttribute: (name: string) => (name === QTY_DRAFT_ATTR ? value : null) });

  it('campo CON borrador: el drawer no se cierra', () => {
    expect(escapeCancelsQuantityDraft(el('true'))).toBe(true);
  });

  it('campo sin borrador, otro elemento o sin foco: Escape cierra el drawer', () => {
    expect(escapeCancelsQuantityDraft(el(null))).toBe(false);
    expect(escapeCancelsQuantityDraft(el('false'))).toBe(false);
    expect(escapeCancelsQuantityDraft(null)).toBe(false);
    expect(escapeCancelsQuantityDraft(undefined)).toBe(false);
    expect(escapeCancelsQuantityDraft({})).toBe(false);
  });
});
