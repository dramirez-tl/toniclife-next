// cart.ts - TypeScript types for e-commerce cart module
// Aligned with API CartDto / CartItemDto responses
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

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  originalPrice?: string;
  lineTotal: string;
  points: number;
  businessValue: string;
  productName: string;
  productCode: string;
  productSlug?: string;
  /** Slug del producto (API C1). Hasta entonces el API manda `productSlug`. */
  slug?: string;
  /** Puntos POR UNIDAD (API C1). `points` es el total de la línea. */
  pointsPerUnit?: number;
  /** Tope de la línea = min(disponible, máximo por línea) (API C1). */
  maxQuantity?: number;
  /** Por qué la línea tiene ese tope: máximo por pedido de la tienda o existencias. */
  maxQuantityReason?: 'order_max' | 'stock';
  productImageUrl?: string;
  lotNumber?: string;
  /** Stock disponible en el almacén del país; undefined = desconocido. */
  availableStock?: number;
  /** false = agotado en el almacén del país. */
  inStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ================================
// CART TYPES
// ================================

export interface Cart {
  id: string;
  customerId?: string;
  branchId?: string;
  cartType?: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  discountType?: number;
  discountPercentage?: string;
  couponId?: string;
  couponCode?: string;
  total: string;
  totalPoints: number;
  totalBusinessValue: string;
  itemCount: number;
  requiresShipping: boolean;
  status: string;
  /** `true` = el viewer ve puntos (API C1). Ausente = API previo (el front decide por sesión). */
  showPoints?: boolean;
  /** Moneda del carrito (API C2). Ausente = se formatea con la moneda del país de la tienda. */
  currencyCode?: string | null;
  /**
   * País del carrito, ISO2 (API C2). OJO: viene SIEMPRE; sin `countryId` es el país que el API
   * DEDUCE (sucursal > cliente > is_usa > MX), no uno fijado. Ver `pinnedCartCountry`.
   */
  countryCode?: string | null;
  /** UUID del país FIJADO en el carrito (C2). Ausente = carrito sin país fijado: comportamiento previo. */
  countryId?: string | null;
  createdAt: string;
  updatedAt: string;
  items: CartItem[];
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
  /** País de la TIENDA elegida, ISO2 (C2). `useAddCartItem` lo pone solo; sin él la petición es la de antes. */
  country?: string;
}

export interface UpdateCartItemInput {
  quantity: number;
}

export interface ApplyCouponInput {
  code: string;
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
  /** País de la tienda (locale): define moneda, impuesto y envío del pedido. */
  countryId?: string;
  shippingAddressId?: string;
  shippingAddress?: CheckoutAddress;
  billingAddressId?: string;
  billingAddress?: CheckoutAddress;
  paymentMethod: PaymentMethod;
  paymentData?: Record<string, any>;
  shippingMethod: ShippingMethod;
  /** Sucursal donde recoger (requerido si shippingMethod=PICKUP). */
  pickupBranchId?: string;
  requiresInvoice?: boolean;
  invoiceData?: InvoiceData;
  notes?: string;
  saveShippingAddress?: boolean;
  saveBillingAddress?: boolean;
}

/** Sucursal disponible para recolección (GET /checkout/pickup-branches). */
export interface PickupBranch {
  id: string;
  code: string;
  name: string;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  countryCode: string;
  countryName: string;
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
  /**
   * Envío a domicilio según las rutas de surtido del país de la orden (opcional:
   * un API anterior no lo manda, y el API lo omite si no pudo determinarlo).
   * `shippingAvailable === false` = ningún almacén envía a ese país: pagar con
   * envío respondería 422 FUL_NO_ROUTE. Ausente = se comporta como siempre.
   */
  delivery?: { shippingAvailable?: boolean };
}
