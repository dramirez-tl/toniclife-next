// confirmation.ts — Vista de la página /confirmacion (lógica PURA, 28-oct-2026).
//
// La página recibe el pedido por dos caminos: con sesión, GET /orders/my-orders/:id
// (+ su tracking); sin sesión, GET /checkout/confirmation/:orderId?session_id=…
// (el session_id de Stripe es la llave). Aquí ambos se reducen a UNA vista para
// que la pantalla no sepa de dónde vino el dato: estado del pago, renglones con
// NOMBRE de producto (nunca "#id"), totales con moneda, dirección o sucursal de
// recogida, entrega de almacén y los pasos de la línea de tiempo.

import type { Order, OrderDeliverySummary, TrackingInfo } from '@/types/order';
import type { CheckoutConfirmation } from '@/types/checkout-confirmation';

export type ConfirmationDeliveryMode = 'shipping' | 'pickup';
export type ConfirmationPaymentStatus = 'paid' | 'pending' | 'failed' | 'unknown';

export interface ConfirmationItem {
  key: string;
  /** Nombre (o clave) del producto; null si el API no lo trae: la UI pone un genérico. */
  name: string | null;
  quantity: number;
  total: number;
}

export interface ConfirmationFulfillment {
  /** pending | ready | shipped | delivered | cancelled */
  status: string;
  mode: ConfirmationDeliveryMode;
  fulfillBranchName: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface ConfirmationView {
  orderId: string;
  orderNumber: string;
  /** orders.status (pending | confirmed | cancelled | …). */
  status: string;
  paymentStatus: ConfirmationPaymentStatus;
  /** Stripe ya redirigió pero el webhook aún no confirma: la página sigue consultando. */
  awaitingPayment: boolean;
  paymentFailed: boolean;
  cancelled: boolean;
  currencyCode: string;
  createdAt: string | null;
  buyerFirstName: string | null;
  totals: { subtotal: number; shipping: number; tax: number; discount: number; total: number };
  items: ConfirmationItem[];
  delivery: {
    mode: ConfirmationDeliveryMode;
    pickupBranchName: string | null;
    /** Renglones de la dirección sin campos vacíos (solo envío). */
    addressLines: string[];
  };
  /** Puntos acreditados al comprador (0 para invitados o compras a precio público). */
  points: number;
  /** Entrega de almacén; null mientras no exista. */
  fulfillment: ConfirmationFulfillment | null;
}

export type ConfirmationStep =
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'shipped'
  | 'delivered'
  | 'pickupDelivered';

export type ConfirmationStepState = 'done' | 'current' | 'todo';

// ===== helpers =====

function num(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

/**
 * Renglones de una dirección a partir de un snapshot con claves variadas: el
 * checkout guarda extNumber/zipCode/reference, el DTO del admin las renombra a
 * exteriorNumber/postalCode/references y la confirmación pública usa las del
 * checkout. Se leen todas; lo vacío no sale.
 */
export function addressLinesFromSnapshot(raw: Record<string, unknown> | null | undefined): string[] {
  if (!raw) return [];
  const fullName = text(raw.fullName ?? raw.full_name);
  const street = text(raw.street ?? raw.address);
  const ext = text(raw.extNumber ?? raw.exteriorNumber ?? raw.exterior_number ?? raw.ext_number);
  const int = text(raw.intNumber ?? raw.interiorNumber ?? raw.interior_number ?? raw.int_number);
  const neighborhood = text(raw.neighborhood ?? raw.colony);
  const city = text(raw.city);
  const state = text(raw.state);
  const zip = text(raw.zipCode ?? raw.postalCode ?? raw.zip_code ?? raw.postal_code);
  const phone = text(raw.phone);
  const reference = text(raw.reference ?? raw.references);

  const lines: string[] = [];
  if (fullName) lines.push(fullName);
  const streetLine = [street, ext ? `#${ext}` : '', int ? `Int. ${int}` : ''].filter(Boolean).join(' ');
  if (streetLine) lines.push(streetLine);
  if (neighborhood) lines.push(neighborhood);
  const cityLine = [city, state].filter(Boolean).join(', ');
  const cityZip = [cityLine, zip ? `CP ${zip}` : ''].filter(Boolean).join(' · ');
  if (cityZip) lines.push(cityZip);
  if (phone) lines.push(`Tel. ${phone}`);
  if (reference) lines.push(reference);
  return lines;
}

function fulfillmentFrom(d: OrderDeliverySummary | null | undefined): ConfirmationFulfillment | null {
  if (!d) return null;
  return {
    status: d.status,
    mode: d.mode === 'pickup' ? 'pickup' : 'shipping',
    fulfillBranchName: d.fulfillBranchName || null,
    carrier: d.carrier || null,
    trackingNumber: d.trackingNumber || null,
    trackingUrl: d.trackingUrl || null,
    shippedAt: d.shippedAt || null,
    deliveredAt: d.deliveredAt || null,
  };
}

function flags(status: string, paymentStatus: ConfirmationPaymentStatus) {
  const cancelled = status === 'cancelled';
  const confirmed = status === 'confirmed';
  const paymentFailed = !confirmed && !cancelled && paymentStatus === 'failed';
  const awaitingPayment =
    !cancelled && !confirmed && !paymentFailed && (status === 'pending' || paymentStatus === 'pending');
  return { cancelled, paymentFailed, awaitingPayment };
}

// ===== constructores =====

/**
 * Vista desde GET /orders/my-orders/:id (distribuidor con sesión). `paymentStatus`
 * del API es derivado (paid | partial | pending | refunded | failed); si no viene
 * (pedidos migrados) se infiere del estado del pedido. `extra.currencyCode` es la
 * moneda que la página obtuvo por otro camino (confirmación pública del mismo
 * pedido) para cuando el pedido no la trae.
 */
export function fromMyOrder(
  order: Order,
  tracking?: TrackingInfo | null,
  extra: { pickupBranchName?: string | null; currencyCode?: string | null } = {},
): ConfirmationView {
  const status = order.status || 'pending';
  const raw = order.paymentStatus;
  const paymentStatus: ConfirmationPaymentStatus =
    raw === 'paid'
      ? 'paid'
      : raw === 'pending' || raw === 'partial'
        ? 'pending'
        : raw === 'failed'
          ? 'failed'
          : raw
            ? 'unknown'
            : status === 'confirmed'
              ? 'paid'
              : status === 'pending'
                ? 'pending'
                : 'unknown';
  const mode: ConfirmationDeliveryMode = order.pickupBranchId ? 'pickup' : 'shipping';
  const items = (order.items ?? [])
    .filter((it) => it.isActive !== false)
    .map((it) => ({
      key: it.id,
      name: text(it.productName) || text(it.productCode) || null,
      quantity: num(it.quantity),
      total: num(it.totalPrice),
    }));
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status,
    paymentStatus,
    ...flags(status, paymentStatus),
    // Moneda: la del pedido si el API la manda (OrderDto.currencyCode, Bloque 1);
    // si no, la que la página obtuvo de la confirmación pública del mismo pedido;
    // MXN solo como último recurso. Antes SIEMPRE caía a MXN: el cast ocultaba
    // que OrderDto no traía la moneda (28-oct-2026).
    currencyCode: text(order.currencyCode) || text(extra.currencyCode) || 'MXN',
    createdAt: order.createdAt || null,
    buyerFirstName: text(order.customer?.firstName) || text(order.shippingAddressSnapshot?.fullName)?.split(' ')[0] || null,
    totals: {
      subtotal: num(order.subtotal),
      shipping: num(order.shippingAmount),
      tax: num(order.taxAmount),
      discount: num(order.discountAmount),
      total: num(order.total),
    },
    items,
    delivery: {
      mode,
      pickupBranchName: mode === 'pickup' ? extra.pickupBranchName || null : null,
      addressLines:
        mode === 'shipping'
          ? addressLinesFromSnapshot(order.shippingAddressSnapshot as unknown as Record<string, unknown> | undefined)
          : [],
    },
    points: Math.max(0, num(order.totalPoints)),
    fulfillment: fulfillmentFrom(tracking?.delivery),
  };
}

/** Vista desde GET /checkout/confirmation/:orderId?session_id=… (invitado o sin sesión). */
export function fromGuestConfirmation(dto: CheckoutConfirmation): ConfirmationView {
  const status = dto.status || 'pending';
  const paymentStatus: ConfirmationPaymentStatus =
    dto.paymentStatus === 'paid' || dto.paymentStatus === 'pending' || dto.paymentStatus === 'failed'
      ? dto.paymentStatus
      : 'unknown';
  const mode: ConfirmationDeliveryMode = dto.delivery?.mode === 'pickup' ? 'pickup' : 'shipping';
  const pickup = dto.delivery?.pickupBranch;
  return {
    orderId: dto.orderId,
    orderNumber: dto.orderNumber,
    status,
    paymentStatus,
    ...flags(status, paymentStatus),
    currencyCode: dto.currencyCode || 'MXN',
    createdAt: dto.createdAt || null,
    buyerFirstName: text(dto.buyer?.firstName) || null,
    totals: {
      subtotal: num(dto.subtotal),
      shipping: num(dto.shippingAmount),
      tax: num(dto.taxAmount),
      discount: num(dto.discountAmount),
      total: num(dto.total),
    },
    items: (dto.items ?? []).map((it, i) => ({
      key: `${it.productCode ?? 'item'}-${i}`,
      name: text(it.productName) || text(it.productCode) || null,
      quantity: num(it.quantity),
      total: num(it.totalPrice),
    })),
    delivery: {
      mode,
      pickupBranchName: pickup ? [pickup.code, pickup.name].filter(Boolean).join(' ') || null : null,
      addressLines:
        mode === 'shipping'
          ? addressLinesFromSnapshot(dto.delivery?.address as unknown as Record<string, unknown> | undefined)
          : [],
    },
    // Un invitado no acumula puntos (decisión 3); el DTO público no los expone.
    points: 0,
    fulfillment: fulfillmentFrom(dto.fulfillment),
  };
}

export function isAwaitingPayment(v: ConfirmationView): boolean {
  return v.awaitingPayment;
}

/**
 * Pasos de la línea de tiempo. Envío: confirmado → en preparación → listo →
 * enviado → entregado. Recoger: confirmado → en preparación → entregado en
 * mostrador (sin "listo para recoger" por ahora, decisión 5). Un paso alcanzado
 * queda `done`; `current` solo marca lo que está en curso (Almacén preparando,
 * o listo para que pasen por él).
 */
export function confirmationSteps(
  v: ConfirmationView,
): { key: ConfirmationStep; state: ConfirmationStepState }[] {
  const pickup = v.delivery.mode === 'pickup';
  const keys: ConfirmationStep[] = pickup
    ? ['confirmed', 'preparing', 'pickupDelivered']
    : ['confirmed', 'preparing', 'ready', 'shipped', 'delivered'];
  if (v.awaitingPayment || v.paymentFailed || v.cancelled) {
    return keys.map((key) => ({ key, state: 'todo' as const }));
  }
  const status = v.fulfillment?.status ?? 'pending';
  const doneCount = pickup
    ? status === 'delivered'
      ? 3
      : status === 'ready'
        ? 2
        : 1
    : status === 'delivered'
      ? 5
      : status === 'shipped'
        ? 4
        : status === 'ready'
          ? 3
          : 1;
  const inProgress = status === 'pending' || status === 'cancelled' || (pickup && status === 'ready');
  return keys.map((key, i) => ({
    key,
    state: i < doneCount ? 'done' : i === doneCount && inProgress ? 'current' : 'todo',
  }));
}
