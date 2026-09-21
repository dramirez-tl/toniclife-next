// useCart.ts - React Query hooks for e-commerce cart
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cartService } from '@/services/cart.service';
import { localeLanguage } from '@/i18n/config';
import { catalogErrorMessage } from '@/lib/storefront/errors';
import { mapCartError, planStockAdjust } from '@/lib/storefront/cart-logic';
import type {
  Cart,
  AddCartItemInput,
  UpdateCartItemInput,
  ApplyCouponInput,
  GuestCheckoutInput,
  AuthenticatedCheckoutInput,
  ShippingMethod,
} from '@/types/cart';

type CartErrorFallback = 'add' | 'update' | 'remove' | 'clear';

/**
 * Aviso de error de las mutaciones del carrito, por i18n (ES/EN) y por CÓDIGO del
 * API (`CART_NOT_SELLABLE`, `CART_ENROLLMENT_KIT`, `CART_QTY_EXCEEDS_STOCK`). Contra
 * un API sin códigos degrada al mensaje real del API (solo con la UI en español,
 * porque viene en español) y, si no, al texto traducido de la operación.
 * Antes fallaban en SILENCIO o con textos fijos en español.
 */
function useCartErrorToast(): (err: unknown, fallback: CartErrorFallback) => void {
  const t = useTranslations('storefront.cart.errors');
  const lang = localeLanguage(useLocale());
  const router = useRouter();

  return useCallback(
    (err, fallback) => {
      const info = mapCartError(err);
      switch (info.kind) {
        case 'session_expired':
          toast.error(t('sessionExpired'));
          return;
        case 'not_sellable':
          toast.error(t('notSellable'));
          return;
        case 'enrollment_kit': {
          // `/registro/distribuidor` vive fuera de `[locale]`: router de Next, no el de next-intl.
          const href = info.href;
          toast.error(t('enrollmentKit'), {
            duration: 10000,
            action: href ? { label: t('enrollmentKitAction'), onClick: () => router.push(href) } : undefined,
          });
          return;
        }
        case 'qty_exceeds_stock':
          if (info.maxQuantity === 0) toast.error(t('soldOut'));
          else if (info.maxQuantity) toast.error(t('qtyExceeds', { max: info.maxQuantity }));
          else toast.error(t('qtyExceedsUnknown'));
          return;
        default:
          toast.error(catalogErrorMessage(err, t(fallback), { useApiMessage: lang === 'es' }));
      }
    },
    [t, lang, router],
  );
}

/** Carrito en caché o, si aún no se pidió, del API (para conocer la línea que hay que ajustar). */
async function currentCart(queryClient: QueryClient): Promise<Cart> {
  return queryClient.getQueryData<Cart>(cartKeys.cart()) ?? (await cartService.getCart());
}

/**
 * `CART_QTY_EXCEEDS_STOCK` (API C1): deja la línea en el máximo que dijo el API y lo
 * avisa. UN solo reintento; si no hay `maxQuantity`, está agotado o el reintento
 * falla, el error sigue su camino normal (`onError`). Contra el API actual (sin
 * ese código) nunca entra aquí.
 */
function useStockAdjust() {
  const t = useTranslations('storefront.cart.errors');
  const queryClient = useQueryClient();

  return useCallback(
    async (err: unknown, locate: (cart: Cart) => Cart['items'][number] | undefined, addProductId?: string): Promise<Cart> => {
      const info = mapCartError(err);
      if (info.kind !== 'qty_exceeds_stock') throw err;
      const cart = await currentCart(queryClient);
      const line = locate(cart);
      const plan = planStockAdjust(info.maxQuantity, line?.quantity ?? 0);
      if (plan.action === 'already_max') {
        toast.info(t('alreadyMax', { max: plan.quantity }));
        return cart;
      }
      if (plan.action !== 'set') throw err;
      let adjusted: Cart;
      if (line) adjusted = await cartService.updateItem(line.id, { quantity: plan.quantity });
      else if (addProductId) adjusted = await cartService.addItem({ productId: addProductId, quantity: plan.quantity });
      else throw err;
      toast.info(t('adjusted', { max: plan.quantity }));
      return adjusted;
    },
    [t, queryClient],
  );
}

// ================================
// QUERY KEYS
// ================================

export const cartKeys = {
  all: ['cart'] as const,
  cart: () => [...cartKeys.all, 'detail'] as const,
  summary: () => [...cartKeys.all, 'summary'] as const,
  checkout: () => [...cartKeys.all, 'checkout'] as const,
  checkoutSummary: (
    shippingMethod?: ShippingMethod,
    postalCode?: string,
    countryId?: string,
    state?: string,
  ) =>
    [
      ...cartKeys.checkout(),
      'summary',
      { shippingMethod, postalCode, countryId, state },
    ] as const,
  addresses: () => [...cartKeys.checkout(), 'addresses'] as const,
};

// ================================
// CART QUERIES
// ================================

export const useCart = () => {
  return useQuery({
    queryKey: cartKeys.cart(),
    queryFn: () => cartService.getCart(),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });
};

export const useCartSummary = () => {
  return useQuery({
    queryKey: cartKeys.summary(),
    queryFn: () => cartService.getCartSummary(),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

// ================================
// CART ITEM MUTATIONS
// ================================

export const useAddCartItem = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();
  const adjustToStock = useStockAdjust();

  return useMutation({
    mutationFn: async (data: AddCartItemInput) => {
      try {
        return await cartService.addItem(data);
      } catch (err) {
        return adjustToStock(err, (cart) => cart.items.find((i) => i.productId === data.productId), data.productId);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: (err) => toastCartError(err, 'add'),
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();
  const adjustToStock = useStockAdjust();

  return useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateCartItemInput }) => {
      try {
        return await cartService.updateItem(itemId, data);
      } catch (err) {
        return adjustToStock(err, (cart) => cart.items.find((i) => i.id === itemId));
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: (err) => toastCartError(err, 'update'),
  });
};

export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();

  return useMutation({
    mutationFn: (itemId: string) => cartService.removeItem(itemId),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: (err) => toastCartError(err, 'remove'),
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();

  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
    onError: (err) => toastCartError(err, 'clear'),
  });
};

// ================================
// COUPON MUTATIONS
// ================================

export const useApplyCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApplyCouponInput) => cartService.applyCoupon(data),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
      queryClient.invalidateQueries({ queryKey: cartKeys.checkoutSummary() });
    },
  });
};

export const useRemoveCoupon = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.removeCoupon(),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
      queryClient.invalidateQueries({ queryKey: cartKeys.checkoutSummary() });
    },
  });
};

export const useValidateCoupon = () => {
  return useMutation({
    mutationFn: (data: ApplyCouponInput) => cartService.validateCoupon(data),
  });
};

// ================================
// CART MERGE
// ================================

export const useMergeCarts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.mergeCarts({ sessionId: cartService.getSessionIdForMerge() }),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
  });
};

// ================================
// CHECKOUT QUERIES
// ================================

export const useCheckoutSummary = (
  shippingMethod?: ShippingMethod,
  postalCode?: string,
  countryId?: string,
  state?: string,
) => {
  return useQuery({
    queryKey: cartKeys.checkoutSummary(shippingMethod, postalCode, countryId, state),
    queryFn: () =>
      cartService.getCheckoutSummary(shippingMethod, postalCode, countryId, state),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useCustomerAddresses = () => {
  // Only fetch addresses if user is authenticated
  const isAuthenticated = typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

  return useQuery({
    queryKey: cartKeys.addresses(),
    queryFn: () => cartService.getCustomerAddresses(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isAuthenticated, // Only run if authenticated
  });
};

// ================================
// CHECKOUT MUTATIONS
// ================================

export const useGuestCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GuestCheckoutInput) => cartService.guestCheckout(data),
    onSuccess: () => {
      // Clear cart cache after successful checkout
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
};

export const useAuthenticatedCheckout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AuthenticatedCheckoutInput) => cartService.authenticatedCheckout(data),
    onSuccess: () => {
      // Clear cart cache after successful checkout
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
};

/** Sucursales disponibles para recoger (todos los países). */
export const usePickupBranches = () => {
  return useQuery({
    queryKey: [...cartKeys.checkout(), 'pickup-branches'],
    queryFn: () => cartService.getPickupBranches(),
    staleTime: 10 * 60 * 1000, // 10 min — cambian poco
  });
};
