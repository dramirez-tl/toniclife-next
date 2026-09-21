// unsaved-navigation.ts — ¿Este clic saca al usuario de la página? (lógica PURA)
//
// `beforeunload` solo cubre cerrar o recargar la pestaña. Un clic en el sidebar
// o en cualquier enlace interno navega por el router de Next SIN ese aviso y el
// borrador se pierde. El hook `useUnsavedChangesGuard` intercepta esos clics y
// pregunta antes; aquí vive la decisión, que se puede probar sin DOM.

export interface LinkClickInfo {
  /** `href` tal como está en el enlace (relativo o absoluto). */
  href: string | null | undefined;
  /** URL completa de la página actual (`window.location.href`). */
  currentUrl: string;
  target?: string | null;
  download?: boolean;
  /** 0 = botón principal. */
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  defaultPrevented?: boolean;
}

/**
 * Devuelve la ruta interna a la que iría el clic (pathname + query + hash) si
 * ese clic ABANDONA la página actual dentro de la app; null si no hay que
 * interceptarlo: otra pestaña, descarga, otro sitio, `mailto:`, ancla de la
 * misma página, clic con Ctrl/⌘/Shift/Alt o con otro botón del ratón.
 */
export function internalNavigationTarget(info: LinkClickInfo): string | null {
  if (info.defaultPrevented) return null;
  if ((info.button ?? 0) !== 0) return null;
  if (info.metaKey || info.ctrlKey || info.shiftKey || info.altKey) return null;
  if (info.download) return null;
  const target = (info.target ?? '').trim().toLowerCase();
  if (target && target !== '_self') return null;
  const href = (info.href ?? '').trim();
  if (!href || href.startsWith('#')) return null;

  let current: URL;
  let next: URL;
  try {
    current = new URL(info.currentUrl);
    next = new URL(href, current);
  } catch {
    return null;
  }
  if (next.protocol !== 'http:' && next.protocol !== 'https:') return null;
  if (next.origin !== current.origin) return null;
  // Misma página (solo cambia el ancla o nada): no se pierde el borrador.
  if (next.pathname === current.pathname && next.search === current.search) return null;
  return `${next.pathname}${next.search}${next.hash}`;
}
