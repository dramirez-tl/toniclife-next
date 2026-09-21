'use client';

// "Agregar al carrito" de la tienda: CONSUME el hook existente `useAddCartItem` y le
// suma el feedback: estado "Agregado", anuncio para lector de pantalla, apertura del
// `CartDrawer` (sustituye al toast "Ver carrito") y analítica.
// El error lo avisa el propio `useAddCartItem` (un solo manejador, sin duplicar toasts).
//
// Con el API C1 un `CART_QTY_EXCEEDS_STOCK` hace que el hook AJUSTE la línea al máximo:
// por eso lo "agregado" se mide contra el carrito (antes → después), no contra lo pedido.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { track } from '@vercel/analytics';
import { useQueryClient } from '@tanstack/react-query';
import { cartKeys, useAddCartItem } from '@/hooks/useCart';
import { openCartDrawer } from '@/lib/storefront/cart-drawer-store';
import type { Cart } from '@/types/cart';

const ADDED_FEEDBACK_MS = 2500;

export interface AddableProduct {
  id: string;
  code: string;
  name: string;
  price: number | null;
}

/**
 * - `added`: entraron piezas al carrito.
 * - `unchanged`: el API aceptó pero la línea ya estaba en su máximo (no entró nada).
 * - `failed`: el API rechazó (el hook ya avisó el motivo) o el producto no es agregable.
 */
export type AddToCartOutcome = 'added' | 'unchanged' | 'failed';

function lineQuantity(cart: Cart | undefined, productId: string): number | null {
  if (!cart) return null;
  return cart.items.find((item) => item.productId === productId)?.quantity ?? 0;
}

export function useAddToCart() {
  const t = useTranslations('storefront.common.cart');
  const queryClient = useQueryClient();
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

  /** `silent`: no abre el drawer (p. ej. "Comprar ahora", que navega al checkout). */
  const add = useCallback(
    async (product: AddableProduct, quantity: number, options: { silent?: boolean } = {}): Promise<AddToCartOutcome> => {
      if (product.price === null || quantity < 1) return 'failed';
      const before = lineQuantity(queryClient.getQueryData<Cart>(cartKeys.cart()), product.id);
      let cart: Cart;
      try {
        cart = await mutation.mutateAsync({ productId: product.id, quantity });
      } catch {
        return 'failed'; // `useAddCartItem` ya mostró el motivo real.
      }
      const after = lineQuantity(cart, product.id) ?? quantity;
      // Sin carrito en caché no se conoce el "antes": lo agregado es lo pedido, acotado a lo que quedó.
      const added = before === null ? Math.min(quantity, after) : after - before;
      if (!options.silent) openCartDrawer();
      if (added <= 0) return 'unchanged';

      track('add_to_cart', { code: product.code, quantity: added, value: product.price * added });
      setJustAdded(true);
      setAnnouncement(t('addedAnnouncement', { name: product.name, count: added }));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setJustAdded(false);
        setAnnouncement('');
      }, ADDED_FEEDBACK_MS);
      return 'added';
    },
    [mutation, queryClient, t],
  );

  return { add, isPending: mutation.isPending, justAdded, announcement };
}
