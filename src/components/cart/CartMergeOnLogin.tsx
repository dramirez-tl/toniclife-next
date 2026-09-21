'use client';

// C3 (contrato ecommerce 6.4): tras un login o registro YA exitoso, si el navegador traía
// un carrito de invitado (`x-session-id`), se mezcla UNA vez en el de la cuenta.
//
// DÓNDE SE ENGANCHA: en el layout RAÍZ (`src/app/layout.tsx`, junto a `SessionSync`), el
// punto más externo. NO toca la lógica de auth: solo LEE el estado de la sesión del store
// (`isInitialized`, `isAuthenticated`, `user.customerId`). El login y el set-password
// navegan con recarga completa (`window.location.href`) y el registro con el router: en
// ambos casos esta pieza ve "sesión de cliente + carrito de invitado sin mezclar" en la
// página de destino y ahí llama a `POST /cart/merge`.
//
// "UNA vez": se recuerda en `localStorage` el `x-session-id` ya mezclado. La marca se
// olvida en las páginas de acceso (/login, /registro, /set-password…) y al navegar sin
// sesión, para que el SIGUIENTE inicio de sesión vuelva a mezclar. En esas páginas nunca
// se mezcla: el login puede revertirse ahí mismo (cuenta con correo vinculado).
// Un 404/405 (API sin el endpoint) se ignora en silencio y no deja marca; un fallo de red
// o 5xx tampoco avisa: se reintenta en la siguiente carga de página.

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useMergeCarts } from '@/hooks/useCart';
import { cartService } from '@/services/cart.service';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectIsInitialized, selectUser } from '@/store/slices/authSlice';
import { MERGE_DONE_KEY, mergeAction, mergeHasNews, mergeMovedNothing, type MergeLineNote } from '@/lib/storefront/cart-merge';

const NAMES_SHOWN = 3;
// Un intento por `x-session-id` y por carga de página (StrictMode monta los efectos dos veces).
const attempted = new Set<string>();

function readMark(): string | null {
  try {
    return localStorage.getItem(MERGE_DONE_KEY);
  } catch {
    return null;
  }
}

function writeMark(value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(MERGE_DONE_KEY);
    else localStorage.setItem(MERGE_DONE_KEY, value);
  } catch {
    // Sin almacenamiento (modo privado estricto): a lo más se repite el intento en otra carga.
  }
}

export function CartMergeOnLogin() {
  const t = useTranslations('storefront.cart.merge');
  const pathname = usePathname();
  const router = useRouter();
  const authInitialized = useAppSelector(selectIsInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const hasCustomerSession = isAuthenticated && !!user?.customerId;
  const { mutateAsync: mergeCarts } = useMergeCarts();

  useEffect(() => {
    const guestSessionId = cartService.peekGuestSessionId();
    const action = mergeAction({
      authInitialized,
      hasCustomerSession,
      pathname,
      guestSessionId,
      mergedSessionId: readMark(),
    });
    if (action === 'rearm') {
      writeMark(null);
      return;
    }
    if (action !== 'merge' || !guestSessionId || attempted.has(guestSessionId)) return;
    attempted.add(guestSessionId);

    const names = (lines: readonly MergeLineNote[]) => {
      const known = lines.map((line) => line.name).filter(Boolean);
      const shown = known.slice(0, NAMES_SHOWN).join(', ');
      const rest = lines.length - Math.min(known.length, NAMES_SHOWN);
      if (!shown) return '';
      return rest > 0 ? `: ${shown} ${t('andMore', { count: rest })}` : `: ${shown}`;
    };
    const viewCart = { label: t('viewCart'), onClick: () => router.push('/carrito') };

    void mergeCarts(guestSessionId)
      .then((outcome) => {
        if (outcome.status === 'unsupported') return; // API previo a C3: silencio y sin marca.
        writeMark(guestSessionId);
        if (outcome.status === 'not_applicable') return; // La sesión no es de cliente: nada que mezclar ni que avisar.
        if (outcome.status === 'country_mismatch' || outcome.summary.skipReason === 'country_mismatch') {
          toast.info(t('countryMismatchTitle'), { description: t('countryMismatchBody'), duration: 12000 });
          return;
        }
        const { summary } = outcome;
        if (!mergeHasNews(summary)) return; // Se mezcló sin ajustes: el carrito ya lo muestra.
        const lines = [
          summary.adjusted.length > 0 ? `${t('adjusted', { count: summary.adjusted.length })}${names(summary.adjusted)}.` : '',
          summary.rejected.length > 0 ? `${t('rejected', { count: summary.rejected.length })}${names(summary.rejected)}.` : '',
        ].filter(Boolean);
        // Si NINGUNA línea pasó, el título no puede decir "pasamos tu carrito".
        toast.info(t(mergeMovedNothing(summary) ? 'titleNone' : 'title'), { description: lines.join(' '), duration: 12000, action: viewCart });
      })
      .catch(() => {
        // Red, 401 o 5xx: sin aviso. El carrito de invitado sigue intacto y se reintenta en otra carga.
      });
  }, [authInitialized, hasCustomerSession, pathname, mergeCarts, router, t]);

  return null;
}
