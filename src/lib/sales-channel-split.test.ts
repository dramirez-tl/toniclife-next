import { describe, expect, it } from 'vitest';
import { branchChannelSplit, cashCutChannelSplit, channelSplitByCurrency } from './sales-channel-split';

describe('sales-channel-split · venta en caja vs pedidos en línea', () => {
  it('parte el total de la sucursal (caso de Ingresos, 13-nov-2026)', () => {
    // Irapuato Call Center: el reporte daba $27,591 y la caja vendió $20,447;
    // los $7,144 eran un pedido de la tienda en línea.
    expect(branchChannelSplit({ totalSales: 27591, posTotal: 20447, onlineTotal: 7144, onlineCount: 1 })).toEqual({
      register: 20447,
      online: 7144,
      onlineCount: 1,
    });
  });

  it('sin pedidos en línea todo es venta en caja', () => {
    expect(branchChannelSplit({ totalSales: 15627, posTotal: 15627, onlineTotal: 0, onlineCount: 0 })).toEqual({
      register: 15627,
      online: 0,
      onlineCount: 0,
    });
  });

  it('con el API anterior (sin posTotal) la caja es el total menos lo de en línea, a centavos', () => {
    expect(branchChannelSplit({ totalSales: 27591, onlineTotal: 7144, onlineCount: 1 })).toEqual({
      register: 20447,
      online: 7144,
      onlineCount: 1,
    });
    expect(branchChannelSplit({ totalSales: 0.3, onlineTotal: 0.1, onlineCount: 1 }).register).toBe(0.2);
    // Ni posTotal ni datos de en línea: todo cuenta como caja.
    expect(branchChannelSplit({ totalSales: 500 })).toEqual({ register: 500, online: 0, onlineCount: 0 });
  });

  it('el pie suma por moneda y nunca mezcla pesos con dólares', () => {
    const totals = channelSplitByCurrency([
      { currencyCode: 'MXN', totalSales: 27591, posTotal: 20447, onlineTotal: 7144, onlineCount: 1 },
      { currencyCode: 'USD', totalSales: 231.77, posTotal: 231.77, onlineTotal: 0, onlineCount: 0 },
      { currencyCode: 'MXN', totalSales: 59692, posTotal: 53558, onlineTotal: 6134, onlineCount: 3 },
      // Sin moneda (API anterior): pesos.
      { totalSales: 100.1, posTotal: 100.1, onlineTotal: 0, onlineCount: 0 },
      { currencyCode: ' usd ', totalSales: 10.2, posTotal: 0.1, onlineTotal: 10.1, onlineCount: 1 },
    ]);
    expect(totals).toEqual([
      { currency: 'MXN', register: 74105.1, online: 13278, onlineCount: 4 },
      { currency: 'USD', register: 231.87, online: 10.1, onlineCount: 1 },
    ]);
  });

  it('el pie sigue el orden de las columnas (MXN, USD, COP, GTQ), no el de las sucursales', () => {
    const order = channelSplitByCurrency([
      { currencyCode: 'COP', totalSales: 3697000, posTotal: 3697000, onlineTotal: 0, onlineCount: 0 },
      { currencyCode: 'GTQ', totalSales: 16991.25, posTotal: 16991.25, onlineTotal: 0, onlineCount: 0 },
      { currencyCode: 'EUR', totalSales: 10, posTotal: 10, onlineTotal: 0, onlineCount: 0 },
      { currencyCode: 'USD', totalSales: 106250.79, posTotal: 106250.79, onlineTotal: 0, onlineCount: 0 },
      { currencyCode: 'MXN', totalSales: 27591, posTotal: 20447, onlineTotal: 7144, onlineCount: 1 },
      { currencyCode: 'CAD', totalSales: 5, posTotal: 5, onlineTotal: 0, onlineCount: 0 },
    ]).map((t) => t.currency);
    expect(order).toEqual(['MXN', 'USD', 'COP', 'GTQ', 'CAD', 'EUR']);
  });

  it('el pie omite las monedas sin movimiento', () => {
    expect(
      channelSplitByCurrency([
        { currencyCode: 'COP', totalSales: 0, posTotal: 0, onlineTotal: 0, onlineCount: 0 },
        { currencyCode: 'MXN', totalSales: 50, posTotal: 50, onlineTotal: 0, onlineCount: 0 },
      ]),
    ).toEqual([{ currency: 'MXN', register: 50, online: 0, onlineCount: 0 }]);
    expect(channelSplitByCurrency([])).toEqual([]);
  });

  it('corte de caja: usa las cifras del API', () => {
    expect(
      cashCutChannelSplit({ total: 27591, registerTotal: 20447, onlineTotal: 7144, onlineCount: 1, rows: [] }),
    ).toEqual({ register: 20447, online: 7144, onlineCount: 1 });
  });

  it('corte de caja con el API anterior: sale de los renglones; sin marca, todo es caja', () => {
    expect(
      cashCutChannelSplit({
        total: 27591,
        rows: [
          { total: 12000 },
          { total: 7144, isOnline: true },
          { total: 8447, isOnline: false },
        ],
      }),
    ).toEqual({ register: 20447, online: 7144, onlineCount: 1 });
    expect(cashCutChannelSplit({ total: 900.5, rows: [{ total: 900.5 }] })).toEqual({
      register: 900.5,
      online: 0,
      onlineCount: 0,
    });
  });
});
