import { describe, expect, it } from 'vitest';
import {
  SALES_CHANNEL_OPTIONS,
  channelCoverageText,
  isOnlineLine,
  linePaymentLabel,
  onlineOrdersText,
  saleFolioHref,
  salesChannelParam,
} from './sales-channel';

const LABELS = { cash: 'Efectivo', credit: 'Tarjeta de crédito' };

describe('canal de Ventas por Producto (caja / tienda en línea)', () => {
  it('por defecto trae los dos canales y al API no le manda nada', () => {
    expect(SALES_CHANNEL_OPTIONS.map((o) => o.value)).toEqual(['all', 'pos', 'online']);
    expect(SALES_CHANNEL_OPTIONS[0].label).toBe('Caja y tienda en línea');
    expect(salesChannelParam('all')).toBeUndefined();
    expect(salesChannelParam(undefined)).toBeUndefined();
    expect(salesChannelParam(null)).toBeUndefined();
    expect(salesChannelParam('pos')).toBe('pos');
    expect(salesChannelParam('online')).toBe('online');
  });

  it('un renglón sin canal es de caja', () => {
    expect(isOnlineLine({ channel: 'online' })).toBe(true);
    expect(isOnlineLine({ channel: 'pos' })).toBe(false);
    expect(isOnlineLine({})).toBe(false);
    expect(isOnlineLine({ channel: null })).toBe(false);
  });

  it('forma de pago: la del pedido en línea ya viene en palabras; la de caja se traduce', () => {
    expect(linePaymentLabel({ paymentMethod: 'credit_card', paymentLabel: 'Tarjeta en línea (Stripe)' }, LABELS)).toBe(
      'Tarjeta en línea (Stripe)',
    );
    expect(linePaymentLabel({ paymentMethod: 'cash' }, LABELS)).toBe('Efectivo');
    // Un código que la pantalla no conoce se muestra tal cual; sin código, raya.
    expect(linePaymentLabel({ paymentMethod: 'legacy:7' }, LABELS)).toBe('legacy:7');
    expect(linePaymentLabel({ paymentMethod: '' }, LABELS)).toBe('—');
    expect(linePaymentLabel({}, LABELS)).toBe('—');
    expect(linePaymentLabel({ paymentMethod: 'cash', paymentLabel: '' }, LABELS)).toBe('Efectivo');
  });

  it('la liga del folio: caja por folio; en línea, en el filtro de Stripe de Reportes › Ventas', () => {
    expect(saleFolioHref({ saleNumber: '156-20261114-0018', channel: 'pos' })).toBe(
      '/admin/reportes/ventas?search=156-20261114-0018',
    );
    expect(saleFolioHref({ saleNumber: '156-20261114-0018' })).toBe('/admin/reportes/ventas?search=156-20261114-0018');
    expect(saleFolioHref({ saleNumber: 'TL2611140003', channel: 'online' })).toBe(
      '/admin/reportes/ventas?paymentMethod=stripe&search=TL2611140003',
    );
    expect(saleFolioHref({ saleNumber: 'A B/1', channel: 'pos' })).toBe('/admin/reportes/ventas?search=A%20B%2F1');
  });

  it('la nota dice qué cuenta cada canal', () => {
    expect(channelCoverageText('all')).toMatch(/Ventas de caja.*Pedidos de la tienda en línea/);
    expect(channelCoverageText(undefined)).toBe(channelCoverageText('all'));
    expect(channelCoverageText('pos')).toMatch(/^Ventas de caja/);
    expect(channelCoverageText('pos')).not.toMatch(/tienda en línea/i);
    expect(channelCoverageText('online')).toMatch(/^Pedidos de la tienda en línea/);
    expect(channelCoverageText('online')).not.toMatch(/caja/i);
  });

  it('cuenta pedidos en singular y plural', () => {
    expect(onlineOrdersText(1)).toBe('1 pedido en línea');
    expect(onlineOrdersText(31)).toBe('31 pedidos en línea');
  });
});
