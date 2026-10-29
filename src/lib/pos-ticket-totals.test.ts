// pos-ticket-totals.test.ts — Bloque "Totales" de la reimpresión del ticket
// con cupón/descuento global (presentación del 29-oct-2026). Los cuatro
// ejemplos de ticket-cupon-presentacion.md "deben salir tal cual" con los
// números que guarda el API (spec de sale-discount.lib), más la detección de
// impuesto incluido/añadido y las etiquetas.

import { describe, expect, it } from 'vitest';
import {
  buildPosTicketTotals,
  saleCouponCode,
  saleTaxIncludedInPrice,
  saleTotalsPresentation,
  ticketLineAmount,
  type PosTicketTotalsSale,
} from './pos-ticket-totals';

/** MX, 8616 a $332 con IVA 16 % incluido, cupón TL-3GCM52PF 30 % (cabecera del API). */
const mx332Cupon30: PosTicketTotalsSale = {
  items: [{ unitPrice: 332, quantity: 1, discountAmount: 99.6, subtotal: 200.34, total: 232.4 }],
  subtotal: 200.34,
  discountAmount: 99.6,
  discountReason: 'Cupón TL-3GCM52PF',
  couponCode: 'TL-3GCM52PF',
  taxAmount: 32.06,
  total: 232.4,
  currencyCode: 'MXN',
};

/** MX mixto: 9019 Jimmy Coffee $391 (IVA 0 %) + 8616 $332 (IVA 16 %), cupón 10 %. */
const mxMixtoCupon10: PosTicketTotalsSale = {
  items: [
    { unitPrice: 391, quantity: 1, discountAmount: 39.1, subtotal: 351.9, total: 351.9 },
    { unitPrice: 332, quantity: 1, discountAmount: 33.2, subtotal: 257.59, total: 298.8 },
  ],
  subtotal: 609.49,
  discountAmount: 72.3,
  // Sin couponCode: el código sale de discount_reason ('Cupón <código>').
  discountReason: 'Cupón TL-10',
  taxAmount: 41.21,
  total: 650.7,
  currencyCode: 'MXN',
};

/** US: $100 sin impuesto, sales tax 8.25 %, cupón 10 % (D = 10.83 con impuesto). */
const us100Cupon10: PosTicketTotalsSale = {
  items: [{ unitPrice: 100, quantity: 1, discountAmount: 10, subtotal: 90, total: 97.42 }],
  subtotal: 90,
  discountAmount: 10.83,
  discountReason: 'Cupón US10',
  couponCode: 'US10',
  taxAmount: 7.42,
  total: 97.42,
  currencyCode: 'USD',
};

/** MX sin cupón, 8616 a $332. */
const mx332SinCupon: PosTicketTotalsSale = {
  items: [{ unitPrice: 332, quantity: 1, discountAmount: 0, subtotal: 286.21, total: 332 }],
  subtotal: 286.21,
  discountAmount: 0,
  taxAmount: 45.79,
  total: 332,
  currencyCode: 'MXN',
};

describe('buildPosTicketTotals: los 4 ejemplos de la especificación', () => {
  it('MX con cupón 30 %: Subtotal 332.00 / Cupón −99.60 / TOTAL 232.40 / IVA incluido 32.06', () => {
    expect(buildPosTicketTotals(mx332Cupon30)).toEqual({
      rows: [
        ['SUB Total $', '332.00'],
        ['Cupón TL-3GCM52PF $', '-99.60'],
      ],
      total: ['TOTAL $', '232.40'],
      after: [['IVA incluido $', '32.06']],
    });
  });

  it('MX mixto con cupón 10 %: Subtotal 723.00 / Cupón −72.30 / TOTAL 650.70 / IVA incluido 41.21', () => {
    expect(buildPosTicketTotals(mxMixtoCupon10)).toEqual({
      rows: [
        ['SUB Total $', '723.00'],
        ['Cupón TL-10 $', '-72.30'],
      ],
      total: ['TOTAL $', '650.70'],
      after: [['IVA incluido $', '41.21']],
    });
  });

  it('US con cupón 10 %: Subtotal 100.00 / Descuento −10.00 / Tax 7.42 / TOTAL 97.42 (las filas suman)', () => {
    expect(buildPosTicketTotals(us100Cupon10)).toEqual({
      rows: [
        ['SUB Total $', '100.00'],
        ['Descuento $', '-10.00'],
        ['IVA/TAX $', '7.42'],
      ],
      total: ['TOTAL $', '97.42'],
      after: [],
    });
  });

  it('MX sin cupón: Subtotal 286.21 / IVA 45.79 / TOTAL 332.00 (igual que siempre)', () => {
    expect(buildPosTicketTotals(mx332SinCupon)).toEqual({
      rows: [
        ['SUB Total $', '286.21'],
        ['IVA/TAX $', '45.79'],
      ],
      total: ['TOTAL $', '332.00'],
      after: [],
    });
  });
});

describe('sin descuento global nada cambia (bloque anterior a la regla)', () => {
  it('discountAmount 0 con discountPercent capturado: tampoco imprime fila de descuento (como antes)', () => {
    const sale = { ...mx332SinCupon, discountPercent: 10 };
    expect(buildPosTicketTotals(sale).rows).toEqual([
      ['SUB Total $', '286.21'],
      ['IVA/TAX $', '45.79'],
    ]);
  });

  it('US sin descuento: SUB Total base, IVA/TAX, TOTAL (2 × $10 al 8.25 % = 21.65 del API)', () => {
    const sale: PosTicketTotalsSale = {
      items: [
        { unitPrice: 10, quantity: 1, discountAmount: 0, subtotal: 10, total: 10.83 },
        { unitPrice: 10, quantity: 1, discountAmount: 0, subtotal: 10, total: 10.82 },
      ],
      subtotal: 20,
      discountAmount: 0,
      taxAmount: 1.65,
      total: 21.65,
      currencyCode: 'USD',
    };
    expect(buildPosTicketTotals(sale)).toEqual({
      rows: [
        ['SUB Total $', '20.00'],
        ['IVA/TAX $', '1.65'],
      ],
      total: ['TOTAL $', '21.65'],
      after: [],
    });
  });

  it('descuento negativo o NaN se trata como 0', () => {
    expect(buildPosTicketTotals({ ...mx332SinCupon, discountAmount: -5 }).rows).toHaveLength(2);
    expect(buildPosTicketTotals({ ...mx332SinCupon, discountAmount: Number.NaN }).rows).toHaveLength(2);
  });
});

describe('etiqueta de la fila de descuento', () => {
  it('descuento manual con porcentaje: "Descuento (10%) $" (formato legacy), sin código', () => {
    const sale: PosTicketTotalsSale = {
      ...mxMixtoCupon10,
      discountReason: 'Autorizado por gerencia',
      discountPercent: 10,
    };
    expect(buildPosTicketTotals(sale).rows[1]).toEqual(['Descuento (10%) $', '-72.30']);
  });

  it('descuento manual de monto fijo: "Descuento $"', () => {
    const sale: PosTicketTotalsSale = { ...mxMixtoCupon10, discountReason: 'Cortesía' };
    expect(buildPosTicketTotals(sale).rows[1]).toEqual(['Descuento $', '-72.30']);
  });

  it('código demasiado largo para el rollo: solo "Cupón $"', () => {
    const sale: PosTicketTotalsSale = { ...mx332Cupon30, couponCode: 'PROMO-ANIVERSARIO-2026-XL' };
    expect(buildPosTicketTotals(sale).rows[1]).toEqual(['Cupón $', '-99.60']);
  });

  it('en US la fila dice "Descuento" aunque venga de cupón (su monto no es D con impuesto)', () => {
    expect(buildPosTicketTotals({ ...us100Cupon10, discountPercent: 10 }).rows[1]).toEqual([
      'Descuento (10%) $',
      '-10.00',
    ]);
  });
});

describe('saleCouponCode', () => {
  it('prefiere couponCode y cae a discount_reason "Cupón <código>"', () => {
    expect(saleCouponCode({ couponCode: ' ABC ', discountReason: 'Cupón XYZ' })).toBe('ABC');
    expect(saleCouponCode({ discountReason: 'Cupón TL-3GCM52PF' })).toBe('TL-3GCM52PF');
    expect(saleCouponCode({ discountReason: 'cupon tl-1 ' })).toBe('tl-1');
  });

  it('un motivo manual no es cupón', () => {
    expect(saleCouponCode({ discountReason: 'Cortesía del gerente' })).toBeUndefined();
    expect(saleCouponCode({})).toBeUndefined();
  });
});

describe('saleTaxIncludedInPrice: señal más confiable primero', () => {
  it('identidad por renglón del API: MX (precio − descuento = total) / US (= base), sin moneda', () => {
    expect(saleTaxIncludedInPrice({ ...mx332Cupon30, currencyCode: undefined })).toBe(true);
    expect(saleTaxIncludedInPrice({ ...us100Cupon10, currencyCode: undefined })).toBe(false);
  });

  it('la identidad manda sobre la moneda cuando los renglones la sostienen', () => {
    expect(saleTaxIncludedInPrice({ ...us100Cupon10, currencyCode: 'MXN' })).toBe(false);
    expect(saleTaxIncludedInPrice({ ...mx332Cupon30, currencyCode: 'USD' })).toBe(true);
  });

  it('sin renglones con impuesto decide la moneda: USD añadido, MXN/GTQ/COP incluido', () => {
    const base: PosTicketTotalsSale = {
      items: [{ unitPrice: 391, quantity: 1, discountAmount: 39.1, subtotal: 351.9, total: 351.9 }],
      subtotal: 351.9,
      discountAmount: 39.1,
      taxAmount: 0,
      total: 351.9,
    };
    expect(saleTaxIncludedInPrice({ ...base, currencyCode: 'USD' })).toBe(false);
    expect(saleTaxIncludedInPrice({ ...base, currencyCode: 'usd ' })).toBe(false);
    expect(saleTaxIncludedInPrice({ ...base, currencyCode: 'MXN' })).toBe(true);
    expect(saleTaxIncludedInPrice({ ...base, currencyCode: 'GTQ' })).toBe(true);
    expect(saleTaxIncludedInPrice({ ...base, currencyCode: 'COP' })).toBe(true);
  });

  it('sin señal: incluido cuando Σ precio × cantidad ≈ total + D', () => {
    const sinImpuesto: PosTicketTotalsSale = {
      items: [{ unitPrice: 391, quantity: 1, discountAmount: 39.1, subtotal: 351.9, total: 351.9 }],
      subtotal: 351.9,
      discountAmount: 39.1,
      taxAmount: 0,
      total: 351.9,
    };
    expect(saleTaxIncludedInPrice(sinImpuesto)).toBe(true);
    // US sin impuesto por renglón y sin moneda: Σ 100 ≠ 90 + 10.83.
    const usSinSenal: PosTicketTotalsSale = {
      items: [{ unitPrice: 100, quantity: 1, discountAmount: 10, subtotal: 90, total: 90 }],
      subtotal: 90,
      discountAmount: 10.83,
      taxAmount: 0,
      total: 90,
    };
    expect(saleTaxIncludedInPrice(usSinSenal)).toBe(false);
  });
});

describe('ventas anteriores a la regla (descuento manual en cabecera, renglones sin parte)', () => {
  it('MX: SUB Total = total + D, Descuento −D, TOTAL e IVA incluido con el impuesto guardado', () => {
    // Antes del 29-oct: cabecera subtotal = 286.21 − 50, IVA íntegro 45.79, total 282.
    const sale: PosTicketTotalsSale = {
      items: [{ unitPrice: 332, quantity: 1, discountAmount: 0, subtotal: 286.21, total: 332 }],
      subtotal: 236.21,
      discountAmount: 50,
      discountReason: 'Cortesía',
      taxAmount: 45.79,
      total: 282,
      currencyCode: 'MXN',
    };
    expect(buildPosTicketTotals(sale)).toEqual({
      rows: [
        ['SUB Total $', '332.00'],
        ['Descuento $', '-50.00'],
      ],
      total: ['TOTAL $', '282.00'],
      after: [['IVA incluido $', '45.79']],
    });
  });

  it('US: Subtotal Σ precio × cantidad, Descuento en el espacio del precio, Tax, TOTAL', () => {
    const sale: PosTicketTotalsSale = {
      items: [{ unitPrice: 100, quantity: 1, discountAmount: 0, subtotal: 100, total: 108.25 }],
      subtotal: 90,
      discountAmount: 10,
      taxAmount: 8.25,
      total: 98.25,
      currencyCode: 'USD',
    };
    expect(buildPosTicketTotals(sale)).toEqual({
      rows: [
        ['SUB Total $', '100.00'],
        ['Descuento $', '-10.00'],
        ['IVA/TAX $', '8.25'],
      ],
      total: ['TOTAL $', '98.25'],
      after: [],
    });
  });
});

describe('saleTotalsPresentation (desglose sin etiquetas para la reimpresión HTML)', () => {
  it('con cupón MX: sin fila de impuesto antes del TOTAL y "IVA incluido" debajo', () => {
    expect(saleTotalsPresentation(mx332Cupon30)).toEqual({
      taxIncluded: true,
      subtotal: 332,
      discount: { amount: 99.6, couponCode: 'TL-3GCM52PF', percent: undefined },
      tax: null,
      total: 232.4,
      taxIncludedAmount: 32.06,
    });
  });

  it('con cupón US: fila de impuesto antes del TOTAL y sin "IVA incluido"', () => {
    expect(saleTotalsPresentation(us100Cupon10)).toEqual({
      taxIncluded: false,
      subtotal: 100,
      discount: { amount: 10, percent: undefined },
      tax: 7.42,
      total: 97.42,
      taxIncludedAmount: null,
    });
  });

  it('sin descuento: base neta, impuesto y total de siempre', () => {
    expect(saleTotalsPresentation(mx332SinCupon)).toEqual({
      taxIncluded: true,
      subtotal: 286.21,
      discount: null,
      tax: 45.79,
      total: 332,
      taxIncludedAmount: null,
    });
  });
});

describe('robustez: ruido binario, −0 y venta sin renglones', () => {
  it('US: Σ precio × cantidad una fracción de centavo por debajo de la base no imprime "--0.00" ni −0', () => {
    // 0.1 + 0.7 = 0.7999999999999999 en binario; la base que guarda el API es 0.80.
    const sale: PosTicketTotalsSale = {
      items: [
        { unitPrice: 0.1, quantity: 1, discountAmount: 0, subtotal: 0.1, total: 0.11 },
        { unitPrice: 0.7, quantity: 1, discountAmount: 0, subtotal: 0.7, total: 0.76 },
      ],
      subtotal: 0.8,
      discountAmount: 0.01,
      taxAmount: 0.07,
      total: 0.86,
      currencyCode: 'USD',
    };
    const p = saleTotalsPresentation(sale);
    expect(p.subtotal).toBe(0.8);
    expect(Object.is(p.discount?.amount, 0)).toBe(true);
    expect(buildPosTicketTotals(sale).rows).toEqual([
      ['SUB Total $', '0.80'],
      ['Descuento $', '-0.00'],
      ['IVA/TAX $', '0.07'],
    ]);
  });

  it('MX: SUB Total = total + D a centavos (0.1 + 0.2 no es 0.30000000000000004)', () => {
    const sale: PosTicketTotalsSale = {
      items: [{ unitPrice: 0.3, quantity: 1, discountAmount: 0.2, subtotal: 0.09, total: 0.1 }],
      subtotal: 0.09,
      discountAmount: 0.2,
      taxAmount: 0.01,
      total: 0.1,
      currencyCode: 'MXN',
    };
    expect(saleTotalsPresentation(sale)).toMatchObject({ taxIncluded: true, subtotal: 0.3, tax: null, taxIncludedAmount: 0.01 });
    expect(buildPosTicketTotals(sale).rows[0]).toEqual(['SUB Total $', '0.30']);
  });

  it('sin renglones (renglón del listado mientras carga el detalle): no revienta y el bloque es el mismo', () => {
    // MX: T = total + D no necesita los renglones.
    expect(buildPosTicketTotals({ ...mx332Cupon30, items: [] })).toEqual(buildPosTicketTotals(mx332Cupon30));
    expect(buildPosTicketTotals({ ...mx332Cupon30, items: undefined })).toEqual(buildPosTicketTotals(mx332Cupon30));
    expect(saleTaxIncludedInPrice({ ...mx332Cupon30, items: undefined })).toBe(true);
    // Sin descuento tampoco cambia nada.
    expect(buildPosTicketTotals({ ...mx332SinCupon, items: undefined })).toEqual(buildPosTicketTotals(mx332SinCupon));
  });

  it('US sin renglones: sin Σ precio × cantidad no hay parte en el espacio del precio → bruto con impuesto, −D e impuesto incluido', () => {
    const sale: PosTicketTotalsSale = { ...us100Cupon10, items: [] };
    expect(saleTaxIncludedInPrice(sale)).toBe(false);
    expect(saleTotalsPresentation(sale)).toEqual({
      taxIncluded: false,
      subtotal: 108.25,
      discount: { amount: 10.83, couponCode: 'US10', percent: undefined },
      tax: null,
      total: 97.42,
      taxIncludedAmount: 7.42,
    });
    expect(buildPosTicketTotals(sale)).toEqual({
      rows: [
        ['SUB Total $', '108.25'],
        ['Cupón US10 $', '-10.83'],
      ],
      total: ['TOTAL $', '97.42'],
      after: [['IVA incluido $', '7.42']],
    });
  });
});

describe('ticketLineAmount: renglones en bruto cuando hay descuento global', () => {
  it('MX con cupón: 8616 × 1 imprime 332.00 (bruto), no el 232.40 neto guardado', () => {
    expect(ticketLineAmount(mx332Cupon30, mx332Cupon30.items![0])).toBe(332);
  });
  it('sin descuento global: el total guardado del renglón, como siempre', () => {
    expect(ticketLineAmount({ discountAmount: 0 }, { unitPrice: 332, quantity: 1, total: 332 })).toBe(332);
    expect(ticketLineAmount({ discountAmount: 0 }, { unitPrice: 100, quantity: 2, total: 216.5 })).toBe(216.5);
  });
  it('US con cupón: precio × cantidad sin impuesto, a centavos (33.333 × 3 = 100.00)', () => {
    expect(ticketLineAmount({ discountAmount: 10.83 }, { unitPrice: 33.333, quantity: 3, total: 97.42 })).toBe(100);
  });
});
