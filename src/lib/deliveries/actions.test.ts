import { describe, expect, it } from 'vitest';
import type { DeliveryStatus } from '@/types/deliveries';
import {
  ORDER_CANCEL_NOTICE,
  availableDeliveryActions,
  canCancelDelivery,
  deliveryActionTitle,
  deliveryCancelNotice,
  deliveryDocLabel,
  deliveryModeOf,
  deliveryPaymentNotice,
  deliveryPaymentShort,
  deliveryStatusClasses,
  isDeliveryPaid,
  paymentMethodLabel,
} from './actions';

const STATUSES: DeliveryStatus[] = ['pending', 'ready', 'shipped', 'delivered', 'cancelled'];

describe('deliveries/actions · acciones por estado, modo y cobro', () => {
  it('sin permiso no hay acciones, en ningún estado ni modo', () => {
    for (const status of STATUSES) {
      expect(availableDeliveryActions({ status, saleStatus: 'completed', deliveryMode: 'shipping' }, false)).toEqual([]);
      expect(availableDeliveryActions({ status, saleStatus: 'completed', deliveryMode: 'pickup' }, false)).toEqual([]);
    }
  });

  it('envío (tabla actual): pendiente → listo/enviado/cancelar; listo → enviado/regresar/cancelar; enviado → entregado/corregir/no se envió', () => {
    const paid = (status: DeliveryStatus) =>
      availableDeliveryActions({ status, saleStatus: 'completed', deliveryMode: 'shipping' }, true);
    expect(paid('pending')).toEqual(['ready', 'shipped', 'cancelled']);
    expect(paid('ready')).toEqual(['shipped', 'unready', 'cancelled']);
    expect(paid('shipped')).toEqual(['delivered', 'edit', 'unship']);
    expect(paid('delivered')).toEqual([]);
    expect(paid('cancelled')).toEqual([]);
  });

  it('envío sin cobrar: solo cancelar (y regresar a pendiente desde listo)', () => {
    const unpaid = (status: DeliveryStatus) =>
      availableDeliveryActions({ status, saleStatus: 'pending', deliveryMode: 'shipping' }, true);
    expect(unpaid('pending')).toEqual(['cancelled']);
    expect(unpaid('ready')).toEqual(['unready', 'cancelled']);
  });

  it('recoger en sucursal: pendiente → entregado en mostrador o cancelar; nunca listo/enviado', () => {
    const pickup = (status: DeliveryStatus, saleStatus = 'completed') =>
      availableDeliveryActions({ status, saleStatus, deliveryMode: 'pickup' }, true);
    expect(pickup('pending')).toEqual(['delivered', 'cancelled']);
    expect(pickup('pending', 'pending')).toEqual(['cancelled']);
    expect(pickup('pending', 'cancelled')).toEqual(['cancelled']);
    expect(pickup('ready')).toEqual([]);
    expect(pickup('shipped')).toEqual([]);
    expect(pickup('delivered')).toEqual([]);
    expect(pickup('cancelled')).toEqual([]);
  });

  it('pedido web: nunca "cancelar entrega" (se anula desde Pedidos, en cascada); lo demás igual', () => {
    const web = (status: DeliveryStatus, deliveryMode: 'shipping' | 'pickup' = 'shipping', saleStatus = 'completed') =>
      availableDeliveryActions({ kind: 'order', status, saleStatus, deliveryMode }, true);
    expect(web('pending')).toEqual(['ready', 'shipped']);
    expect(web('ready')).toEqual(['shipped', 'unready']);
    expect(web('shipped')).toEqual(['delivered', 'edit', 'unship']);
    expect(web('pending', 'pickup')).toEqual(['delivered']);
    // Sin pagar / cancelado: tampoco hay cancelación de entrega (el pedido manda).
    expect(web('pending', 'shipping', 'pending')).toEqual([]);
    expect(web('ready', 'shipping', 'pending')).toEqual(['unready']);
    expect(web('pending', 'pickup', 'cancelled')).toEqual([]);
    for (const status of STATUSES) {
      expect(web(status)).not.toContain('cancelled');
      expect(web(status, 'pickup')).not.toContain('cancelled');
    }
    // Las ventas POS (con kind explícito o sin él) sí se cancelan desde la bandeja.
    expect(availableDeliveryActions({ kind: 'pos_sale', status: 'pending', saleStatus: 'completed' }, true)).toContain(
      'cancelled',
    );
    expect(canCancelDelivery({ kind: 'order' })).toBe(false);
    expect(canCancelDelivery({ kind: 'pos_sale' })).toBe(true);
    expect(canCancelDelivery({})).toBe(true);
  });

  it('aviso de cancelación: solo pedidos web pendientes o listos', () => {
    expect(deliveryCancelNotice({ kind: 'order', status: 'pending' })).toBe(ORDER_CANCEL_NOTICE);
    expect(deliveryCancelNotice({ kind: 'order', status: 'ready' })).toBe(ORDER_CANCEL_NOTICE);
    expect(deliveryCancelNotice({ kind: 'order', status: 'shipped' })).toBeNull();
    expect(deliveryCancelNotice({ kind: 'order', status: 'delivered' })).toBeNull();
    expect(deliveryCancelNotice({ kind: 'order', status: 'cancelled' })).toBeNull();
    expect(deliveryCancelNotice({ kind: 'pos_sale', status: 'pending' })).toBeNull();
    expect(deliveryCancelNotice({ status: 'pending' })).toBeNull();
    expect(ORDER_CANCEL_NOTICE).toContain('Pedidos › Cancelar pedido');
  });

  it('sin deliveryMode (API anterior a la mig 176) se comporta como envío', () => {
    expect(deliveryModeOf({})).toBe('shipping');
    expect(deliveryModeOf({ deliveryMode: 'pickup' })).toBe('pickup');
    expect(availableDeliveryActions({ status: 'pending', saleStatus: 'completed' }, true)).toEqual([
      'ready',
      'shipped',
      'cancelled',
    ]);
  });
});

describe('deliveries/actions · etiquetas', () => {
  it('título de la acción según el modo', () => {
    expect(deliveryActionTitle('delivered')).toBe('Marcar entregado');
    expect(deliveryActionTitle('delivered', 'shipping')).toBe('Marcar entregado');
    expect(deliveryActionTitle('delivered', 'pickup')).toBe('Entregado en mostrador');
    expect(deliveryActionTitle('shipped', 'pickup')).toBe('Marcar enviado');
    expect(deliveryActionTitle('cancelled')).toBe('Cancelar entrega');
  });

  it('documento: pedido web vs venta POS (sin kind = venta)', () => {
    expect(deliveryDocLabel({ kind: 'order', saleNumber: 'TL2610280001' })).toBe('Pedido web TL2610280001');
    expect(deliveryDocLabel({ kind: 'pos_sale', saleNumber: '164-20261028-0007' })).toBe('Venta 164-20261028-0007');
    expect(deliveryDocLabel({ saleNumber: '164-1' })).toBe('Venta 164-1');
  });

  it('cobro: completed = pagada; avisos distintos para venta y pedido', () => {
    expect(isDeliveryPaid({ saleStatus: 'completed' })).toBe(true);
    expect(isDeliveryPaid({ saleStatus: 'pending' })).toBe(false);
    expect(deliveryPaymentShort({ saleStatus: 'completed' })).toBeNull();
    expect(deliveryPaymentShort({ saleStatus: 'pending' })).toBe('Venta sin cobrar');
    expect(deliveryPaymentShort({ kind: 'pos_sale', saleStatus: 'cancelled' })).toBe('Venta cancelled');
    expect(deliveryPaymentShort({ kind: 'order', saleStatus: 'pending' })).toBe('Pedido sin pagar');
    expect(deliveryPaymentShort({ kind: 'order', saleStatus: 'cancelled' })).toBe('Pedido cancelado');
    expect(deliveryPaymentNotice({ kind: 'order', saleStatus: 'completed' })).toBeNull();
    expect(deliveryPaymentNotice({ kind: 'order', saleStatus: 'cancelled' })).toBe(
      'El pedido no está pagado o fue cancelado; no se puede surtir.',
    );
    expect(deliveryPaymentNotice({ kind: 'pos_sale', saleStatus: 'pending' })).toBe(
      'La venta está sin cobrar; no se puede surtir.',
    );
  });

  it('métodos de pago: los del POS siguen igual y los del pedido web se nombran', () => {
    expect(paymentMethodLabel('cash')).toBe('Efectivo');
    expect(paymentMethodLabel('credit')).toBe('Tarjeta de crédito');
    expect(paymentMethodLabel('credit_card')).toBe('Tarjeta (en línea)');
    expect(paymentMethodLabel('stripe')).toBe('Tarjeta (en línea)');
    expect(paymentMethodLabel('debit_card')).toBe('Tarjeta de débito (en línea)');
    expect(paymentMethodLabel('otro')).toBe('otro');
    expect(paymentMethodLabel(null)).toBe('—');
    expect(paymentMethodLabel(undefined)).toBe('—');
  });

  it('colores por estado con respaldo', () => {
    expect(deliveryStatusClasses('shipped')).toContain('indigo');
    expect(deliveryStatusClasses('lo-que-sea')).toBe(deliveryStatusClasses('pending'));
  });
});
