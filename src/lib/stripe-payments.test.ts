import { describe, expect, it } from 'vitest';
import { PAYMENT_METHOD_OPTIONS } from '@/components/admin/pos/payment-method-options';
import {
  STRIPE_CSV_HEADERS,
  STRIPE_FILTER_VALUE,
  type StripePaymentRow,
  buildStripePaymentsCsv,
  formatStripeCentro,
  formatStripeOrderDate,
  formatStripeUtc,
  isStripeFilter,
  isStripeOrderVoided,
  stripeAccountLabel,
  stripeCsvFilename,
  stripeMethodLabel,
  stripeOrderStatusLabel,
  stripeSearchHint,
} from './stripe-payments';

const row = (over: Partial<StripePaymentRow> = {}): StripePaymentRow => ({
  paymentId: 'p-1',
  orderId: 'o-1',
  orderNumber: 'TL2611140025',
  orderDate: '2026-11-14',
  orderStatus: 'confirmed',
  paidAt: '2026-11-14T23:56:03.249Z',
  amount: 562,
  currencyCode: 'MXN',
  method: 'card',
  gatewayAccount: 'mx',
  paymentIntentId: 'pi_3TestAbcDEf1gHIJK0aBcDeF',
  checkoutSessionId: 'cs_live_a1B2c3D4e5F6',
  oxxoReference: null,
  branchId: 'b-144',
  branchCode: '144',
  branchName: 'Puebla Loreto TL',
  customerNumber: '1786956',
  customerName: 'NOMBRE DE PRUEBA',
  invoiced: false,
  ...over,
});

describe('"Stripe" es solo un filtro de Reportes › Ventas', () => {
  it('no está entre las formas de pago del POS ni en el diálogo de corregir el método', () => {
    expect(PAYMENT_METHOD_OPTIONS.map((o) => o.value)).not.toContain(STRIPE_FILTER_VALUE);
  });

  it('reconoce cuándo el filtro elegido es Stripe', () => {
    expect(isStripeFilter('stripe')).toBe(true);
    expect(isStripeFilter('credit')).toBe(false);
    expect(isStripeFilter('all')).toBe(false);
    expect(isStripeFilter(undefined)).toBe(false);
  });
});

describe('fechas para conciliar', () => {
  it('la hora UTC sale igual que en el archivo de Stripe', () => {
    // El cargo de la captura de Contabilidad: "14/11/2026 23:56" en Stripe.
    expect(formatStripeUtc('2026-11-14T23:56:03.249Z')).toBe('14/11/2026 23:56');
    expect(formatStripeUtc('2026-11-15T01:34:00Z')).toBe('15/11/2026 01:34');
  });

  it('la hora Centro va 6 horas atrás (y puede caer en otro día)', () => {
    expect(formatStripeCentro('2026-11-14T23:56:03.249Z')).toBe('14/11/2026 17:56');
    // 01:34 UTC del 15 = 19:34 del 14 en hora Centro.
    expect(formatStripeCentro('2026-11-15T01:34:00Z')).toBe('14/11/2026 19:34');
    expect(formatStripeCentro('2026-11-14T06:00:00Z')).toBe('14/11/2026 00:00');
  });

  it('sin fecha o con fecha rota no truena', () => {
    expect(formatStripeUtc(null)).toBe('');
    expect(formatStripeUtc('no-es-fecha')).toBe('');
    expect(formatStripeCentro(undefined)).toBe('');
    expect(formatStripeOrderDate('2026-11-14')).toBe('14/11/2026');
    expect(formatStripeOrderDate(null)).toBe('');
  });
});

describe('textos', () => {
  it('forma de cobro, cuenta y estado del pedido', () => {
    expect(stripeMethodLabel('card')).toBe('Stripe · Tarjeta');
    expect(stripeMethodLabel('oxxo')).toBe('Stripe · OXXO');
    expect(stripeMethodLabel('other')).toBe('Stripe');
    expect(stripeAccountLabel('mx')).toBe('México');
    expect(stripeAccountLabel(' US ')).toBe('Estados Unidos');
    expect(stripeAccountLabel(null)).toBe('—');
    expect(stripeOrderStatusLabel('confirmed')).toBe('Pagado');
    expect(stripeOrderStatusLabel('delivered')).toBe('Entregado');
    expect(stripeOrderStatusLabel('algo_nuevo')).toBe('algo_nuevo');
    expect(isStripeOrderVoided('cancelled')).toBe(true);
    expect(isStripeOrderVoided('confirmed')).toBe(false);
  });

  it('explica una búsqueda por cargo (ch_) y un id incompleto', () => {
    expect(stripeSearchHint('intent', 'ch_3TestAbcDEf1gHIJKzXyW9vU')).toContain('PaymentIntent');
    // Buscar por el propio pi_ no necesita explicación.
    expect(stripeSearchHint('intent', 'pi_3TestAbcDEf1gHIJK0aBcDeF')).toBeNull();
    expect(stripeSearchHint('too_short', 'ch_3U')).toContain('incompleto');
    expect(stripeSearchHint('text', '0025')).toContain('folio');
    expect(stripeSearchHint('none', '')).toBeNull();
    expect(stripeSearchHint('session', 'cs_live_a1B2c3D4')).toBeNull();
  });
});

describe('CSV para cruzar con el archivo de Stripe', () => {
  it('trae el PaymentIntent y las dos horas del cobro', () => {
    const csv = buildStripePaymentsCsv([row()]);
    expect(csv.startsWith('﻿')).toBe(true);
    const [header, line] = csv.slice(1).trimEnd().split('\r\n');
    expect(header.split(',')).toEqual([...STRIPE_CSV_HEADERS]);
    expect(line).toBe(
      'TL2611140025,14/11/2026,14/11/2026 17:56,14/11/2026 23:56,144 Puebla Loreto TL,1786956,NOMBRE DE PRUEBA,' +
        'Stripe · Tarjeta,562.00,MXN,pi_3TestAbcDEf1gHIJK0aBcDeF,cs_live_a1B2c3D4e5F6,,México,Pagado,No',
    );
  });

  it('OXXO lleva su referencia y escapa comas y comillas', () => {
    const csv = buildStripePaymentsCsv([
      row({ method: 'oxxo', oxxoReference: '93000012345', customerName: 'PEREZ, "PEPE"', invoiced: true, amount: 1234.5 }),
    ]);
    const line = csv.slice(1).trimEnd().split('\r\n')[1];
    expect(line).toContain('"PEREZ, ""PEPE"""');
    expect(line).toContain('Stripe · OXXO,1234.50,MXN');
    expect(line).toContain(',93000012345,México,Pagado,Sí');
  });

  it('sin renglones deja solo el encabezado', () => {
    expect(buildStripePaymentsCsv([]).slice(1).trimEnd().split('\r\n')).toHaveLength(1);
  });

  it('nombre del archivo', () => {
    expect(stripeCsvFilename('2026-11-14', '2026-11-14')).toBe('cobros_stripe_2026-11-14_2026-11-14.csv');
    expect(stripeCsvFilename('', undefined)).toBe('cobros_stripe_inicio_hoy.csv');
  });
});
