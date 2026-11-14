import { describe, expect, it } from 'vitest';
import type { ProductSaleLine } from '@/types/reports';
import {
  filterFreePiecesSales,
  freePiecesBreakdownText,
  freePiecesDetail,
  orderFreePiecesSales,
} from './free-pieces-detail';

const PROMO = 'BUENFIN2026-3X2BUENFINSABADO';

function line(saleNumber: string, quantity: number, over: Partial<ProductSaleLine> = {}): ProductSaleLine {
  const free = over.freeByPromotion === true;
  return {
    saleId: `id-${saleNumber}`,
    saleNumber,
    saleDate: '2026-11-14',
    saleTime: '10:00',
    branchId: 'b-164',
    branchCode: '164',
    branchName: 'Centro',
    currencyCode: 'MXN',
    customerNumber: '70001',
    customerName: 'Ana Ruiz Lara',
    productId: 'nerlife',
    productSku: '8180',
    productName: 'Nerlife 60 Caps',
    quantity,
    unitPrice: free ? 0 : 281,
    total: free ? 0 : 281 * quantity,
    points: free ? 0 : 242 * quantity,
    paymentMethod: 'cash',
    sellerName: 'Caja 1',
    promotionCode: PROMO,
    promotionName: '3x2 Buen Fin sábado 14',
    giftedValue: free ? 281 * quantity : 0,
    ...over,
  };
}
const paid = (saleNumber: string, quantity: number, over: Partial<ProductSaleLine> = {}) => line(saleNumber, quantity, over);
const gift = (saleNumber: string, quantity: number, over: Partial<ProductSaleLine> = {}) =>
  line(saleNumber, quantity, { freeByPromotion: true, ...over });

describe('freePiecesDetail: las piezas gratis de un producto, venta por venta', () => {
  const lines = [
    // 3 piezas: 2 cobradas + 1 gratis.
    paid('164-20261114-0003', 2, { saleTime: '09:30' }),
    gift('164-20261114-0003', 1, { saleTime: '09:30' }),
    // 6 piezas: 4 cobradas + 2 gratis, en otra sucursal y más temprano.
    paid('205-20261114-0001', 4, { saleTime: '08:15', branchCode: '205', branchName: 'Norte', customerNumber: '88197', customerName: 'Juan Soto' }),
    gift('205-20261114-0001', 2, { saleTime: '08:15', branchCode: '205', branchName: 'Norte', customerNumber: '88197', customerName: 'Juan Soto' }),
    // 2 piezas sin promoción completa: no aparece en el detalle.
    paid('164-20261114-0009', 2, { saleTime: '11:00', promotionCode: null, promotionName: null }),
    // Gratis del mismo producto por OTRA promoción: tampoco es de este renglón.
    gift('164-20261114-0010', 1, { saleTime: '11:30', promotionCode: 'OTRA', promotionName: 'Otra promoción' }),
  ];
  const row = { promotionCode: PROMO, salesCount: 2, units: 3 };

  it('una fila por venta con lo cobrado y lo gratis del producto, en orden de hora', () => {
    const detail = freePiecesDetail(row, { lines });
    expect(detail.sales.map((s) => [s.saleNumber, s.saleTime, s.paidUnits, s.freeUnits, s.giftedValue, s.paidAmount])).toEqual([
      ['205-20261114-0001', '08:15', 4, 2, 562, 1124],
      ['164-20261114-0003', '09:30', 2, 1, 281, 562],
    ]);
    expect(detail.sales[0]).toMatchObject({ branchCode: '205', branchName: 'Norte', customerNumber: '88197', customerName: 'Juan Soto' });
  });

  it('los totales cuadran con el renglón del resumen (ventas y piezas gratis)', () => {
    const detail = freePiecesDetail(row, { lines });
    expect(detail.totals).toEqual({ sales: 2, paidUnits: 6, freeUnits: 3, giftedValue: 843 });
    expect(detail.matches).toBe(true);
    // Si el resumen dijera otra cosa, se nota.
    expect(freePiecesDetail({ ...row, units: 4 }, { lines }).matches).toBe(false);
    expect(freePiecesDetail({ ...row, salesCount: 3 }, { lines }).matches).toBe(false);
  });

  it('dice cómo se reparten: cuántas ventas llevaron 1 gratis, cuántas 2…', () => {
    const detail = freePiecesDetail(row, { lines });
    expect(detail.breakdown).toEqual([
      { freeUnits: 1, sales: 1 },
      { freeUnits: 2, sales: 1 },
    ]);
    expect(freePiecesBreakdownText(detail.breakdown)).toBe('1 venta con 1 pieza gratis · 1 con 2');
    expect(
      freePiecesBreakdownText([
        { freeUnits: 1, sales: 56 },
        { freeUnits: 2, sales: 19 },
        { freeUnits: 3, sales: 2 },
      ]),
    ).toBe('56 ventas con 1 pieza gratis · 19 con 2 · 2 con 3');
    expect(freePiecesBreakdownText([{ freeUnits: 2, sales: 5 }])).toBe('5 ventas con 2 piezas gratis');
    expect(freePiecesBreakdownText([])).toBe('');
  });

  it('un regalo por compra (el producto no se cobra en la venta): cobradas en cero', () => {
    const gifts = [gift('164-20261114-0020', 1, { productId: 'shaker', unitPrice: 0, giftedValue: 0, promotionCode: 'REGALO' })];
    const detail = freePiecesDetail({ promotionCode: 'REGALO', salesCount: 1, units: 1 }, { lines: gifts });
    expect(detail.sales).toHaveLength(1);
    expect(detail.sales[0]).toMatchObject({ paidUnits: 0, paidAmount: 0, freeUnits: 1, giftedValue: 0 });
    expect(detail.matches).toBe(true);
  });

  it('dos renglones gratis de la misma venta se suman en una sola fila', () => {
    const twice = [paid('164-20261114-0030', 4), gift('164-20261114-0030', 1), gift('164-20261114-0030', 1)];
    const detail = freePiecesDetail({ promotionCode: PROMO, salesCount: 1, units: 2 }, { lines: twice });
    expect(detail.sales).toHaveLength(1);
    expect(detail.sales[0]).toMatchObject({ paidUnits: 4, freeUnits: 2, giftedValue: 562 });
  });

  it('sin el producto en el reporte (o sin renglones) queda vacío y no cuadra con el resumen', () => {
    for (const product of [null, undefined, { lines: [] }]) {
      const detail = freePiecesDetail(row, product);
      expect(detail.sales).toEqual([]);
      expect(detail.totals).toEqual({ sales: 0, paidUnits: 0, freeUnits: 0, giftedValue: 0 });
      expect(detail.matches).toBe(false);
    }
  });

  it('renglones sin código de promoción cuentan para el renglón "sin código" del resumen', () => {
    const blank = [gift('164-20261114-0040', 1, { promotionCode: null })];
    expect(freePiecesDetail({ promotionCode: '', salesCount: 1, units: 1 }, { lines: blank }).matches).toBe(true);
  });
});

describe('filterFreePiecesSales: buscar dentro del detalle', () => {
  const sales = freePiecesDetail(
    { promotionCode: PROMO, salesCount: 2, units: 3 },
    {
      lines: [
        paid('164-20261114-0003', 2),
        gift('164-20261114-0003', 1),
        paid('205-20261114-0001', 4, { branchCode: '205', branchName: 'Norte', customerNumber: '88197', customerName: 'José Peña' }),
        gift('205-20261114-0001', 2, { branchCode: '205', branchName: 'Norte', customerNumber: '88197', customerName: 'José Peña' }),
      ],
    },
  ).sales;

  it('por folio, cliente (sin importar acentos), número de cliente o sucursal', () => {
    const found = (term: string) => filterFreePiecesSales(sales, term).map((s) => s.saleNumber);
    expect(found('0003')).toEqual(['164-20261114-0003']);
    expect(found('jose pena')).toEqual(['205-20261114-0001']);
    expect(found('88197')).toEqual(['205-20261114-0001']);
    expect(found('norte')).toEqual(['205-20261114-0001']);
    expect(found('  ')).toHaveLength(2);
    expect(found('nada')).toEqual([]);
  });
});

describe('orderFreePiecesSales: por hora o con las que más piezas gratis llevaron primero', () => {
  const sales = freePiecesDetail(
    { promotionCode: PROMO, salesCount: 3, units: 4 },
    {
      lines: [
        gift('164-20261114-0001', 1, { saleTime: '08:00' }),
        gift('164-20261114-0002', 2, { saleTime: '09:00' }),
        gift('164-20261114-0003', 1, { saleTime: '10:00' }),
      ],
    },
  ).sales;

  it('por hora deja el orden en que se vendió; "más gratis primero" sube las grandes y respeta la hora en los empates', () => {
    const folios = (order: 'time' | 'free') => orderFreePiecesSales(sales, order).map((s) => s.saleNumber.slice(-4));
    expect(folios('time')).toEqual(['0001', '0002', '0003']);
    expect(folios('free')).toEqual(['0002', '0001', '0003']);
    // No cambia la lista que recibe.
    expect(sales.map((s) => s.saleNumber.slice(-4))).toEqual(['0001', '0002', '0003']);
  });
});
