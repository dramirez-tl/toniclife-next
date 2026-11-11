// product-card.ts — Qué dice y qué hace la tarjeta de producto del catálogo (lógica PURA).
//
// Una tarjeta puede hablar por UN producto o por una FAMILIA (mig 178: un diseño con
// varias tallas, colores o "para quién"; cada variante es un producto con su clave y su
// existencia). En la tarjeta de familia el API manda los datos de una variante
// representativa (la primera que se puede vender), así que dos cosas NO se pueden tomar
// de ahí tal cual:
//   · el botón no puede agregar esa variante al carrito: sería comprar una talla que la
//     persona no eligió (11-nov-2026: los tenis agregaban la talla 22 sin preguntar);
//   · "Últimas n" es la existencia de ESA talla, no del modelo (decía "Última pieza" en
//     un modelo con 13 pares).

import type { StorefrontCardFamily, StorefrontProductCard } from '@/types/storefront';

export type CardBadge = 'outOfStock' | 'lowStock' | 'madeToOrder' | 'new' | 'featured' | 'pack';

/** Lo que hace el botón de la tarjeta. */
export type CardAction =
  /** Agrega ESE producto al carrito (no hay nada que elegir). */
  | 'add'
  /** Lleva al producto a elegir la talla. */
  | 'choose_size'
  /** Lleva al producto a elegir color o "para quién" (sin tallas que elegir). */
  | 'choose_options';

type CardLike = Pick<StorefrontProductCard, 'availability' | 'stockLeft' | 'madeToOrder' | 'isNew' | 'isFeatured' | 'type' | 'family'>;

/** La familia de la tarjeta cuando hay algo que elegir (más de una variante); si no, `null`. */
export function cardFamily(product: Pick<CardLike, 'family'>): StorefrontCardFamily | null {
  return product.family && product.family.variantCount > 1 ? product.family : null;
}

/** Con varias variantes la tarjeta no agrega: manda al producto a elegir. */
export function cardAction(product: Pick<CardLike, 'family'>): CardAction {
  const family = cardFamily(product);
  if (!family) return 'add';
  return family.sizes.length > 1 ? 'choose_size' : 'choose_options';
}

/**
 * Badges REALES, máximo 2, por prioridad: Agotado > Últimas n > Bajo pedido > Nuevo >
 * Destacado > Paquete. En la tarjeta de familia no va "Últimas n": esa existencia es la de
 * una sola variante (dentro del producto cada talla muestra la suya).
 */
export function cardBadges(product: CardLike): CardBadge[] {
  const badges: CardBadge[] = [];
  if (product.availability === 'out_of_stock') badges.push('outOfStock');
  if (product.availability === 'low_stock' && product.stockLeft !== null && !cardFamily(product)) badges.push('lowStock');
  if (product.madeToOrder) badges.push('madeToOrder');
  if (product.isNew) badges.push('new');
  if (product.isFeatured) badges.push('featured');
  if (product.type === 'pack') badges.push('pack');
  return badges.slice(0, 2);
}
