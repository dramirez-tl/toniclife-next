import { describe, expect, it } from 'vitest';
import type { InventoryFlowBranchRow, InventoryFlowProductRow } from '@/types/reports';
import {
  branchListLabel,
  branchSubtotals,
  closingTitle,
  filterProducts,
  generatedAtLabel,
  INVENTORY_FLOW_DEFAULT_TOP,
  INVENTORY_FLOW_TOPS,
  INVENTORY_FLOW_ZONES,
  inventoryFlowErrorMessage,
  inventoryFlowFilename,
  openingTitle,
  periodLabel,
  periodStateLabel,
  pieces,
  rowBalances,
  shortDate,
  signedPieces,
  warehouseStock,
} from './inventory-flow';

const period = {
  id: 'p75',
  number: 75,
  name: 'NOVIEMBRE 2026',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  isClosed: false,
};

function branch(over: Partial<InventoryFlowBranchRow> = {}): InventoryFlowBranchRow {
  return {
    branchId: 'b164',
    code: '164',
    name: 'Irapuato Almacén General',
    group: 'general',
    opening: 6038,
    entries: 14791,
    received: 0,
    sent: 20461,
    sales: 300,
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
    salesGross: 22627,
    saleReturns: 471,
    sales: 22156,
    other: 136,
    closing: { general: 68, warehouses: 44266, stores: 10844, transit: 5466, total: 60644 },
    branches: [branch()],
    ...over,
  };
}

describe('piezas', () => {
  it('con separador de miles y sin decimales de más', () => {
    expect(pieces(0)).toBe('0');
    expect(pieces(68)).toBe('68');
    expect(pieces(22156)).toBe('22,156');
    expect(pieces(1234.5)).toBe('1,234.5');
    expect(pieces(null)).toBe('0');
    expect(pieces(Number.NaN)).toBe('0');
  });

  it('los negativos llevan el signo menos, no un guion', () => {
    expect(pieces(-61)).toBe('−61');
    expect(pieces(-1361)).toBe('−1,361');
  });

  it('"otros movimientos" siempre dice si suma o resta', () => {
    expect(signedPieces(136)).toBe('+136');
    expect(signedPieces(-1057)).toBe('−1,057');
    expect(signedPieces(0)).toBe('0');
  });
});

describe('fechas y títulos', () => {
  it('fecha de negocio corta, sin corrimientos de zona', () => {
    expect(shortDate('2026-11-01')).toBe('1 nov 2026');
    expect(shortDate('2026-10-31')).toBe('31 oct 2026');
    expect(shortDate(null)).toBe('');
  });

  it('el periodo se muestra con las fechas que da el servidor', () => {
    expect(periodLabel(period)).toBe('NOVIEMBRE 2026 · 1 nov 2026 a 30 nov 2026');
    expect(
      periodLabel({ ...period, name: 'OCTUBRE 2026', startDate: '2026-09-26', endDate: '2026-10-31' }),
    ).toBe('OCTUBRE 2026 · 26 sep 2026 a 31 oct 2026');
  });

  it('el inicial es del primer día; el cierre dice si es el de hoy o el del último día', () => {
    expect(openingTitle({ period })).toBe('Inventario inicial · 1 nov 2026');
    expect(closingTitle({ inProgress: true, closingDate: '2026-11-25' })).toBe('Inventario actual · 25 nov 2026');
    expect(closingTitle({ inProgress: false, closingDate: '2026-11-30' })).toBe(
      'Inventario al cierre · 30 nov 2026',
    );
  });

  it('la hora de la consulta se dice en hora Centro', () => {
    // 17:20 UTC = 11:20 en la Ciudad de México.
    expect(generatedAtLabel('2026-11-25T17:20:00Z')).toBe('25 nov 2026, 11:20');
    // 03:10 UTC del 26 todavía es 25 en hora Centro.
    expect(generatedAtLabel('2026-11-26T03:10:00Z')).toBe('25 nov 2026, 21:10');
    expect(generatedAtLabel('no es fecha')).toBe('');
  });

  it('estado del periodo', () => {
    expect(
      periodStateLabel({ inProgress: true, closingDate: '2026-11-25', generatedAt: '2026-11-25T17:20:00Z' }),
    ).toBe('Periodo en curso: el inventario de cierre es el de este momento (25 nov 2026, 11:20).');
    expect(
      periodStateLabel({ inProgress: false, closingDate: '2026-11-30', generatedAt: '2026-12-02T15:00:00Z' }),
    ).toBe('Periodo terminado: el inventario de cierre es el del final del 30 nov 2026.');
  });

  it('nombre del Excel con periodo, zona y día', () => {
    expect(inventoryFlowFilename({ period, currency: 'MXN', closingDate: '2026-11-25' })).toBe(
      'INVENTARIO_Y_VENTAS_NOVIEMBRE_2026_MXN_20261125.xlsx',
    );
  });
});

describe('opciones de la pantalla', () => {
  it('México primero y las cuatro zonas con tienda', () => {
    expect(INVENTORY_FLOW_ZONES.map((z) => z.key)).toEqual(['MXN', 'USD', 'COP', 'GTQ']);
    expect(INVENTORY_FLOW_ZONES[0].label).toBe('México');
  });

  it('el top por defecto es 15, lo que pidió Operaciones', () => {
    expect(INVENTORY_FLOW_DEFAULT_TOP).toBe(15);
    expect(INVENTORY_FLOW_TOPS).toContain(15);
    expect(Math.max(...INVENTORY_FLOW_TOPS)).toBe(100);
  });
});

describe('renglones', () => {
  const rows = [
    product(),
    product({ rank: 2, productId: 'p2', code: '9570M', name: 'Os 436 Sobre c3 Tabs' }),
    product({ rank: 3, productId: 'p3', code: '9316', name: 'Leche De Soya 500 g' }),
  ];

  it('se filtran por clave o por nombre, sin importar mayúsculas ni acentos', () => {
    expect(filterProducts(rows, '').map((r) => r.code)).toEqual(['9019', '9570M', '9316']);
    expect(filterProducts(rows, '9570m').map((r) => r.code)).toEqual(['9570M']);
    expect(filterProducts(rows, 'LECHE').map((r) => r.code)).toEqual(['9316']);
    expect(filterProducts(rows, 'cóffee').map((r) => r.code)).toEqual(['9019']);
    expect(filterProducts(rows, 'no existe')).toEqual([]);
  });

  it('la fila cuadra: inicial + entró a almacén − ventas + otros = cierre', () => {
    expect(rowBalances(product())).toBe(true);
    expect(rowBalances(product({ other: 0 }))).toBe(false);
  });

  it('en almacén = almacén general + otros almacenes', () => {
    expect(warehouseStock(product().closing)).toBe(44334);
  });

  it('subtotales del desglose por tipo de sucursal', () => {
    const sub = branchSubtotals([
      branch(),
      branch({ branchId: 'b163', code: '163', group: 'warehouse', opening: 300, closing: 388, sales: 0 }),
      branch({ branchId: 'b144', code: '144', group: 'store', opening: 600, closing: 500, sales: 1000 }),
      branch({ branchId: 'b200', code: '200', group: 'store', opening: 50, closing: 70, sales: 30 }),
    ]);
    expect(sub.general).toEqual({ count: 1, opening: 6038, closing: 68, sales: 300 });
    expect(sub.warehouse).toEqual({ count: 1, opening: 300, closing: 388, sales: 0 });
    expect(sub.store).toEqual({ count: 2, opening: 650, closing: 570, sales: 1030 });
  });

  it('lista de sucursales de un grupo', () => {
    expect(
      branchListLabel([
        { code: '164', name: 'Almacén General' },
        { code: '163', name: 'Tijuana Almacén' },
      ]),
    ).toBe('164 Almacén General · 163 Tijuana Almacén');
    expect(branchListLabel([])).toBe('Ninguna');
  });
});

describe('errores del servidor', () => {
  it('muestra el motivo que da el servidor', () => {
    expect(
      inventoryFlowErrorMessage({
        response: { status: 403, data: { message: 'Este reporte es de toda la operación.' } },
      }),
    ).toBe('Este reporte es de toda la operación.');
    expect(
      inventoryFlowErrorMessage({ response: { status: 400, data: { message: ['top must not be greater than 100'] } } }),
    ).toBe('top must not be greater than 100');
  });

  it('un servidor que todavía no trae el reporte lo dice claro', () => {
    expect(inventoryFlowErrorMessage({ response: { status: 404, data: {} } })).toBe(
      'El servidor todavía no tiene este reporte. Avisa a Sistemas.',
    );
  });

  it('sin respuesta, el mensaje general', () => {
    expect(inventoryFlowErrorMessage(new Error('Network Error'))).toBe(
      'No se pudo cargar el reporte. Intenta de nuevo.',
    );
    expect(inventoryFlowErrorMessage(null)).toBe('No se pudo cargar el reporte. Intenta de nuevo.');
  });
});
