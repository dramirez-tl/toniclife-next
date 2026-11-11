// El carrito de una cuenta es UNO solo, aunque la cuenta esté abierta en varias pestañas
// o dispositivos: lo que se quita en uno desaparece en los demás. Aquí vive, sin React y
// probado, cómo ESTA pestaña distingue lo que hizo ella de lo que cambió en otra sesión,
// qué copia del carrito se queda en pantalla cuando una lectura y un cambio propio se
// cruzan, y cuándo el resumen del checkout y el carrito dejaron de hablar de lo mismo.
//
// Caso real (11-nov-2026): dos personas con la misma cuenta; una agregaba y la otra
// quitaba. A una "se le borraba" el carrito sin explicación y el checkout le mostró
// Subtotal $363.00 con Total $150.00 (líneas de la copia vieja, total recién cotizado).

import type { QueryClient } from '@tanstack/react-query';
import type { Cart, CheckoutSummary } from '@/types/cart';
import { cartKeys, invalidateCartDerived } from './cart-query-keys';

/** Lo mínimo de un carrito para comparar dos lecturas. */
export interface CartLinesLike {
  id: string;
  items: ReadonlyArray<{ id: string; quantity: number | string }>;
}

/** `emptied` = quedó sin productos; `changed` = se agregó, se quitó o cambió una cantidad. */
export type CartChangeElsewhere = 'emptied' | 'changed';

/**
 * Lo que cambió entre dos lecturas del MISMO carrito y que esta pantalla NO hizo.
 * `ownLineIds` = líneas que tocó la acción en curso (la que se agregó, cambió o quitó):
 * no cuentan. Con otro carrito (inicio de sesión, pedido creado) o sin lectura previa
 * no hay nada que comparar.
 */
export function cartChangeElsewhere(
  before: CartLinesLike | null | undefined,
  after: CartLinesLike | null | undefined,
  ownLineIds: ReadonlyArray<string | null | undefined> = [],
): CartChangeElsewhere | null {
  if (!before || !after || !before.id || before.id !== after.id) return null;
  const own = new Set(ownLineIds.filter((id): id is string => !!id));
  const quantities = (cart: CartLinesLike) =>
    new Map(cart.items.filter((item) => !own.has(item.id)).map((item) => [item.id, Number(item.quantity)]));
  const was = quantities(before);
  const now = quantities(after);

  let changed = false;
  for (const [id, quantity] of was) {
    if (now.get(id) !== quantity) changed = true; // ya no está o trae otra cantidad
  }
  for (const id of now.keys()) {
    if (!was.has(id)) changed = true; // apareció una línea que aquí no se agregó
  }
  if (!changed) return null;
  return after.items.length === 0 ? 'emptied' : 'changed';
}

/** ¿La lectura trae un carrito distinto del que había? (lo que deriva de él hay que volver a pedirlo) */
export function cartMoved(
  before: Pick<Cart, 'id' | 'updatedAt' | 'subtotal' | 'itemCount'> | null | undefined,
  after: Pick<Cart, 'id' | 'updatedAt' | 'subtotal' | 'itemCount'>,
): boolean {
  if (!before) return false;
  return (
    before.id !== after.id ||
    String(before.updatedAt) !== String(after.updatedAt) ||
    before.subtotal !== after.subtotal ||
    Number(before.itemCount) !== Number(after.itemCount)
  );
}

// ================================
// ACTIVIDAD DE ESTA PESTAÑA
// ================================

/**
 * Cómo terminó una lectura (`GET /cart`) respecto de lo que hizo esta pestaña:
 *  - `clean`: no movió nada mientras se leía ni tenía dudas → una diferencia es de OTRA sesión.
 *  - `reconciled`: la copia local era dudosa (cambios propios encimados o uno que falló)
 *    y esta lectura la pone al día: sin aviso.
 *  - `raced`: esta pestaña movió el carrito mientras se leía: sin aviso.
 */
export type CartReadOutcome = 'clean' | 'reconciled' | 'raced';

export interface CartActivity {
  /** Empieza un cambio propio (agregar, cantidad, quitar, vaciar, mezclar). */
  mutationStarted(): void;
  /** Terminó, bien o mal. `true` = toca releer el carrito para dejar la copia local al día. */
  mutationSettled(ok: boolean): boolean;
  /** ¿La respuesta del cambio en curso se puede comparar con la copia local? Solo si es el único en vuelo y no hay dudas. */
  mutationIsComparable(): boolean;
  /** Marca el inicio de una lectura; el valor se entrega a `readFinished`. */
  readStarted(): number;
  readFinished(token: number): CartReadOutcome;
}

/**
 * Bitácora mínima de lo que ESTA pestaña le hace al carrito. Sin relojes: un contador que
 * avanza con cada cambio propio que empieza o termina. Dos cambios propios encimados
 * pueden responder en desorden, y uno que falla pudo aplicarse a medias: en ambos casos
 * la copia local queda "dudosa" hasta que una lectura limpia la ponga al día.
 */
export function createCartActivity(): CartActivity {
  let inFlight = 0;
  let tick = 0;
  let unsure = false;

  return {
    mutationStarted() {
      if (inFlight > 0) unsure = true;
      inFlight += 1;
      tick += 1;
    },
    mutationSettled(ok) {
      inFlight = Math.max(0, inFlight - 1);
      tick += 1;
      if (!ok) unsure = true;
      return inFlight === 0 && unsure;
    },
    mutationIsComparable() {
      return inFlight === 1 && !unsure;
    },
    readStarted() {
      return tick;
    },
    readFinished(token) {
      if (inFlight > 0 || token !== tick) return 'raced';
      if (unsure) {
        unsure = false;
        return 'reconciled';
      }
      return 'clean';
    },
  };
}

/**
 * Qué carrito queda en pantalla al terminar una lectura y si hay que avisar.
 *  - Si esta pestaña ESCRIBIÓ el carrito mientras se leía (la respuesta de un cambio
 *    suyo), esa respuesta es más nueva que la lectura: no se pisa.
 *  - Si no, gana la lectura; y solo una lectura `clean` atribuye la diferencia a otra sesión.
 */
export function resolveCartRead<T extends CartLinesLike>(input: {
  /** Copia local cuando EMPEZÓ la lectura. */
  seen: T | undefined;
  /** Copia local cuando TERMINÓ. */
  current: T | undefined;
  /** Lo que respondió el servidor. */
  next: T;
  outcome: CartReadOutcome;
}): { cart: T; change: CartChangeElsewhere | null } {
  const { seen, current, next, outcome } = input;
  if (current && current !== seen && current.id === next.id) return { cart: current, change: null };
  return { cart: next, change: outcome === 'clean' ? cartChangeElsewhere(current, next) : null };
}

// ================================
// LECTURAS Y CAMBIOS SOBRE LA CACHÉ
// ================================

/** Avisa que el carrito cambió en otra sesión (lo pinta `useCart` con un toast traducido). */
export type CartElsewhereNotifier = (change: CartChangeElsewhere, cart: Cart) => void;

/** La bitácora de ESTA pestaña: el módulo se carga una vez por página. */
export const cartActivity = createCartActivity();

/**
 * `GET /cart` con las reglas de arriba: decide qué carrito queda en caché, vuelve a pedir
 * lo que deriva de él si cambió (resumen del encabezado y del checkout) y avisa si el
 * cambio vino de otra sesión.
 */
export async function readCartInSync(
  queryClient: QueryClient,
  fetchCart: () => Promise<Cart>,
  notify: CartElsewhereNotifier,
  activity: CartActivity = cartActivity,
): Promise<Cart> {
  const token = activity.readStarted();
  const seen = queryClient.getQueryData<Cart>(cartKeys.cart());
  const next = await fetchCart();
  const current = queryClient.getQueryData<Cart>(cartKeys.cart());
  const { cart, change } = resolveCartRead({ seen, current, next, outcome: activity.readFinished(token) });
  if (cart === next && cartMoved(current, next)) invalidateCartDerived(queryClient);
  if (change) notify(change, next);
  return cart;
}

/**
 * Respuesta de un cambio PROPIO: queda en caché (como siempre) y, si además trae cambios
 * que esta pestaña no hizo, se avisa. `ownLineIds` = líneas que tocó este cambio;
 * `'all'` = el cambio toca todo el carrito (vaciar, cambiar de país): no hay qué comparar.
 */
export function applyCartMutation(
  queryClient: QueryClient,
  data: Cart,
  ownLineIds: ReadonlyArray<string | null | undefined> | 'all',
  notify: CartElsewhereNotifier,
  activity: CartActivity = cartActivity,
): void {
  const before = queryClient.getQueryData<Cart>(cartKeys.cart());
  const comparable = activity.mutationIsComparable();
  queryClient.setQueryData(cartKeys.cart(), data);
  invalidateCartDerived(queryClient);
  if (!comparable || ownLineIds === 'all') return;
  const change = cartChangeElsewhere(before, data, ownLineIds);
  if (change) notify(change, data);
}

/** Fin de un cambio propio. Si la copia local quedó dudosa, se relee el carrito (sin aviso). */
export function settleCartMutation(queryClient: QueryClient, ok: boolean, activity: CartActivity = cartActivity): void {
  if (activity.mutationSettled(ok)) void queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
}

// ================================
// CHECKOUT: CARRITO vs RESUMEN
// ================================

function cents(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

function count(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * El resumen del checkout (envío, impuesto, total) y el carrito (líneas) son dos
 * respuestas distintas del API. Si no coinciden en piezas o en subtotal, una de las dos
 * es vieja. Devuelve la FIRMA del desacuerdo (para volver a pedir UNA sola vez por
 * desacuerdo, nunca en bucle) o `null` si hablan de lo mismo o falta alguna de las dos.
 */
export function cartSummaryMismatch(
  cart: Pick<Cart, 'itemCount' | 'subtotal'> | null | undefined,
  summary: Pick<CheckoutSummary, 'itemCount' | 'subtotal'> | null | undefined,
): string | null {
  if (!cart || !summary) return null;
  const cartCount = count(cart.itemCount);
  const summaryCount = count(summary.itemCount);
  const cartSubtotal = cents(cart.subtotal);
  const summarySubtotal = cents(summary.subtotal);
  const countDiffers = cartCount !== null && summaryCount !== null && cartCount !== summaryCount;
  const subtotalDiffers = cartSubtotal !== null && summarySubtotal !== null && cartSubtotal !== summarySubtotal;
  if (!countDiffers && !subtotalDiffers) return null;
  return [cartCount, cartSubtotal, summaryCount, summarySubtotal].join('|');
}
