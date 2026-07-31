'use client';

import { useEffect, useState } from 'react';

/** Debajo de este ancho se considera teléfono. Es el `sm` de Tailwind. */
export const MOBILE_BREAKPOINT = 640;

/**
 * true cuando la pantalla es de teléfono.
 *
 * Arranca en `false` a propósito: `matchMedia` no existe en el servidor, y si
 * el primer render del cliente devolviera otra cosa que el HTML del servidor
 * habría un desajuste de hidratación. El valor real se resuelve en el efecto,
 * que corre antes de que el usuario alcance a tocar nada.
 */
export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [breakpoint]);

  return isMobile;
}
