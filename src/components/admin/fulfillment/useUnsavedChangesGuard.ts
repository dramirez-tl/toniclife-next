'use client';

// useUnsavedChangesGuard — no perder el borrador por accidente (contrato §7.3-7).
//
//  · Cerrar o recargar la pestaña → aviso nativo del navegador (`beforeunload`).
//  · Clic en un enlace interno (sidebar, "Configuración", cualquier <a>) → se
//    intercepta ANTES de que el router de Next navegue y la página pregunta.
//
// Límite conocido: el botón Atrás del navegador no pasa por aquí (el App
// Router no ofrece un punto para cancelarlo).

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { internalNavigationTarget } from '@/lib/unsaved-navigation';

export function useUnsavedChangesGuard(isDirty: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    // Fase de captura en `document`: corre antes que el onClick de <Link> de Next.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const target = internalNavigationTarget({
        href: anchor.getAttribute('href'),
        currentUrl: window.location.href,
        target: anchor.getAttribute('target'),
        download: anchor.hasAttribute('download'),
        button: e.button,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        defaultPrevented: e.defaultPrevented,
      });
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingHref(target);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty]);

  const cancel = useCallback(() => setPendingHref(null), []);

  /** `beforeLeave` = descartar el borrador: al quedar limpio, el guard ya no intercepta. */
  const confirm = useCallback(
    (beforeLeave?: () => void) => {
      const href = pendingHref;
      setPendingHref(null);
      if (!href) return;
      beforeLeave?.();
      router.push(href);
    },
    [pendingHref, router],
  );

  return { pendingHref, cancel, confirm };
}
