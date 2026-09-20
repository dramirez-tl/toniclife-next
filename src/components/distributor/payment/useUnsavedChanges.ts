'use client';

// useUnsavedChanges.ts — aviso `beforeunload` mientras alguna sección tenga
// cambios sin guardar. El texto lo pone el navegador (no es traducible).

import { useEffect } from 'react';

export function useUnsavedChanges(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome/Edge exigen returnValue para mostrar el diálogo.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
