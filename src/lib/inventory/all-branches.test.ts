import { describe, expect, it } from 'vitest';
import type { ConsolidatedProductStockDto, ProductStockDto } from '@/types/inventory';
import {
  ALL_BRANCHES,
  branchBreakdown,
  branchesWithStockLabel,
  branchStockRows,
  breakdownTotals,
  canSeeAllBranches,
  consolidatedStockRows,
  filterBranchBreakdown,
  productBranchesExcelFilename,
  stockCards,
  stockExportFilename,
  stockState,
} from './all-branches';

function branchRow(over: Partial<ProductStockDto> = {}): ProductStockDto {
  return {
    id: 'sl-1',
    productId: 'p-1',
    productCode: '8180',
    productName: 'Nerlife 60 Caps',
    imageUrl: 'https://img.test/nerlife.jpg',
    thumbnailUrl: null,
    branchId: 'b-ira',
    branchName: 'Irapuato',
    quantityOnHand: 12,
    quantityReserved: 2,
    quantityInTransit: 0,
    quantityAvailable: 10,
    isLowStock: false,
    lastMovementAt: '2026-11-14T17:23:00.000Z',
    isActive: true,
    ...over,
  };
}

function allRow(over: Partial<ConsolidatedProductStockDto> = {}): ConsolidatedProductStockDto {
  return {
    productId: 'p-1',
    productCode: '8180',
    productName: 'Nerlife 60 Caps',
    imageUrl: null,
    thumbnailUrl: null,
    quantityOnHand: 1240,
    quantityReserved: 3,
    quantityInTransit: 0,
    quantityAvailable: 1237,
    minStockAlert: 0,
    isLowStock: false,
    branchesCount: 83,
    branchesWithStock: 37,
    lastMovementAt: '2026-11-14T18:05:00.000Z',
    ...over,
  };
}

describe('el selector: "Todas las sucursales"', () => {
  it('el valor es "all" y solo se ofrece a quien ve dos o más sucursales', () => {
    expect(ALL_BRANCHES).toBe('all');
    expect(canSeeAllBranches(83)).toBe(true);
    expect(canSeeAllBranches(2)).toBe(true);
    expect(canSeeAllBranches(1)).toBe(false);
    expect(canSeeAllBranches(0)).toBe(false);
    expect(canSeeAllBranches(undefined)).toBe(false);
  });
});

describe('stockState: los tres estados no se traslapan', () => {
  it('sin piezas manda sobre "bajas"; "bajas" solo con piezas', () => {
    expect(stockState({ quantityAvailable: 0, isLowStock: false })).toBe('out');
    // El API de una sucursal marca isLowStock también en cero: sigue siendo "sin existencias".
    expect(stockState({ quantityAvailable: 0, isLowStock: true })).toBe('out');
    expect(stockState({ quantityAvailable: 3, isLowStock: true })).toBe('low');
    expect(stockState({ quantityAvailable: 3, isLowStock: false })).toBe('normal');
  });
});

describe('renglones de la tabla: iguales para una sucursal que para todas', () => {
  it('una sucursal: la llave es la fila de existencias y conserva la sucursal (para la hora local)', () => {
    const [row] = branchStockRows([branchRow()]);
    expect(row).toEqual({
      key: 'sl-1',
      productId: 'p-1',
      productCode: '8180',
      productName: 'Nerlife 60 Caps',
      imageUrl: 'https://img.test/nerlife.jpg',
      thumbnailUrl: null,
      quantityOnHand: 12,
      quantityReserved: 2,
      quantityAvailable: 10,
      state: 'normal',
      lastMovementAt: '2026-11-14T17:23:00.000Z',
      branchId: 'b-ira',
    });
    expect(row.branchesCount).toBeUndefined();
  });

  it('todas: la llave es el producto y trae en cuántas sucursales hay', () => {
    const [row] = consolidatedStockRows([allRow()]);
    expect(row).toEqual({
      key: 'p-1',
      productId: 'p-1',
      productCode: '8180',
      productName: 'Nerlife 60 Caps',
      imageUrl: null,
      thumbnailUrl: null,
      quantityOnHand: 1240,
      quantityReserved: 3,
      quantityAvailable: 1237,
      state: 'normal',
      lastMovementAt: '2026-11-14T18:05:00.000Z',
      branchesCount: 83,
      branchesWithStock: 37,
    });
    expect(row.branchId).toBeUndefined();
  });

  it('el estado sale del disponible, en los dos modos', () => {
    expect(branchStockRows([branchRow({ quantityAvailable: 0, isLowStock: true })])[0].state).toBe('out');
    expect(branchStockRows([branchRow({ quantityAvailable: 2, isLowStock: true })])[0].state).toBe('low');
    expect(consolidatedStockRows([allRow({ quantityAvailable: 0, branchesWithStock: 0 })])[0].state).toBe('out');
    expect(consolidatedStockRows([allRow({ quantityAvailable: 5, isLowStock: true })])[0].state).toBe('low');
  });

  it('sin datos todavía: lista vacía', () => {
    expect(branchStockRows(undefined)).toEqual([]);
    expect(consolidatedStockRows(undefined)).toEqual([]);
  });
});

describe('stockCards: las tarjetas suman el total', () => {
  it('normales = total − bajas − sin existencias (el API manda "bajas" sin las agotadas)', () => {
    // Sucursal 164 el 14-nov: antes "bajas" traía las mismas 287 agotadas y "normales" salía en 0.
    expect(stockCards({ totalProducts: 493, lowStock: 0, outOfStock: 287 })).toEqual({
      totalProducts: 493,
      normalStock: 206,
      lowStock: 0,
      outOfStock: 287,
    });
    expect(stockCards({ totalProducts: 567, lowStock: 12, outOfStock: 157 })).toEqual({
      totalProducts: 567,
      normalStock: 398,
      lowStock: 12,
      outOfStock: 157,
    });
  });

  it('sin datos: ceros; nunca negativos', () => {
    const zeros = { totalProducts: 0, normalStock: 0, lowStock: 0, outOfStock: 0 };
    expect(stockCards(undefined)).toEqual(zeros);
    expect(stockCards(null)).toEqual(zeros);
    expect(stockCards({ totalProducts: 10, lowStock: 8, outOfStock: 8 }).normalStock).toBe(0);
  });
});

describe('branchesWithStockLabel', () => {
  it('"37 de 83"', () => {
    expect(branchesWithStockLabel(37, 83)).toBe('37 de 83');
    expect(branchesWithStockLabel(0, 12)).toBe('0 de 12');
    expect(branchesWithStockLabel(undefined, undefined)).toBe('0 de 0');
  });
});

describe('branchBreakdown: un producto, sucursal por sucursal', () => {
  const branches = [
    { id: 'b-ira', name: 'Irapuato', code: '164', timezone: 'America/Mexico_City' },
    { id: 'b-leon', name: 'León Centro', code: '136', timezone: 'America/Mexico_City' },
    { id: 'b-tij', name: 'Tijuana', code: '301', timezone: 'America/Tijuana' },
    { id: 'b-cel', name: 'Celaya', code: '118' },
  ];
  const stock = [
    branchRow({ id: 's1', branchId: 'b-ira', branchName: 'Irapuato', quantityOnHand: 12, quantityReserved: 2, quantityAvailable: 10 }),
    branchRow({ id: 's2', branchId: 'b-leon', branchName: 'León Centro', quantityOnHand: 40, quantityReserved: 0, quantityAvailable: 40, lastMovementAt: undefined }),
    branchRow({ id: 's3', branchId: 'b-tij', branchName: 'Tijuana', quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0 }),
    branchRow({ id: 's4', branchId: 'b-cel', branchName: 'Celaya', quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0 }),
    // Sucursal que la persona no ve en su selector (inactiva o fuera de su alcance): no entra.
    branchRow({ id: 's5', branchId: 'b-otra', branchName: 'Otra', quantityOnHand: 999, quantityAvailable: 999 }),
  ];

  it('solo las sucursales del selector; primero donde más hay y, a igual cantidad, por nombre', () => {
    const rows = branchBreakdown(stock, branches);
    expect(rows.map((r) => [r.branchName, r.branchCode, r.quantityAvailable])).toEqual([
      ['León Centro', '136', 40],
      ['Irapuato', '164', 10],
      ['Celaya', '118', 0],
      ['Tijuana', '301', 0],
    ]);
    expect(rows[1]).toEqual({
      branchId: 'b-ira',
      branchName: 'Irapuato',
      branchCode: '164',
      timezone: 'America/Mexico_City',
      quantityOnHand: 12,
      quantityReserved: 2,
      quantityAvailable: 10,
      lastMovementAt: '2026-11-14T17:23:00.000Z',
    });
    expect(rows[3].timezone).toBe('America/Tijuana');
  });

  it('los totales del desglose: piezas y en cuántas sucursales hay', () => {
    expect(breakdownTotals(branchBreakdown(stock, branches))).toEqual({
      branches: 4,
      withStock: 2,
      quantityOnHand: 52,
      quantityReserved: 2,
      quantityAvailable: 50,
    });
    expect(breakdownTotals([])).toEqual({
      branches: 0,
      withStock: 0,
      quantityOnHand: 0,
      quantityReserved: 0,
      quantityAvailable: 0,
    });
  });

  it('se filtra por nombre o clave (sin importar acentos) y por si hay piezas', () => {
    const rows = branchBreakdown(stock, branches);
    const names = (term: string, filter?: 'all' | 'with' | 'without') =>
      filterBranchBreakdown(rows, term, filter).map((r) => r.branchName);
    expect(names('leon')).toEqual(['León Centro']);
    expect(names('164')).toEqual(['Irapuato']);
    expect(names('  ')).toHaveLength(4);
    expect(names('', 'with')).toEqual(['León Centro', 'Irapuato']);
    expect(names('', 'without')).toEqual(['Celaya', 'Tijuana']);
    expect(names('tij', 'with')).toEqual([]);
    expect(names('nada')).toEqual([]);
  });

  it('sin datos o sin sucursales: vacío', () => {
    expect(branchBreakdown(undefined, branches)).toEqual([]);
    expect(branchBreakdown(stock, undefined)).toEqual([]);
  });
});

describe('stockExportFilename', () => {
  it('nombre del archivo sin acentos ni símbolos, con la fecha que se le da', () => {
    expect(stockExportFilename('Todas las sucursales', '2026-11-14')).toBe(
      'inventario_Todas_las_sucursales_2026-11-14.csv',
    );
    expect(stockExportFilename('León Centro / Bodega (136)', '2026-11-14')).toBe(
      'inventario_Leon_Centro_Bodega_136_2026-11-14.csv',
    );
    expect(stockExportFilename('', '2026-11-14')).toBe('inventario_sucursal_2026-11-14.csv');
  });
});

describe('productBranchesExcelFilename', () => {
  it('mismo nombre que arma el API: EXISTENCIAS_<clave>_<fecha>.xlsx', () => {
    expect(productBranchesExcelFilename('8289', '2026-11-14')).toBe('EXISTENCIAS_8289_2026-11-14.xlsx');
    expect(productBranchesExcelFilename('F9019-3', '2026-11-14')).toBe('EXISTENCIAS_F9019-3_2026-11-14.xlsx');
    expect(productBranchesExcelFilename('TL/A 25"', '2026-11-14')).toBe('EXISTENCIAS_TL_A_25__2026-11-14.xlsx');
    expect(productBranchesExcelFilename('', '2026-11-14')).toBe('EXISTENCIAS_producto_2026-11-14.xlsx');
  });
});
