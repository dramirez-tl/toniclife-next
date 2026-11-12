// pickup-progress.ts — Avance de un pedido para RECOGER EN SUCURSAL en "Mis pedidos" del
// distribuidor (lógica PURA, 11-nov-2026).
//
// Un pedido de la tienda para recoger pasa por cuatro pasos: pagado → preparando (la
// sucursal lo surte y lo aparta) → listo para recoger (se le avisa al comprador) →
// entregado en mostrador. Con lo que manda GET /distributor/orders aquí se decide en qué
// paso va, qué se le dice al comprador y qué datos de la sucursal se le muestran:
//  · sin pagar: no hay seguimiento, va el aviso de "pendiente de pago";
//  · cancelado: sin seguimiento ni aviso;
//  · preparando o listo: el seguimiento y la sucursal (dirección, teléfono, mapa);
//  · entregado: el seguimiento completo, cuándo se entregó y quién lo recogió;
//  · sin seguimiento (`untracked`): el pedido no tiene entrega de sucursal registrada. Son
//    los pedidos del sistema anterior (pagados o entregados hace meses) y los "pendientes"
//    viejos que nadie pagó: decirles "Preparando" o "Pendiente de pago" sería mentira. Su
//    tarjeta queda como estaba.
// Los pedidos con envío a domicilio y las entregas de Call Center NO pasan por aquí: su
// tarjeta sigue como estaba.

import {
  branchPlace,
  cleanBranchText,
  pickupMapUrl,
  pickupPhoneHref,
  type BranchPlace,
} from '@/lib/checkout/pickup-branches';
import type { MyOrder } from '@/services/distributorApi';

/** Lo que se lee del pedido. Los campos nuevos son opcionales: un API anterior no los manda. */
export type PickupOrderLike = Pick<MyOrder, 'kind' | 'status'> &
  Partial<
    Pick<
      MyOrder,
      | 'delivery'
      | 'deliveryMode'
      | 'deliveryStatus'
      | 'pickupBranch'
      | 'pickupBranchName'
      | 'fulfillBranchName'
      | 'readyAt'
      | 'deliveredAt'
      | 'receivedByName'
      | 'createdAt'
    >
  >;

/** Pedido de la tienda en línea para recoger en sucursal (las entregas de Call Center siempre se envían). */
export function isPickupOrder(order: PickupOrderLike): boolean {
  return order.deliveryMode === 'pickup' || (order.kind !== 'home_delivery' && order.delivery === 'pickup');
}

/** En qué va un pedido para recoger. `untracked` = sin entrega de sucursal registrada: no hay nada que seguir. */
export type PickupStage = 'unpaid' | 'cancelled' | 'preparing' | 'ready' | 'delivered' | 'untracked';

/**
 * Un pedido sin pagar se cancela solo a las 72 h. Uno "pendiente" más viejo que eso es un
 * resto del sistema anterior: no se le promete nada.
 */
export const UNPAID_NOTICE_HOURS = 72;

/**
 * `status` es el estado que el API arma para el comprador: `pending` = todavía sin pagar;
 * `cancelled`; y, cuando el pedido ya está pagado, el avance de la ENTREGA de la sucursal
 * (`deliveryStatus`): `processing` = se está preparando, `ready` = listo para recoger,
 * `delivered` = entregado. Un pedido pagado SIN entrega registrada (los del sistema
 * anterior) no tiene avance que mostrar: `untracked`. Igual un "pendiente" de hace más de
 * 72 h (`createdAt`; sin fecha se da por reciente).
 */
export function pickupStage(
  order: Pick<PickupOrderLike, 'status' | 'deliveryStatus' | 'createdAt'>,
  now: Date = new Date(),
): PickupStage {
  const delivery = order.deliveryStatus ?? null;
  if (order.status === 'cancelled' || delivery === 'cancelled') return 'cancelled';
  if (order.status === 'pending') {
    const created = order.createdAt ? new Date(order.createdAt).getTime() : NaN;
    const stale = Number.isFinite(created) && now.getTime() - created > UNPAID_NOTICE_HOURS * 3_600_000;
    return stale ? 'untracked' : 'unpaid';
  }
  if (!delivery) return 'untracked';
  if (delivery === 'delivered') return 'delivered';
  if (delivery === 'ready') return 'ready';
  return 'preparing';
}

export type PickupStepKey = 'paid' | 'preparing' | 'ready' | 'delivered';
/** `done` = palomeado; `current` = el paso en el que va (resaltado); `todo` = aún no llega. */
export type PickupStepState = 'done' | 'current' | 'todo';

export interface PickupStep {
  key: PickupStepKey;
  state: PickupStepState;
}

export const PICKUP_STEP_KEYS: readonly PickupStepKey[] = ['paid', 'preparing', 'ready', 'delivered'];

/**
 * Los 4 pasos del seguimiento: los anteriores al actual, palomeados; el actual,
 * resaltado; los que faltan, apagados. "Entregado" es el final: quedan los cuatro
 * palomeados. Sin pagar o cancelado no hay seguimiento (lista vacía).
 */
export function pickupSteps(stage: PickupStage): PickupStep[] {
  if (stage === 'unpaid' || stage === 'cancelled' || stage === 'untracked') return [];
  if (stage === 'delivered') return PICKUP_STEP_KEYS.map((key) => ({ key, state: 'done' }));
  const current = PICKUP_STEP_KEYS.indexOf(stage);
  return PICKUP_STEP_KEYS.map((key, index) => ({
    key,
    state: index < current ? 'done' : index === current ? 'current' : 'todo',
  }));
}

/**
 * "Listo" en un pedido para recoger es "Listo para recoger": la etiqueta general del
 * estado dice "Listo para envío", que es la de los envíos a domicilio.
 */
export function usesPickupReadyLabel(order: PickupOrderLike): boolean {
  return isPickupOrder(order) && order.status === 'ready';
}

/** Sucursal donde se recoge, limpia, con sus enlaces para llamar y para verla en el mapa. */
export interface PickupOrderBranch extends BranchPlace {
  phoneHref: string | null;
  mapUrl: string | null;
}

export interface PickupOrderView {
  stage: PickupStage;
  /** Pasos del seguimiento; vacío = no se pinta (sin pagar o cancelado). */
  steps: PickupStep[];
  /**
   * Sucursal con su dirección y teléfono. Solo mientras se prepara o está listo (es cuando
   * el comprador necesita saber a dónde ir) y si el API la manda con algo más que el nombre.
   */
  branch: PickupOrderBranch | null;
  /** Desde cuándo está listo (ISO); solo en `ready`. */
  readyAt: string | null;
  /** Cuándo se entregó en mostrador (ISO); solo en `delivered`. */
  deliveredAt: string | null;
  /** Quién lo recogió; solo en `delivered` y si la sucursal lo capturó. */
  receivedByName: string;
}

function isoOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function orderBranch(order: PickupOrderLike): PickupOrderBranch | null {
  const raw = order.pickupBranch;
  if (!raw || typeof raw !== 'object') return null;
  const place = branchPlace({
    name: cleanBranchText(raw.name) || order.pickupBranchName,
    code: raw.code,
    street: raw.street,
    city: raw.city,
    state: raw.state,
    zip: raw.zip,
    phone: raw.phone,
  });
  // Solo el nombre ya se dice en "Recoger en …": sin dirección ni teléfono no hay nada que agregar.
  if (!place.street && !place.city && !place.state && !place.zip && !place.phone) return null;
  return { ...place, phoneHref: pickupPhoneHref(place.phone), mapUrl: pickupMapUrl(place) };
}

/**
 * Todo lo que la tarjeta de "Mis pedidos" pinta de un pedido para recoger. `null` = el
 * pedido no es para recoger, o no tiene nada que seguir (`untracked`): la tarjeta no cambia.
 */
export function pickupOrderView(order: PickupOrderLike, now: Date = new Date()): PickupOrderView | null {
  if (!isPickupOrder(order)) return null;
  const stage = pickupStage(order, now);
  if (stage === 'untracked') return null;
  const open = stage === 'preparing' || stage === 'ready';
  return {
    stage,
    steps: pickupSteps(stage),
    branch: open ? orderBranch(order) : null,
    readyAt: stage === 'ready' ? isoOrNull(order.readyAt) : null,
    deliveredAt: stage === 'delivered' ? isoOrNull(order.deliveredAt) : null,
    receivedByName: stage === 'delivered' ? cleanBranchText(order.receivedByName) : '',
  };
}
