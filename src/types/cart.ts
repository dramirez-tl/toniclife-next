// cart.ts - TypeScript types for e-commerce cart module
// Aligned with API CartDto / CartItemDto responses
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

// ================================
// ENUMS
// ================================

export enum PaymentMethod {
  STRIPE = 'stripe',
  /**
   * Efectivo en OXXO con ficha de Stripe (12-nov-2026). Solo la tienda de México, con sesión
   * y si el servidor lo tiene encendido; fuera de eso el API responde 422
   * CHK_PAYMENT_METHOD_UNAVAILABLE. Ver `lib/checkout/payment-options`.
   */
  OXXO = 'oxxo',
  PAYPAL = 'paypal',
  MERCADOPAGO = 'mercadopago',
  CASH = 'cash',
  TRANSFER = 'transfer',
}

export enum ShippingMethod {
  STANDARD = 'standard',
  /** Ya NO se ofrece (11-nov-2026): el API lo rechaza con 422 CHK_SHIPPING_METHOD_UNAVAILABLE. Queda por los pedidos que lo traigan. */
  EXPRESS = 'express',
  PICKUP = 'pickup',
  /** Nunca lo elige el cliente: el envío gratis lo calcula el servidor. */
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
  /** Texto de personalización de la línea (playeras, API mig 179); ausente o null = sin texto. */
  personalization?: string | null;
  /** Promoción de temporada que tocó la línea (API mig 186). */
  seasonPromotionId?: string;
  promoCode?: string;
  promoName?: string;
  /** Piezas gratis (3x2) dentro de `quantity`: $0 y sin puntos. */
  promoFreeQuantity?: number;
  /** Descuento de temporada de la línea, ya restado de `lineTotal` y del subtotal. */
  promoDiscountAmount?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartSeasonalPromotion {
  promotionId: string;
  code: string;
  name: string;
  type: 'nxm' | 'percent_off' | 'fixed_price' | 'gift_with_purchase';
  typeLabel: string;
  times: number;
  discountAmount: string;
  freeUnits: number;
  giftUnits: number;
}

export interface CartSeasonalGift {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  promotionId: string;
  promoCode: string;
  promoName: string;
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
  /** Descuento de promociones de temporada (API mig 186), YA restado del subtotal; informativo. */
  seasonalDiscountAmount?: string;
  seasonalPromotions?: CartSeasonalPromotion[];
  /** Regalos de temporada ($0): se crean como líneas del pedido al pagar. */
  seasonalGifts?: CartSeasonalGift[];
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
  /** Texto de personalización (playeras, mig 179). `useAddCartItem` lo limpia y lo manda SOLO si hay texto. */
  personalization?: string;
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

/**
 * Dirección de envío guardada del comprador (GET /checkout/addresses): la
 * predeterminada y las más recientes primero. No guarda quién recibe: el nombre
 * y el teléfono del destinatario viajan aparte en el pedido.
 */
export interface SavedAddress {
  id: string;
  street: string | null;
  extNumber: string | null;
  intNumber: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryId: string | null;
  /** ISO2 del país (MX, FN, US…). */
  countryCode: string | null;
  phone: string | null;
  reference: string | null;
  isDefault: boolean;
  /** Tiene calle, ciudad, estado y código postal. Una incompleta no se puede usar tal cual. */
  isComplete: boolean;
  createdAt: string | null;
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
  paymentData?: Record<string, unknown>;
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
  /** Dirección guardada (GET /checkout/addresses): va con `recipientName`/`recipientPhone` y SIN `shippingAddress`. */
  shippingAddressId?: string;
  /** Quién recibe, al usar una dirección guardada (las guardadas no llevan nombre). */
  recipientName?: string;
  recipientPhone?: string;
  /** Dirección nueva: va con `saveShippingAddress` (el API no duplica una que ya estaba guardada). */
  shippingAddress?: CheckoutAddress;
  /**
   * Guardada que el cliente abrió para COMPLETARLA: con `shippingAddress` y
   * `saveShippingAddress`, el API actualiza esa misma dirección en vez de guardar otra.
   */
  replaceShippingAddressId?: string;
  billingAddressId?: string;
  billingAddress?: CheckoutAddress;
  paymentMethod: PaymentMethod;
  paymentData?: Record<string, unknown>;
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
  /**
   * ¿La sucursal tiene existencias para TODO el carrito del comprador? Solo viene en la
   * lista de la tienda (`?countryId=`) y con productos en el carrito. Ausente = el API no
   * lo revisó (o es un API anterior): la sucursal se puede elegir y no lleva etiqueta.
   */
  availability?: 'available' | 'unavailable';
  /** Nombres de los productos del carrito que no alcanzan en esa sucursal. */
  missingItems?: string[];
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

/** Quién compra (GET /checkout/summary). A un distribuidor la tienda le muestra su número en vez de pedirle un código de referido. */
export interface CheckoutBuyer {
  isDistributor: boolean;
  customerNumber: string | null;
  name: string | null;
  phone: string | null;
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
  /** Ahorro por promociones de temporada (API mig 186), ya restado del subtotal; informativo. */
  seasonalDiscountAmount?: string;
  shippingOptions: ShippingQuote[];
  /**
   * Envío a domicilio según las rutas de surtido del país de la orden (opcional:
   * un API anterior no lo manda, y el API lo omite si no pudo determinarlo).
   * `shippingAvailable === false` = ningún almacén envía a ese país: pagar con
   * envío respondería 422 FUL_NO_ROUTE. Ausente = se comporta como siempre.
   */
  delivery?: { shippingAvailable?: boolean };
  /** Quién compra (opcional: un API anterior no lo manda y entonces no se muestra nada). */
  buyer?: CheckoutBuyer | null;
}
