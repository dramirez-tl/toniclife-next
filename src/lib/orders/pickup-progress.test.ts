import { describe, expect, it } from 'vitest';
import {
  isPickupOrder,
  pickupOrderView,
  pickupStage,
  pickupSteps,
  usesPickupReadyLabel,
  type PickupOrderLike,
} from './pickup-progress';

/** Pedido de la tienda para recoger, como lo manda GET /distributor/orders (pagado, por surtir). */
function order(over: Partial<PickupOrderLike> = {}): PickupOrderLike {
  return {
    kind: 'online',
    status: 'processing',
    delivery: 'pickup',
    deliveryMode: 'pickup',
    deliveryStatus: 'pending',
    pickupBranchName: 'Puebla Centro',
    pickupBranch: {
      code: '164',
      name: 'Puebla Centro',
      street: 'Av. Juárez 123',
      city: 'Puebla',
      state: 'Puebla',
      zip: '72000',
      phone: '222 123 4567',
    },
    readyAt: null,
    deliveredAt: null,
    receivedByName: null,
    ...over,
  };
}

const states = (o: PickupOrderLike) => pickupOrderView(o)?.steps.map((s) => `${s.key}:${s.state}`);

describe('orders/pickup-progress · qué pedidos son para recoger', () => {
  it('pedido de la tienda con recoger en sucursal', () => {
    expect(isPickupOrder(order())).toBe(true);
    // API anterior a la mig 176: sin deliveryMode, pero dice `delivery: pickup`.
    expect(isPickupOrder({ kind: 'online', status: 'confirmed', delivery: 'pickup', deliveryMode: null })).toBe(true);
    expect(isPickupOrder({ kind: 'online', status: 'confirmed', delivery: 'pickup' })).toBe(true);
  });

  it('envío a domicilio y entregas de Call Center: no pasan por aquí', () => {
    const shipping: PickupOrderLike = { kind: 'online', status: 'shipped', delivery: 'shipping', deliveryMode: 'shipping' };
    const callCenter: PickupOrderLike = { kind: 'home_delivery', status: 'ready', delivery: 'shipping', deliveryMode: 'shipping' };
    expect(isPickupOrder(shipping)).toBe(false);
    expect(isPickupOrder(callCenter)).toBe(false);
    expect(pickupOrderView(shipping)).toBeNull();
    expect(pickupOrderView(callCenter)).toBeNull();
    // Una entrega de Call Center nunca es para recoger, diga lo que diga `delivery`.
    expect(isPickupOrder({ kind: 'home_delivery', status: 'ready', delivery: 'pickup' })).toBe(false);
  });
});

describe('orders/pickup-progress · en qué paso va', () => {
  it('estado del pedido → etapa', () => {
    expect(pickupStage({ status: 'pending' })).toBe('unpaid');
    expect(pickupStage({ status: 'processing', deliveryStatus: 'pending' })).toBe('preparing');
    expect(pickupStage({ status: 'processing', deliveryStatus: 'production' })).toBe('preparing');
    expect(pickupStage({ status: 'ready', deliveryStatus: 'ready' })).toBe('ready');
    expect(pickupStage({ status: 'delivered', deliveryStatus: 'delivered' })).toBe('delivered');
    expect(pickupStage({ status: 'cancelled' })).toBe('cancelled');
  });

  it('pagado SIN entrega registrada (pedidos del sistema anterior): sin seguimiento, la tarjeta queda como estaba', () => {
    expect(pickupStage({ status: 'confirmed', deliveryStatus: null })).toBe('untracked');
    expect(pickupStage({ status: 'paid' })).toBe('untracked');
    expect(pickupStage({ status: 'completed' })).toBe('untracked');
    expect(pickupStage({ status: 'delivered' })).toBe('untracked');
    expect(pickupSteps('untracked')).toEqual([]);
    expect(pickupOrderView(order({ status: 'confirmed', deliveryStatus: null }))).toBeNull();
  });

  it('sin pagar: el aviso solo en pedidos recientes; un "pendiente" de hace más de 72 h es un resto viejo', () => {
    const now = new Date('2026-11-12T12:00:00.000Z');
    expect(pickupStage({ status: 'pending', createdAt: '2026-11-11T21:16:00.000Z' }, now)).toBe('unpaid');
    expect(pickupStage({ status: 'pending', createdAt: '2026-11-09T11:59:00.000Z' }, now)).toBe('untracked');
    expect(pickupStage({ status: 'pending', createdAt: '2025-03-01T10:00:00.000Z' }, now)).toBe('untracked');
    // Sin fecha (o ilegible) se da por reciente.
    expect(pickupStage({ status: 'pending' }, now)).toBe('unpaid');
    expect(pickupStage({ status: 'pending', createdAt: 'x' }, now)).toBe('unpaid');
    expect(
      pickupOrderView(order({ status: 'pending', deliveryStatus: null, createdAt: '2025-03-01T10:00:00.000Z' }), now),
    ).toBeNull();
  });

  it('con entrega registrada y un estado del pedido que no se conoce = preparando', () => {
    expect(pickupStage({ status: 'confirmed', deliveryStatus: 'pending' })).toBe('preparing');
    expect(pickupStage({ status: 'paid', deliveryStatus: 'production' })).toBe('preparing');
    expect(pickupStage({ status: 'lo-que-sea', deliveryStatus: 'pending' })).toBe('preparing');
  });

  it('el estado de la entrega desempata; cancelado manda sobre todo', () => {
    expect(pickupStage({ status: 'processing', deliveryStatus: 'ready' })).toBe('ready');
    expect(pickupStage({ status: 'processing', deliveryStatus: 'delivered' })).toBe('delivered');
    expect(pickupStage({ status: 'completed', deliveryStatus: 'delivered' })).toBe('delivered');
    expect(pickupStage({ status: 'ready', deliveryStatus: 'cancelled' })).toBe('cancelled');
    expect(pickupStage({ status: 'cancelled', deliveryStatus: 'delivered' })).toBe('cancelled');
  });

  it('preparando: Pagado palomeado y Preparando resaltado', () => {
    expect(states(order())).toEqual(['paid:done', 'preparing:current', 'ready:todo', 'delivered:todo']);
  });

  it('listo: los anteriores palomeados y "Listo para recoger" resaltado', () => {
    expect(states(order({ status: 'ready', deliveryStatus: 'ready' }))).toEqual([
      'paid:done',
      'preparing:done',
      'ready:current',
      'delivered:todo',
    ]);
  });

  it('entregado: los cuatro palomeados', () => {
    expect(states(order({ status: 'delivered', deliveryStatus: 'delivered' }))).toEqual([
      'paid:done',
      'preparing:done',
      'ready:done',
      'delivered:done',
    ]);
  });

  it('sin pagar o cancelado: sin seguimiento', () => {
    expect(pickupSteps('unpaid')).toEqual([]);
    expect(pickupSteps('cancelled')).toEqual([]);
    expect(states(order({ status: 'pending', deliveryStatus: null }))).toEqual([]);
    expect(states(order({ status: 'cancelled' }))).toEqual([]);
  });
});

describe('orders/pickup-progress · etiqueta del estado', () => {
  it('"listo" de un pedido para recoger es "Listo para recoger"', () => {
    expect(usesPickupReadyLabel(order({ status: 'ready' }))).toBe(true);
  });

  it('los demás estados y los envíos conservan su etiqueta', () => {
    expect(usesPickupReadyLabel(order())).toBe(false);
    expect(usesPickupReadyLabel(order({ status: 'delivered' }))).toBe(false);
    expect(usesPickupReadyLabel({ kind: 'online', status: 'ready', delivery: 'shipping', deliveryMode: 'shipping' })).toBe(false);
    expect(usesPickupReadyLabel({ kind: 'home_delivery', status: 'ready', delivery: 'shipping', deliveryMode: 'shipping' })).toBe(false);
  });
});

describe('orders/pickup-progress · qué se le dice al comprador', () => {
  it('sin pagar: aviso de pendiente de pago, sin seguimiento ni sucursal', () => {
    const view = pickupOrderView(order({ status: 'pending', deliveryStatus: null }));
    expect(view).toEqual({ stage: 'unpaid', steps: [], branch: null, readyAt: null, deliveredAt: null, receivedByName: '' });
  });

  it('cancelado: nada', () => {
    const view = pickupOrderView(order({ status: 'cancelled', deliveryStatus: 'cancelled' }));
    expect(view?.stage).toBe('cancelled');
    expect(view?.steps).toEqual([]);
    expect(view?.branch).toBeNull();
  });

  it('preparando: la sucursal con dirección, teléfono para marcar y mapa', () => {
    const view = pickupOrderView(order());
    expect(view?.stage).toBe('preparing');
    expect(view?.branch).toMatchObject({
      name: 'Puebla Centro',
      street: 'Av. Juárez 123',
      city: 'Puebla',
      state: 'Puebla',
      zip: '72000',
      phone: '222 123 4567',
      phoneHref: 'tel:2221234567',
    });
    expect(view?.branch?.mapUrl).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Av. Juárez 123, Puebla, Puebla, 72000')}`,
    );
    expect(view?.readyAt).toBeNull();
  });

  it('listo: la sucursal y desde cuándo está listo', () => {
    const view = pickupOrderView(order({ status: 'ready', deliveryStatus: 'ready', readyAt: '2026-11-11T18:30:00.000Z' }));
    expect(view?.stage).toBe('ready');
    expect(view?.branch?.name).toBe('Puebla Centro');
    expect(view?.readyAt).toBe('2026-11-11T18:30:00.000Z');
    expect(view?.deliveredAt).toBeNull();
  });

  it('entregado: cuándo y quién lo recogió; la sucursal ya no hace falta', () => {
    const view = pickupOrderView(
      order({
        status: 'delivered',
        deliveryStatus: 'delivered',
        readyAt: '2026-11-11T18:30:00.000Z',
        deliveredAt: '2026-11-12T16:05:00.000Z',
        receivedByName: '  Ana López ',
      }),
    );
    expect(view).toMatchObject({
      stage: 'delivered',
      branch: null,
      readyAt: null,
      deliveredAt: '2026-11-12T16:05:00.000Z',
      receivedByName: 'Ana López',
    });
    // Sin el dato de quién recogió no se inventa nada.
    expect(pickupOrderView(order({ status: 'delivered', receivedByName: '.' }))?.receivedByName).toBe('');
  });

  it('datos sucios de la sucursal: "." y vacíos no se pintan', () => {
    const view = pickupOrderView(
      order({ pickupBranch: { code: '164', name: 'Puebla Centro', street: '.', city: 'Puebla', state: '', zip: null, phone: '.' } }),
    );
    expect(view?.branch).toMatchObject({ street: '', city: 'Puebla', state: '', zip: '', phone: '', phoneHref: null, mapUrl: null });
  });

  it('sucursal sin nombre: el que ya traía el pedido, o su clave', () => {
    const noName = { code: '164', name: '.', street: 'Av. Juárez 123', city: null, state: null, zip: null, phone: null };
    expect(pickupOrderView(order({ pickupBranch: noName }))?.branch?.name).toBe('Puebla Centro');
    expect(pickupOrderView(order({ pickupBranch: noName, pickupBranchName: null }))?.branch?.name).toBe('164');
  });

  it('API anterior (sin `pickupBranch`) o sucursal con solo el nombre: no hay caja de sucursal', () => {
    expect(pickupOrderView(order({ pickupBranch: undefined }))?.branch).toBeNull();
    expect(pickupOrderView(order({ pickupBranch: null }))?.branch).toBeNull();
    const onlyName = { code: '164', name: 'Puebla Centro', street: null, city: '.', state: '', zip: null, phone: null };
    expect(pickupOrderView(order({ pickupBranch: onlyName }))?.branch).toBeNull();
    // El seguimiento sí sale: no depende de los campos nuevos.
    expect(states(order({ pickupBranch: undefined, readyAt: undefined, receivedByName: undefined }))).toEqual([
      'paid:done',
      'preparing:current',
      'ready:todo',
      'delivered:todo',
    ]);
  });
});
