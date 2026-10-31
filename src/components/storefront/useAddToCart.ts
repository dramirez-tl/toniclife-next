'use client';

// "Agregar al carrito" de la tienda: CONSUME el hook existente `useAddCartItem` y le
// suma el feedback: estado "Agregado", anuncio para lector de pantalla, apertura del
// `CartDrawer` (sustituye al toast "Ver carrito") y analítica.
// El error lo avisa el propio `useAddCartItem` (un solo manejador, sin duplicar toasts).
//
// Con el API C1 un `CART_QTY_EXCEEDS_STOCK` hace que el hook AJUSTE la línea al máximo:
// por eso lo "agregado" se mide contra el carrito (antes → después), no contra lo pedido.
// Con personalización (mig 179) un producto puede ocupar varias líneas (otro texto =
// otra línea), así que se cuentan las piezas del PRODUCTO, no las de una línea.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { track } from '@vercel/analytics';
import { useQueryClient } from '@tanstack/react-query';
import { cartKeys, useAddCartItem } from '@/hooks/useCart';
import { openCartDrawer } from '@/lib/storefront/cart-drawer-store';
import { addedQuantity, productQuantity } from '@/lib/storefront/cart-logic';
import { normalizePersonalization } from '@/lib/storefront/personalization';
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

export interface AddToCartOptions {
  /** No abre el drawer (p. ej. "Comprar ahora", que navega al checkout). */
  silent?: boolean;
  /** Texto de personalización (playeras, mig 179); vacío o null = sin texto. */
  personalization?: string | null;
}

/** Piezas del producto en el carrito (todas sus líneas); `null` = carrito desconocido. */
function productPieces(cart: Cart | undefined, productId: string): number | null {
  return cart ? productQuantity(cart.items, productId) : null;
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

  const add = useCallback(
    async (product: AddableProduct, quantity: number, options: AddToCartOptions = {}): Promise<AddToCartOutcome> => {
      if (product.price === null || quantity < 1) return 'failed';
      const trigger = typeof document === 'undefined' ? null : document.activeElement;
      const personalization = normalizePersonalization(options.personalization);
      const before = productPieces(queryClient.getQueryData<Cart>(cartKeys.cart()), product.id);
      let cart: Cart;
      try {
        cart = await mutation.mutateAsync({ productId: product.id, quantity, ...(personalization ? { personalization } : {}) });
      } catch {
        return 'failed'; // `useAddCartItem` ya mostró el motivo real.
      }
      // Sin carrito en caché no se conoce el "antes": lo agregado es lo pedido, acotado a lo que quedó.
      const added = addedQuantity(before, productPieces(cart, product.id), quantity);
      if (!options.silent) openCartDrawer(trigger);
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
