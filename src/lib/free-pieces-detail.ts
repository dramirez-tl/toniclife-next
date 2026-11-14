// Detalle de las piezas GRATIS de un producto por una promoción de temporada, venta por venta
// (Diego, 14-nov-2026: "que al hacer clic en la fila te abra una ventana con el detalle de esa
// clave y sus ventas, para saber que sí son las 100 piezas gratis en las 77 ventas; solo para
// aclaraciones"). Sale de los mismos renglones que ya trae "Ventas por producto": no consulta
// nada más. Puro, con pruebas.

import type { FreeByPromotionRow, ProductSaleLine, ProductSalesSummary } from '@/types/reports';

/** Una venta (folio) en la que el producto salió gratis por la promoción. */
export interface FreePiecesSale {
  saleId: string;
  saleNumber: string;
  /** YYYY-MM-DD y HH:mm locales de la sucursal. */
  saleDate: string;
  saleTime: string;
  branchCode: string;
  branchName: string;
  customerNumber: string | null;
  customerName: string;
  /** Piezas del producto que se COBRARON en la venta. */
  paidUnits: number;
  /** Lo que se pagó por ellas. */
  paidAmount: number;
  /** Piezas del producto que salieron gratis por ESTA promoción. */
  freeUnits: number;
  /** Valor de lo regalado, a precio de venta. */
  giftedValue: number;
  paymentMethod: string;
  sellerName: string;
}

export interface FreePiecesDetail {
  /** Una fila por venta, en orden de fecha, hora y folio. */
  sales: FreePiecesSale[];
  totals: { sales: number; paidUnits: number; freeUnits: number; giftedValue: number };
  /** Cómo se reparten las piezas gratis: cuántas ventas llevaron 1, cuántas 2… (de menos a más). */
  breakdown: { freeUnits: number; sales: number }[];
  /** true = el detalle suma las mismas ventas y piezas que el renglón del resumen. */
  matches: boolean;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Ventas en las que el producto salió gratis por la promoción del renglón. Las piezas cobradas
 * son las del MISMO producto en esa venta (en un 3x2, las 2 que se pagaron de cada 3).
 */
export function freePiecesDetail(
  row: Pick<FreeByPromotionRow, 'promotionCode' | 'salesCount' | 'units'>,
  product: Pick<ProductSalesSummary, 'lines'> | null | undefined,
): FreePiecesDetail {
  const lines: readonly ProductSaleLine[] = product?.lines ?? [];
  const isFreeHere = (l: ProductSaleLine) => !!l.freeByPromotion && (l.promotionCode ?? '') === row.promotionCode;
  const bySale = new Map<string, FreePiecesSale>();
  for (const l of lines) {
    if (!isFreeHere(l)) continue;
    const sale = bySale.get(l.saleId) ?? {
      saleId: l.saleId,
      saleNumber: l.saleNumber,
      saleDate: l.saleDate,
      saleTime: l.saleTime,
      branchCode: l.branchCode,
      branchName: l.branchName,
      customerNumber: l.customerNumber,
      customerName: l.customerName,
      paidUnits: 0,
      paidAmount: 0,
      freeUnits: 0,
      giftedValue: 0,
      paymentMethod: l.paymentMethod,
      sellerName: l.sellerName,
    };
    sale.freeUnits = round2(sale.freeUnits + l.quantity);
    sale.giftedValue = round2(sale.giftedValue + (l.giftedValue || 0));
    bySale.set(l.saleId, sale);
  }
  // Lo cobrado del mismo producto en esas ventas.
  for (const l of lines) {
    if (l.freeByPromotion) continue;
    const sale = bySale.get(l.saleId);
    if (!sale) continue;
    sale.paidUnits = round2(sale.paidUnits + l.quantity);
    sale.paidAmount = round2(sale.paidAmount + l.total);
  }
  const sales = [...bySale.values()].sort(
    (a, b) =>
      a.saleDate.localeCompare(b.saleDate) ||
      a.saleTime.localeCompare(b.saleTime) ||
      a.saleNumber.localeCompare(b.saleNumber),
  );
  const totals = sales.reduce(
    (t, s) => ({
      sales: t.sales + 1,
      paidUnits: round2(t.paidUnits + s.paidUnits),
      freeUnits: round2(t.freeUnits + s.freeUnits),
      giftedValue: round2(t.giftedValue + s.giftedValue),
    }),
    { sales: 0, paidUnits: 0, freeUnits: 0, giftedValue: 0 },
  );
  const counts = new Map<number, number>();
  for (const s of sales) counts.set(s.freeUnits, (counts.get(s.freeUnits) ?? 0) + 1);
  const breakdown = [...counts.entries()]
    .map(([freeUnits, count]) => ({ freeUnits, sales: count }))
    .sort((a, b) => a.freeUnits - b.freeUnits);
  return {
    sales,
    totals,
    breakdown,
    matches: totals.sales === row.salesCount && totals.freeUnits === round2(row.units),
  };
}

const plain = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Ventas cuyo folio, cliente, número de cliente o sucursal contienen el texto buscado. */
export function filterFreePiecesSales(sales: readonly FreePiecesSale[], search: string): FreePiecesSale[] {
  const term = plain(search.trim());
  if (!term) return [...sales];
  return sales.filter((s) =>
    [s.saleNumber, s.customerName, s.customerNumber ?? '', s.branchCode, s.branchName].some((field) =>
      plain(field).includes(term),
    ),
  );
}

/**
 * Las ventas en el orden pedido: `time` = como se vendieron (así vienen del detalle); `free` = las
 * que más piezas gratis llevaron primero y, a igual número, por hora. No toca la lista original.
 */
export function orderFreePiecesSales(sales: readonly FreePiecesSale[], order: 'time' | 'free'): FreePiecesSale[] {
  // `sort` es estable: los empates conservan el orden por hora con el que llegan.
  return order === 'free' ? [...sales].sort((a, b) => b.freeUnits - a.freeUnits) : [...sales];
}

/** "56 ventas con 1 pieza gratis · 19 con 2 · 2 con 3": cómo se llega al total. */
export function freePiecesBreakdownText(breakdown: FreePiecesDetail['breakdown']): string {
  return breakdown
    .map((b, i) => {
      const ventas = `${b.sales} ${b.sales === 1 ? 'venta' : 'ventas'}`;
      const piezas = `${b.freeUnits} ${b.freeUnits === 1 ? 'pieza gratis' : 'piezas gratis'}`;
      return i === 0 ? `${ventas} con ${piezas}` : `${b.sales} con ${b.freeUnits}`;
    })
    .join(' · ');
}
