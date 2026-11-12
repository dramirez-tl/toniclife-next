import { describe, expect, it } from 'vitest';
import {
  clampOxxoDays,
  formatOxxoDeadline,
  formatOxxoReference,
  oxxoOption,
  oxxoOrderState,
  oxxoPreviewDeadlineDay,
  readOrderOxxo,
  readOxxoConfig,
  shouldPollPendingPayment,
  type OxxoConfig,
} from './payment-options';

const ON: OxxoConfig = { enabled: true, expiresAfterDays: 2, minAmount: 10, maxAmount: 10_000 };

describe('payment-options · interruptor de OXXO (estado del piloto)', () => {
  it('API anterior o bloque ilegible: OXXO no existe (null)', () => {
    expect(readOxxoConfig(undefined)).toBeNull();
    expect(readOxxoConfig(null)).toBeNull();
    expect(readOxxoConfig({ checkoutEnabled: true })).toBeNull();
    expect(readOxxoConfig({ checkoutEnabled: true, oxxo: null })).toBeNull();
    expect(readOxxoConfig({ checkoutEnabled: true, oxxo: 'on' })).toBeNull();
    expect(readOxxoConfig({ checkoutEnabled: true, oxxo: [true] })).toBeNull();
    expect(readOxxoConfig('oxxo')).toBeNull();
  });

  it('lee el bloque tal como lo manda el API', () => {
    expect(
      readOxxoConfig({ checkoutEnabled: true, oxxo: { enabled: true, expiresAfterDays: 3, minAmount: 10, maxAmount: 10000 } }),
    ).toEqual({ enabled: true, expiresAfterDays: 3, minAmount: 10, maxAmount: 10000 });
  });

  it('solo un `enabled: true` EXPRESO lo enciende', () => {
    expect(readOxxoConfig({ oxxo: { enabled: false } })?.enabled).toBe(false);
    expect(readOxxoConfig({ oxxo: {} })?.enabled).toBe(false);
    expect(readOxxoConfig({ oxxo: { enabled: 'true' } })?.enabled).toBe(false);
    expect(readOxxoConfig({ oxxo: { enabled: 1 } })?.enabled).toBe(false);
  });

  it('vigencia: entera, de 1 a 7 días; ilegible = 2', () => {
    expect(clampOxxoDays(1)).toBe(1);
    expect(clampOxxoDays(7)).toBe(7);
    expect(clampOxxoDays(0)).toBe(1);
    expect(clampOxxoDays(-3)).toBe(1);
    expect(clampOxxoDays(30)).toBe(7);
    expect(clampOxxoDays(2.6)).toBe(3);
    expect(clampOxxoDays('5')).toBe(5);
    expect(clampOxxoDays(undefined)).toBe(2);
    expect(clampOxxoDays(null)).toBe(2);
    expect(clampOxxoDays('dos')).toBe(2);
    expect(clampOxxoDays(Number.NaN)).toBe(2);
    expect(readOxxoConfig({ oxxo: { enabled: true, expiresAfterDays: 99 } })?.expiresAfterDays).toBe(7);
    expect(readOxxoConfig({ oxxo: { enabled: true } })?.expiresAfterDays).toBe(2);
  });

  it('límites: los del API si son legibles; si no, $10 y $10,000', () => {
    expect(readOxxoConfig({ oxxo: { enabled: true } })).toMatchObject({ minAmount: 10, maxAmount: 10_000 });
    expect(readOxxoConfig({ oxxo: { enabled: true, minAmount: '10.00', maxAmount: '10000.00' } })).toMatchObject({
      minAmount: 10,
      maxAmount: 10_000,
    });
    expect(readOxxoConfig({ oxxo: { enabled: true, minAmount: 50, maxAmount: 5000 } })).toMatchObject({
      minAmount: 50,
      maxAmount: 5000,
    });
    expect(readOxxoConfig({ oxxo: { enabled: true, minAmount: 0, maxAmount: -1 } })).toMatchObject({
      minAmount: 10,
      maxAmount: 10_000,
    });
    expect(readOxxoConfig({ oxxo: { enabled: true, minAmount: 'x', maxAmount: null } })).toMatchObject({
      minAmount: 10,
      maxAmount: 10_000,
    });
    // Invertidos (mínimo mayor que el máximo) no se usan.
    expect(readOxxoConfig({ oxxo: { enabled: true, minAmount: 20_000, maxAmount: 500 } })).toMatchObject({
      minAmount: 10,
      maxAmount: 10_000,
    });
  });
});

describe('payment-options · OXXO como forma de pago del checkout', () => {
  const mx = { pilotOxxo: ON, storeCountryCode: 'MX', currencyCode: 'MXN' };

  it('tienda de México, en pesos y encendido: se ofrece y se puede elegir', () => {
    expect(oxxoOption({ ...mx, total: 1310 })).toEqual({ offered: true, selectable: true });
    expect(oxxoOption({ ...mx, total: '1310.00' })).toEqual({ offered: true, selectable: true });
    expect(oxxoOption({ ...mx, storeCountryCode: 'mx', currencyCode: 'mxn', total: 500 }).offered).toBe(true);
  });

  it('límites de Stripe: $10 y $10,000 exactos sí; un centavo fuera, no (y se dice por qué)', () => {
    expect(oxxoOption({ ...mx, total: 10 })).toEqual({ offered: true, selectable: true });
    expect(oxxoOption({ ...mx, total: '10.00' })).toEqual({ offered: true, selectable: true });
    expect(oxxoOption({ ...mx, total: 9.99 })).toEqual({ offered: true, selectable: false, reason: 'below_min' });
    expect(oxxoOption({ ...mx, total: 0 })).toEqual({ offered: true, selectable: false, reason: 'below_min' });
    expect(oxxoOption({ ...mx, total: 10_000 })).toEqual({ offered: true, selectable: true });
    expect(oxxoOption({ ...mx, total: '10000.00' })).toEqual({ offered: true, selectable: true });
    expect(oxxoOption({ ...mx, total: 10_000.01 })).toEqual({ offered: true, selectable: false, reason: 'above_max' });
    expect(oxxoOption({ ...mx, total: '25000.00' })).toEqual({ offered: true, selectable: false, reason: 'above_max' });
  });

  it('usa los límites que manda el servidor', () => {
    const config = { ...ON, minAmount: 50, maxAmount: 5000 };
    expect(oxxoOption({ ...mx, pilotOxxo: config, total: 49.99 }).reason).toBe('below_min');
    expect(oxxoOption({ ...mx, pilotOxxo: config, total: 5000 }).selectable).toBe(true);
    expect(oxxoOption({ ...mx, pilotOxxo: config, total: 5000.5 }).reason).toBe('above_max');
  });

  it('sin interruptor (API anterior) o apagado: no se ofrece', () => {
    const off = { offered: false, selectable: false };
    expect(oxxoOption({ ...mx, pilotOxxo: null, total: 500 })).toEqual(off);
    expect(oxxoOption({ ...mx, pilotOxxo: undefined, total: 500 })).toEqual(off);
    expect(oxxoOption({ ...mx, pilotOxxo: { ...ON, enabled: false }, total: 500 })).toEqual(off);
    expect(oxxoOption({ ...mx, pilotOxxo: readOxxoConfig({ checkoutEnabled: true }), total: 500 })).toEqual(off);
  });

  it('otras tiendas (US, CO, GT) u otra moneda: nunca se ofrece', () => {
    const off = { offered: false, selectable: false };
    expect(oxxoOption({ ...mx, storeCountryCode: 'US', currencyCode: 'USD', total: 100 })).toEqual(off);
    expect(oxxoOption({ ...mx, storeCountryCode: 'CO', currencyCode: 'COP', total: 100 })).toEqual(off);
    expect(oxxoOption({ ...mx, storeCountryCode: 'GT', currencyCode: 'GTQ', total: 100 })).toEqual(off);
    // Tienda de México con un carrito en dólares, o tienda de EE. UU. con pesos: tampoco.
    expect(oxxoOption({ ...mx, currencyCode: 'USD', total: 100 })).toEqual(off);
    expect(oxxoOption({ ...mx, storeCountryCode: 'US', total: 100 })).toEqual(off);
    expect(oxxoOption({ ...mx, storeCountryCode: null, total: 100 })).toEqual(off);
    expect(oxxoOption({ ...mx, currencyCode: undefined, total: 100 })).toEqual(off);
  });

  it('sin total que comparar se deja elegir (el API valida al crear el pedido)', () => {
    const open = { offered: true, selectable: true };
    expect(oxxoOption({ ...mx, total: null })).toEqual(open);
    expect(oxxoOption({ ...mx, total: undefined })).toEqual(open);
    expect(oxxoOption({ ...mx, total: '' })).toEqual(open);
    expect(oxxoOption({ ...mx, total: 'abc' })).toEqual(open);
    expect(oxxoOption({ ...mx, total: Number.NaN })).toEqual(open);
  });
});

describe('payment-options · campo `oxxo` de un pedido', () => {
  it('ausente o ilegible: el pedido no es de OXXO', () => {
    expect(readOrderOxxo(undefined)).toBeNull();
    expect(readOrderOxxo(null)).toBeNull();
    expect(readOrderOxxo('oxxo')).toBeNull();
    expect(readOrderOxxo([])).toBeNull();
  });

  it('pedido de OXXO sin ficha todavía: todo en null', () => {
    expect(readOrderOxxo({ voucherUrl: null, expiresAt: null, reference: null })).toEqual({
      voucherUrl: null,
      expiresAt: null,
      reference: null,
    });
    expect(readOrderOxxo({})).toEqual({ voucherUrl: null, expiresAt: null, reference: null });
  });

  it('limpia los datos: solo enlaces http(s) y fechas legibles', () => {
    expect(
      readOrderOxxo({
        voucherUrl: ' https://payments.stripe.com/oxxo/voucher/abc ',
        expiresAt: '2026-11-15T05:59:59.000Z',
        reference: ' 12345678901234567890123456789012 ',
      }),
    ).toEqual({
      voucherUrl: 'https://payments.stripe.com/oxxo/voucher/abc',
      expiresAt: '2026-11-15T05:59:59.000Z',
      reference: '12345678901234567890123456789012',
    });
    expect(readOrderOxxo({ voucherUrl: 'javascript:alert(1)' })?.voucherUrl).toBeNull();
    expect(readOrderOxxo({ voucherUrl: '/oxxo/voucher' })?.voucherUrl).toBeNull();
    expect(readOrderOxxo({ voucherUrl: 42 })?.voucherUrl).toBeNull();
    expect(readOrderOxxo({ expiresAt: 'mañana' })?.expiresAt).toBeNull();
    expect(readOrderOxxo({ expiresAt: '' })?.expiresAt).toBeNull();
    expect(readOrderOxxo({ reference: '   ' })?.reference).toBeNull();
  });
});

describe('payment-options · en qué va el pago en OXXO de un pedido', () => {
  const now = new Date('2026-11-13T18:00:00.000Z');
  const voucher = {
    voucherUrl: 'https://payments.stripe.com/oxxo/voucher/abc',
    expiresAt: '2026-11-15T05:59:59.000Z',
    reference: '12345678901234567890123456789012',
  };
  const noVoucher = { voucherUrl: null, expiresAt: null, reference: null };
  const pending = { paymentStatus: 'pending', status: 'pending', now };

  it('none: pedido con tarjeta (sin `oxxo`) en cualquier estado', () => {
    expect(oxxoOrderState({ oxxo: null, ...pending })).toBe('none');
    expect(oxxoOrderState({ oxxo: undefined, paymentStatus: 'paid', status: 'confirmed', now })).toBe('none');
    expect(oxxoOrderState({ oxxo: 'x', paymentStatus: 'failed', status: 'pending', now })).toBe('none');
  });

  it('voucher_pending: pedido de OXXO al que Stripe aún no le genera la ficha', () => {
    expect(oxxoOrderState({ oxxo: noVoucher, ...pending })).toBe('voucher_pending');
    expect(oxxoOrderState({ oxxo: {}, status: 'pending', now })).toBe('voucher_pending');
    // Un enlace que no es http(s) no cuenta como ficha.
    expect(oxxoOrderState({ oxxo: { ...voucher, voucherUrl: 'javascript:void(0)' }, ...pending })).toBe('voucher_pending');
  });

  it('awaiting_payment: ficha generada y vigente', () => {
    expect(oxxoOrderState({ oxxo: voucher, ...pending })).toBe('awaiting_payment');
    expect(oxxoOrderState({ oxxo: voucher, paymentStatus: null, status: 'pending', now })).toBe('awaiting_payment');
    // Sin fecha límite (o ilegible) no se da por vencida.
    expect(oxxoOrderState({ oxxo: { ...voucher, expiresAt: null }, ...pending })).toBe('awaiting_payment');
    expect(oxxoOrderState({ oxxo: { ...voucher, expiresAt: 'no es fecha' }, ...pending })).toBe('awaiting_payment');
    // El instante exacto de la fecha límite todavía cuenta.
    expect(oxxoOrderState({ oxxo: voucher, ...pending, now: new Date(voucher.expiresAt) })).toBe('awaiting_payment');
  });

  it('deadline_passed: pasó la fecha límite y el servidor aún lo tiene pendiente', () => {
    const late = new Date('2026-11-15T05:59:59.001Z');
    expect(oxxoOrderState({ oxxo: voucher, ...pending, now: late })).toBe('deadline_passed');
    expect(oxxoOrderState({ oxxo: voucher, paymentStatus: 'partial', status: 'pending', now: late })).toBe('deadline_passed');
  });

  it('expired: Stripe avisó que la ficha venció sin pago', () => {
    expect(oxxoOrderState({ oxxo: voucher, paymentStatus: 'failed', status: 'pending', now })).toBe('expired');
    expect(oxxoOrderState({ oxxo: voucher, paymentStatus: 'failed', status: 'cancelled', now })).toBe('expired');
    expect(oxxoOrderState({ oxxo: noVoucher, paymentStatus: 'FAILED', status: 'pending', now })).toBe('expired');
  });

  it('paid: el pago ya se recibió (por el cobro o por el avance del pedido)', () => {
    const late = new Date('2026-12-01T00:00:00.000Z');
    expect(oxxoOrderState({ oxxo: voucher, paymentStatus: 'paid', status: 'confirmed', now: late })).toBe('paid');
    expect(oxxoOrderState({ oxxo: voucher, paymentStatus: 'completed', status: 'pending', now })).toBe('paid');
    expect(oxxoOrderState({ oxxo: voucher, paymentStatus: 'refunded', status: 'cancelled', now })).toBe('paid');
    // "Mis pedidos" manda el avance de la entrega como estado del pedido.
    for (const status of ['confirmed', 'paid', 'processing', 'ready', 'shipped', 'in_transit', 'delivered', 'completed']) {
      expect(oxxoOrderState({ oxxo: voucher, paymentStatus: null, status, now: late })).toBe('paid');
    }
  });

  it('cancelado sin aviso de vencimiento: nada de OXXO que mostrar', () => {
    expect(oxxoOrderState({ oxxo: voucher, paymentStatus: 'pending', status: 'cancelled', now })).toBe('none');
    expect(
      oxxoOrderState({ oxxo: voucher, paymentStatus: 'pending', status: 'cancelled', now: new Date('2026-12-01T00:00:00Z') }),
    ).toBe('none');
  });

  it('solo se sigue consultando mientras la ficha se genera (o si es un pedido con tarjeta)', () => {
    expect(shouldPollPendingPayment({ status: 'pending', paymentStatus: 'pending' }, now)).toBe(true);
    expect(shouldPollPendingPayment({ oxxo: null, status: 'pending', paymentStatus: 'pending' }, now)).toBe(true);
    expect(shouldPollPendingPayment({ oxxo: noVoucher, status: 'pending', paymentStatus: 'pending' }, now)).toBe(true);
    expect(shouldPollPendingPayment({ oxxo: voucher, status: 'pending', paymentStatus: 'paid' }, now)).toBe(true);
    expect(shouldPollPendingPayment({ oxxo: voucher, status: 'pending', paymentStatus: 'pending' }, now)).toBe(false);
    expect(shouldPollPendingPayment({ oxxo: voucher, status: 'pending', paymentStatus: 'failed' }, now)).toBe(false);
    expect(
      shouldPollPendingPayment({ oxxo: voucher, status: 'pending', paymentStatus: 'pending' }, new Date('2026-11-16T00:00:00Z')),
    ).toBe(false);
  });
});

describe('payment-options · fecha límite en hora del centro de México', () => {
  /** El texto con espacios normales (la hora lleva espacios de no separación). */
  const deadline = (...args: Parameters<typeof formatOxxoDeadline>) =>
    formatOxxoDeadline(...args)?.replace(/\u00a0/g, ' ') ?? null;

  it('escribe el día y la hora de México, no los del navegador ni UTC', () => {
    // 05:59 UTC del domingo 15 = 23:59 del sábado 14 en México.
    expect(deadline('2026-11-15T05:59:00.000Z', 'es')).toBe('sábado 14 de noviembre, 11:59 p. m.');
    expect(deadline('2026-11-15T05:59:00.000Z', 'en')).toBe('Saturday, November 14, 11:59 PM');
    expect(deadline('2026-11-14T23:59:00-06:00', 'es')).toBe('sábado 14 de noviembre, 11:59 p. m.');
    expect(deadline('2026-11-15T05:59:00.000Z')).toBe('sábado 14 de noviembre, 11:59 p. m.');
  });

  it('mañana, mediodía y medianoche', () => {
    expect(deadline('2026-11-14T15:05:00.000Z', 'es')).toBe('sábado 14 de noviembre, 9:05 a. m.');
    expect(deadline('2026-11-14T15:05:00.000Z', 'en')).toBe('Saturday, November 14, 9:05 AM');
    expect(deadline('2026-11-14T18:00:00.000Z', 'es')).toBe('sábado 14 de noviembre, 12:00 p. m.');
    expect(deadline('2026-11-14T06:00:00.000Z', 'es')).toBe('sábado 14 de noviembre, 12:00 a. m.');
    expect(deadline('2026-11-14T06:00:00.000Z', 'en')).toBe('Saturday, November 14, 12:00 AM');
  });

  it('la hora no se parte al final de un renglón (espacios de no separación)', () => {
    expect(formatOxxoDeadline('2026-11-15T05:59:00.000Z', 'es')).toBe('sábado 14 de noviembre, 11:59\u00a0p.\u00a0m.');
    expect(formatOxxoDeadline('2026-11-15T05:59:00.000Z', 'en')).toBe('Saturday, November 14, 11:59\u00a0PM');
  });

  it('fecha vacía o ilegible: null', () => {
    expect(formatOxxoDeadline(null, 'es')).toBeNull();
    expect(formatOxxoDeadline(undefined, 'es')).toBeNull();
    expect(formatOxxoDeadline('', 'es')).toBeNull();
    expect(formatOxxoDeadline('   ', 'en')).toBeNull();
    expect(formatOxxoDeadline('pronto', 'es')).toBeNull();
  });

  it('adelanto del checkout: hoy EN MÉXICO más los días de vigencia', () => {
    // Jueves 12-nov, 10:00 en México.
    const morning = new Date('2026-11-12T16:00:00.000Z');
    expect(oxxoPreviewDeadlineDay(2, 'es', morning)).toBe('sábado 14 de noviembre');
    expect(oxxoPreviewDeadlineDay(2, 'en', morning)).toBe('Saturday, November 14');
    expect(oxxoPreviewDeadlineDay(1, 'es', morning)).toBe('viernes 13 de noviembre');
    expect(oxxoPreviewDeadlineDay(7, 'es', morning)).toBe('jueves 19 de noviembre');
    // Jueves 12-nov, 21:30 en México: en UTC ya es viernes 13, pero el día de negocio sigue siendo el 12.
    const evening = new Date('2026-11-13T03:30:00.000Z');
    expect(oxxoPreviewDeadlineDay(2, 'es', evening)).toBe('sábado 14 de noviembre');
    // Ya pasada la medianoche de México, sí es el día siguiente.
    expect(oxxoPreviewDeadlineDay(2, 'es', new Date('2026-11-13T06:30:00.000Z'))).toBe('domingo 15 de noviembre');
  });

  it('adelanto: cambia de mes y de año, y acota la vigencia', () => {
    expect(oxxoPreviewDeadlineDay(2, 'es', new Date('2026-11-29T18:00:00.000Z'))).toBe('martes 1 de diciembre');
    expect(oxxoPreviewDeadlineDay(3, 'en', new Date('2026-12-30T18:00:00.000Z'))).toBe('Saturday, January 2');
    expect(oxxoPreviewDeadlineDay(99, 'es', new Date('2026-11-12T16:00:00.000Z'))).toBe('jueves 19 de noviembre');
    expect(oxxoPreviewDeadlineDay(undefined, 'es', new Date('2026-11-12T16:00:00.000Z'))).toBe('sábado 14 de noviembre');
  });
});

describe('payment-options · referencia de la ficha', () => {
  it('32 dígitos en grupos de 4', () => {
    expect(formatOxxoReference('12345678901234567890123456789012')).toBe('1234 5678 9012 3456 7890 1234 5678 9012');
  });

  it('acepta espacios o guiones y deja corto el último grupo si no es múltiplo de 4', () => {
    expect(formatOxxoReference(' 1234-5678 9012 34 ')).toBe('1234 5678 9012 34');
    expect(formatOxxoReference('123456')).toBe('1234 56');
  });

  it('si no son solo dígitos se muestra tal cual; vacía = null', () => {
    expect(formatOxxoReference('REF-0001-AB')).toBe('REF-0001-AB');
    expect(formatOxxoReference('')).toBeNull();
    expect(formatOxxoReference('   ')).toBeNull();
    expect(formatOxxoReference(null)).toBeNull();
    expect(formatOxxoReference(undefined)).toBeNull();
  });
});
