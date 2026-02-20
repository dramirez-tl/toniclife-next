// cart.ts - TypeScript types for e-commerce cart module
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

// ================================
// ENUMS
// ================================

export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  MERCADOPAGO = 'mercadopago',
  CASH = 'cash',
  TRANSFER = 'transfer',
}

export enum ShippingMethod {
  STANDARD = 'standard',
  EXPRESS = 'express',
  PICKUP = 'pickup',
  FREE = 'free',
}

export enum CartStatus {
  ACTIVE = 'active',
  MERGED = 'merged',
  CONVERTED = 'converted',
  ABANDONED = 'abandoned',
  EXPIRED = 'expired',
}

// ================================
// CART ITEM TYPES
// ================================

export interface CartItemProductSnapshot {
  name: string;
  sku: string;
  imageUrl?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  originalPrice?: string;
  lineTotal: string;
  discountAmount?: string;
  discountType?: string;
  taxRate: string;
  taxAmount: string;
  points: number;
  businessValue: string;
  productSnapshot?: CartItemProductSnapshot;
  createdAt: string;
  updatedAt: string;
}

// ================================
// CART TYPES
// ================================

export interface CartCoupon {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: string;
}

export interface Cart {
  id: string;
  customerId?: string;
  sessionId?: string;
  branchId?: string;
  currencyId?: string;
  priceTypeId?: string;
  couponId?: string;
  couponDiscountAmount?: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  shippingAmount: string;
  total: string;
  totalPoints: number;
  totalBusinessValue: string;
  itemCount: number;
  notes?: string;
  status: string;
  expiresAt?: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
  coupon?: CartCoupon;
}

export interface CartSummary {
  itemCount: number;
  subtotal: string;
  total: string;
  totalPoints: number;
}

// ================================
// CART OPERATION TYPES
// ================================

export interface AddCartItemInput {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export interface ApplyCouponInput {
  code: string;
}

export interface MergeCartsInput {
  sessionId: string;
}

export interface CouponValidationResult {
  valid: boolean;
  errorMessage?: string;
  couponId?: string;
  code?: string;
  name?: string;
  discountType?: string;
  discountValue?: string;
  calculatedDiscount?: string;
}

// ================================
// CHECKOUT ADDRESS TYPES
// ================================

export interface CheckoutAddress {
  fullName: string;
  phone: string;
  street: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  references?: string;
}

export interface SavedAddress extends CheckoutAddress {
  id: string;
  alias?: string;
  isDefault?: boolean;
}

// ================================
// INVOICE TYPES
// ================================

export interface InvoiceData {
  rfc: string;
  name: string;
  regime: string;
  useCfdi: string;
  postalCode: string;
  email?: string;
}

// ================================
// CHECKOUT TYPES
// ================================

export interface GuestCheckoutInput {
  email: string;
  name: string;
  phone: string;
  sessionId?: string;
  shippingAddress: CheckoutAddress;
  billingAddress?: CheckoutAddress;
  paymentMethod: PaymentMethod;
  paymentData?: Record<string, any>;
  shippingMethod: ShippingMethod;
  requiresInvoice?: boolean;
  invoiceData?: InvoiceData;
  notes?: string;
  referralCode?: string;
  acceptTerms: boolean;
}

export interface AuthenticatedCheckoutInput {
  shippingAddressId?: string;
  shippingAddress?: CheckoutAddress;
  billingAddressId?: string;
  billingAddress?: CheckoutAddress;
  paymentMethod: PaymentMethod;
  paymentData?: Record<string, any>;
  shippingMethod: ShippingMethod;
  requiresInvoice?: boolean;
  invoiceData?: InvoiceData;
  notes?: string;
  saveShippingAddress?: boolean;
  saveBillingAddress?: boolean;
}

export interface CheckoutResponse {
  success: boolean;
  orderId: string;
  orderNumber: string;
  total: string;
  paymentUrl?: string;
  externalPaymentId?: string;
  paymentStatus?: string;
  message: string;
}

// ================================
// SHIPPING TYPES
// ================================

export interface ShippingQuote {
  method: string;
  name: string;
  description: string;
  cost: string;
  estimatedDays: number;
  estimatedDeliveryDate?: string;
}

export interface CheckoutSummary {
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  shippingAmount: string;
  total: string;
  totalPoints: number;
  totalBusinessValue: string;
  itemCount: number;
  coupon?: {
    code: string;
    discount: string;
  };
  shippingOptions: ShippingQuote[];
}
