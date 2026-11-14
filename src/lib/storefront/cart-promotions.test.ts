import { describe, expect, it } from 'vitest';
import type { SeasonalProductBadge } from '@/lib/seasonal-promotions';
import { cartPromoNudges, linePromoApplied } from './cart-promotions';

const NXM_3X2 = { buy: 3, pay: 2, free: 1, sameProductOnly: true };

function badge(over: Partial<SeasonalProductBadge> = {}): SeasonalProductBadge {
  return {
    promotionId: 'sab',
    label: '3x2',
    name: '3x2 Buen Fin sábado 14',
    seasonName: 'Buen Fin 2026',
    storeOnly: false,
    nxm: NXM_3X2,
    maxPerSale: null,
    description: null,
    ...over,
  };
}

function line(id: string, productId: string, quantity: number, over: Record<string, unknown> = {}) {
  return { id, productId, quantity, unitPrice: '281.00', ...over };
}

const BADGES = new Map<string, SeasonalProductBadge>([
  ['oximagic', badge()],
  ['nerlife', badge()],
  ['shake', badge({ promotionId: '6x5', label: '6x5', name: 'Compra 5 y llévate 1 gratis', storeOnly: true, nxm: { buy: 6, pay: 5, free: 1, sameProductOnly: true } })],
  ['kit', badge({ promotionId: 'kit', label: 'Precio especial', name: 'Kit a $2,000', nxm: null })],
]);

describe('linePromoApplied: lo que el servidor ya aplicó a la línea', () => {
  it('3x2 con 3 piezas: 1 gratis, lo que se ahorra y lo que costaba sin la promoción', () => {
    expect(
      linePromoApplied({
        seasonPromotionId: 'sab',
        promoName: '3x2 Buen Fin sábado 14',
        promoFreeQuantity: 1,
        promoDiscountAmount: '281.00',
        unitPrice: '281.00',
        quantity: 3,
      }),
    ).toEqual({ name: '3x2 Buen Fin sábado 14', freeQuantity: 1, savings: 281, originalTotal: 843 });
  });

  it('descuento sin piezas gratis (% o precio especial): también cuenta como aplicada', () => {
    expect(
      linePromoApplied({
        seasonPromotionId: 'pct',
        promoName: '20% en tés',
        promoFreeQuantity: 0,
        promoDiscountAmount: '96.80',
        unitPrice: '242.00',
        quantity: 2,
      }),
    ).toEqual({ name: '20% en tés', freeQuantity: 0, savings: 96.8, originalTotal: 484 });
  });

  it('sin promoción, o participando sin ahorro propio: null', () => {
    expect(linePromoApplied({ unitPrice: '281.00', quantity: 2 })).toBeNull();
    // Cuenta para el grupo, pero la pieza gratis cayó en otra línea.
    expect(
      linePromoApplied({
        seasonPromotionId: 'mix',
        promoName: '3x2 surtido',
        promoFreeQuantity: 0,
        promoDiscountAmount: '0.00',
        unitPrice: '281.00',
        quantity: 2,
      }),
    ).toBeNull();
  });
});

describe('cartPromoNudges: a quién avisarle que le falta poco', () => {
  it('3x2 con 2 piezas: "agrega 1 más y te sale gratis" (la pieza que falta es la gratis)', () => {
    const nudges = cartPromoNudges({ items: [line('l1', 'oximagic', 2)], badges: BADGES });
    expect(nudges.get('l1')).toEqual({
      promotionId: 'sab',
      label: '3x2',
      name: '3x2 Buen Fin sábado 14',
      missing: 1,
      free: 1,
      targetQuantity: 3,
      allFree: true,
      mixed: false,
    });
  });

  it('3x2 con 1 pieza: faltan 2 para llevarse 1 gratis', () => {
    const nudge = cartPromoNudges({ items: [line('l1', 'oximagic', 1)], badges: BADGES }).get('l1');
    expect(nudge).toMatchObject({ missing: 2, free: 1, targetQuantity: 3, allFree: false });
  });

  it('con 3 piezas (grupo exacto) no hay aviso; con 5, falta 1 para la segunda gratis', () => {
    expect(cartPromoNudges({ items: [line('l1', 'oximagic', 3, { seasonPromotionId: 'sab' })], badges: BADGES }).size).toBe(0);
    const five = cartPromoNudges({ items: [line('l1', 'oximagic', 5, { seasonPromotionId: 'sab' })], badges: BADGES });
    expect(five.get('l1')).toMatchObject({ missing: 1, targetQuantity: 6, allFree: true });
  });

  it('cada producto lleva su cuenta: "solo en productos idénticos"', () => {
    const nudges = cartPromoNudges({
      items: [line('l1', 'oximagic', 2), line('l2', 'nerlife', 1), line('l3', 'otro', 2)],
      badges: BADGES,
    });
    expect([...nudges.keys()]).toEqual(['l1', 'l2']);
    expect(nudges.get('l2')).toMatchObject({ missing: 2 });
  });

  it('no avisa de promociones que solo valen en sucursal, ni de las que no son "lleva N, paga M"', () => {
    const nudges = cartPromoNudges({ items: [line('l1', 'shake', 5), line('l2', 'kit', 1)], badges: BADGES });
    expect(nudges.size).toBe(0);
  });

  it('no avisa si a la línea la tomó otra promoción, si no tiene precio o si la cantidad no sirve', () => {
    const nudges = cartPromoNudges({
      items: [
        line('l1', 'oximagic', 2, { seasonPromotionId: 'otra' }),
        line('l2', 'oximagic', 2, { unitPrice: '0.00' }),
        line('l3', 'oximagic', 0),
        line('l4', 'oximagic', Number.NaN),
      ],
      badges: BADGES,
    });
    expect(nudges.size).toBe(0);
  });

  it('respeta el tope de piezas de la línea: si no cabe la que falta, no promete nada', () => {
    const items = [line('l1', 'oximagic', 2)];
    expect(cartPromoNudges({ items, badges: BADGES, maxFor: () => 2 }).size).toBe(0);
    expect(cartPromoNudges({ items, badges: BADGES, maxFor: () => 3 }).size).toBe(1);
    expect(cartPromoNudges({ items, badges: BADGES, maxFor: () => null }).size).toBe(1);
  });

  it('respeta el tope de veces por compra de la promoción', () => {
    const capped = new Map([['oximagic', badge({ maxPerSale: 1 })]]);
    const items = [line('l1', 'oximagic', 5, { seasonPromotionId: 'sab' })];
    expect(cartPromoNudges({ items, badges: capped, applied: [{ promotionId: 'sab', times: 1 }] }).size).toBe(0);
    // Todavía no se usa: sí avisa.
    expect(cartPromoNudges({ items: [line('l1', 'oximagic', 2)], badges: capped, applied: [] }).size).toBe(1);
  });

  it('promoción surtida (cualquiera de la promoción): cuenta el conjunto y avisa una sola vez', () => {
    const mix = { buy: 3, pay: 2, free: 1, sameProductOnly: false };
    const badges = new Map([
      ['a', badge({ promotionId: 'mix', nxm: mix })],
      ['b', badge({ promotionId: 'mix', nxm: mix })],
    ]);
    const nudges = cartPromoNudges({ items: [line('l1', 'a', 1), line('l2', 'b', 1)], badges });
    expect([...nudges.keys()]).toEqual(['l2']);
    expect(nudges.get('l2')).toMatchObject({ missing: 1, free: 1, targetQuantity: 2, allFree: true, mixed: true });
    // Con el grupo completo entre las dos líneas, nada que avisar.
    expect(cartPromoNudges({ items: [line('l1', 'a', 2), line('l2', 'b', 1)], badges }).size).toBe(0);
    // Si a la última línea no le cabe, el aviso va en la anterior.
    const moved = cartPromoNudges({
      items: [line('l1', 'a', 1), line('l2', 'b', 1)],
      badges,
      maxFor: (item) => (item.id === 'l2' ? 1 : null),
    });
    expect([...moved.keys()]).toEqual(['l1']);
  });

  it('carrito vacío o sin promociones: sin avisos', () => {
    expect(cartPromoNudges({ items: [], badges: BADGES }).size).toBe(0);
    expect(cartPromoNudges({ items: [line('l1', 'oximagic', 2)], badges: new Map() }).size).toBe(0);
  });
});

describe('sabores que se combinan: el aviso cuenta el GRUPO (14-nov-2026)', () => {
  const X6 = { buy: 6, pay: 5, free: 1, sameProductOnly: true };
  const GROUP = { name: '24 Shake', productIds: ['van', 'choc', 'fresa'] };
  const inGroup = badge({ promotionId: 'c5', label: '6x5', name: 'Compra 5 y llévate 1', nxm: X6, group: GROUP });
  const badges = new Map<string, SeasonalProductBadge>([
    ['van', inGroup],
    ['choc', inGroup],
    ['fresa', inGroup],
    ['mix', badge({ promotionId: 'c5', label: '6x5', name: 'Compra 5 y llévate 1', nxm: X6 })],
  ]);
  const shake = (id: string, productId: string, quantity: number, price = '363.00') => line(id, productId, quantity, { unitPrice: price });

  it('3 de vainilla + 1 de chocolate: faltan 2 del grupo, una sola vez y con el nombre del grupo', () => {
    const nudges = cartPromoNudges({ items: [shake('l1', 'van', 3), shake('l2', 'choc', 1)], badges });
    expect([...nudges.keys()]).toEqual(['l2']);
    expect(nudges.get('l2')).toEqual({
      promotionId: 'c5',
      label: '6x5',
      name: 'Compra 5 y llévate 1',
      missing: 2,
      free: 1,
      targetQuantity: 3,
      allFree: false,
      mixed: true,
      groupName: '24 Shake',
    });
  });

  it('con 5 del grupo falta 1 y sale gratis; con 6 ya no hay aviso', () => {
    const five = cartPromoNudges({ items: [shake('l1', 'van', 3), shake('l2', 'choc', 2)], badges });
    expect(five.get('l2')).toMatchObject({ missing: 1, allFree: true, targetQuantity: 3, groupName: '24 Shake' });
    expect(cartPromoNudges({ items: [shake('l1', 'van', 3), shake('l2', 'choc', 3)], badges }).size).toBe(0);
  });

  it('precios distintos: el aviso va en la línea MÁS BARATA (agregando de esa, lo agregado sí sale gratis)', () => {
    const nudges = cartPromoNudges({
      items: [shake('l1', 'van', 4, '300.00'), shake('l2', 'choc', 1, '400.00')],
      badges,
    });
    expect([...nudges.keys()]).toEqual(['l1']);
    expect(nudges.get('l1')).toMatchObject({ missing: 1, targetQuantity: 5, allFree: true });
  });

  it('lo que está fuera del grupo se sigue contando solo, con su propio aviso', () => {
    const nudges = cartPromoNudges({ items: [shake('l1', 'van', 3), shake('l2', 'mix', 4, '471.00')], badges });
    expect(nudges.get('l1')).toMatchObject({ missing: 3, mixed: true, groupName: '24 Shake' });
    expect(nudges.get('l2')).toMatchObject({ missing: 2, mixed: false });
    expect(nudges.get('l2')).not.toHaveProperty('groupName');
  });

  it('si a ninguna línea del grupo le caben las piezas que faltan, no avisa', () => {
    const nudges = cartPromoNudges({
      items: [shake('l1', 'van', 3), shake('l2', 'choc', 2)],
      badges,
      maxFor: () => 3,
    });
    // Vainilla ya está en su tope (3) y a chocolate (2) sí le cabe una más.
    expect([...nudges.keys()]).toEqual(['l2']);
    expect(cartPromoNudges({ items: [shake('l1', 'van', 3), shake('l2', 'choc', 2)], badges, maxFor: () => 2 }).size).toBe(0);
  });
});
