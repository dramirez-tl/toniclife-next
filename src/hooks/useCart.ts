// useCart.ts - React Query hooks for e-commerce cart
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartService } from '@/services/cart.service';
import type {
  Cart,
  CartSummary,
  AddCartItemInput,
  UpdateCartItemInput,
  ApplyCouponInput,
  CouponValidationResult,
  GuestCheckoutInput,
  AuthenticatedCheckoutInput,
  CheckoutResponse,
  CheckoutSummary,
  SavedAddress,
  ShippingMethod,
} from '@/types/cart';

// ================================
// QUERY KEYS
// ================================

export const cartKeys = {
  all: ['cart'] as const,
  cart: () => [...cartKeys.all, 'detail'] as const,
  summary: () => [...cartKeys.all, 'summary'] as const,
  checkout: () => [...cartKeys.all, 'checkout'] as const,
  checkoutSummary: (shippingMethod?: ShippingMethod, postalCode?: string) =>
    [...cartKeys.checkout(), 'summary', { shippingMethod, postalCode }] as const,
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

  return useMutation({
    mutationFn: (data: AddCartItemInput) => cartService.addItem(data),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
  });
};

export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateCartItemInput }) =>
      cartService.updateItem(itemId, data),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
  });
};

export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => cartService.removeItem(itemId),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
  });
};

export const useClearCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.cart(), data);
      queryClient.invalidateQueries({ queryKey: cartKeys.summary() });
    },
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

export const useCheckoutSummary = (shippingMethod?: ShippingMethod, postalCode?: string) => {
  return useQuery({
    queryKey: cartKeys.checkoutSummary(shippingMethod, postalCode),
    queryFn: () => cartService.getCheckoutSummary(shippingMethod, postalCode),
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
