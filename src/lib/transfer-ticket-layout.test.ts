// PDF de traspaso: la lista de productos con letra grande para surtir en Almacén (17-nov-2026).
// Medidas puras: tamaños, alto de renglón, reparto de columnas y saltos de página.

import { describe, expect, it } from 'vitest';
import {
  TRANSFER_LIST_FONT,
  planTransferListRows,
  ptToMm,
  transferHeadHeight,
  transferListColumns,
  transferNameLineHeight,
  transferRowBaseline,
  transferRowHeight,
  type TransferListItem,
  type TransferListMeasure,
} from './transfer-ticket-layout';

// Medida de ejemplo: letra de ancho fijo (0.6 del tamaño) y letra normal (0.5), en mm.
const measure: TransferListMeasure = (text, font, _style, sizePt) =>
  text.length * ptToMm(sizePt) * (font === 'mono' ? 0.6 : 0.5);

const BOUNDS = { left: 15, right: 195 };

const item = (over: Partial<TransferListItem> = {}): TransferListItem => ({
  productCode: '9019',
  productName: 'Jimmy Coffee Frasco 270g.',
  quantity: 1200,
  ...over,
});

describe('tamaños de la lista', () => {
  it('la lista va bastante más grande que los 7.5 puntos de antes; la cantidad es lo más grande', () => {
    expect(TRANSFER_LIST_FONT.row).toBeGreaterThanOrEqual(11);
    expect(TRANSFER_LIST_FONT.quantity).toBeGreaterThan(TRANSFER_LIST_FONT.row);
    expect(TRANSFER_LIST_FONT.extra).toBeGreaterThan(7);
    expect(TRANSFER_LIST_FONT.head).toBeGreaterThan(7.5);
  });

  it('el renglón es más alto que los 5 mm de antes y crece con el nombre y con la preferencia de letra', () => {
    const one = transferRowHeight(1);
    expect(one).toBeGreaterThan(7);
    expect(one).toBeLessThan(9);
    expect(transferRowHeight(2)).toBeGreaterThan(one + 3);
    expect(transferRowHeight(3)).toBeGreaterThan(transferRowHeight(2));
    expect(transferRowHeight(1, 1.3)).toBeCloseTo(one * 1.3, 5);
    // Valores raros no rompen el alto.
    expect(transferRowHeight(0)).toBe(one);
    expect(transferRowHeight(1, 0)).toBe(one);
    expect(transferRowHeight(1, Number.NaN)).toBe(one);
  });

  it('el texto cabe dentro de su renglón: la línea base queda arriba del borde inferior', () => {
    for (const scale of [1, 1.1, 1.2, 1.3]) {
      expect(transferRowBaseline(scale)).toBeLessThan(transferRowHeight(1, scale));
      // Con dos renglones de nombre, el segundo también queda dentro.
      expect(transferRowBaseline(scale) + transferNameLineHeight(scale)).toBeLessThan(
        transferRowHeight(2, scale),
      );
      expect(transferHeadHeight(scale)).toBeGreaterThan(ptToMm(TRANSFER_LIST_FONT.head * scale));
    }
  });
});

describe('reparto de columnas', () => {
  it('sin lote ni caducidad esas columnas no se imprimen y la cantidad queda pegada a los nombres', () => {
    const cols = transferListColumns(
      [item(), item({ productCode: '8340-B', productName: 'BRONIX XUCA GOLD 240 ML', quantity: 10 })],
      measure,
      BOUNDS,
    );
    expect(cols.showLots).toBe(false);
    expect(cols.lotX).toBeNull();
    expect(cols.expirationX).toBeNull();
    // Orden de izquierda a derecha, sin encimarse.
    expect(cols.indexX).toBeGreaterThan(BOUNDS.left);
    expect(cols.codeX).toBeGreaterThan(cols.indexX);
    expect(cols.nameX).toBeGreaterThan(cols.codeX + measure('8340-B', 'mono', 'normal', TRANSFER_LIST_FONT.row));
    // El nombre mide lo que el más largo: la cantidad va justo después, no al otro extremo.
    const widest = measure('Jimmy Coffee Frasco 270g.', 'body', 'normal', TRANSFER_LIST_FONT.row);
    expect(cols.nameWidth).toBeCloseTo(widest, 5);
    expect(cols.qtyRight).toBeGreaterThan(cols.nameX + cols.nameWidth);
    expect(cols.qtyRight).toBeLessThan(BOUNDS.right - 30);
  });

  it('con lote o caducidad van después de la cantidad y todo cabe en la hoja', () => {
    const cols = transferListColumns(
      [
        item({ lotNumber: 'L261100A', expirationDate: '2028-05-31' }),
        item({ productCode: '8234', productName: '24 Shake Chocolate 625 g', quantity: 12 }),
      ],
      measure,
      BOUNDS,
    );
    expect(cols.showLots).toBe(true);
    expect(cols.lotX).not.toBeNull();
    expect(cols.expirationX).not.toBeNull();
    expect(cols.lotX as number).toBeGreaterThan(cols.qtyRight);
    expect(cols.expirationX as number).toBeGreaterThan(
      (cols.lotX as number) + measure('L261100A', 'mono', 'normal', TRANSFER_LIST_FONT.extra),
    );
    expect(
      (cols.expirationX as number) + measure('2028-05-31', 'mono', 'normal', TRANSFER_LIST_FONT.extra),
    ).toBeLessThanOrEqual(BOUNDS.right);
  });

  it('un nombre más largo que la hoja ocupa todo el ancho disponible (se envuelve) sin sacar la cantidad', () => {
    const long = 'TONIC SMILE 80 ML. - CARBON VEGETAL ACTIVADO - PRESENTACION ESPECIAL DE TEMPORADA NAVIDEÑA 2026';
    const cols = transferListColumns([item({ productName: long })], measure, BOUNDS);
    expect(cols.nameWidth).toBeLessThan(measure(long, 'body', 'normal', TRANSFER_LIST_FONT.row));
    expect(cols.qtyRight).toBeLessThanOrEqual(BOUNDS.right);
    expect(cols.qtyRight).toBeGreaterThan(BOUNDS.right - 5);
  });

  it('nombres muy cortos: la columna conserva un ancho mínimo', () => {
    const cols = transferListColumns([item({ productName: 'Pp 1 Tab.', quantity: 10 })], measure, BOUNDS);
    expect(cols.nameWidth).toBeGreaterThanOrEqual(45);
  });

  it('las columnas se ensanchan con la clave y la cantidad más largas', () => {
    const short = transferListColumns([item({ productCode: '8234', quantity: 3 })], measure, BOUNDS);
    const wide = transferListColumns([item({ productCode: 'KPM13-ESPECIAL', quantity: 120000 })], measure, BOUNDS);
    expect(wide.nameX).toBeGreaterThan(short.nameX);
    expect(wide.qtyRight - (wide.nameX + wide.nameWidth)).toBeGreaterThan(
      short.qtyRight - (short.nameX + short.nameWidth),
    );
  });

  it('un traspaso sin productos no truena', () => {
    const cols = transferListColumns([], measure, BOUNDS);
    expect(cols.showLots).toBe(false);
    expect(cols.nameWidth).toBeGreaterThanOrEqual(45);
  });
});

describe('saltos de página', () => {
  const page = { firstTop: 120, nextTop: 15, bottom: 277, headHeight: 7 };

  it('lo que cabe se queda en la primera hoja', () => {
    const plan = planTransferListRows([8, 8, 8], page);
    expect(plan.rows).toEqual([
      { page: 0, top: 120, height: 8 },
      { page: 0, top: 128, height: 8 },
      { page: 0, top: 136, height: 8 },
    ]);
    expect(plan.endPage).toBe(0);
    expect(plan.endY).toBe(144);
  });

  it('ningún renglón se parte: el que no cabe pasa completo a la hoja siguiente, debajo del encabezado', () => {
    const heights = Array.from({ length: 26 }, () => 8);
    const plan = planTransferListRows(heights, page);
    // 19 renglones de 8 mm caben entre 120 y 277; el 20 ya no.
    expect(plan.rows.filter((r) => r.page === 0)).toHaveLength(19);
    expect(plan.rows[19]).toEqual({ page: 1, top: 22, height: 8 });
    expect(plan.endPage).toBe(1);
    for (const r of plan.rows) expect(r.top + r.height).toBeLessThanOrEqual(page.bottom);
  });

  it('un traspaso largo sigue en más hojas', () => {
    const plan = planTransferListRows(
      Array.from({ length: 120 }, () => 8),
      page,
    );
    expect(plan.endPage).toBeGreaterThanOrEqual(3);
    const pages = new Set(plan.rows.map((r) => r.page));
    expect(pages.size).toBe(plan.endPage + 1);
  });

  it('un renglón más alto que la hoja no deja el documento dando vueltas', () => {
    const plan = planTransferListRows([8, 400, 8], page);
    expect(plan.rows).toHaveLength(3);
    expect(plan.rows[1].page).toBe(1);
    expect(plan.rows[2].page).toBe(2);
  });

  it('sin renglones, la tabla termina donde empezó', () => {
    expect(planTransferListRows([], page)).toEqual({ rows: [], endPage: 0, endY: 120 });
  });
});
