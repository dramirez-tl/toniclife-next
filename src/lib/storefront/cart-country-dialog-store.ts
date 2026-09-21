// Estado del diálogo de PAÍS del carrito (C2). Store externo mínimo, mismo patrón que
// `cart-drawer-store`: lo abren `useAddCartItem` (409 `CART_COUNTRY_CHANGE`) y el
// checkout (409 `CHK_COUNTRY_MISMATCH`) sin context ni props en cadena; el diálogo
// (`CartCountryDialog`, montado una vez en el layout de `[locale]`) lo lee con
// `useSyncExternalStore`. En el servidor siempre está cerrado.

import { countryConflictOf, isCheckoutCountryMismatch, type CountryConflict } from './cart-country';

/** Alta que el API rechazó por país; se repite tal cual tras "Vaciar y cambiar". */
export interface PendingCartAdd {
  productId: string;
  quantity: number;
}

export type CartCountryDialogState =
  | ({ kind: 'cart_country_change'; pending: PendingCartAdd } & CountryConflict)
  | ({ kind: 'checkout_country_mismatch' } & CountryConflict);

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

/** 409 `CART_COUNTRY_CHANGE` al agregar: ofrece "Vaciar y cambiar" o seguir en la tienda del carrito. */
export function openCartCountryChange(conflict: CountryConflict, pending: PendingCartAdd): void {
  open({ kind: 'cart_country_change', pending, ...conflict });
}

/**
 * Checkout: si el error es el 409 `CHK_COUNTRY_MISMATCH` abre el aviso (enlace al carrito
 * y a la tienda correcta) y devuelve `true`; cualquier otro error devuelve `false` y el
 * checkout sigue con su manejo de siempre.
 */
export function reportCheckoutCountryMismatch(err: unknown): boolean {
  if (!isCheckoutCountryMismatch(err)) return false;
  open({ kind: 'checkout_country_mismatch', ...countryConflictOf(err) });
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
