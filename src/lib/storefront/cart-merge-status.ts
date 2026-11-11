// cart-merge-status.ts — ¿Se está pasando el carrito de invitado a la cuenta? (estado de la pestaña)
//
// Al iniciar sesión o crear la cuenta desde el checkout, la persona vuelve al checkout con
// su carrito de invitado todavía sin mezclar: `CartMergeOnLogin` (layout raíz) lo mezcla
// con `POST /cart/merge` en esa misma página. Mientras tanto `GET /cart` ya responde el
// carrito de la CUENTA, que en una cuenta nueva está vacío, y el checkout daba el carrito
// por vacío y mandaba a /carrito antes de que el merge terminara.
//
// Este módulo es la señal entre los dos: `CartMergeOnLogin` avisa cuando empieza y cuando
// termina cada mezcla, y el checkout espera mientras haya una en curso. No decide nada del
// merge (eso es `cart-merge.ts`) ni toca la sesión; solo cuenta mezclas en vuelo.

export type CartMergeStatus = 'idle' | 'merging';

let inFlight = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function getCartMergeStatus(): CartMergeStatus {
  return inFlight > 0 ? 'merging' : 'idle';
}

/** En el servidor nunca hay una mezcla en curso. */
export function getServerCartMergeStatus(): CartMergeStatus {
  return 'idle';
}

export function subscribeCartMergeStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Marca el inicio de una mezcla. Devuelve la función que la da por terminada (bien o
 * mal): llamarla más de una vez no descuenta de más.
 */
export function beginCartMerge(): () => void {
  const wasIdle = inFlight === 0;
  inFlight += 1;
  if (wasIdle) notify();
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    inFlight = Math.max(0, inFlight - 1);
    if (inFlight === 0) notify();
  };
}

/**
 * ¿El checkout debe esperar antes de decidir que el carrito está vacío?
 *  - mientras la sesión no se ha leído (no se sabe si es invitado o cliente), y
 *  - mientras se mezcla el carrito de invitado en el de la cuenta.
 * Un carrito CON artículos nunca espera: esto solo retrasa el "está vacío, vuelve al carrito".
 */
export function cartMayStillFill(input: { authInitialized: boolean; mergeStatus: CartMergeStatus }): boolean {
  return !input.authInitialized || input.mergeStatus === 'merging';
}
