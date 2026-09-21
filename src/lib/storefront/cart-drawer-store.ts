// Estado abierto/cerrado del `CartDrawer`. Store externo mínimo (mismo patrón que
// `viewer-session`): lo abren el catálogo, el detalle y el icono del Header sin
// context ni props en cadena; el drawer lo lee con `useSyncExternalStore`.
// En el servidor siempre está cerrado.

let open = false;
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

export const openCartDrawer = (): void => setCartDrawerOpen(true);
export const closeCartDrawer = (): void => setCartDrawerOpen(false);

/** Solo pruebas. */
export function resetCartDrawerForTests(): void {
  open = false;
  listeners.clear();
}
