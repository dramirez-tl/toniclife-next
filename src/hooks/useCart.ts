// useCart.ts - React Query hooks for e-commerce cart
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cartService } from '@/services/cart.service';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { localeLanguage } from '@/i18n/config';
import { catalogErrorMessage, catalogErrorStatus } from '@/lib/storefront/errors';
import { conflictItemCount, countryConflictOf, countryDisplayName, normalizeCountryCode } from '@/lib/storefront/cart-country';
import { openCartCountryChange } from '@/lib/storefront/cart-country-dialog-store';
import { capReason, mapCartError, planStockAdjust, type CapReason } from '@/lib/storefront/cart-logic';
import { classifyMergeError, normalizeMergeResponse, type MergeResult } from '@/lib/storefront/cart-merge';
import { cartKeys, invalidateCartDerived } from '@/lib/storefront/cart-query-keys';
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
type LocateLine = (cart: Cart) => Cart['items'][number] | undefined;

/**
 * Motivo del tope de la línea según el carrito en caché: "Máximo N por pedido" cuando
 * el tope es el de la tienda y SÍ hay existencias; sin línea o sin dato, existencias.
 */
function cachedCapReason(queryClient: QueryClient, locate: LocateLine): CapReason {
  const cart = queryClient.getQueryData<Cart>(cartKeys.cart());
  const line = cart ? locate(cart) : undefined;
  return line ? capReason(line) : 'stock';
}

/**
 * Aviso de error de las mutaciones del carrito, por i18n (ES/EN) y por CÓDIGO del
 * API (`CART_NOT_SELLABLE`, `CART_ENROLLMENT_KIT`, `CART_QTY_EXCEEDS_STOCK` y, con C2,
 * `CART_NO_PRICE_IN_COUNTRY` y `CART_COUNTRY_CHANGE`). Contra
 * un API sin códigos degrada al mensaje real del API (solo con la UI en español,
 * porque viene en español) y, si no, al texto traducido de la operación.
 * Antes fallaban en SILENCIO o con textos fijos en español.
 */
function useCartErrorToast(): (err: unknown, fallback: CartErrorFallback, reason?: CapReason) => void {
  const t = useTranslations('storefront.cart.errors');
  const lang = localeLanguage(useLocale());
  const router = useRouter();
  const queryClient = useQueryClient();
  const { countryCode: storeCountry } = useStoreCountry();

  return useCallback(
    (err, fallback, reason = 'stock') => {
      const info = mapCartError(err);
      // País del carrito: el que dijo el API, el del carrito en caché o el de la tienda.
      const cartCountry = () =>
        normalizeCountryCode(queryClient.getQueryData<Cart>(cartKeys.cart())?.countryCode) ?? storeCountry;
      switch (info.kind) {
        case 'no_price_in_country':
          toast.error(t('noPriceInCountry', { country: countryDisplayName(info.requestedCountry ?? cartCountry(), lang) }));
          return;
        case 'country_invalid':
          toast.error(t('countryInvalid'));
          return;
        case 'country_change':
          // Al AGREGAR lo atiende el diálogo "Vaciar y cambiar" (`useAddCartItem`); aquí solo el aviso.
          toast.error(t('countryChange', { country: countryDisplayName(info.cartCountry ?? cartCountry(), lang) }));
          return;
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
          else if (info.maxQuantity) {
            toast.error(t(reason === 'order_max' ? 'qtyExceedsOrderMax' : 'qtyExceeds', { max: info.maxQuantity }));
          }
          else toast.error(t('qtyExceedsUnknown'));
          return;
        default:
          toast.error(catalogErrorMessage(err, t(fallback), { useApiMessage: lang === 'es' }));
      }
    },
    [t, lang, router, queryClient, storeCountry],
  );
}

/** Carrito en caché o, si aún no se pidió, del API (para conocer la línea que hay que ajustar). */
async function currentCart(queryClient: QueryClient): Promise<Cart> {
  return queryClient.getQueryData<Cart>(cartKeys.cart()) ?? (await cartService.getCart());
}

/**
 * `CART_QTY_EXCEEDS_STOCK` (API C1): deja la línea en el máximo que dijo el API y lo
 * avisa. UN solo reintento; si no hay `maxQuantity`, está agotado o el reintento
 * falla, el error sigue su camino normal (`onError`). Una línea que YA estaba por
 * encima del tope NO se baja en silencio: sale el error de cantidad excedida y el
 * usuario decide (la línea ofrece "Ajustar a N"). Contra el API actual (sin ese
 * código) nunca entra aquí.
 */
function useStockAdjust() {
  const t = useTranslations('storefront.cart.errors');
  const queryClient = useQueryClient();

  return useCallback(
    async (err: unknown, locate: LocateLine, addData?: AddCartItemInput): Promise<Cart> => {
      const info = mapCartError(err);
      if (info.kind !== 'qty_exceeds_stock') throw err;
      const cart = await currentCart(queryClient);
      const line = locate(cart);
      const plan = planStockAdjust(info.maxQuantity, line?.quantity ?? 0);
      const orderMax = line ? capReason(line) === 'order_max' : false;
      if (plan.action === 'already_max') {
        toast.info(t(orderMax ? 'alreadyMaxOrderMax' : 'alreadyMax', { max: plan.quantity }));
        return cart;
      }
      if (plan.action !== 'set') throw err;
      let adjusted: Cart;
      if (line) adjusted = await cartService.updateItem(line.id, { quantity: plan.quantity });
      else if (addData) adjusted = await cartService.addItem({ ...addData, quantity: plan.quantity });
      else throw err;
      toast.info(t(orderMax ? 'adjustedOrderMax' : 'adjusted', { max: plan.quantity }));
      return adjusted;
    },
    [t, queryClient],
  );
}

// ================================
// QUERY KEYS
// ================================

// Mismas keys de siempre; viven en `cart-query-keys` (probadas sin React) y se re-exportan.
export { cartKeys };

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

/**
 * C2: TODA alta al carrito lleva `country` = país de la TIENDA elegida (`useStoreCountry`:
 * el del locale de la URL o, con sesión, el de la cuenta; es el MISMO país que el checkout
 * manda como `countryId`). Vive en el hook para que ningún consumidor lo olvide (catálogo,
 * detalle, "Comprar ahora", quiz y el reintento por existencias). Un 409
 * `CART_COUNTRY_CHANGE` no es un toast: abre el diálogo "Vaciar y cambiar".
 */
export const useAddCartItem = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();
  const adjustToStock = useStockAdjust();
  const { countryCode } = useStoreCountry();

  return useMutation({
    mutationFn: async (input: AddCartItemInput) => {
      const data: AddCartItemInput = { ...input, country: input.country ?? countryCode };
      try {
        return await cartService.addItem(data);
      } catch (err) {
        return adjustToStock(err, (cart) => cart.items.find((i) => i.productId === data.productId), data);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      invalidateCartDerived(queryClient);
    },
    onError: (err, data) => {
      if (mapCartError(err).kind === 'country_change') {
        const cached = queryClient.getQueryData<Cart>(cartKeys.cart());
        openCartCountryChange(
          {
            ...countryConflictOf(err, { cartCountry: cached?.countryCode, requestedCountry: data.country ?? countryCode }),
            itemCount: conflictItemCount(err),
          },
          { productId: data.productId, quantity: data.quantity },
        );
        // El carrito en caché puede ser viejo (otra pestaña o dispositivo): que el aviso de país lo vea.
        void queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
        return;
      }
      toastCartError(err, 'add', cachedCapReason(queryClient, (cart) => cart.items.find((i) => i.productId === data.productId)));
    },
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
      invalidateCartDerived(queryClient);
    },
    onError: (err, { itemId }) =>
      toastCartError(err, 'update', cachedCapReason(queryClient, (cart) => cart.items.find((i) => i.id === itemId))),
  });
};

export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();

  return useMutation({
    mutationFn: (itemId: string) => cartService.removeItem(itemId),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      invalidateCartDerived(queryClient);
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
      invalidateCartDerived(queryClient);
    },
    onError: (err) => toastCartError(err, 'clear'),
  });
};

/**
 * C2, "Vaciar y cambiar": vacía el carrito y le fija el país de la tienda en una sola
 * transacción del API (`PUT /cart/country`). Si esa ruta no existiera (404/405) degrada a
 * vaciar el carrito: el alta que sigue, con `country`, fija el país en el carrito ya vacío.
 */
export const useSwitchCartCountry = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();

  return useMutation({
    mutationFn: async (country: string) => {
      try {
        return await cartService.switchCountry(country);
      } catch (err) {
        const status = catalogErrorStatus(err);
        if (status !== 404 && status !== 405) throw err;
        return cartService.clearCart();
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      invalidateCartDerived(queryClient);
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

export type MergeCartsOutcome =
  | ({ status: 'merged' } & MergeResult<Cart>)
  /** El API respondió con ERROR que el carrito de invitado es de otro país: no se mezcló. */
  | { status: 'country_mismatch' }
  /** API sin `POST /cart/merge` (404/405): silencio, y no se marca como hecho. */
  | { status: 'unsupported' }
  /** 403 `CART_MERGE_CUSTOMER_REQUIRED`: la sesión no es de cliente; silencio y se marca como hecho. */
  | { status: 'not_applicable' };

/**
 * C3: `POST /cart/merge` con el `x-session-id` de INVITADO que se le pasa (nunca crea uno).
 * Antes mandaba `{ sessionId }` en el cuerpo y sin cabecera, contra un endpoint que no
 * existía, y nadie lo consumía. Su único consumidor es `CartMergeOnLogin` (layout raíz).
 * Resuelve con un resultado también para 404/405 y para "es de otro país"; cualquier otro
 * fallo (red, 401, 5xx) rechaza y quien lo llama reintenta en la siguiente carga de página.
 * Invalida TODO lo del carrito: el de la sesión pudo cambiar aunque la respuesta no lo traiga.
 */
export const useMergeCarts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (guestSessionId: string): Promise<MergeCartsOutcome> => {
      try {
        const data = await cartService.mergeGuestCart(guestSessionId);
        return { status: 'merged', ...normalizeMergeResponse<Cart>(data) };
      } catch (err) {
        const failure = classifyMergeError(err);
        if (failure === 'retry_later') throw err;
        return { status: failure };
      }
    },
    onSuccess: (outcome) => {
      if (outcome.status === 'unsupported') return;
      if (outcome.status === 'merged' && outcome.cart) queryClient.setQueryData(cartKeys.cart(), outcome.cart);
      // También con el carrito en mano: un `GET /cart` que iba en vuelo ANTES del merge lo pisaría
      // con el estado viejo; invalidar lo cancela y vuelve a pedir (detalle, resumen y checkout).
      void queryClient.invalidateQueries({ queryKey: cartKeys.all });
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
