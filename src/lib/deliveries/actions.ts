// actions.ts — Reglas de interfaz de "Entregas a domicilio" (lógica PURA, 28-oct-2026).
//
// Desde la mig 176 la bandeja lleva ventas POS y PEDIDOS WEB pagados en línea
// (kind), con envío a domicilio o para recoger en sucursal (deliveryMode).
// Espejo de canTransitionDelivery del API: envío = pendiente → listo → enviado
// → entregado; recoger (11-nov-2026) = pendiente → listo para recoger →
// entregado en mostrador, con pendiente → entregado (surtir y entregar de una
// vez) y listo → pendiente (corrección); nunca "enviado". La entrega de un
// PEDIDO WEB nunca se cancela desde la bandeja (ver canCancelDelivery). La
// autoridad sigue siendo el API; esto solo decide qué botones ofrecer y cómo
// nombrar las cosas.

import { DELIVERY_STATUS_LABELS, type Delivery, type DeliveryMode, type DeliveryStatus } from '@/types/deliveries';

export type DeliveryAction = 'produced' | 'ready' | 'shipped' | 'delivered' | 'edit' | 'unready' | 'unship' | 'cancelled';

/** Orden canónico en que se pintan los botones. */
export const DELIVERY_ACTION_ORDER: readonly DeliveryAction[] = [
  'produced',
  'ready',
  'shipped',
  'delivered',
  'edit',
  'unready',
  'unship',
  'cancelled',
];

/** Acciones que NO van en la tabla (solo en el detalle): correcciones hacia atrás. */
export const DELIVERY_DETAIL_ONLY_ACTIONS: readonly DeliveryAction[] = ['unready', 'unship'];

/** Cobrada (POS: completed; pedido web: pagado = confirmed, que el API normaliza a completed). */
export function isDeliveryPaid(d: Pick<Delivery, 'saleStatus'>): boolean {
  return d.saleStatus === 'completed';
}

/** Modo efectivo: un API anterior a la mig 176 no manda deliveryMode (POS = envío). */
export function deliveryModeOf(d: Partial<Pick<Delivery, 'deliveryMode'>>): DeliveryMode {
  return d.deliveryMode === 'pickup' ? 'pickup' : 'shipping';
}

/**
 * Solo las entregas de ventas POS se cancelan desde la bandeja. La de un pedido
 * web NO (28-oct-2026): el pedido seguiría pagado, Mis pedidos y el rastreo lo
 * mostrarían "Cancelado" y no habría forma de volver a surtirlo (un pedido tiene
 * a lo más UNA entrega: índice único de la mig 176). Un pedido web se anula desde
 * Pedidos › Cancelar pedido, que revierte inventario y puntos y cancela la
 * entrega en cascada (cancelOrderDeliveriesInTx en el API).
 */
export function canCancelDelivery(d: Partial<Pick<Delivery, 'kind'>>): boolean {
  return d.kind !== 'order';
}

export const ORDER_CANCEL_NOTICE =
  'Para anular un pedido web usa Pedidos › Cancelar pedido; la entrega se cancela en cascada.';

/** Aviso del detalle de un pedido web mientras aún no se surte (pendiente / listo); null si no aplica. */
export function deliveryCancelNotice(d: Partial<Pick<Delivery, 'kind'>> & Pick<Delivery, 'status'>): string | null {
  if (canCancelDelivery(d)) return null;
  return d.status === 'pending' || d.status === 'ready' || d.status === 'production' ? ORDER_CANCEL_NOTICE : null;
}

/**
 * Acciones disponibles por estado, modo, cobro y origen. Sin permiso = ninguna.
 * Envío: pendiente → listo/enviado (si está cobrada) o cancelar; listo → enviado,
 * regresar a pendiente, cancelar; enviado → entregado, corregir guía, no se envió.
 * Recoger: pendiente → listo para recoger o entregar en mostrador (si está pagado);
 * listo → entregar en mostrador (si está pagado) o regresar a pendiente.
 * Pedido web (kind 'order'): igual, pero sin "cancelar" (ver canCancelDelivery).
 */
export function availableDeliveryActions(
  d: Pick<Delivery, 'status' | 'saleStatus'> & Partial<Pick<Delivery, 'kind' | 'deliveryMode'>>,
  canAct: boolean,
): DeliveryAction[] {
  if (!canAct) return [];
  const paid = isDeliveryPaid(d);
  const cancellable = canCancelDelivery(d);
  const out: DeliveryAction[] = [];
  // BAJO PEDIDO (mig 182): "En elaboración" solo sale a "elaborado" (pasa a
  // pendiente de surtir, en cualquier modo); se cancela desde Pedidos, en cascada.
  if (d.status === 'production') {
    if (paid) out.push('produced');
    return out;
  }
  if (deliveryModeOf(d) === 'pickup') {
    // Recoger en sucursal: nunca "enviado" (ni corregir guía).
    if (d.status === 'pending') {
      if (paid) out.push('ready', 'delivered');
      if (cancellable) out.push('cancelled');
    } else if (d.status === 'ready') {
      if (paid) out.push('delivered');
      out.push('unready');
      if (cancellable) out.push('cancelled');
    }
    return out;
  }
  switch (d.status) {
    case 'pending':
      if (paid) out.push('ready', 'shipped');
      if (cancellable) out.push('cancelled');
      break;
    case 'ready':
      if (paid) out.push('shipped');
      out.push('unready');
      if (cancellable) out.push('cancelled');
      break;
    case 'shipped':
      out.push('delivered', 'edit', 'unship');
      break;
    default:
      break;
  }
  return out;
}

const ACTION_TITLES: Record<DeliveryAction, string> = {
  produced: 'Marcar elaborado (pasa a surtido)',
  ready: 'Marcar listo para envío',
  shipped: 'Marcar enviado',
  delivered: 'Marcar entregado',
  cancelled: 'Cancelar entrega',
  edit: 'Corregir paquetería o guía',
  unready: 'Regresar a pendiente',
  unship: 'Regresar a listo (no se envió)',
};

/** Recoger en sucursal: "listo" y "entregado" se dicen como los ve el mostrador. */
const PICKUP_ACTION_TITLES: Partial<Record<DeliveryAction, string>> = {
  ready: 'Marcar listo para recoger',
  delivered: 'Entregar en mostrador',
};

/** Título de la acción; "listo" y "entregado" cambian según el modo (mostrador vs domicilio). */
export function deliveryActionTitle(action: DeliveryAction, mode: DeliveryMode = 'shipping'): string {
  return (mode === 'pickup' ? PICKUP_ACTION_TITLES[action] : undefined) ?? ACTION_TITLES[action];
}

/** Estado "listo" de un pedido para recoger: ya está surtido y apartado en mostrador. */
export const PICKUP_READY_LABEL = 'Listo para recoger';

/**
 * Etiqueta del estado de una entrega. Un pedido para RECOGER que ya está listo dice
 * "Listo para recoger" (no "Listo para envío"), lo diga o no el API; en lo demás manda la
 * etiqueta del API (`statusLabel`) y, si no viene, la de la tabla.
 */
export function deliveryStatusLabel(
  d: Pick<Delivery, 'status'> & Partial<Pick<Delivery, 'deliveryMode' | 'statusLabel'>>,
): string {
  if (d.status === 'ready' && deliveryModeOf(d) === 'pickup') return PICKUP_READY_LABEL;
  return d.statusLabel || DELIVERY_STATUS_LABELS[d.status] || d.status;
}

/** "¿Quién recoge?" es obligatorio al entregar en mostrador un pedido para recoger. */
export function needsReceivedByName(action: DeliveryAction, mode: DeliveryMode): boolean {
  return action === 'delivered' && mode === 'pickup';
}

/** Tope del nombre de quien recoge (el del API). */
export const RECEIVED_BY_NAME_MAX = 255;

/** 'Pedido web TL…' | 'Venta 164-…' (un API anterior sin kind = venta). */
export function deliveryDocLabel(d: Partial<Pick<Delivery, 'kind'>> & Pick<Delivery, 'saleNumber'>): string {
  return d.kind === 'order' ? `Pedido web ${d.saleNumber}` : `Venta ${d.saleNumber}`;
}

/** Aviso corto cuando la entrega no está cobrada (null si lo está). */
export function deliveryPaymentShort(
  d: Partial<Pick<Delivery, 'kind'>> & Pick<Delivery, 'saleStatus'>,
): string | null {
  if (isDeliveryPaid(d)) return null;
  if (d.kind === 'order') {
    if (d.saleStatus === 'pending') return 'Pedido sin pagar';
    if (d.saleStatus === 'cancelled') return 'Pedido cancelado';
    return `Pedido ${d.saleStatus}`;
  }
  return d.saleStatus === 'pending' ? 'Venta sin cobrar' : `Venta ${d.saleStatus}`;
}

/** Mensaje largo del detalle cuando no se puede surtir (null si está cobrada). */
export function deliveryPaymentNotice(
  d: Partial<Pick<Delivery, 'kind'>> & Pick<Delivery, 'saleStatus'>,
): string | null {
  if (isDeliveryPaid(d)) return null;
  if (d.kind === 'order') return 'El pedido no está pagado o fue cancelado; no se puede surtir.';
  return `La venta está ${d.saleStatus === 'pending' ? 'sin cobrar' : d.saleStatus}; no se puede surtir.`;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  credit: 'Tarjeta de crédito',
  // Pedidos web: cobrados con Stripe Checkout (payment_methods.code).
  credit_card: 'Tarjeta (en línea)',
  debit_card: 'Tarjeta de débito (en línea)',
  stripe: 'Tarjeta (en línea)',
  transfer: 'Transferencia',
  deposit: 'Depósito',
  mixed: 'Mixto',
  usd_cash: 'Efectivo USD',
  mercado_pago: 'Mercado Pago',
  promotion: 'Promoción',
  cashback: 'Cashback',
  undefined: 'Por definir',
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_LABELS[method] ?? method;
}

/** Colores del estado de una entrega (los mismos de la bandeja y del admin de pedidos). */
export const DELIVERY_STATUS_CLASSES: Record<DeliveryStatus, string> = {
  production: 'bg-purple-100 text-purple-800',
  pending: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

export function deliveryStatusClasses(status: string): string {
  return DELIVERY_STATUS_CLASSES[status as DeliveryStatus] ?? DELIVERY_STATUS_CLASSES.pending;
}
