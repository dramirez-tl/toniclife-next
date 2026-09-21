// Estado del diálogo de PAÍS del carrito (C2). Store externo mínimo, mismo patrón que
// `cart-drawer-store`: lo abren `useAddCartItem` (409 `CART_COUNTRY_CHANGE`) y el
// checkout (409 `CHK_COUNTRY_MISMATCH`) sin context ni props en cadena; el diálogo
// (`CartCountryDialog`, montado una vez en el layout de `[locale]`) lo lee con
// `useSyncExternalStore`. En el servidor siempre está cerrado.

import { conflictItemCount, countryConflictOf, isCheckoutCountryMismatch, type CountryConflict } from './cart-country';

/** Alta que el API rechazó por país; se repite tal cual tras "Vaciar y cambiar". */
export interface PendingCartAdd {
  productId: string;
  quantity: number;
}

interface ConflictInfo extends CountryConflict {
  /** Líneas que se pierden al vaciar, si el API lo dijo (`details.itemCount`); si no, el diálogo usa el carrito en caché. */
  itemCount: number | null;
}

export type CartCountryDialogState =
  /**
   * `pending`: TODAS las altas por repetir tras vaciar, en orden. Una sola desde el catálogo;
   * el paquete completo desde el quiz; vacío cuando lo abre el aviso del carrito (solo vaciar).
   */
  | ({ kind: 'cart_country_change'; pending: PendingCartAdd[] } & ConflictInfo)
  | ({ kind: 'checkout_country_mismatch' } & ConflictInfo);

let state: CartCountryDialogState | null = null;
// El diálogo es controlado y SIN trigger de Radix: quien lo provoca deja aquí el
// elemento con foco para devolvérselo al cerrar (WCAG 2.4.3).
let returnFocusTo: HTMLElement | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function activeElement(): HTMLElement | null {
  if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') return null;
  return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

export function subscribeCartCountryDialog(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCartCountryDialog(): CartCountryDialogState | null {
  return state;
}

export function getServerCartCountryDialog(): CartCountryDialogState | null {
  return null;
}

function open(next: CartCountryDialogState): void {
  returnFocusTo = activeElement();
  state = next;
  emit();
}

/** Una entrada por producto (la primera gana) y solo cantidades válidas. */
function cleanPending(list: readonly PendingCartAdd[]): PendingCartAdd[] {
  const seen = new Set<string>();
  const out: PendingCartAdd[] = [];
  for (const item of list) {
    if (!item || typeof item.productId !== 'string' || !item.productId || seen.has(item.productId)) continue;
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) continue;
    seen.add(item.productId);
    out.push({ productId: item.productId, quantity: item.quantity });
  }
  return out;
}

/**
 * 409 `CART_COUNTRY_CHANGE` al agregar (o el aviso del carrito, con `pending` vacío): ofrece
 * vaciar el carrito y cambiarlo de país, o conservarlo.
 */
export function openCartCountryChange(
  conflict: CountryConflict & { itemCount?: number | null },
  pending: PendingCartAdd | readonly PendingCartAdd[],
): void {
  const list = Array.isArray(pending) ? (pending as readonly PendingCartAdd[]) : [pending as PendingCartAdd];
  open({
    kind: 'cart_country_change',
    cartCountry: conflict.cartCountry,
    requestedCountry: conflict.requestedCountry,
    itemCount: conflict.itemCount ?? null,
    pending: cleanPending(list),
  });
}

/**
 * Lote (paquete del quiz): tras el PRIMER `CART_COUNTRY_CHANGE` el lote se corta y aquí se
 * anotan los demás productos, para que "Vaciar y cambiar" los re-agregue TODOS y no solo el
 * último. Sin diálogo de cambio de país abierto no hace nada. Devuelve cuántos quedaron pendientes.
 */
export function addPendingToCartCountryChange(extra: readonly PendingCartAdd[]): number {
  if (state?.kind !== 'cart_country_change') return 0;
  const pending = cleanPending([...state.pending, ...extra]);
  if (pending.length !== state.pending.length) {
    state = { ...state, pending };
    emit();
  }
  return pending.length;
}

/**
 * Checkout: si el error es el 409 `CHK_COUNTRY_MISMATCH` abre el aviso (enlace al carrito
 * y a la tienda correcta) y devuelve `true`; cualquier otro error devuelve `false` y el
 * checkout sigue con su manejo de siempre.
 */
export function reportCheckoutCountryMismatch(err: unknown): boolean {
  if (!isCheckoutCountryMismatch(err)) return false;
  open({ kind: 'checkout_country_mismatch', ...countryConflictOf(err), itemCount: conflictItemCount(err) });
  return true;
}

export function closeCartCountryDialog(): void {
  if (state === null) return;
  state = null;
  emit();
}

/** Elemento que tenía el foco al abrirse, si sigue en el documento. Se consume al leerlo. */
export function takeCartCountryDialogReturnFocus(): HTMLElement | null {
  const target = returnFocusTo;
  returnFocusTo = null;
  return target && target.isConnected ? target : null;
}

/** Solo pruebas. */
export function resetCartCountryDialogForTests(): void {
  state = null;
  returnFocusTo = null;
  listeners.clear();
}
