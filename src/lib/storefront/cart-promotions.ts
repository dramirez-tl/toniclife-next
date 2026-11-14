// Promociones de temporada EN EL CARRITO (Buen Fin 2026): qué decirle al comprador de cada
// línea. Puro, con pruebas.
//
//  - "Aplicada": lo que el SERVIDOR ya aplicó a la línea (piezas gratis, descuento). Sale de la
//    respuesta del carrito; aquí solo se le da forma para pintarla.
//  - "Te falta poco": la línea está en un "lleva N, paga M" que vale en la tienda y le faltan
//    piezas para la siguiente gratis ("Agrega 1 más y te sale gratis"). Es un AVISO: quien aplica
//    la promoción es el servidor cuando la cantidad llega. Por eso la cuenta es la misma del motor
//    (`applySeasonalPromotions`): grupos completos de N piezas, por producto o entre todos los de
//    la promoción, con el tope de veces por compra.

import { nxmProgress, type SeasonalProductBadge } from '@/lib/seasonal-promotions';
import type { CartItem, CartSeasonalPromotion } from '@/types/cart';

const money = (value: string | number | null | undefined): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const units = (quantity: number): number => (Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0);

/** Lo que el servidor ya le aplicó a una línea. */
export interface CartLinePromoApplied {
  /** Nombre de la promoción ("3x2 Buen Fin sábado 14"). */
  name: string;
  /** Piezas de la línea que salen gratis. */
  freeQuantity: number;
  /** Lo que la línea se ahorra (ya restado de `lineTotal`). */
  savings: number;
  /** Lo que costaría la línea sin la promoción (para mostrarlo tachado). */
  originalTotal: number;
}

/**
 * La promoción que el servidor aplicó a la línea, o `null` si no le dio nada. Una línea puede
 * participar en una promoción sin ahorro propio (cuenta para el grupo, pero la pieza gratis cayó
 * en otra): no se anuncia.
 */
export function linePromoApplied(
  item: Pick<CartItem, 'seasonPromotionId' | 'promoName' | 'promoFreeQuantity' | 'promoDiscountAmount' | 'unitPrice' | 'quantity'>,
): CartLinePromoApplied | null {
  if (!item.seasonPromotionId) return null;
  const freeQuantity = units(Number(item.promoFreeQuantity) || 0);
  const savings = Math.max(0, round2(money(item.promoDiscountAmount)));
  if (freeQuantity === 0 && savings === 0) return null;
  return {
    name: (item.promoName ?? '').trim(),
    freeQuantity,
    savings,
    originalTotal: round2(money(item.unitPrice) * units(item.quantity)),
  };
}

/** Aviso de "te falta poco" de una línea. */
export interface CartLinePromoNudge {
  promotionId: string;
  /** "3x2". */
  label: string;
  /** "3x2 Buen Fin sábado 14". */
  name: string;
  /** Piezas que faltan para cerrar el siguiente grupo. */
  missing: number;
  /** Piezas gratis que da cerrarlo. */
  free: number;
  /** Cantidad a la que queda ESTA línea al agregarlas. */
  targetQuantity: number;
  /** true = todas las piezas que faltan salen gratis ("agrega 1 más y te sale gratis"). */
  allFree: boolean;
  /** true = el grupo se arma con cualquier producto de la promoción (no solo con este). */
  mixed: boolean;
}

type NudgeLine = Pick<CartItem, 'id' | 'productId' | 'quantity' | 'unitPrice' | 'seasonPromotionId'>;

export interface CartPromoNudgesInput<T extends NudgeLine> {
  items: readonly T[];
  /** Insignias de los productos que hoy están en promoción (`seasonalProductBadges`). */
  badges: ReadonlyMap<string, SeasonalProductBadge>;
  /** Promociones que el servidor ya aplicó al carrito (para el tope de veces por compra). */
  applied?: readonly Pick<CartSeasonalPromotion, 'promotionId' | 'times'>[] | null;
  /** Tope de piezas de una línea (existencias o máximo por pedido); `null` = sin tope conocido. */
  maxFor?: (item: T) => number | null;
}

/**
 * A qué líneas avisarles que les falta poco para una pieza gratis. Devuelve un mapa por id de
 * línea. No avisa cuando: la promoción solo vale en sucursal, no es "lleva N, paga M", a la línea
 * la tocó OTRA promoción, ya se llegó al tope de veces por compra, la cantidad ya cierra grupos
 * exactos, o las piezas que faltan no caben (existencias / máximo por pedido).
 */
export function cartPromoNudges<T extends NudgeLine>(input: CartPromoNudgesInput<T>): Map<string, CartLinePromoNudge> {
  const { items, badges, applied, maxFor } = input;
  const nudges = new Map<string, CartLinePromoNudge>();
  const timesApplied = new Map<string, number>();
  for (const a of applied ?? []) timesApplied.set(a.promotionId, units(Number(a.times) || 0));
  const fits = (item: T, target: number): boolean => {
    const max = maxFor ? maxFor(item) : null;
    return max === null || !Number.isFinite(max) || target <= max;
  };
  // "Lleva N de cualquiera de la promoción": se cuenta el conjunto, no cada línea.
  const pools = new Map<string, { badge: SeasonalProductBadge; lines: T[] }>();

  for (const item of items) {
    const badge = badges.get(item.productId);
    if (!badge || badge.storeOnly || !badge.nxm) continue;
    const quantity = units(item.quantity);
    if (quantity < 1 || !(money(item.unitPrice) > 0)) continue;
    // La línea ya la tomó otra promoción: el motor no la vuelve a contar en esta.
    if (item.seasonPromotionId && item.seasonPromotionId !== badge.promotionId) continue;
    if (badge.maxPerSale !== null && (timesApplied.get(badge.promotionId) ?? 0) >= badge.maxPerSale) continue;

    if (!badge.nxm.sameProductOnly) {
      const pool = pools.get(badge.promotionId) ?? { badge, lines: [] };
      pool.lines.push(item);
      pools.set(badge.promotionId, pool);
      continue;
    }
    const progress = nxmProgress(quantity, badge.nxm);
    if (progress.missing === 0 || !fits(item, progress.targetQuantity)) continue;
    nudges.set(item.id, {
      promotionId: badge.promotionId,
      label: badge.label,
      name: badge.name,
      missing: progress.missing,
      free: progress.freeNext,
      targetQuantity: progress.targetQuantity,
      allFree: progress.missing <= progress.freeNext,
      mixed: false,
    });
  }

  for (const { badge, lines } of pools.values()) {
    if (!badge.nxm) continue;
    const total = lines.reduce((sum, line) => sum + units(line.quantity), 0);
    const progress = nxmProgress(total, badge.nxm);
    if (progress.missing === 0) continue;
    // El aviso va UNA vez: en la última línea del grupo a la que le quepan las piezas que faltan.
    const host = [...lines].reverse().find((line) => fits(line, units(line.quantity) + progress.missing));
    if (!host) continue;
    nudges.set(host.id, {
      promotionId: badge.promotionId,
      label: badge.label,
      name: badge.name,
      missing: progress.missing,
      free: progress.freeNext,
      targetQuantity: units(host.quantity) + progress.missing,
      allFree: progress.missing <= progress.freeNext,
      mixed: true,
    });
  }
  return nudges;
}
