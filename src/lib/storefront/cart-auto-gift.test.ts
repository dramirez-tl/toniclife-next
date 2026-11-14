import { describe, expect, it } from 'vitest';
import type { SeasonalProductBadge } from '@/lib/seasonal-promotions';
import type { Cart, CartItem } from '@/types/cart';
import { autoGiftAfterAdd, autoGiftOffer, autoGiftOnUpdate, autoGiftTarget, planAutoGift } from './cart-auto-gift';

const X3 = { buy: 3, pay: 2 };
const X6 = { buy: 6, pay: 5 };

function badge(over: Partial<SeasonalProductBadge> = {}): SeasonalProductBadge {
  return {
    promotionId: 'sab',
    label: '3x2',
    name: '3x2 Buen Fin sábado 14',
    seasonName: 'Buen Fin 2026',
    storeOnly: false,
    nxm: { buy: 3, pay: 2, free: 1, sameProductOnly: true },
    maxPerSale: null,
    description: null,
    ...over,
  };
}
const BADGES = new Map<string, SeasonalProductBadge>([['oximagic', badge()]]);

/** Carrito de una línea como lo devolvería el servidor: aplica (o no) el 3x2. */
function cartWith(quantity: number, opts: { promo?: boolean; productId?: string; maxQuantity?: number; price?: number } = {}): Cart {
  const price = opts.price ?? 281;
  const free = opts.promo === false ? 0 : Math.floor(quantity / 3);
  const line: CartItem = {
    id: 'l1',
    productId: opts.productId ?? 'oximagic',
    quantity,
    unitPrice: price.toFixed(2),
    lineTotal: (price * (quantity - free)).toFixed(2),
    points: 0,
    businessValue: '0',
    productName: 'Oximagic 250 ml.',
    productCode: '8593',
    ...(opts.maxQuantity !== undefined ? { maxQuantity: opts.maxQuantity } : {}),
    ...(free > 0 ? { seasonPromotionId: 'sab', promoFreeQuantity: free } : {}),
    createdAt: '',
    updatedAt: '',
  };
  return { items: quantity > 0 ? [line] : [] } as unknown as Cart;
}

/** Servidor de mentira: registra las cantidades pedidas y responde con el carrito resultante. */
function server(opts: { promo?: boolean; fail?: (quantity: number) => boolean; maxQuantity?: number } = {}) {
  const calls: number[] = [];
  const updateItem = async (_itemId: string, quantity: number): Promise<Cart> => {
    calls.push(quantity);
    if (opts.fail?.(quantity)) throw new Error('sin red');
    return cartWith(quantity, { promo: opts.promo, maxQuantity: opts.maxQuantity });
  };
  return { calls, updateItem };
}

describe('autoGiftTarget: misma regla que la caja', () => {
  it('3x2: al llegar a las 2 que se pagan entra la tercera; con 1, 3 o 4 no cambia', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((q) => autoGiftTarget(q, 0, X3))).toEqual([1, 3, 3, 4, 6, 6, 7, 9]);
  });

  it('3x2 al bajar: la gratis se va con la pieza que la ganaba (3 → 1, 6 → 4)', () => {
    expect(autoGiftTarget(2, 3, X3)).toBe(1);
    expect(autoGiftTarget(5, 6, X3)).toBe(4);
    // Bajar a una cantidad que no deja "pagando sin regalo" no cambia.
    expect(autoGiftTarget(4, 6, X3)).toBe(4);
    expect(autoGiftTarget(1, 3, X3)).toBe(1);
  });

  it('"compra 5 y llévate 1" (6x5): 5 → 6, 11 → 12; al bajar 6 → 4', () => {
    expect(autoGiftTarget(5, 4, X6)).toBe(6);
    expect(autoGiftTarget(11, 10, X6)).toBe(12);
    expect(autoGiftTarget(4, 3, X6)).toBe(4);
    expect(autoGiftTarget(5, 6, X6)).toBe(4);
  });

  it('cantidades que no sirven se dejan como llegan', () => {
    expect(autoGiftTarget(0, 2, X3)).toBe(0);
    expect(autoGiftTarget(-1, 2, X3)).toBe(-1);
    expect(autoGiftTarget(Number.NaN, 2, X3)).toBe(0);
  });
});

describe('planAutoGift', () => {
  it('sube, baja o no cabe', () => {
    expect(planAutoGift({ wanted: 2, previous: 1, offer: X3 })).toEqual({ quantity: 3, added: 1, removed: 0, missing: 0 });
    expect(planAutoGift({ wanted: 2, previous: 3, offer: X3 })).toEqual({ quantity: 1, added: 0, removed: 1, missing: 0 });
    // Sin existencias para la gratis: se queda con lo pedido y se avisa.
    expect(planAutoGift({ wanted: 2, previous: 1, offer: X3, max: 2 })).toEqual({ quantity: 2, added: 0, removed: 0, missing: 1 });
    expect(planAutoGift({ wanted: 2, previous: 1, offer: X3, max: 3 })).toMatchObject({ quantity: 3, added: 1 });
  });

  it('al bajar SIN existencias para la gratis no se quita de más: "Ajustar a 2" con solo 2 deja 2', () => {
    expect(planAutoGift({ wanted: 2, previous: 5, offer: X3, max: 2 })).toEqual({ quantity: 2, added: 0, removed: 0, missing: 1 });
    // Con existencias para el grupo completo sí aplica la regla de la caja.
    expect(planAutoGift({ wanted: 2, previous: 5, offer: X3, max: 10 })).toEqual({ quantity: 1, added: 0, removed: 1, missing: 0 });
  });

  it('sin promoción o sin cambio: lo pedido', () => {
    expect(planAutoGift({ wanted: 2, previous: 1, offer: null })).toEqual({ quantity: 2, added: 0, removed: 0, missing: 0 });
    expect(planAutoGift({ wanted: 4, previous: 3, offer: X3 })).toEqual({ quantity: 4, added: 0, removed: 0, missing: 0 });
  });
});

describe('autoGiftOffer: solo piezas idénticas que valen en la tienda', () => {
  it('vale la del 3x2 en línea; no la de sucursal, la surtida ni otro tipo', () => {
    expect(autoGiftOffer(badge())).toMatchObject({ buy: 3, pay: 2 });
    expect(autoGiftOffer(badge({ storeOnly: true }))).toBeNull();
    expect(autoGiftOffer(badge({ nxm: { buy: 3, pay: 2, free: 1, sameProductOnly: false } }))).toBeNull();
    expect(autoGiftOffer(badge({ nxm: null }))).toBeNull();
    expect(autoGiftOffer(null)).toBeNull();
    expect(autoGiftOffer(undefined)).toBeNull();
  });
});

describe('autoGiftAfterAdd: al agregar al carrito', () => {
  it('llega a 2: pide 3 al servidor y avisa que entró 1 gratis', async () => {
    const s = server();
    const result = await autoGiftAfterAdd({ cart: cartWith(2), lineId: 'l1', addedQuantity: 1, badges: BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([3]);
    expect(result.cart.items[0]).toMatchObject({ quantity: 3, lineTotal: '562.00', promoFreeQuantity: 1 });
    expect(result.notice).toEqual({ kind: 'added', label: '3x2', productName: 'Oximagic 250 ml.', count: 1 });
  });

  it('agrega 2 a una línea de 3 (queda en 5): sube a 6', async () => {
    const s = server();
    const result = await autoGiftAfterAdd({ cart: cartWith(5), lineId: 'l1', addedQuantity: 2, badges: BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([6]);
    expect(result.cart.items[0]).toMatchObject({ quantity: 6, promoFreeQuantity: 2 });
    expect(result.notice).toMatchObject({ kind: 'added', count: 1 });
  });

  it('con 1, 3 o 4 piezas no se toca nada', async () => {
    for (const [quantity, added] of [[1, 1], [3, 3], [4, 1]] as const) {
      const s = server();
      const cart = cartWith(quantity);
      const result = await autoGiftAfterAdd({ cart, lineId: 'l1', addedQuantity: added, badges: BADGES, updateItem: s.updateItem });
      expect(s.calls).toEqual([]);
      expect(result).toEqual({ cart, notice: null });
    }
  });

  it('CANDADO: si el servidor cobra la pieza que entró sola, se deshace y no se avisa', async () => {
    // El servidor ya no aplica la promoción (terminó, o el comprador no entra en ella).
    const s = server({ promo: false });
    const result = await autoGiftAfterAdd({
      cart: cartWith(2, { promo: false }),
      lineId: 'l1',
      addedQuantity: 2,
      badges: BADGES,
      updateItem: s.updateItem,
    });
    expect(s.calls).toEqual([3, 2]);
    expect(result.cart.items[0]).toMatchObject({ quantity: 2, lineTotal: '562.00' });
    expect(result.notice).toBeNull();
  });

  it('sin existencias para la gratis: no pide nada y avisa que se cobra sin promoción', async () => {
    const s = server();
    const cart = cartWith(2, { maxQuantity: 2 });
    const result = await autoGiftAfterAdd({ cart, lineId: 'l1', addedQuantity: 2, badges: BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([]);
    expect(result.cart).toBe(cart);
    expect(result.notice).toEqual({ kind: 'missing', label: '3x2', productName: 'Oximagic 250 ml.', count: 1 });
  });

  it('si falla la red al subir, el carrito queda como estaba y sin aviso', async () => {
    const s = server({ fail: () => true });
    const cart = cartWith(2);
    const result = await autoGiftAfterAdd({ cart, lineId: 'l1', addedQuantity: 2, badges: BADGES, updateItem: s.updateItem });
    expect(result).toEqual({ cart, notice: null });
  });

  it('producto sin promoción, línea que no existe o promoción de sucursal: nada', async () => {
    const s = server();
    const other = cartWith(2, { productId: 'colageno', promo: false });
    expect(await autoGiftAfterAdd({ cart: other, lineId: 'l1', addedQuantity: 2, badges: BADGES, updateItem: s.updateItem })).toEqual({
      cart: other,
      notice: null,
    });
    const cart = cartWith(2);
    expect(await autoGiftAfterAdd({ cart, lineId: undefined, addedQuantity: 2, badges: BADGES, updateItem: s.updateItem })).toEqual({ cart, notice: null });
    const storeOnly = new Map([['oximagic', badge({ storeOnly: true })]]);
    expect(await autoGiftAfterAdd({ cart, lineId: 'l1', addedQuantity: 2, badges: storeOnly, updateItem: s.updateItem })).toEqual({ cart, notice: null });
    expect(s.calls).toEqual([]);
  });
});

describe('autoGiftOnUpdate: al cambiar la cantidad', () => {
  it('de 1 a 2 con "+": queda en 3 con 1 gratis (dos cambios: el pedido y la gratis)', async () => {
    const s = server();
    const result = await autoGiftOnUpdate({ cached: cartWith(1), itemId: 'l1', wanted: 2, badges: BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([2, 3]);
    expect(result.cart.items[0]).toMatchObject({ quantity: 3, promoFreeQuantity: 1 });
    expect(result.notice).toMatchObject({ kind: 'added', count: 1 });
  });

  it('de 3 a 2 con "−": baja a 1 en un solo cambio y avisa que se fue la gratis', async () => {
    const s = server();
    const result = await autoGiftOnUpdate({ cached: cartWith(3), itemId: 'l1', wanted: 2, badges: BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([1]);
    expect(result.cart.items[0]).toMatchObject({ quantity: 1 });
    expect(result.notice).toEqual({ kind: 'removed', label: '3x2', productName: 'Oximagic 250 ml.', count: 1 });
  });

  it('el botón "Agregar 2" del aviso (de 1 a 3): un solo cambio, sin aviso extra', async () => {
    const s = server();
    const result = await autoGiftOnUpdate({ cached: cartWith(1), itemId: 'l1', wanted: 3, badges: BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([3]);
    expect(result.notice).toBeNull();
  });

  it('CANDADO: si el servidor cobra la gratis, se regresa a lo pedido', async () => {
    const s = server({ promo: false });
    const result = await autoGiftOnUpdate({
      cached: cartWith(1, { promo: false }),
      itemId: 'l1',
      wanted: 2,
      badges: BADGES,
      updateItem: s.updateItem,
    });
    expect(s.calls).toEqual([2, 3, 2]);
    expect(result.cart.items[0]).toMatchObject({ quantity: 2 });
    expect(result.notice).toBeNull();
  });

  it('sin existencias para la gratis: deja lo pedido y avisa', async () => {
    const s = server({ maxQuantity: 2 });
    const result = await autoGiftOnUpdate({
      cached: cartWith(1, { maxQuantity: 2 }),
      itemId: 'l1',
      wanted: 2,
      badges: BADGES,
      updateItem: s.updateItem,
    });
    expect(s.calls).toEqual([2]);
    expect(result.notice).toMatchObject({ kind: 'missing', count: 1 });
  });

  it('el error del cambio pedido se propaga (lo atiende quien llama); el de la gratis, no', async () => {
    const failing = server({ fail: (q) => q === 2 });
    await expect(
      autoGiftOnUpdate({ cached: cartWith(1), itemId: 'l1', wanted: 2, badges: BADGES, updateItem: failing.updateItem }),
    ).rejects.toThrow('sin red');
    const gift = server({ fail: (q) => q === 3 });
    const result = await autoGiftOnUpdate({ cached: cartWith(1), itemId: 'l1', wanted: 2, badges: BADGES, updateItem: gift.updateItem });
    expect(gift.calls).toEqual([2, 3]);
    expect(result.cart.items[0]).toMatchObject({ quantity: 2 });
    expect(result.notice).toBeNull();
  });

  it('sin carrito en pantalla o producto sin promoción: el cambio de siempre', async () => {
    const s = server();
    const plain = await autoGiftOnUpdate({ cached: undefined, itemId: 'l1', wanted: 2, badges: BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([2]);
    expect(plain.notice).toBeNull();
    const s2 = server();
    await autoGiftOnUpdate({ cached: cartWith(1, { productId: 'colageno' }), itemId: 'l1', wanted: 2, badges: BADGES, updateItem: s2.updateItem });
    expect(s2.calls).toEqual([2]);
  });
});
