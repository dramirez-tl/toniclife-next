// Venta en caja vs pedidos en línea (Contabilidad, 14-nov-2026).
//
// El total de una sucursal suma lo que cobró en su caja (POS) y los pedidos de la
// tienda en línea que surte o entrega. Esos pedidos se pagan en la tienda (tarjeta
// u OXXO), no en la caja: por eso el total del reporte puede ser mayor que el corte
// de la sucursal. Estas funciones parten el total para mostrar las dos partes en
// Ventas por sucursal y en el Corte de caja. Las cifras las da el API; aquí solo
// se acomodan (y se cubre el API anterior, que no mandaba la parte de caja).

import type { BranchSales, CashCutResponse } from '@/types/reports';

export interface ChannelSplit {
  /** Lo cobrado en la caja de la sucursal (ventas del POS). */
  register: number;
  /** Pedidos de la tienda en línea asignados a la sucursal. */
  online: number;
  onlineCount: number;
}

export interface CurrencyChannelSplit extends ChannelSplit {
  currency: string;
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

/** Moneda en que se muestra la sucursal (MXN si el API no la manda). */
const currencyOf = (code: string | undefined): string => (code ?? '').trim().toUpperCase() || 'MXN';

type BranchTotals = Pick<BranchSales, 'totalSales' | 'posTotal' | 'onlineTotal' | 'onlineCount'>;

/** Parte del total de una sucursal que pasó por su caja y parte que son pedidos en línea. */
export function branchChannelSplit(branch: BranchTotals): ChannelSplit {
  const online = branch.onlineTotal ?? 0;
  return {
    // API anterior (sin posTotal): lo de caja es el total menos lo de en línea.
    register: round2(branch.posTotal ?? branch.totalSales - online),
    online: round2(online),
    onlineCount: branch.onlineCount ?? 0,
  };
}

/** Orden de las monedas en el pie: el mismo de las columnas del reporte. */
const CURRENCY_ORDER = ['MXN', 'USD', 'COP', 'GTQ'];
const currencyRank = (currency: string): number => {
  const rank = CURRENCY_ORDER.indexOf(currency);
  return rank === -1 ? CURRENCY_ORDER.length : rank;
};

/**
 * Totales del pie de la tabla, una fila por moneda: nunca se suman pesos con
 * dólares. Solo las monedas que tienen algo, en el orden de las columnas (MXN,
 * USD, COP, GTQ) y las demás al final por orden alfabético.
 */
export function channelSplitByCurrency(
  branches: readonly (BranchTotals & Pick<BranchSales, 'currencyCode'>)[],
): CurrencyChannelSplit[] {
  const byCurrency = new Map<string, CurrencyChannelSplit>();
  for (const branch of branches) {
    const currency = currencyOf(branch.currencyCode);
    const split = branchChannelSplit(branch);
    const acc = byCurrency.get(currency) ?? { currency, register: 0, online: 0, onlineCount: 0 };
    acc.register = round2(acc.register + split.register);
    acc.online = round2(acc.online + split.online);
    acc.onlineCount += split.onlineCount;
    byCurrency.set(currency, acc);
  }
  return [...byCurrency.values()]
    .filter((t) => t.register !== 0 || t.online !== 0 || t.onlineCount !== 0)
    .sort((a, b) => currencyRank(a.currency) - currencyRank(b.currency) || a.currency.localeCompare(b.currency));
}

type CashCutTotals = Pick<CashCutResponse, 'total' | 'registerTotal' | 'onlineTotal' | 'onlineCount'> & {
  rows: readonly Pick<CashCutResponse['rows'][number], 'total' | 'isOnline'>[];
};

/** Cuánto del corte pasó por la caja y cuánto son pedidos en línea. */
export function cashCutChannelSplit(cut: CashCutTotals): ChannelSplit {
  if (cut.registerTotal !== undefined && cut.onlineTotal !== undefined) {
    return {
      register: round2(cut.registerTotal),
      online: round2(cut.onlineTotal),
      onlineCount: cut.onlineCount ?? 0,
    };
  }
  // API anterior: se calcula de los renglones (si tampoco los marca, todo es caja).
  const onlineRows = cut.rows.filter((r) => r.isOnline === true);
  const online = round2(onlineRows.reduce((sum, r) => sum + r.total, 0));
  return { register: round2(cut.total - online), online, onlineCount: onlineRows.length };
}
