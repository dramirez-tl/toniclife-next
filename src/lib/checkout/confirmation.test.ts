import { describe, expect, it } from 'vitest';
import type { Order, TrackingInfo } from '@/types/order';
import type { CheckoutConfirmation } from '@/types/checkout-confirmation';
import {
  addressLinesFromSnapshot,
  confirmationSteps,
  fromGuestConfirmation,
  fromMyOrder,
  isAwaitingPayment,
} from './confirmation';

function order(over: Partial<Order> = {}): Order {
  return {
    id: 'o-1',
    orderNumber: 'TL2610280001',
    status: 'confirmed',
    paymentStatus: 'paid',
    subtotal: '1000.00',
    taxAmount: '160.00',
    discountAmount: '0',
    shippingAmount: '150.00',
    total: '1310.00',
    totalPoints: 42,
    totalBusinessValue: '900',
    orderDate: '2026-10-28',
    isActive: true,
    createdAt: '2026-10-28T22:10:00.000Z',
    updatedAt: '2026-10-28T22:10:00.000Z',
    items: [
      {
        id: 'i-1',
        productId: '8f1c2d3e-0000-0000-0000-000000000001',
        productName: 'Omega 3 Premium',
        productCode: '6001',
        quantity: 2,
        unitPrice: '500.00',
        totalPrice: '1000.00',
        points: 21,
        businessValue: '450',
        isActive: true,
      },
    ],
    shippingAddressSnapshot: {
      fullName: 'Ana López',
      phone: '5512345678',
      street: 'Av. Reforma',
      exteriorNumber: '10',
      neighborhood: 'Centro',
      city: 'Puebla',
      state: 'Puebla',
      postalCode: '72000',
      country: 'MX',
    },
    ...over,
  };
}

function guest(over: Partial<CheckoutConfirmation> = {}): CheckoutConfirmation {
  return {
    orderId: 'o-2',
    orderNumber: 'TL2610280002',
    status: 'confirmed',
    paymentStatus: 'paid',
    createdAt: '2026-10-28T22:10:00.000Z',
    orderDate: '2026-10-28',
    currencyCode: 'USD',
    subtotal: '80.00',
    shippingAmount: '0',
    taxAmount: '0',
    discountAmount: '5.00',
    total: '75.00',
    buyer: { firstName: 'Mike' },
    items: [{ productName: 'Gorra Tonic', productCode: 'SV-01', quantity: 1, unitPrice: '80.00', totalPrice: '80.00' }],
    delivery: { mode: 'pickup', pickupBranch: { code: '427', name: 'Acapulco Diamante', city: 'Acapulco' } },
    ...over,
  };
}

describe('confirmation · fromMyOrder (distribuidor con sesión)', () => {
  it('un pedido pendiente queda en "confirmando tu pago" (awaitingPayment)', () => {
    const v = fromMyOrder(order({ status: 'pending', paymentStatus: 'pending' }));
    expect(isAwaitingPayment(v)).toBe(true);
    expect(v.cancelled).toBe(false);
    expect(v.paymentFailed).toBe(false);
    // Mientras se confirma no hay pasos cumplidos.
    expect(confirmationSteps(v).every((s) => s.state === 'todo')).toBe(true);
  });

  it('sin paymentStatus (pedido migrado) se infiere del estado', () => {
    expect(fromMyOrder(order({ paymentStatus: undefined })).paymentStatus).toBe('paid');
    expect(fromMyOrder(order({ status: 'pending', paymentStatus: undefined })).awaitingPayment).toBe(true);
  });

  it('cancelado y pago fallido no son "esperando pago"', () => {
    expect(fromMyOrder(order({ status: 'cancelled' })).cancelled).toBe(true);
    expect(fromMyOrder(order({ status: 'cancelled' })).awaitingPayment).toBe(false);
    const failed = fromMyOrder(order({ status: 'pending', paymentStatus: 'failed' }));
    expect(failed.paymentFailed).toBe(true);
    expect(failed.awaitingPayment).toBe(false);
  });

  it('renglones con NOMBRE de producto (nunca el id), totales numéricos y puntos', () => {
    const v = fromMyOrder(order());
    expect(v.items).toEqual([{ key: 'i-1', name: 'Omega 3 Premium', quantity: 2, total: 1000 }]);
    expect(v.items[0].name).not.toContain('8f1c2d3e');
    expect(v.totals).toEqual({ subtotal: 1000, shipping: 150, tax: 160, discount: 0, total: 1310 });
    expect(v.points).toBe(42);
    expect(v.currencyCode).toBe('MXN');
    expect(v.buyerFirstName).toBe('Ana');
  });

  it('moneda: la del pedido manda; sin ella, la de la confirmación pública; MXN al final', () => {
    // OrderDto no traía currencyCode y la página formateaba USD como MXN (28-oct-2026).
    expect(fromMyOrder(order({ currencyCode: 'USD' })).currencyCode).toBe('USD');
    expect(fromMyOrder(order({ currencyCode: 'USD' }), null, { currencyCode: 'MXN' }).currencyCode).toBe('USD');
    expect(fromMyOrder(order(), null, { currencyCode: 'USD' }).currencyCode).toBe('USD');
    expect(fromMyOrder(order(), null, { currencyCode: ' ' }).currencyCode).toBe('MXN');
    expect(fromMyOrder(order(), null, { currencyCode: null }).currencyCode).toBe('MXN');
    expect(fromMyOrder(order()).currencyCode).toBe('MXN');
  });

  it('sin nombre cae a la clave y, sin clave, a null (la UI pone el genérico)', () => {
    const v = fromMyOrder(
      order({
        items: [
          { ...order().items[0], productName: undefined },
          { ...order().items[0], id: 'i-2', productName: undefined, productCode: undefined },
        ],
      }),
    );
    expect(v.items.map((i) => i.name)).toEqual(['6001', null]);
  });

  it('envío: líneas de dirección sin campos vacíos; recoger: sin dirección y con la sucursal', () => {
    const v = fromMyOrder(order());
    expect(v.delivery.mode).toBe('shipping');
    expect(v.delivery.addressLines).toEqual([
      'Ana López',
      'Av. Reforma #10',
      'Centro',
      'Puebla, Puebla · CP 72000',
      'Tel. 5512345678',
    ]);
    const p = fromMyOrder(order({ pickupBranchId: 'b-427' }), null, { pickupBranchName: '427 Acapulco Diamante' });
    expect(p.delivery).toEqual({ mode: 'pickup', pickupBranchName: '427 Acapulco Diamante', addressLines: [] });
  });

  it('toma la entrega de almacén del tracking', () => {
    const tracking: TrackingInfo = {
      orderNumber: 'TL2610280001',
      status: 'confirmed',
      shippingStatus: 'shipped',
      statusHistory: [],
      delivery: {
        id: 'd-1',
        status: 'shipped',
        statusLabel: 'Enviado',
        mode: 'shipping',
        fulfillBranchName: 'Almacén E-commerce',
        carrier: 'FedEx',
        trackingNumber: '7890',
        trackingUrl: 'https://www.fedex.com/fedextrack/?trknbr=7890',
        requestedAt: '2026-10-28T22:11:00.000Z',
        readyAt: null,
        shippedAt: '2026-10-29T15:00:00.000Z',
        deliveredAt: null,
        cancelledAt: null,
      },
    };
    const v = fromMyOrder(order(), tracking);
    expect(v.fulfillment).toMatchObject({ status: 'shipped', carrier: 'FedEx', trackingNumber: '7890' });
    expect(fromMyOrder(order(), { ...tracking, delivery: undefined }).fulfillment).toBeNull();
  });
});

describe('confirmation · fromGuestConfirmation (sin sesión)', () => {
  it('mapea el DTO público: moneda, comprador, recoger en sucursal y 0 puntos', () => {
    const v = fromGuestConfirmation(guest());
    expect(v.currencyCode).toBe('USD');
    expect(v.buyerFirstName).toBe('Mike');
    expect(v.points).toBe(0);
    expect(v.delivery).toEqual({ mode: 'pickup', pickupBranchName: '427 Acapulco Diamante', addressLines: [] });
    expect(v.items).toEqual([{ key: 'SV-01-0', name: 'Gorra Tonic', quantity: 1, total: 80 }]);
    expect(v.totals.discount).toBe(5);
  });

  it('pago pendiente / fallido del DTO', () => {
    expect(fromGuestConfirmation(guest({ status: 'pending', paymentStatus: 'pending' })).awaitingPayment).toBe(true);
    const failed = fromGuestConfirmation(guest({ status: 'pending', paymentStatus: 'failed' }));
    expect(failed.paymentFailed).toBe(true);
    expect(failed.awaitingPayment).toBe(false);
  });

  it('envío: dirección con las claves del checkout (extNumber/zipCode)', () => {
    const v = fromGuestConfirmation(
      guest({
        delivery: {
          mode: 'shipping',
          address: { street: 'Calle 5', extNumber: '12', intNumber: '3', city: 'Tulsa', state: 'OK', zipCode: '74101' },
        },
      }),
    );
    expect(v.delivery.addressLines).toEqual(['Calle 5 #12 Int. 3', 'Tulsa, OK · CP 74101']);
  });
});

describe('confirmation · pasos', () => {
  it('recoger: 3 pasos; sin entrega = preparando (current)', () => {
    const v = fromGuestConfirmation(guest());
    expect(confirmationSteps(v)).toEqual([
      { key: 'confirmed', state: 'done' },
      { key: 'preparing', state: 'current' },
      { key: 'pickupDelivered', state: 'todo' },
    ]);
  });

  it('envío con entrega "shipped": enviado done y entregado todo', () => {
    const v = fromMyOrder(order(), {
      orderNumber: 'x',
      status: 'confirmed',
      shippingStatus: 'shipped',
      statusHistory: [],
      delivery: {
        id: 'd',
        status: 'shipped',
        statusLabel: 'Enviado',
        mode: 'shipping',
        fulfillBranchName: 'A',
        carrier: null,
        trackingNumber: null,
        trackingUrl: null,
        requestedAt: '',
        readyAt: null,
        shippedAt: null,
        deliveredAt: null,
        cancelledAt: null,
      },
    });
    expect(confirmationSteps(v)).toEqual([
      { key: 'confirmed', state: 'done' },
      { key: 'preparing', state: 'done' },
      { key: 'ready', state: 'done' },
      { key: 'shipped', state: 'done' },
      { key: 'delivered', state: 'todo' },
    ]);
  });

  it('envío sin entrega: confirmado done, preparando current, el resto todo', () => {
    expect(confirmationSteps(fromMyOrder(order())).map((s) => s.state)).toEqual([
      'done',
      'current',
      'todo',
      'todo',
      'todo',
    ]);
  });

  it('recoger entregado en mostrador: todo done', () => {
    const v = fromGuestConfirmation(
      guest({
        fulfillment: {
          id: 'd',
          status: 'delivered',
          statusLabel: 'Entregado',
          mode: 'pickup',
          fulfillBranchName: '427',
          carrier: null,
          trackingNumber: null,
          trackingUrl: null,
          requestedAt: '',
          readyAt: null,
          shippedAt: null,
          deliveredAt: '2026-10-30T18:00:00.000Z',
          cancelledAt: null,
        },
      }),
    );
    expect(confirmationSteps(v).every((s) => s.state === 'done')).toBe(true);
  });
});

describe('confirmation · addressLinesFromSnapshot', () => {
  it('ignora campos vacíos y acepta claves camelCase del checkout, del DTO y snake_case', () => {
    expect(addressLinesFromSnapshot(null)).toEqual([]);
    expect(addressLinesFromSnapshot({ street: '', city: '', state: '' })).toEqual([]);
    expect(addressLinesFromSnapshot({ street: 'A', exterior_number: '1', zip_code: '01000', city: 'CDMX' })).toEqual([
      'A #1',
      'CDMX · CP 01000',
    ]);
  });
});
