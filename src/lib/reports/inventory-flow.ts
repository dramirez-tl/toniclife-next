// inventory-flow.ts — Reportes › Inventario y Ventas (Operaciones México,
// 24-nov-2026): textos y cuentas de la pantalla. Los números los entrega el
// servidor (GET /reports/inventory-flow); aquí solo se les da forma.

import type {
  InventoryFlowBranchRef,
  InventoryFlowBranchRow,
  InventoryFlowCurrency,
  InventoryFlowGroup,
  InventoryFlowPeriod,
  InventoryFlowProductRow,
  InventoryFlowResponse,
} from '@/types/reports';

export const INVENTORY_FLOW_ZONES: { key: InventoryFlowCurrency; label: string }[] = [
  { key: 'MXN', label: 'México' },
  { key: 'USD', label: 'Estados Unidos' },
  { key: 'COP', label: 'Colombia' },
  { key: 'GTQ', label: 'Guatemala' },
];

/** Cuántos productos se pueden pedir; 15 es lo que pidió Operaciones. */
export const INVENTORY_FLOW_TOPS = [15, 30, 50, 100] as const;
export const INVENTORY_FLOW_DEFAULT_TOP = 15;

export const INVENTORY_FLOW_GROUP_LABEL: Record<InventoryFlowGroup, string> = {
  general: 'Almacén general',
  warehouse: 'Otro almacén',
  store: 'Tienda',
};

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 12345.5 → '12,345.5' · −61 → '−61' (signo menos tipográfico, no guion). */
export function pieces(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return '0';
  const text = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  return n < 0 ? `−${text}` : text;
}

/** Para "otros movimientos": +136 · −61 · 0. */
export function signedPieces(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return '0';
  return n > 0 ? `+${pieces(n)}` : pieces(n);
}

/** '2026-11-01' → '1 nov 2026' (fecha de negocio, sin zona horaria). */
export function shortDate(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return iso ?? '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** Hora Centro de cuándo se generó: '25 nov 2026, 11:20'. */
export function generatedAtLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${shortDate(`${get('year')}-${get('month')}-${get('day')}`)}, ${get('hour')}:${get('minute')}`;
}

/** Opción del selector: 'NOVIEMBRE 2026 · 1 nov 2026 a 30 nov 2026'. */
export function periodLabel(period: InventoryFlowPeriod): string {
  return `${period.name} · ${shortDate(period.startDate)} a ${shortDate(period.endDate)}`;
}

/** Título del grupo de columnas del cierre. */
export function closingTitle(report: Pick<InventoryFlowResponse, 'inProgress' | 'closingDate'>): string {
  return report.inProgress
    ? `Inventario actual · ${shortDate(report.closingDate)}`
    : `Inventario al cierre · ${shortDate(report.closingDate)}`;
}

export function openingTitle(report: Pick<InventoryFlowResponse, 'period'>): string {
  return `Inventario inicial · ${shortDate(report.period.startDate)}`;
}

/** Frase que dice de cuándo es el cierre. */
export function periodStateLabel(
  report: Pick<InventoryFlowResponse, 'inProgress' | 'closingDate' | 'generatedAt'>,
): string {
  if (!report.inProgress) {
    return `Periodo terminado: el inventario de cierre es el del final del ${shortDate(report.closingDate)}.`;
  }
  const at = generatedAtLabel(report.generatedAt);
  return `Periodo en curso: el inventario de cierre es el de este momento${at ? ` (${at})` : ''}.`;
}

/** 'INVENTARIO_Y_VENTAS_NOVIEMBRE_2026_MXN_20261125.xlsx' */
export function inventoryFlowFilename(
  report: Pick<InventoryFlowResponse, 'period' | 'currency' | 'closingDate'>,
): string {
  const period = report.period.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
  return `INVENTARIO_Y_VENTAS_${period}_${report.currency}_${report.closingDate.replace(/-/g, '')}.xlsx`;
}

/** Filtra por clave o nombre (sin distinguir mayúsculas ni acentos). */
export function filterProducts(
  rows: readonly InventoryFlowProductRow[],
  search: string,
): InventoryFlowProductRow[] {
  const q = fold(search);
  if (!q) return [...rows];
  return rows.filter((r) => fold(r.code).includes(q) || fold(r.name).includes(q));
}

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** '164 Irapuato Almacén General · 163 Tijuana Almacén' */
export function branchListLabel(list: readonly InventoryFlowBranchRef[]): string {
  return list.length === 0 ? 'Ninguna' : list.map((b) => `${b.code} ${b.name}`).join(' · ');
}

/** Lo que queda en almacén (general + otros) de un inventario. */
export function warehouseStock(stock: { general: number; warehouses: number }): number {
  return stock.general + stock.warehouses;
}

/**
 * ¿La fila cuadra? inicial + entró a almacén − ventas + otros = cierre (contando lo
 * que va en camino). Siempre debe dar true: se usa como comprobación, no como dato.
 */
export function rowBalances(row: InventoryFlowProductRow): boolean {
  return Math.abs(row.opening.total + row.entries - row.sales + row.other - row.closing.total) < 0.01;
}

/** Suma del desglose por tipo de sucursal (para los subtotales del detalle). */
export function branchSubtotals(
  branches: readonly InventoryFlowBranchRow[],
): Record<InventoryFlowGroup, { count: number; opening: number; closing: number; sales: number }> {
  const out: Record<InventoryFlowGroup, { count: number; opening: number; closing: number; sales: number }> = {
    general: { count: 0, opening: 0, closing: 0, sales: 0 },
    warehouse: { count: 0, opening: 0, closing: 0, sales: 0 },
    store: { count: 0, opening: 0, closing: 0, sales: 0 },
  };
  for (const b of branches) {
    const g = out[b.group];
    g.count += 1;
    g.opening += b.opening;
    g.closing += b.closing;
    g.sales += b.sales;
  }
  return out;
}

/** Cómo se lee el reporte (lo mismo que trae la hoja DATOS DEL REPORTE del Excel). */
export const INVENTORY_FLOW_NOTES: readonly { term: string; text: string }[] = [
  { term: 'Inventario inicial', text: 'Las piezas que había al empezar el primer día del periodo.' },
  {
    term: 'Entró a almacén',
    text: 'Entradas de producción y de compra recibidas en almacén durante el periodo.',
  },
  {
    term: 'Ventas',
    text:
      'Piezas que salieron del inventario por venta (caja y tienda en línea), menos las que regresaron por cancelación. ' +
      'Cuenta también las que salieron dentro de un kit o como regalo de una promoción; por eso puede ser mayor que Piezas por Producto.',
  },
  {
    term: 'En camino',
    text: 'Traspasos que ya salieron de su origen y todavía no se reciben en el destino.',
  },
  {
    term: 'Otros movimientos',
    text:
      'Ajustes, mermas, caducidad, devoluciones al almacén, conteos físicos y faltantes de traspaso. ' +
      'Es lo que hace que la fila cuadre: inicial + entró a almacén − ventas + otros = cierre (contando lo que va en camino).',
  },
];

/** Mensaje de un error del API: su `message` (texto o lista) o el de respaldo. */
export function inventoryFlowErrorMessage(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { message?: unknown } } } | null)?.response;
  const message = response?.data?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message)) {
    const parts = message.filter((m): m is string => typeof m === 'string' && m.trim() !== '');
    if (parts.length > 0) return parts.join('. ');
  }
  if (response?.status === 404) {
    return 'El servidor todavía no tiene este reporte. Avisa a Sistemas.';
  }
  return 'No se pudo cargar el reporte. Intenta de nuevo.';
}
