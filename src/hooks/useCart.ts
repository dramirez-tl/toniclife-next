// useCart.ts - React Query hooks for e-commerce cart
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

import { useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { keepPreviousData, useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cartService } from '@/services/cart.service';
import { seasonalPromotionsService } from '@/services/seasonal-promotions.service';
import { seasonalPromotionKeys } from '@/hooks/useSeasonalPromotions';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { localeLanguage } from '@/i18n/config';
import { seasonalProductBadges, type SeasonalProductBadge } from '@/lib/seasonal-promotions';
import { autoGiftAfterAdd, autoGiftOnUpdate, type AutoGiftNotice } from '@/lib/storefront/cart-auto-gift';
import { formatProductName } from '@/lib/storefront/content-format';
import { catalogErrorMessage, catalogErrorStatus } from '@/lib/storefront/errors';
import { conflictItemCount, countryConflictOf, countryDisplayName, normalizeCountryCode } from '@/lib/storefront/cart-country';
import { openCartCountryChange } from '@/lib/storefront/cart-country-dialog-store';
import { capReason, mapCartError, planStockAdjust, type CapReason } from '@/lib/storefront/cart-logic';
import { normalizePersonalization, samePersonalization } from '@/lib/storefront/personalization';
import { classifyMergeError, normalizeMergeResponse, type MergeResult } from '@/lib/storefront/cart-merge';
import {
  getCartMergeStatus,
  getServerCartMergeStatus,
  subscribeCartMergeStatus,
  type CartMergeStatus,
} from '@/lib/storefront/cart-merge-status';
import { cartKeys } from '@/lib/storefront/cart-query-keys';
import { pickupBranchesRefreshPolicy } from '@/lib/checkout/pickup-branches';
import {
  applyCartMutation,
  cartActivity,
  readCartInSync,
  settleCartMutation,
  type CartElsewhereNotifier,
} from '@/lib/storefront/cart-sync';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import type {
  Cart,
  AddCartItemInput,
  UpdateCartItemInput,
  ApplyCouponInput,
  GuestCheckoutInput,
  AuthenticatedCheckoutInput,
  SavedAddress,
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
 * Línea que corresponde a un alta: mismo producto Y misma personalización (mig 179:
 * otro texto es OTRA línea del mismo producto; sin texto, la línea sin personalizar).
 */
function locateAddedLine(data: AddCartItemInput): LocateLine {
  return (cart) =>
    cart.items.find((i) => i.productId === data.productId && samePersonalization(i.personalization, data.personalization));
}

/**
 * Aviso de error de las mutaciones del carrito, por i18n (ES/EN) y por CÓDIGO del
 * API (`CART_NOT_SELLABLE`, `CART_ENROLLMENT_KIT`, `CART_QTY_EXCEEDS_STOCK` y, con C2,
 * `CART_NO_PRICE_IN_COUNTRY` y `CART_COUNTRY_CHANGE`; con la mig 179, `CART_PERSONALIZATION_*`). Contra
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
        case 'personalization_not_allowed':
          toast.error(t('personalizationNotAllowed'));
          return;
        case 'personalization_too_long':
          toast.error(info.maxLength ? t('personalizationTooLong', { max: info.maxLength }) : t('personalizationTooLongUnknown'));
          return;
        default:
          toast.error(catalogErrorMessage(err, t(fallback), { useApiMessage: lang === 'es' }));
      }
    },
    [t, lang, router, queryClient, storeCountry],
  );
}

/**
 * Aviso de que el carrito cambió en OTRA sesión (otra pestaña u otro dispositivo con la
 * misma cuenta): el carrito es uno por cuenta, así que lo que se quita allá desaparece
 * aquí. Un solo toast con id fijo: los avisos no se apilan. Qué cuenta como "otra
 * sesión" lo decide `lib/storefront/cart-sync`.
 */
function useCartElsewhereNotice(): CartElsewhereNotifier {
  const t = useTranslations('storefront.cart.sync');
  return useCallback(
    (change, cart) => {
      // Un carrito de invitado vive en este navegador: solo otra pestaña pudo cambiarlo.
      const scope = cart.customerId ? 'account' : 'guest';
      toast.info(t(`${change}.${scope}`), { id: 'cart-changed-elsewhere', duration: 9000 });
    },
    [t],
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

/**
 * La pieza GRATIS de un "lleva N, paga M" entra sola al carrito, igual que en la caja
 * (`lib/storefront/cart-auto-gift`). Aquí solo van las dos cosas que necesitan React:
 *  - `badgesFor`: qué productos están HOY en promoción en el país del carrito. Usa el mismo
 *    paquete (y la misma caché) que las insignias del catálogo; si no se puede leer, nadie
 *    recibe nada automático y el carrito se comporta como siempre.
 *  - `announce`: el aviso al comprador ("3x2: agregamos 1 pieza gratis de…").
 */
function useAutoGift() {
  const t = useTranslations('storefront.cart.autoGift');
  const queryClient = useQueryClient();
  const { countryCode: storeCountry } = useStoreCountry();

  const badgesFor = useCallback(
    async (cart: Cart | undefined): Promise<ReadonlyMap<string, SeasonalProductBadge>> => {
      // País DEL CARRITO: es con el que el servidor aplica las promociones.
      const country = (normalizeCountryCode(cart?.countryCode) ?? storeCountry).toUpperCase();
      try {
        const bundle = await queryClient.ensureQueryData({
          queryKey: seasonalPromotionKeys.storefront(country),
          queryFn: () => seasonalPromotionsService.storefrontBundle(country),
          staleTime: 60 * 1000,
        });
        return seasonalProductBadges(bundle?.seasons);
      } catch {
        return new Map();
      }
    },
    [queryClient, storeCountry],
  );

  const announce = useCallback(
    (notice: AutoGiftNotice | null) => {
      if (!notice) return;
      const text = t(notice.kind, {
        label: notice.label,
        name: formatProductName(notice.productName),
        count: notice.count,
      });
      // Un solo aviso a la vez: el siguiente cambio sustituye al anterior.
      if (notice.kind === 'added') toast.success(text, { id: 'cart-auto-gift', duration: 7000 });
      else toast.info(text, { id: 'cart-auto-gift', duration: 7000 });
    },
    [t],
  );

  return { badgesFor, announce };
}

// ================================
// QUERY KEYS
// ================================

// Mismas keys de siempre; viven en `cart-query-keys` (probadas sin React) y se re-exportan.
export { cartKeys };

// ================================
// CART QUERIES
// ================================

/**
 * El carrito es UNO por cuenta: otra pestaña u otro dispositivo pudo cambiarlo. Por eso
 * se relee al volver a la ventana (si la copia ya tiene más de un minuto) y, con
 * `fresh` (la página del carrito y el checkout, donde se decide y se paga), SIEMPRE al
 * entrar y al volver a la ventana. Si la última lectura falló no se insiste al enfocar.
 */
export const useCart = (options: { fresh?: boolean } = {}) => {
  const queryClient = useQueryClient();
  const notifyElsewhere = useCartElsewhereNotice();
  const refetch = options.fresh ? ('always' as const) : true;

  return useQuery({
    queryKey: cartKeys.cart(),
    queryFn: () => readCartInSync(queryClient, () => cartService.getCart(), notifyElsewhere),
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: refetch,
    refetchOnWindowFocus: (query) => (query.state.status === 'success' ? refetch : false),
  });
};

export const useCartSummary = (enabled = true) => {
  return useQuery({
    queryKey: cartKeys.summary(),
    queryFn: () => cartService.getCartSummary(),
    staleTime: 60 * 1000,
    // El contador del encabezado también se pone al día al volver a la ventana.
    refetchOnWindowFocus: (query) => query.state.status === 'success',
    // Tienda solo para distribuidores + visitante sin sesión: no hay carrito
    // que consultar (el API respondería 401 STF_MEMBERS_ONLY).
    enabled,
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
  const notifyElsewhere = useCartElsewhereNotice();
  const adjustToStock = useStockAdjust();
  const autoGift = useAutoGift();
  const { countryCode } = useStoreCountry();

  return useMutation({
    onMutate: () => cartActivity.mutationStarted(),
    mutationFn: async (input: AddCartItemInput) => {
      // Mig 179: el texto viaja limpio y SOLO si hay texto (un producto que no se personaliza
      // o un API sin la migración no deben recibir el campo vacío).
      const { personalization: rawPersonalization, ...rest } = input;
      const personalization = normalizePersonalization(rawPersonalization);
      const data: AddCartItemInput = {
        ...rest,
        country: input.country ?? countryCode,
        ...(personalization ? { personalization } : {}),
      };
      let cart: Cart;
      try {
        cart = await cartService.addItem(data);
      } catch (err) {
        cart = await adjustToStock(err, locateAddedLine(data), data);
      }
      // "Lleva N, paga M": si la línea llegó a las piezas que se pagan, la gratis entra sola
      // (y solo se queda si el servidor confirma que no cuesta más). El alta ya quedó hecha:
      // pase lo que pase con lo automático, nunca la tumba.
      try {
        const gift = await autoGiftAfterAdd({
          cart,
          lineId: locateAddedLine(data)(cart)?.id,
          addedQuantity: data.quantity,
          badges: await autoGift.badgesFor(cart),
          updateItem: (itemId, quantity) => cartService.updateItem(itemId, { quantity }),
        });
        autoGift.announce(gift.notice);
        return gift.cart;
      } catch {
        return cart;
      }
    },
    onSuccess: (data, input) => {
      // La línea de esta alta es propia; cualquier otra diferencia la hizo otra sesión.
      applyCartMutation(queryClient, data, [locateAddedLine(input)(data)?.id], notifyElsewhere);
    },
    onSettled: (_data, error) => settleCartMutation(queryClient, !error),
    onError: (err, data) => {
      if (mapCartError(err).kind === 'country_change') {
        const cached = queryClient.getQueryData<Cart>(cartKeys.cart());
        const personalization = normalizePersonalization(data.personalization);
        openCartCountryChange(
          {
            ...countryConflictOf(err, { cartCountry: cached?.countryCode, requestedCountry: data.country ?? countryCode }),
            itemCount: conflictItemCount(err),
          },
          { productId: data.productId, quantity: data.quantity, ...(personalization ? { personalization } : {}) },
        );
        // El carrito en caché puede ser viejo (otra pestaña o dispositivo): que el aviso de país lo vea.
        void queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
        return;
      }
      toastCartError(err, 'add', cachedCapReason(queryClient, locateAddedLine(data)));
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();
  const notifyElsewhere = useCartElsewhereNotice();
  const adjustToStock = useStockAdjust();
  const autoGift = useAutoGift();

  return useMutation({
    onMutate: () => cartActivity.mutationStarted(),
    mutationFn: async ({ itemId, data }: { itemId: string; data: UpdateCartItemInput }) => {
      try {
        // "Lleva N, paga M": al llegar a las piezas que se pagan entra la gratis; al bajar, se
        // va con la pieza que la ganaba (misma regla que la caja).
        const cached = queryClient.getQueryData<Cart>(cartKeys.cart());
        const gift = await autoGiftOnUpdate({
          cached,
          itemId,
          wanted: data.quantity,
          badges: await autoGift.badgesFor(cached),
          updateItem: (id, quantity) => cartService.updateItem(id, { quantity }),
        });
        autoGift.announce(gift.notice);
        return gift.cart;
      } catch (err) {
        return adjustToStock(err, (cart) => cart.items.find((i) => i.id === itemId));
      }
    },
    onSuccess: (data, { itemId }) => applyCartMutation(queryClient, data, [itemId], notifyElsewhere),
    onSettled: (_data, error) => settleCartMutation(queryClient, !error),
    onError: (err, { itemId }) =>
      toastCartError(err, 'update', cachedCapReason(queryClient, (cart) => cart.items.find((i) => i.id === itemId))),
  });
};

export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();
  const notifyElsewhere = useCartElsewhereNotice();

  return useMutation({
    onMutate: () => cartActivity.mutationStarted(),
    mutationFn: (itemId: string) => cartService.removeItem(itemId),
    onSuccess: (data, itemId) => applyCartMutation(queryClient, data, [itemId], notifyElsewhere),
    onSettled: (_data, error) => settleCartMutation(queryClient, !error),
    onError: (err) => toastCartError(err, 'remove'),
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();
  const toastCartError = useCartErrorToast();
  const notifyElsewhere = useCartElsewhereNotice();

  return useMutation({
    onMutate: () => cartActivity.mutationStarted(),
    mutationFn: () => cartService.clearCart(),
    onSuccess: (data) => applyCartMutation(queryClient, data, 'all', notifyElsewhere),
    onSettled: (_data, error) => settleCartMutation(queryClient, !error),
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
  const notifyElsewhere = useCartElsewhereNotice();

  return useMutation({
    onMutate: () => cartActivity.mutationStarted(),
    mutationFn: async (country: string) => {
      try {
        return await cartService.switchCountry(country);
      } catch (err) {
        const status = catalogErrorStatus(err);
        if (status !== 404 && status !== 405) throw err;
        return cartService.clearCart();
      }
    },
    onSuccess: (data) => applyCartMutation(queryClient, data, 'all', notifyElsewhere),
    onSettled: (_data, error) => settleCartMutation(queryClient, !error),
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
    // Mezclar el carrito de invitado es un cambio de ESTA pestaña: nunca se avisa como ajeno.
    onMutate: () => cartActivity.mutationStarted(),
    onSettled: (_outcome, error) => settleCartMutation(queryClient, !error),
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

/**
 * `merging` mientras `CartMergeOnLogin` pasa el carrito de invitado a la cuenta recién
 * iniciada. El checkout lo usa para no dar por vacío un carrito que está por llenarse.
 */
export const useCartMergeStatus = (): CartMergeStatus =>
  useSyncExternalStore(subscribeCartMergeStatus, getCartMergeStatus, getServerCartMergeStatus);

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

/**
 * Direcciones de envío guardadas del comprador. Corre con SESIÓN (el usuario del store),
 * no con `localStorage.accessToken`: con "Recordarme" apagado el token vive en
 * sessionStorage y la consulta nunca salía. La key lleva la cuenta para que las
 * direcciones de una sesión jamás se muestren en otra.
 */
export const useCustomerAddresses = () => {
  const user = useAppSelector(selectUser);

  return useQuery({
    queryKey: cartKeys.addresses(user?.id),
    queryFn: () => cartService.getCustomerAddresses(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user,
  });
};

/** Quita una dirección guardada: sale de la lista de inmediato y se vuelve a pedir. */
export const useDeleteCustomerAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (addressId: string) => cartService.deleteCustomerAddress(addressId),
    onSuccess: (_data, addressId) => {
      queryClient.setQueriesData<SavedAddress[]>({ queryKey: cartKeys.addresses() }, (list) =>
        list?.filter((address) => address.id !== addressId),
      );
      void queryClient.invalidateQueries({ queryKey: cartKeys.addresses() });
    },
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

export interface PickupBranchesOptions {
  /**
   * País de la tienda (checkout). Con él el API ofrece solo las sucursales de la zona de
   * precios del comprador y dice en cuáles hay existencias para su carrito.
   */
  countryId?: string;
  /** Firma del carrito (`pickupCartSignature`): al cambiar, la disponibilidad se vuelve a pedir. */
  cartSignature?: string;
  /** `false` evita la consulta (p. ej. sin sesión o mientras no se elige "recoger"). */
  enabled?: boolean;
}

/**
 * Sucursales disponibles para recoger.
 *  - Sin país (`usePickupBranches()` o `usePickupBranches(enabled)`): todas, de cualquier
 *    país, como siempre. Así lo usan el carrito compartido y la confirmación del pedido.
 *  - Con el país de la tienda (checkout): las de la zona del comprador con la
 *    disponibilidad de SU carrito. Esa respuesta envejece rápido (se vende en caja): se
 *    da por buena solo 30 s y se vuelve a pedir cuando cambia el carrito (su firma va en
 *    la clave) y al volver a la ventana. Mientras llega la nueva se conserva la lista
 *    anterior en pantalla.
 * Cuánto vale la lista y si se vuelve a pedir al regresar a la ventana lo decide
 * `pickupBranchesRefreshPolicy` (lib/checkout/pickup-branches).
 */
export const usePickupBranches = (options: boolean | PickupBranchesOptions = true) => {
  const { countryId, cartSignature, enabled = true }: PickupBranchesOptions =
    typeof options === 'boolean' ? { enabled: options } : options;

  return useQuery({
    queryKey: cartKeys.pickupBranches(countryId, cartSignature),
    queryFn: () => cartService.getPickupBranches(countryId),
    enabled,
    ...pickupBranchesRefreshPolicy(countryId),
    placeholderData: countryId ? keepPreviousData : undefined,
  });
};
