// La pieza GRATIS de un "lleva N, paga M" entra SOLA al carrito de la tienda, igual que en la
// caja (Diego, 12-nov-2026 para el POS: "cuando agreguen 2 de un producto en promoción se
// agregue el de regalo sí o sí, por defecto, en automático"; 14-nov-2026 lo pidió para la tienda).
//
// Antes el 3x2 solo se aplicaba si el comprador ponía las 3 piezas: con 2 pagaba 2 y se llevaba
// 2. Ahora, en cuanto la línea llega a las piezas que se PAGAN (2 en un 3x2, 5 en un "compra 5 y
// llévate 1"), la cantidad sube sola a completar el grupo (3, 6). Al bajar, la gratis se va junto
// con la pieza que la ganaba (de 3 baja a 1, no a 2): si se quedara en 2 volvería a subir sola.
//
// MISMA regla que la caja (`toniclife-electron/src/lib/seasonalAutoGift.ts`, `autoGiftTarget`):
// si cambia una, cambia la otra. Aquí la promoción la aplica el SERVIDOR al carrito; esto solo
// decide la CANTIDAD que se le pide. Candado: la pieza que entró sola solo se queda si el
// servidor confirma que NO se paga más que antes; si costara más, se deshace. Nunca se le cobra
// al comprador una pieza que él no pidió.
//
// GRUPOS que se combinan (14-nov-2026, sabores del mismo producto): si el producto está en un
// grupo de la promoción, lo que cuenta es el TOTAL del grupo en el carrito (3 de vainilla + 2 de
// chocolate ya son las 5 de un 6x5). La gratis entra en la línea que se movió; si los precios del
// grupo son distintos y ahí costaría más (la gratis es la más barata), en la más barata. Al
// bajar, si la línea que se movió no puede dar una pieza más, se queda como se pidió y el
// carrito avisa que falta una (`cart-promotions`).
//
// Alcance: promociones "lleva N, paga M" de piezas IDÉNTICAS (con o sin grupos) que valen en la
// tienda en línea. En un surtido (cualquiera de la promoción) la gratis es la más barata del
// conjunto: ahí no se adivina; el carrito solo avisa. Puro: sin React; la red llega inyectada.

import type { SeasonalNxm, SeasonalProductBadge } from '@/lib/seasonal-promotions';
import type { Cart, CartItem } from '@/types/cart';
import { lineLimit } from './cart-logic';

type Offer = Pick<SeasonalNxm, 'buy' | 'pay'>;

const whole = (value: number): number => (Number.isFinite(value) ? Math.floor(value) : 0);
const money = (value: string | number | null | undefined): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};

/**
 * La promoción de piezas idénticas que vale EN LA TIENDA para ese producto, o `null`: sin
 * promoción, solo de sucursal, de otro tipo, o surtida.
 */
export function autoGiftOffer(badge: SeasonalProductBadge | null | undefined): SeasonalNxm | null {
  if (!badge || badge.storeOnly || !badge.nxm || !badge.nxm.sameProductOnly) return null;
  return badge.nxm;
}

/**
 * Cantidad a la que debe quedar la línea para que la pieza gratis vaya incluida. `wanted` = lo
 * que se pidió; `previous` = lo que había.
 *   - Sube (o línea nueva): si el sobrante ya alcanzó las piezas que se pagan, se completa el
 *     grupo. 3x2: 2 → 3, 5 → 6; 6x5: 5 → 6, 11 → 12.
 *   - Baja: si quedaría "pagando sin su regalo", baja una más: 3 → 1, 6 → 4.
 */
export function autoGiftTarget(wanted: number, previous: number, offer: Offer): number {
  const q = whole(wanted);
  if (!(q > 0)) return q;
  const rem = q % offer.buy;
  if (rem < offer.pay) return q;
  if (q >= whole(previous)) return q + (offer.buy - rem);
  return q - rem + (offer.pay - 1);
}

export interface AutoGiftPlan {
  /** Cantidad con la que debe quedar la línea. */
  quantity: number;
  /** Piezas gratis que entran solas. */
  added: number;
  /** Piezas que se van de más al bajar (la gratis que ya no se gana). */
  removed: number;
  /** Piezas gratis que NO caben por existencias o tope del pedido. */
  missing: number;
}

/** Qué hacer con la cantidad pedida. `max` = tope de la línea (`null`/ausente = sin tope conocido). */
export function planAutoGift(args: { wanted: number; previous: number; offer: Offer | null; max?: number | null }): AutoGiftPlan {
  const wanted = whole(args.wanted);
  const same: AutoGiftPlan = { quantity: wanted, added: 0, removed: 0, missing: 0 };
  if (!args.offer || !(wanted > 0)) return same;
  const target = autoGiftTarget(wanted, args.previous, args.offer);
  if (target === wanted) return same;
  const max = args.max !== null && args.max !== undefined && Number.isFinite(args.max) ? args.max : null;
  // Cantidad con la que el grupo quedaría completo (lo pedido + las gratis que le faltan).
  const complete = wanted + (args.offer.buy - (wanted % args.offer.buy));
  // Sin existencias para la gratis no hay regalo que cuidar: se queda lo pedido y se avisa
  // (también al bajar: "Ajustar a 2" con solo 2 en existencia no debe dejar 1).
  if (max !== null && complete > max) return { ...same, missing: complete - wanted };
  if (target < wanted) return { ...same, quantity: target, removed: wanted - target };
  return { ...same, quantity: target, added: target - wanted };
}

/**
 * Lo mismo para una línea que se COMBINA con otras (grupo de sabores): cuenta el total del grupo.
 * `others` = piezas del grupo en las DEMÁS líneas del carrito. Con `others = 0` da lo mismo que
 * `planAutoGift`, salvo que nunca deja la línea en cero: si al bajar no puede dar una pieza más,
 * se queda como se pidió (el carrito avisa que falta una para la gratis).
 */
export function planGroupAutoGift(args: {
  wanted: number;
  previous: number;
  others: number;
  offer: Offer | null;
  max?: number | null;
}): AutoGiftPlan {
  const wanted = whole(args.wanted);
  const same: AutoGiftPlan = { quantity: wanted, added: 0, removed: 0, missing: 0 };
  if (!args.offer || !(wanted > 0)) return same;
  const others = Math.max(0, whole(args.others));
  const total = others + wanted;
  const rem = total % args.offer.buy;
  if (rem < args.offer.pay) return same;
  const max = args.max !== null && args.max !== undefined && Number.isFinite(args.max) ? args.max : null;
  // Piezas gratis que le faltan al grupo para completarse.
  const gift = args.offer.buy - rem;
  if (max !== null && wanted + gift > max) return { ...same, missing: gift };
  if (total >= others + whole(args.previous)) return { ...same, quantity: wanted + gift, added: gift };
  const extra = rem - (args.offer.pay - 1);
  if (wanted - extra < 1) return same;
  return { ...same, quantity: wanted - extra, removed: extra };
}

/** Lo que hay que decirle al comprador (el texto lo pone la interfaz). */
export interface AutoGiftNotice {
  kind: 'added' | 'removed' | 'missing';
  /** "3x2". */
  label: string;
  productName: string;
  /** Piezas que entraron solas, que se fueron, o que no cupieron. */
  count: number;
}

export interface AutoGiftResult {
  cart: Cart;
  notice: AutoGiftNotice | null;
}

type Badges = ReadonlyMap<string, SeasonalProductBadge>;
type UpdateItem = (itemId: string, quantity: number) => Promise<Cart>;

const knownMax = (line: CartItem): number | null => {
  const limit = lineLimit(line);
  return limit.known ? limit.max : null;
};
const findLine = (cart: Cart, itemId: string | undefined): CartItem | undefined =>
  itemId ? cart.items.find((item) => item.id === itemId) : undefined;

/**
 * Líneas del carrito que cuentan JUNTO con esa: las de su grupo de productos que se combinan,
 * dentro de la misma promoción. Sin grupo, solo ella.
 */
function poolOf(cart: Cart, line: CartItem, badge: SeasonalProductBadge, badges: Badges): CartItem[] {
  if (!badge.group) return [line];
  const ids = new Set(badge.group.productIds);
  return cart.items.filter(
    (item) =>
      ids.has(item.productId) &&
      whole(item.quantity) > 0 &&
      badges.get(item.productId)?.promotionId === badge.promotionId,
  );
}
const piecesOf = (lines: readonly CartItem[]): number => lines.reduce((sum, l) => sum + whole(l.quantity), 0);
/** Lo que se paga por esas líneas (ya con la promoción que aplicó el servidor). */
const costOf = (cart: Cart, lineIds: ReadonlySet<string>): number =>
  cart.items.reduce((sum, item) => (lineIds.has(item.id) ? sum + money(item.lineTotal) : sum), 0);

/**
 * Sube la línea a `target` y comprueba que el servidor NO cobra más que antes por ella y por las
 * que cuentan con ella (`poolIds`; sin grupo, solo la línea). Si cobra más, o la línea no quedó,
 * deshace el cambio. Un fallo de red al subir deja el carrito como estaba (`fallback`).
 */
async function bumpIfFree(args: {
  fallback: Cart;
  line: CartItem;
  target: number;
  updateItem: UpdateItem;
  poolIds?: ReadonlySet<string>;
}): Promise<{ cart: Cart; kept: boolean }> {
  const { fallback, line, target, updateItem } = args;
  const poolIds = args.poolIds ?? new Set([line.id]);
  let bumped: Cart;
  try {
    bumped = await updateItem(line.id, target);
  } catch {
    return { cart: fallback, kept: false };
  }
  const after = findLine(bumped, line.id);
  const costsMore = !after || costOf(bumped, poolIds) > costOf(fallback, poolIds) + 0.005;
  if (!costsMore && whole(after.quantity) === target) return { cart: bumped, kept: true };
  if (after && whole(after.quantity) === whole(line.quantity)) return { cart: bumped, kept: false };
  try {
    return { cart: await updateItem(line.id, whole(line.quantity)), kept: false };
  } catch {
    return { cart: bumped, kept: false };
  }
}

/**
 * Entra la pieza gratis: en la línea que se movió y, si ahí el servidor cobra más (grupo con
 * precios distintos: la gratis es la más barata), en la línea más barata del grupo.
 */
async function addGift(args: {
  cart: Cart;
  line: CartItem;
  pool: readonly CartItem[];
  added: number;
  target: number;
  updateItem: UpdateItem;
}): Promise<{ cart: Cart; host: CartItem | null }> {
  const { cart, line, pool, added, target, updateItem } = args;
  const poolIds = new Set(pool.map((l) => l.id));
  const first = await bumpIfFree({ fallback: cart, line, target, updateItem, poolIds });
  if (first.kept) return { cart: first.cart, host: line };
  const price = money(line.unitPrice);
  // La más barata del grupo, tal como quedó el carrito después de deshacer.
  const cheaper = pool
    .map((l) => findLine(first.cart, l.id))
    .filter((l): l is CartItem => !!l && l.id !== line.id && money(l.unitPrice) < price)
    .sort((a, b) => money(a.unitPrice) - money(b.unitPrice))[0];
  if (!cheaper) return { cart: first.cart, host: null };
  const max = knownMax(cheaper);
  if (max !== null && whole(cheaper.quantity) + added > max) return { cart: first.cart, host: null };
  const second = await bumpIfFree({
    fallback: first.cart,
    line: cheaper,
    target: whole(cheaper.quantity) + added,
    updateItem,
    poolIds,
  });
  return { cart: second.cart, host: second.kept ? cheaper : null };
}

/**
 * Después de AGREGAR al carrito: si la línea (o su grupo) llegó a las piezas que se pagan, entra
 * la gratis. `cart` = respuesta del alta; `lineId` = la línea del alta; `addedQuantity` = piezas
 * pedidas.
 */
export async function autoGiftAfterAdd(args: {
  cart: Cart;
  lineId: string | undefined;
  addedQuantity: number;
  badges: Badges;
  updateItem: UpdateItem;
}): Promise<AutoGiftResult> {
  const { cart, badges, updateItem } = args;
  const line = findLine(cart, args.lineId);
  const badge = line ? badges.get(line.productId) : undefined;
  const offer = autoGiftOffer(badge);
  if (!line || !badge || !offer) return { cart, notice: null };
  const wanted = whole(line.quantity);
  const previous = Math.max(0, wanted - Math.max(0, whole(args.addedQuantity)));
  const pool = poolOf(cart, line, badge, badges);
  const plan = badge.group
    ? planGroupAutoGift({ wanted, previous, others: piecesOf(pool) - wanted, offer, max: knownMax(line) })
    : planAutoGift({ wanted, previous, offer, max: knownMax(line) });
  const notice = (kind: AutoGiftNotice['kind'], count: number, productName = line.productName): AutoGiftNotice => ({
    kind,
    label: badge.label,
    productName,
    count,
  });
  if (plan.missing > 0) return { cart, notice: notice('missing', plan.missing) };
  if (plan.added <= 0) return { cart, notice: null };
  const { cart: next, host } = await addGift({ cart, line, pool, added: plan.added, target: plan.quantity, updateItem });
  return { cart: next, notice: host ? notice('added', plan.added, host.productName) : null };
}

/**
 * Al CAMBIAR la cantidad de una línea (botones + y −, cantidad escrita, "Agregar 1" del aviso).
 * `cached` = el carrito como lo ve la pantalla. Los errores del cambio pedido se propagan (los
 * atiende quien llama, igual que antes); los de la pieza gratis, no.
 */
export async function autoGiftOnUpdate(args: {
  cached: Cart | undefined;
  itemId: string;
  wanted: number;
  badges: Badges;
  updateItem: UpdateItem;
}): Promise<AutoGiftResult> {
  const { cached, itemId, badges, updateItem } = args;
  const wanted = whole(args.wanted);
  const current = cached ? findLine(cached, itemId) : undefined;
  const badge = current ? badges.get(current.productId) : undefined;
  const offer = autoGiftOffer(badge);
  if (!cached || !current || !badge || !offer) return { cart: await updateItem(itemId, wanted), notice: null };
  const previous = whole(current.quantity);
  const plan = badge.group
    ? planGroupAutoGift({
        wanted,
        previous,
        others: piecesOf(poolOf(cached, current, badge, badges)) - previous,
        offer,
        max: knownMax(current),
      })
    : planAutoGift({ wanted, previous, offer, max: knownMax(current) });
  const notice = (kind: AutoGiftNotice['kind'], count: number, productName = current.productName): AutoGiftNotice => ({
    kind,
    label: badge.label,
    productName,
    count,
  });
  // Baja: la gratis se va con la pieza que la ganaba (un solo cambio).
  if (plan.removed > 0) return { cart: await updateItem(itemId, plan.quantity), notice: notice('removed', plan.removed) };
  const cart = await updateItem(itemId, wanted);
  if (plan.missing > 0) return { cart, notice: notice('missing', plan.missing) };
  if (plan.added <= 0) return { cart, notice: null };
  const line = findLine(cart, itemId);
  // El servidor pudo ajustar la cantidad (existencias): solo se sigue si quedó lo pedido.
  if (!line || whole(line.quantity) !== wanted) return { cart, notice: null };
  const { cart: next, host } = await addGift({
    cart,
    line,
    pool: poolOf(cart, line, badge, badges),
    added: plan.added,
    target: plan.quantity,
    updateItem,
  });
  return { cart: next, notice: host ? notice('added', plan.added, host.productName) : null };
}
