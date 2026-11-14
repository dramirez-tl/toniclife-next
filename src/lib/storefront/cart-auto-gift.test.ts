import { describe, expect, it } from 'vitest';
import type { SeasonalProductBadge } from '@/lib/seasonal-promotions';
import type { Cart, CartItem } from '@/types/cart';
import {
  autoGiftAfterAdd,
  autoGiftOffer,
  autoGiftOnUpdate,
  autoGiftTarget,
  planAutoGift,
  planGroupAutoGift,
} from './cart-auto-gift';

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

describe('sabores que se combinan: la gratis entra sola contando el GRUPO (14-nov-2026)', () => {
  const GROUP = { name: '24 Shake', productIds: ['van', 'choc', 'fresa'] };
  const shakeBadge = badge({
    promotionId: 'c5',
    label: '6x5',
    name: 'Compra 5 y llévate 1',
    nxm: { buy: 6, pay: 5, free: 1, sameProductOnly: true },
    group: GROUP,
  });
  const GROUP_BADGES = new Map<string, SeasonalProductBadge>([
    ['van', shakeBadge],
    ['choc', shakeBadge],
    ['fresa', shakeBadge],
    // El 12 Mix está en la misma promoción, pero cuenta solo.
    ['mix', badge({ promotionId: 'c5', label: '6x5', name: 'Compra 5 y llévate 1', nxm: { buy: 6, pay: 5, free: 1, sameProductOnly: true } })],
  ]);
  const PRICES: Record<string, number> = { van: 363, choc: 363, fresa: 363, mix: 471 };

  /**
   * Servidor de mentira con varias líneas: aplica el 6x5 como el motor real (cada grupo cuenta
   * junto, lo demás por línea; la gratis es la más barata) y registra lo que se le pidió.
   */
  function shop(initial: Record<string, number>, opts: { prices?: Record<string, number>; max?: Record<string, number> } = {}) {
    const prices = { ...PRICES, ...opts.prices };
    const qty = new Map(Object.entries(initial));
    const calls: [string, number][] = [];
    const build = (): Cart => {
      const lines = [...qty.entries()].filter(([, q]) => q > 0).map(([productId, quantity]) => ({ productId, quantity, free: 0 }));
      const pools = [lines.filter((l) => GROUP.productIds.includes(l.productId)), ...lines.filter((l) => !GROUP.productIds.includes(l.productId)).map((l) => [l])];
      for (const pool of pools) {
        let toFree = Math.floor(pool.reduce((s, l) => s + l.quantity, 0) / 6);
        for (const l of [...pool].sort((a, b) => prices[a.productId] - prices[b.productId] || a.productId.localeCompare(b.productId))) {
          const f = Math.min(toFree, l.quantity);
          l.free = f;
          toFree -= f;
        }
      }
      return {
        items: lines.map((l) => ({
          id: `l-${l.productId}`,
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: prices[l.productId].toFixed(2),
          lineTotal: (prices[l.productId] * (l.quantity - l.free)).toFixed(2),
          points: 0,
          businessValue: '0',
          productName: `24 Shake ${l.productId}`,
          productCode: l.productId,
          ...(opts.max?.[l.productId] !== undefined ? { maxQuantity: opts.max[l.productId] } : {}),
          ...(l.free > 0 ? { seasonPromotionId: 'c5', promoFreeQuantity: l.free } : {}),
          createdAt: '',
          updatedAt: '',
        })),
      } as unknown as Cart;
    };
    const updateItem = async (itemId: string, quantity: number): Promise<Cart> => {
      calls.push([itemId, quantity]);
      qty.set(itemId.replace(/^l-/, ''), quantity);
      return build();
    };
    const pieces = (cart: Cart) => Object.fromEntries(cart.items.map((i) => [i.productId, i.quantity]));
    const total = (cart: Cart) => cart.items.reduce((s, i) => s + Number(i.lineTotal), 0);
    return { build, updateItem, calls, pieces, total };
  }

  it('planGroupAutoGift: cuenta lo que hay en las otras líneas del grupo', () => {
    // 3 en otra línea + 2 en esta = 5 → entra la sexta en esta.
    expect(planGroupAutoGift({ wanted: 2, previous: 1, others: 3, offer: X6 })).toEqual({ quantity: 3, added: 1, removed: 0, missing: 0 });
    // 3 + 1 = 4: nada. 3 + 3 = 6: nada.
    expect(planGroupAutoGift({ wanted: 1, previous: 0, others: 3, offer: X6 }).quantity).toBe(1);
    expect(planGroupAutoGift({ wanted: 3, previous: 2, others: 3, offer: X6 }).quantity).toBe(3);
    // Baja de 6 (3 + 3) a 5: se va una más de esta línea.
    expect(planGroupAutoGift({ wanted: 2, previous: 3, others: 3, offer: X6 })).toEqual({ quantity: 1, added: 0, removed: 1, missing: 0 });
    // La línea no puede dar una más (quedaría en 0): se queda como se pidió.
    expect(planGroupAutoGift({ wanted: 1, previous: 2, others: 4, offer: X6 })).toEqual({ quantity: 1, added: 0, removed: 0, missing: 0 });
    // Sin existencias para la gratis en esta línea: se avisa.
    expect(planGroupAutoGift({ wanted: 2, previous: 1, others: 3, offer: X6, max: 2 })).toEqual({ quantity: 2, added: 0, removed: 0, missing: 1 });
    // Sola en el grupo se comporta como una línea normal.
    expect(planGroupAutoGift({ wanted: 5, previous: 4, others: 0, offer: X6 }).quantity).toBe(6);
    expect(planGroupAutoGift({ wanted: 0, previous: 1, others: 5, offer: X6 }).quantity).toBe(0);
  });

  it('al agregar: 3 de vainilla en el carrito + 2 de chocolate → entra la sexta, de chocolate, y se paga lo mismo', async () => {
    const s = shop({ van: 3, choc: 2 });
    const cart = s.build();
    const before = s.total(cart);
    const r = await autoGiftAfterAdd({ cart, lineId: 'l-choc', addedQuantity: 1, badges: GROUP_BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([['l-choc', 3]]);
    expect(s.pieces(r.cart)).toEqual({ van: 3, choc: 3 });
    expect(s.total(r.cart)).toBe(before);
    expect(r.notice).toEqual({ kind: 'added', label: '6x5', productName: '24 Shake choc', count: 1 });
  });

  it('con 4 en el grupo, o con las 6 ya puestas, no pide nada', async () => {
    for (const lines of [{ van: 3, choc: 1 }, { van: 3, choc: 3 }]) {
      const s = shop(lines);
      const r = await autoGiftAfterAdd({ cart: s.build(), lineId: 'l-choc', addedQuantity: 1, badges: GROUP_BADGES, updateItem: s.updateItem });
      expect(s.calls).toEqual([]);
      expect(r.notice).toBeNull();
    }
  });

  it('lo que está fuera del grupo no completa: 4 del grupo + 1 del 12 Mix', async () => {
    const s = shop({ van: 4, mix: 1 });
    const r = await autoGiftAfterAdd({ cart: s.build(), lineId: 'l-mix', addedQuantity: 1, badges: GROUP_BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([]);
    expect(r.notice).toBeNull();
  });

  it('precios distintos: en la línea que se agregó costaría más → se deshace y entra de la más barata', async () => {
    const s = shop({ van: 4, choc: 1 }, { prices: { van: 300, choc: 400 } });
    const cart = s.build();
    const before = s.total(cart);
    const r = await autoGiftAfterAdd({ cart, lineId: 'l-choc', addedQuantity: 1, badges: GROUP_BADGES, updateItem: s.updateItem });
    // Prueba en chocolate (cuesta $100 más), lo regresa, y prueba en vainilla.
    expect(s.calls).toEqual([
      ['l-choc', 2],
      ['l-choc', 1],
      ['l-van', 5],
    ]);
    expect(s.pieces(r.cart)).toEqual({ van: 5, choc: 1 });
    expect(s.total(r.cart)).toBe(before);
    expect(r.notice).toMatchObject({ kind: 'added', productName: '24 Shake van' });
  });

  it('sin existencias para la gratis en la línea que se agregó: avisa y no pide nada', async () => {
    const s = shop({ van: 3, choc: 2 }, { max: { choc: 2 } });
    const r = await autoGiftAfterAdd({ cart: s.build(), lineId: 'l-choc', addedQuantity: 1, badges: GROUP_BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([]);
    expect(r.notice).toMatchObject({ kind: 'missing', count: 1 });
  });

  it('con el botón +: de 1 a 2 de chocolate (con 3 de vainilla) → pide 2 y luego la gratis', async () => {
    const s = shop({ van: 3, choc: 1 });
    const cached = s.build();
    const r = await autoGiftOnUpdate({ cached, itemId: 'l-choc', wanted: 2, badges: GROUP_BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([
      ['l-choc', 2],
      ['l-choc', 3],
    ]);
    expect(s.pieces(r.cart)).toEqual({ van: 3, choc: 3 });
    expect(r.notice).toMatchObject({ kind: 'added', count: 1 });
  });

  it('con el botón −: de 3 a 2 de chocolate (grupo en 6) → queda en 1, en un solo cambio', async () => {
    const s = shop({ van: 3, choc: 3 });
    const r = await autoGiftOnUpdate({ cached: s.build(), itemId: 'l-choc', wanted: 2, badges: GROUP_BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([['l-choc', 1]]);
    expect(s.pieces(r.cart)).toEqual({ van: 3, choc: 1 });
    expect(r.notice).toMatchObject({ kind: 'removed', count: 1 });
  });

  it('con el botón − en una línea que no puede dar otra pieza: queda como se pidió (el carrito avisa que falta una)', async () => {
    const s = shop({ van: 4, choc: 2 });
    const r = await autoGiftOnUpdate({ cached: s.build(), itemId: 'l-choc', wanted: 1, badges: GROUP_BADGES, updateItem: s.updateItem });
    expect(s.calls).toEqual([['l-choc', 1]]);
    expect(s.pieces(r.cart)).toEqual({ van: 4, choc: 1 });
    expect(r.notice).toBeNull();
  });
});
