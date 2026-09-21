// Estado abierto/cerrado del `CartDrawer`. Store externo mínimo (mismo patrón que
// `viewer-session`): lo abren el catálogo, el detalle y el icono del Header sin
// context ni props en cadena; el drawer lo lee con `useSyncExternalStore`.
// En el servidor siempre está cerrado.

let open = false;
// Quién abrió el drawer. El Sheet es controlado y SIN `SheetTrigger`: Radix no tiene a
// quién devolverle el foco, así que TODO el que abre (icono del Header, "Agregar") pasa
// su elemento; sin esto, al cerrar el foco caería en <body> (WCAG 2.4.3).
let returnFocusTo: HTMLElement | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeCartDrawer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCartDrawerOpen(): boolean {
  return open;
}

export function getServerCartDrawerOpen(): boolean {
  return false;
}

export function setCartDrawerOpen(next: boolean): void {
  if (open === next) return;
  open = next;
  emit();
}

/** `trigger`: elemento al que vuelve el foco al cerrar. Sin él, el foco se pierde: pásalo siempre que haya uno. */
export function openCartDrawer(trigger?: Element | null): void {
  returnFocusTo = typeof HTMLElement !== 'undefined' && trigger instanceof HTMLElement ? trigger : null;
  setCartDrawerOpen(true);
}

/** Elemento que abrió el drawer, si sigue en el documento. Se consume al leerlo. */
export function takeCartDrawerReturnFocus(): HTMLElement | null {
  const target = returnFocusTo;
  returnFocusTo = null;
  return target && target.isConnected ? target : null;
}

export const closeCartDrawer = (): void => setCartDrawerOpen(false);

/** Solo pruebas. */
export function resetCartDrawerForTests(): void {
  open = false;
  returnFocusTo = null;
  listeners.clear();
}
