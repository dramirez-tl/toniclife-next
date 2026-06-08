// order.ts - Types for Orders API
// Aligned with backend DTO: toniclife-api/src/modules/orders/dto/order.dto.ts

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface OrderItem {
  id: string;
  productId: string;
  productName?: string;
  productCode?: string;
  productSku?: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  points: number;
  businessValue: string;
  packProductId?: string;
  quantityOriginal?: number;
  quantityPack?: number;
  lotNumber?: string;
  lineNumber?: number;
  isActive: boolean;
}

export interface AddressSnapshot {
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

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  branchId?: string;
  status: string;
  /** Estado de pago derivado en backend: paid | partial | pending | refunded | failed */
  paymentStatus?: string;
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  shippingAmount: string;
  total: string;
  totalPoints: number;
  totalBusinessValue: string;

  // v2.0 fields
  source?: string;
  periodId?: string;
  documentTypeId?: string;
  sellerUserId?: string;
  discountPercentage?: number;
  taxRate?: number;
  paymentMethodId?: string;
  paymentMethodName?: string;
  paymentMethodId2?: string;
  paymentAmount1?: number;
  paymentAmount2?: number;
  paymentReference?: string;
  paymentReference2?: string;

  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;

  requiresShipping?: boolean;
  shippingAddressId?: string;
  shippingAddressSnapshot?: AddressSnapshot;
  pickupBranchId?: string;
  dispatchTypeId?: string;

  isEcommerce?: boolean;
  isPublicSale?: boolean;
  observation?: string;
  confirmationNotes?: string;

  orderDate: string;
  isActive: boolean;
  invoiceId?: string;
  isInvoiced?: boolean;

  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  customer?: {
    id: string;
    customerNumber?: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'refunded' | 'failed';

export interface OrderQueryParams {
  customerId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  isInvoiced?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderStats {
  total: number;
  byStatus: Record<
    | 'pending'
    | 'confirmed'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'in_transit'
    | 'delivered'
    | 'completed'
    | 'cancelled',
    number
  >;
  revenue: number;
}

export interface OrderListResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  notes?: string;
}

export interface UpdateShippingDto {
  trackingNumber?: string;
  shippingCarrier?: string;
  estimatedDeliveryDate?: string;
}

export interface CancelOrderDto {
  reason: string;
}

export interface TrackingInfo {
  orderNumber: string;
  status: string;
  shippingStatus: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  deliveredAt?: string;
  statusHistory: {
    status: string;
    statusType: string;
    notes?: string;
    createdAt: string;
  }[];
}

export interface Payment {
  id: string;
  orderId: string;
  paymentMethodId: string;
  amount: string;
  currencyCode?: string;
  exchangeRate?: number;
  reference?: string;
  gatewayTransactionId?: string;
  status: string;
  paidAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}
