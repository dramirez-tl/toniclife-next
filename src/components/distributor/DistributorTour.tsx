'use client';

// Dispara el tour guiado la PRIMERA vez que el distribuidor entra al panel.
// Se monta una vez en el layout. Espera a que la navegación exista en el DOM
// (los anclas data-tour) antes de arrancar. No renderiza nada visible.

import { useEffect } from 'react';
import {
  hasSeenDistributorTour,
  startDistributorTour,
} from '@/lib/distributorTour';

export function DistributorTour() {
  useEffect(() => {
    if (hasSeenDistributorTour()) return;

    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const ready = document.querySelector(
        '[data-tour="d-core-inicio"], [data-tour="m-core-inicio"]',
      );
      if (ready) {
        window.clearInterval(timer);
        startDistributorTour();
      } else if (tries > 20) {
        window.clearInterval(timer); // ~6s: no bloquear si la nav no aparece
      }
    }, 300);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
