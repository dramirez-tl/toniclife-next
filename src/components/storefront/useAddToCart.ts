'use client';

// "Agregar al carrito" de la tienda: CONSUME el hook existente `useAddCartItem`
// (no lo modifica) y le suma el feedback: estado "Agregado", anuncio para lector
// de pantalla, toast con acceso al carrito y analítica.
// El error lo avisa el propio `useAddCartItem` (un solo manejador, sin duplicar toasts).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { track } from '@vercel/analytics';
import { useAddCartItem } from '@/hooks/useCart';
import { useRouter } from '@/i18n/routing';

const ADDED_FEEDBACK_MS = 2500;

export interface AddableProduct {
  id: string;
  code: string;
  name: string;
  price: number | null;
}

export function useAddToCart() {
  const t = useTranslations('storefront.common.cart');
  const router = useRouter();
  const mutation = useAddCartItem();
  const [justAdded, setJustAdded] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /** Agrega y resuelve `true` si el API aceptó la línea. */
  const add = useCallback(
    async (product: AddableProduct, quantity: number, options: { silent?: boolean } = {}): Promise<boolean> => {
      if (product.price === null || quantity < 1) return false;
      try {
        await mutation.mutateAsync({ productId: product.id, quantity });
      } catch {
        return false; // `useAddCartItem` ya mostró el motivo real.
      }
      track('add_to_cart', { code: product.code, quantity, value: product.price * quantity });
      setJustAdded(true);
      setAnnouncement(t('addedAnnouncement', { name: product.name, count: quantity }));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setJustAdded(false);
        setAnnouncement('');
      }, ADDED_FEEDBACK_MS);
      if (!options.silent) {
        toast.success(t('addedToast', { name: product.name }), {
          action: { label: t('viewCart'), onClick: () => router.push('/carrito') },
        });
      }
      return true;
    },
    [mutation, router, t],
  );

  return { add, isPending: mutation.isPending, justAdded, announcement };
}
