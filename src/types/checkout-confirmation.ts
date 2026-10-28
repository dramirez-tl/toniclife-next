// checkout-confirmation.ts - Confirmación PÚBLICA de un pedido pagado con Stripe
// (GET /checkout/confirmation/:orderId?session_id=cs_…, 28-oct-2026, Bloque 1).
// Espejo de CheckoutConfirmationDto del API. La responde a quien tenga el
// session_id de Stripe de ESE pedido (lo recibe solo quien pagó), con o sin
// sesión: nunca trae correo ni teléfono del comprador.

import type { OrderDeliverySummary } from '@/types/order';

export interface CheckoutConfirmationItem {
  productName: string;
  productCode: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface CheckoutConfirmationAddress {
  fullName?: string;
  street: string;
  extNumber?: string;
  intNumber?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
}

export interface CheckoutConfirmationPickupBranch {
  code: string;
  name: string;
  city: string | null;
}

export interface CheckoutConfirmation {
  orderId: string;
  orderNumber: string;
  /** orders.status: pending | confirmed | cancelled */
  status: string;
  /** Estado del cobro de ESA sesión de Stripe. */
  paymentStatus: 'paid' | 'pending' | 'failed';
  createdAt: string;
  orderDate: string;
  currencyCode: string;
  subtotal: string;
  shippingAmount: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  buyer: { firstName: string };
  items: CheckoutConfirmationItem[];
  delivery: {
    mode: 'shipping' | 'pickup';
    pickupBranch?: CheckoutConfirmationPickupBranch;
    address?: CheckoutConfirmationAddress;
  };
  /** Entrega de almacén; solo si ya existe (se crea al confirmarse el pago). */
  fulfillment?: OrderDeliverySummary;
}
