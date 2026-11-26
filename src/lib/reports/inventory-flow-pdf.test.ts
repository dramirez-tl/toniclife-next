import { describe, expect, it } from 'vitest';
import type { InventoryFlowBranchRow, InventoryFlowProductRow, InventoryFlowResponse } from '@/types/reports';
import {
  buildInventoryFlowPdf,
  countable,
  countRowHeight,
  countRows,
  flowFigures,
  howToReadNotes,
  inventoryFlowPdfFilename,
  paginateCountRows,
  pdfPieces,
  pdfSigned,
  pdfTotals,
  productPeriodLine,
} from './inventory-flow-pdf';

function branch(over: Partial<InventoryFlowBranchRow> = {}): InventoryFlowBranchRow {
  return {
    branchId: 'b164',
    code: '164',
    name: 'Irapuato Almacén General',
    group: 'general',
    opening: 100,
    entries: 0,
    received: 0,
    sent: 0,
    sales: 0,
    other: 0,
    closing: 68,
    ...over,
  };
}

function product(over: Partial<InventoryFlowProductRow> = {}): InventoryFlowProductRow {
  return {
    rank: 1,
    productId: 'p1',
    code: '9019',
    name: 'Jimmy Coffee Frasco 270g.',
    opening: { general: 6038, warehouses: 43946, stores: 14653, transit: 3236, total: 67873 },
    entries: 14791,
    salesGross: 22387,
    saleReturns: 231,
    sales: 22156,
    other: 136,
    closing: { general: 68, warehouses: 44266, stores: 10844, transit: 5466, total: 60644 },
    branches: [
      branch(),
      branch({ branchId: 'b172', code: '172', name: 'Producción México', group: 'warehouse', closing: 23257 }),
      branch({ branchId: 'b163', code: '163', name: 'Tijuana Almacén', group: 'warehouse', closing: 336 }),
      branch({ branchId: 'b144', code: '144', name: 'Puebla Loreto', group: 'store', closing: 1051 }),
      branch({ branchId: 'b102', code: '102', name: 'Acapulco Oviedo', group: 'store', closing: 0 }),
    ],
    ...over,
  };
}

function report(rows: InventoryFlowProductRow[], over: Partial<InventoryFlowResponse> = {}): InventoryFlowResponse {
  return {
    period: { id: 'p75', number: 75, name: 'NOVIEMBRE 2026', startDate: '2026-11-01', endDate: '2026-11-30', isClosed: true },
    currency: 'MXN',
    region: 'México',
    top: 15,
    inProgress: false,
    closingDate: '2026-11-30',
    generatedAt: '2026-12-01T15:00:00Z',
    groups: { general: [], warehouse: [], store: [] },
    excluded: [],
    periods: [],
    totals: {
      products: rows.length,
      opening: { general: 0, warehouses: 0, stores: 0, transit: 0, total: 0 },
      entries: 0,
      sales: 0,
      other: 0,
      closing: { general: 0, warehouses: 0, stores: 0, transit: 0, total: 0 },
    },
    rows,
    ...over,
  };
}

describe('cifras del informe', () => {
  it('las piezas van con guion normal: la fuente del PDF no trae el signo menos tipográfico', () => {
    expect(pdfPieces(60644)).toBe('60,644');
    expect(pdfPieces(-1361)).toBe('-1,361');
    expect(pdfPieces(0)).toBe('0');
    expect(pdfPieces(null)).toBe('0');
    expect(pdfSigned(136)).toBe('+136');
    expect(pdfSigned(-61)).toBe('-61');
    expect(pdfSigned(0)).toBe('0');
  });

  it('las cinco cifras: empezamos con + entraron - se vendieron +/- otros = quedan', () => {
    const p = product();
    const f = flowFigures(
      { opening: p.opening.total, entries: p.entries, sales: p.sales, other: p.other, closing: p.closing.total },
      false,
    );
    expect(f.map((x) => `${x.sign}${x.label}:${x.value}`)).toEqual([
      'Empezamos con:67,873',
      '+Entraron:14,791',
      '-Se vendieron:22,156',
      '+Otros movimientos:136',
      '=Quedaron al cierre:60,644',
    ]);
    // Y las cifras cierran.
    expect(p.opening.total + p.entries - p.sales + p.other).toBe(p.closing.total);
  });

  it('otros movimientos negativos se restan, y un periodo en curso dice "quedan hoy"', () => {
    const f = flowFigures({ opening: 100, entries: 0, sales: 10, other: -5, closing: 85 }, true);
    expect(f[3]).toEqual({ sign: '-', label: 'Otros movimientos', value: '5' });
    expect(f[4].label).toBe('Quedan hoy');
  });

  it('el resumen suma solo los productos que van en el informe', () => {
    const a = product();
    const b = product({
      rank: 2,
      productId: 'p2',
      code: '9316',
      opening: { general: 10, warehouses: 0, stores: 5, transit: 0, total: 15 },
      entries: 3,
      sales: 4,
      other: -1,
      closing: { general: 8, warehouses: 0, stores: 5, transit: 0, total: 13 },
    });
    const t = pdfTotals([a, b]);
    expect(t).toMatchObject({
      products: 2,
      opening: 67888,
      entries: 14794,
      sales: 22160,
      other: 135,
      closing: 60657,
      closingGeneral: 76,
      closingWarehouses: 44266,
      closingStores: 10849,
      closingTransit: 5466,
    });
    expect(t.opening + t.entries - t.sales + t.other).toBe(t.closing);
    expect(pdfTotals([a]).closing).toBe(60644);
    expect(pdfTotals([])).toMatchObject({ products: 0, closing: 0 });
  });
});

describe('dónde deben estar las piezas (tabla del conteo)', () => {
  it('solo salen las sucursales con piezas, por grupo y con el total de cada grupo', () => {
    expect(countRows(product())).toEqual([
      { kind: 'group', title: 'ALMACÉN GENERAL', pieces: 68 },
      { kind: 'branch', code: '164', name: 'Irapuato Almacén General', pieces: 68 },
      { kind: 'group', title: 'OTROS ALMACENES', pieces: 23593 },
      { kind: 'branch', code: '172', name: 'Producción México', pieces: 23257 },
      { kind: 'branch', code: '163', name: 'Tijuana Almacén', pieces: 336 },
      { kind: 'group', title: 'TIENDAS', pieces: 1051 },
      { kind: 'branch', code: '144', name: 'Puebla Loreto', pieces: 1051 },
    ]);
  });

  it('un grupo sin piezas no sale; sin existencias no hay renglones', () => {
    const p = product({ branches: [branch({ group: 'store', code: '144', name: 'Puebla Loreto', closing: 5 })] });
    expect(countRows(p).map((r) => (r.kind === 'group' ? r.title : r.code))).toEqual(['TIENDAS', '144']);
    expect(countRows(product({ branches: [branch({ closing: 0 })] }))).toEqual([]);
  });

  it('lo que va en camino no se cuenta en ninguna sucursal', () => {
    expect(countable(product())).toBe(55178);
    expect(countable(product({ closing: { general: 5, warehouses: 0, stores: 0, transit: 0, total: 5 } }))).toBe(5);
  });

  it('los renglones se aprietan para caber en una hoja antes de pasar a otra', () => {
    expect(countRowHeight(20)).toBe(4.7);
    // México: unas 70 sucursales con piezas + 3 títulos.
    const h = countRowHeight(73);
    expect(h).toBeLessThan(4.7);
    expect(h).toBeGreaterThanOrEqual(4.1);
    expect(countRowHeight(400)).toBe(4.1);
  });

  it('reparto en dos columnas: la última hoja en mitades parejas y los títulos nunca al pie', () => {
    const n = (count: number) => Array.from({ length: count }, (_, i) => i + 1);
    expect(paginateCountRows(n(7), 10, 12)).toEqual([[[1, 2, 3, 4], [5, 6, 7]]]);
    expect(paginateCountRows(n(20), 10, 12)).toEqual([[n(10), n(20).slice(10)]]);
    // Más de lo que cabe: la primera hoja llena y el resto en la siguiente.
    const pages = paginateCountRows(n(26), 10, 12);
    expect(pages).toHaveLength(2);
    expect(pages[0].map((c) => c.length)).toEqual([10, 10]);
    expect(pages[1]).toEqual([[21, 22, 23], [24, 25, 26]]);
    expect(paginateCountRows([], 10, 12)).toEqual([[[], []]]);
    // El renglón 4 es un título de grupo: pasa a la columna derecha con sus sucursales.
    const split = paginateCountRows(n(8), 10, 12, (row) => row === 4);
    expect(split).toEqual([[[1, 2, 3], [4, 5, 6, 7, 8]]]);
  });
});

describe('el PDF', () => {
  it('una hoja de resumen y una por producto', () => {
    const rows = [product(), product({ rank: 2, productId: 'p2', code: '9316', name: 'Leche De Soya 500 g' })];
    const doc = buildInventoryFlowPdf(report(rows));
    expect(doc.getNumberOfPages()).toBe(3);
    const bytes = doc.output('arraybuffer');
    expect(new TextDecoder('latin1').decode(bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('solo van los productos que se piden; sin productos queda la hoja del resumen', () => {
    const rows = [product(), product({ rank: 2, productId: 'p2', code: '9316' }), product({ rank: 3, productId: 'p3', code: '8050' })];
    expect(buildInventoryFlowPdf(report(rows), { products: [rows[0], rows[2]] }).getNumberOfPages()).toBe(3);
    expect(buildInventoryFlowPdf(report(rows), { products: [] }).getNumberOfPages()).toBe(1);
  });

  it('un producto con muchísimas sucursales sigue en otra hoja en vez de salirse', () => {
    const many = Array.from({ length: 260 }, (_, i) =>
      branch({ branchId: `b${i}`, code: String(100 + i), name: `Sucursal ${i}`, group: 'store', closing: i + 1 }),
    );
    const rows = [product({ branches: many }), product({ rank: 2, productId: 'p2', code: '9316' })];
    // Resumen + más de una hoja del primero + la del segundo.
    expect(buildInventoryFlowPdf(report(rows)).getNumberOfPages()).toBeGreaterThan(3);
  });

  it('cien productos: la tabla del resumen salta de hoja con su encabezado', () => {
    const rows = Array.from({ length: 100 }, (_, i) =>
      product({ rank: i + 1, productId: `p${i}`, code: String(8000 + i), branches: [branch()] }),
    );
    // 100 hojas de producto + las del resumen (más de una).
    expect(buildInventoryFlowPdf(report(rows)).getNumberOfPages()).toBeGreaterThan(102);
  });

  it('nombre del archivo con periodo, zona y día del cierre', () => {
    expect(inventoryFlowPdfFilename(report([]))).toBe('INFORME_INVENTARIO_NOVIEMBRE_2026_MXN_20261130.pdf');
  });
});

// Diego, 25-nov-2026: "el Informe en PDF quiero que sea en cada producto… para yo elegir de cuál
// quiero el informe y no de todos".
describe('el informe de un solo producto (se pide desde su renglón)', () => {
  const stores = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      branch({ branchId: `b${i}`, code: String(100 + i), name: `Sucursal ${i}`, group: 'store', closing: i + 1 }),
    );

  it('es una sola hoja: la del producto, sin la hoja de resumen', () => {
    const rows = [product(), product({ rank: 2, productId: 'p2', code: '9316' }), product({ rank: 3, productId: 'p3', code: '8050' })];
    expect(buildInventoryFlowPdf(report(rows), { products: [rows[1]] }).getNumberOfPages()).toBe(1);
    // Aunque el reporte solo traiga ese producto.
    expect(buildInventoryFlowPdf(report([rows[0]])).getNumberOfPages()).toBe(1);
  });

  it('con las sucursales de México la tabla llena la hoja y "Cómo leerlo" pasa a la siguiente', () => {
    const doc = buildInventoryFlowPdf(report([product({ branches: stores(70) })]));
    expect(doc.getNumberOfPages()).toBe(2);
  });

  it('con muchísimas sucursales la tabla sigue en otra hoja en vez de salirse', () => {
    const doc = buildInventoryFlowPdf(report([product({ branches: stores(260) })]));
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
  });

  it('sin piezas en ninguna sucursal también sale en una hoja', () => {
    const empty = product({ branches: [], closing: { general: 0, warehouses: 0, stores: 0, transit: 0, total: 0 } });
    expect(buildInventoryFlowPdf(report([empty])).getNumberOfPages()).toBe(1);
  });

  it('el archivo lleva la clave del producto', () => {
    const r = report([]);
    expect(inventoryFlowPdfFilename(r, { code: '9019' })).toBe('INFORME_INVENTARIO_9019_NOVIEMBRE_2026_MXN_20261130.pdf');
    expect(inventoryFlowPdfFilename(r, { code: '8012-R' })).toBe('INFORME_INVENTARIO_8012_R_NOVIEMBRE_2026_MXN_20261130.pdf');
    expect(inventoryFlowPdfFilename(r, { code: '9570m' })).toBe('INFORME_INVENTARIO_9570M_NOVIEMBRE_2026_MXN_20261130.pdf');
    expect(inventoryFlowPdfFilename(r, null)).toBe('INFORME_INVENTARIO_NOVIEMBRE_2026_MXN_20261130.pdf');
  });

  it('bajo el título dice su lugar en ventas, las fechas del periodo y de cuándo es la existencia', () => {
    expect(productPeriodLine(report([]), { rank: 4 })).toBe(
      'Número 4 en ventas del periodo · Del 1 nov 2026 al 30 nov 2026 · Periodo terminado: existencia al final del 30 nov 2026',
    );
    expect(productPeriodLine(report([], { inProgress: true, closingDate: '2026-11-25' }), { rank: 1 })).toBe(
      'Número 1 en ventas del periodo · Del 1 nov 2026 al 30 nov 2026 · Periodo en curso: existencia al momento del informe (25 nov 2026)',
    );
  });

  it('"Cómo leerlo" nombra la tabla del conteo, que va en el mismo informe', () => {
    const single = howToReadNotes(true, true);
    expect(single).toHaveLength(5);
    expect(single[4]).toContain('Quedan = Empezamos con + Entraron - Se vendieron +/- Otros movimientos');
    expect(single[4]).toContain('tabla "Dónde deben estar las piezas"');
    expect(howToReadNotes(false, false)[4]).toContain('Quedaron = ');
    expect(howToReadNotes(false, false)[4]).toContain('hojas siguientes');
    // La fuente estándar del PDF solo trae Latin-1.
    const latin1 = /^[\x20-\xff]+$/;
    for (const note of [...single, ...howToReadNotes(false, false)]) expect(note).toMatch(latin1);
  });
});
