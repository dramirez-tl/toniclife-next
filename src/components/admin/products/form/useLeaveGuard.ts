'use client';

// useLeaveGuard — guard de salida con cambios sin guardar.
//  - Cerrar/recargar la pestaña: `beforeunload` (useUnsavedChanges).
//  - Navegación interna: el App Router no expone un evento cancelable, así que
//    se interceptan en fase de captura los clics a enlaces internos y se pide
//    confirmación con un diálogo propio antes de navegar.

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUnsavedChanges } from '@/components/distributor/payment/useUnsavedChanges';

export interface LeaveGuard {
  pendingHref: string | null;
  confirmLeave: () => void;
  cancelLeave: () => void;
  /** Para navegaciones programáticas (botón Regresar, etc.). */
  guardedPush: (href: string) => void;
}

export function useLeaveGuard(dirty: boolean): LeaveGuard {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useUnsavedChanges(dirty);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== '_self') return;
      if (target.hasAttribute('download')) return;
      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Mismo documento (cambio de ?seccion= o ancla): no es una salida.
      if (url.pathname === window.location.pathname) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dirty]);

  const confirmLeave = useCallback(() => {
    const href = pendingHref;
    setPendingHref(null);
    if (href) router.push(href);
  }, [pendingHref, router]);

  const cancelLeave = useCallback(() => setPendingHref(null), []);

  const guardedPush = useCallback(
    (href: string) => {
      if (dirty) setPendingHref(href);
      else router.push(href);
    },
    [dirty, router],
  );

  return { pendingHref, confirmLeave, cancelLeave, guardedPush };
}
