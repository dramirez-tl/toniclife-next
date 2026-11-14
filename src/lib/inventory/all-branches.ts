// Inventario › Existencias General › "Todas las sucursales" (Diego, 14-nov-2026).
//
// La pantalla ve UNA sucursal o TODAS sumadas por producto. Aquí vive lo que no
// depende de React: el valor del selector, el renglón común de la tabla (venga
// de una sucursal o del consolidado), las tarjetas y el desglose de un producto
// sucursal por sucursal. Puro y con pruebas.

import type { ConsolidatedProductStockDto, ProductStockDto } from '@/types/inventory';

/** Valor del selector (y de `?branch=`) para ver todas las sucursales juntas. */
export const ALL_BRANCHES = 'all';

export const ALL_BRANCHES_LABEL = 'Todas las sucursales';

/** "Todas" solo tiene sentido para quien ve dos o más sucursales. */
export function canSeeAllBranches(branchCount: number | undefined): boolean {
  return (branchCount ?? 0) > 1;
}

export type StockState = 'out' | 'low' | 'normal';

/**
 * Estado de un renglón. Sin piezas manda ("sin existencias"); "bajas" solo
 * aplica cuando todavía quedan piezas. Así los tres estados no se traslapan.
 */
export function stockState(row: { quantityAvailable: number; isLowStock: boolean }): StockState {
  if (!(row.quantityAvailable > 0)) return 'out';
  return row.isLowStock ? 'low' : 'normal';
}

/** Renglón de la tabla: igual para una sucursal que para todas. */
export interface StockTableRow {
  key: string;
  productId: string;
  productCode: string;
  productName: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  state: StockState;
  lastMovementAt?: string;
  /** Solo con una sucursal: de ahí sale la zona horaria de la fecha. */
  branchId?: string;
  /** Solo con todas las sucursales: en cuántas está dado de alta el producto… */
  branchesCount?: number;
  /** …y en cuántas tiene piezas. */
  branchesWithStock?: number;
}

export function branchStockRows(items: ProductStockDto[] | undefined): StockTableRow[] {
  return (items ?? []).map((item) => ({
    key: item.id,
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    imageUrl: item.imageUrl,
    thumbnailUrl: item.thumbnailUrl,
    quantityOnHand: item.quantityOnHand,
    quantityReserved: item.quantityReserved,
    quantityAvailable: item.quantityAvailable,
    state: stockState(item),
    lastMovementAt: item.lastMovementAt,
    branchId: item.branchId,
  }));
}

export function consolidatedStockRows(items: ConsolidatedProductStockDto[] | undefined): StockTableRow[] {
  return (items ?? []).map((item) => ({
    key: item.productId,
    productId: item.productId,
    productCode: item.productCode,
    productName: item.productName,
    imageUrl: item.imageUrl,
    thumbnailUrl: item.thumbnailUrl,
    quantityOnHand: item.quantityOnHand,
    quantityReserved: item.quantityReserved,
    quantityAvailable: item.quantityAvailable,
    state: stockState(item),
    lastMovementAt: item.lastMovementAt,
    branchesCount: item.branchesCount,
    branchesWithStock: item.branchesWithStock,
  }));
}

export interface StockCards {
  totalProducts: number;
  normalStock: number;
  lowStock: number;
  outOfStock: number;
}

/**
 * Tarjetas de arriba. El API manda "bajas" SIN las agotadas, así que los tres
 * estados suman el total: normales = total − bajas − sin existencias.
 */
export function stockCards(
  stats: { totalProducts: number; lowStock: number; outOfStock: number } | null | undefined,
): StockCards {
  const totalProducts = stats?.totalProducts ?? 0;
  const lowStock = stats?.lowStock ?? 0;
  const outOfStock = stats?.outOfStock ?? 0;
  return {
    totalProducts,
    lowStock,
    outOfStock,
    normalStock: Math.max(0, totalProducts - lowStock - outOfStock),
  };
}

/** "37 de 83" (en cuántas sucursales hay piezas, de las que tienen el producto). */
export function branchesWithStockLabel(withStock: number | undefined, count: number | undefined): string {
  return `${withStock ?? 0} de ${count ?? 0}`;
}

// ---------------------------------------------------------------- desglose por sucursal

/** Lo que el desglose necesita saber de una sucursal del selector. */
export interface BreakdownBranch {
  id: string;
  name: string;
  code: string;
  timezone?: string;
}

/** Un producto en una sucursal. */
export interface BranchBreakdownRow {
  branchId: string;
  branchName: string;
  branchCode: string;
  timezone?: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lastMovementAt?: string;
}

/**
 * Existencias de un producto, sucursal por sucursal, solo de las sucursales
 * que la persona ve en el selector (las demás se dejan fuera para que el
 * desglose sume lo mismo que el renglón de "Todas las sucursales").
 * Orden: primero donde más hay; a igual cantidad, por nombre.
 */
export function branchBreakdown(
  stock: ProductStockDto[] | undefined,
  branches: BreakdownBranch[] | undefined,
): BranchBreakdownRow[] {
  const byId = new Map((branches ?? []).map((b) => [b.id, b]));
  const rows: BranchBreakdownRow[] = [];
  for (const item of stock ?? []) {
    const branch = byId.get(item.branchId);
    if (!branch) continue;
    rows.push({
      branchId: branch.id,
      branchName: branch.name,
      branchCode: branch.code,
      timezone: branch.timezone,
      quantityOnHand: item.quantityOnHand,
      quantityReserved: item.quantityReserved,
      quantityAvailable: item.quantityAvailable,
      lastMovementAt: item.lastMovementAt,
    });
  }
  return rows.sort(
    (a, b) =>
      b.quantityAvailable - a.quantityAvailable ||
      a.branchName.localeCompare(b.branchName, 'es') ||
      a.branchCode.localeCompare(b.branchCode, 'es'),
  );
}

export type BreakdownFilter = 'all' | 'with' | 'without';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Filtra el desglose por texto (nombre o clave de la sucursal, sin acentos) y por si hay piezas. */
export function filterBranchBreakdown(
  rows: BranchBreakdownRow[],
  term: string,
  filter: BreakdownFilter = 'all',
): BranchBreakdownRow[] {
  const needle = normalize(term);
  return rows.filter((row) => {
    if (filter === 'with' && !(row.quantityAvailable > 0)) return false;
    if (filter === 'without' && row.quantityAvailable > 0) return false;
    if (!needle) return true;
    return normalize(`${row.branchName} ${row.branchCode}`).includes(needle);
  });
}

export interface BreakdownTotals {
  branches: number;
  withStock: number;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
}

export function breakdownTotals(rows: BranchBreakdownRow[]): BreakdownTotals {
  return rows.reduce<BreakdownTotals>(
    (t, row) => ({
      branches: t.branches + 1,
      withStock: t.withStock + (row.quantityAvailable > 0 ? 1 : 0),
      quantityOnHand: t.quantityOnHand + row.quantityOnHand,
      quantityReserved: t.quantityReserved + row.quantityReserved,
      quantityAvailable: t.quantityAvailable + row.quantityAvailable,
    }),
    { branches: 0, withStock: 0, quantityOnHand: 0, quantityReserved: 0, quantityAvailable: 0 },
  );
}

/** Nombre del archivo que se descarga: `inventario_Irapuato_2026-11-14.csv`. */
export function stockExportFilename(scope: string, date: string): string {
  const safe =
    scope
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'sucursal';
  return `inventario_${safe}_${date}.csv`;
}
