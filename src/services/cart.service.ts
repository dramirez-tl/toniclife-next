// cart.service.ts - Service for e-commerce cart and checkout API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

import api from '@/lib/api';
import type {
  Cart,
  CartSummary,
  AddCartItemInput,
  UpdateCartItemInput,
  ApplyCouponInput,
  MergeCartsInput,
  CouponValidationResult,
  GuestCheckoutInput,
  AuthenticatedCheckoutInput,
  CheckoutResponse,
  CheckoutSummary,
  SavedAddress,
  ShippingMethod,
} from '@/types/cart';

// Helper to get/create session ID for guest carts
const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';

  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

class CartService {
  // ================================
  // CART ENDPOINTS
  // ================================

  async getCart(): Promise<Cart> {
    const sessionId = getSessionId();
    const response = await api.get<Cart>('/cart', {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  async getCartSummary(): Promise<CartSummary> {
    const sessionId = getSessionId();
    const response = await api.get<CartSummary>('/cart/summary', {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  // ================================
  // CART ITEMS
  // ================================

  async addItem(data: AddCartItemInput): Promise<Cart> {
    const sessionId = getSessionId();
    const response = await api.post<Cart>('/cart/items', data, {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  async updateItem(itemId: string, data: UpdateCartItemInput): Promise<Cart> {
    const sessionId = getSessionId();
    const response = await api.patch<Cart>(`/cart/items/${itemId}`, data, {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  async removeItem(itemId: string): Promise<Cart> {
    const sessionId = getSessionId();
    const response = await api.delete<Cart>(`/cart/items/${itemId}`, {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  async clearCart(): Promise<Cart> {
    const sessionId = getSessionId();
    const response = await api.delete<Cart>('/cart/items', {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  // ================================
  // COUPONS
  // ================================

  // TODO: Endpoint no implementado en backend
  async applyCoupon(data: ApplyCouponInput): Promise<Cart> {
    const sessionId = getSessionId();
    const response = await api.post<Cart>('/cart/coupon', data, {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  // TODO: Endpoint no implementado en backend
  async removeCoupon(): Promise<Cart> {
    const sessionId = getSessionId();
    const response = await api.delete<Cart>('/cart/coupon', {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  // TODO: Endpoint no implementado en backend
  async validateCoupon(data: ApplyCouponInput): Promise<CouponValidationResult> {
    const sessionId = getSessionId();
    const response = await api.post<CouponValidationResult>('/cart/coupon/validate', data, {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  // ================================
  // CART MERGE
  // ================================

  // TODO: Endpoint no implementado en backend
  async mergeCarts(data: MergeCartsInput): Promise<Cart> {
    const response = await api.post<Cart>('/cart/merge', data);
    return response.data;
  }

  // ================================
  // CHECKOUT
  // ================================

  async getCheckoutSummary(
    shippingMethod?: ShippingMethod,
    postalCode?: string,
  ): Promise<CheckoutSummary> {
    const sessionId = getSessionId();
    const params = new URLSearchParams();
    if (shippingMethod) params.append('shippingMethod', shippingMethod);
    if (postalCode) params.append('postalCode', postalCode);

    const response = await api.get<CheckoutSummary>(`/checkout/summary?${params.toString()}`, {
      headers: { 'x-session-id': sessionId },
    });
    return response.data;
  }

  async guestCheckout(data: GuestCheckoutInput): Promise<CheckoutResponse> {
    const sessionId = getSessionId();
    const response = await api.post<CheckoutResponse>('/checkout/guest', {
      ...data,
      sessionId: sessionId,
    });

    // Clear session ID after successful checkout
    if (response.data.success) {
      localStorage.removeItem('cart_session_id');
    }

    return response.data;
  }

  async authenticatedCheckout(data: AuthenticatedCheckoutInput): Promise<CheckoutResponse> {
    const response = await api.post<CheckoutResponse>('/checkout/authenticated', data);
    return response.data;
  }

  async getCustomerAddresses(): Promise<SavedAddress[]> {
    const response = await api.get<SavedAddress[]>('/checkout/addresses');
    return response.data;
  }

  // ================================
  // UTILITIES
  // ================================

  formatCurrency(amount: string | number): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(num);
  }

  getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      stripe: 'Tarjeta de Crédito/Débito',
      paypal: 'PayPal',
      mercadopago: 'Mercado Pago',
      cash: 'Efectivo',
      transfer: 'Transferencia',
    };
    return labels[method] || method;
  }

  getShippingMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      standard: 'Envío Estándar',
      express: 'Envío Express',
      pickup: 'Recoger en Tienda',
      free: 'Envío Gratis',
    };
    return labels[method] || method;
  }

  getSessionIdForMerge(): string {
    return getSessionId();
  }
}

export const cartService = new CartService();
export default cartService;
