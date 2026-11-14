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
