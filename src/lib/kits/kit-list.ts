// kit-list.ts — lógica PURA (sin React ni red) de la pestaña Kits de
// /admin/productos (contrato de kits §5.1): columnas Receta y Salud, filtros
// que se aplican en el cliente (salud, ventas del periodo; los de canal van al
// servidor) y las filas del CSV exportable.
//
// Fuentes que cruza el listado:
//   - GET /products (fila del kit: imagen, precio del país, canales, estado),
//   - GET /products/kits/availability (receta, sucursales, fantasma, respaldo),
//   - GET /products/kits/sales-summary (unidades del periodo 26 → 25).
// Todo dato ausente degrada a "sin dato": aquí no se inventan reglas.

import {
  filterKitsByAvailability,
  fmt,
  type AvailabilityTone,
  type KitAvailabilitySummary,
  type KitListFilters,
  type KitStockMode,
} from './kit-availability';
import type { KitSalesSummaryItem } from './kit-sales';

// ================================
// Columna Receta
// ================================
export interface RecipeCell {
  /** "12 componentes" / "Sin receta" / "Sin dato". */
  label: string;
  /** Rojo: kit que se arma al vender sin receta (no se puede vender). */
  missing: boolean;
  /** `false` cuando el servidor no mandó el resumen del kit. */
  known: boolean;
}

export function recipeCell(
  summary: Pick<KitAvailabilitySummary, 'componentsCount' | 'stockMode'> | undefined,
): RecipeCell {
  if (!summary) return { label: 'Sin dato', missing: false, known: false };
  if (summary.componentsCount <= 0) {
    return { label: 'Sin receta', missing: summary.stockMode !== 'prebuilt', known: true };
  }
  const count = summary.componentsCount;
  return { label: `${fmt(count)} ${count === 1 ? 'componente' : 'componentes'}`, missing: false, known: true };
}

// ================================
// Columna Salud (chips del contrato §5.1 que el listado permite calcular)
// ================================
export type KitHealthKey = 'no_recipe' | 'no_price' | 'no_image' | 'phantom' | 'unbacked';

export interface KitHealthFlag {
  key: KitHealthKey;
  label: string;
  /** Explicación para gente no técnica (tooltip). */
  title: string;
  tone: AvailabilityTone;
}

/**
 * Chips de salud de un kit. Con el resumen de disponibilidad: "Sin receta"
 * (se arma y no tiene componentes), "Sin precio" (ninguna sucursal con punto
 * de venta del país tiene precio vigente), "Existencia fantasma" (se arma pero
 * tiene piezas propias) y "Sin respaldo" (prearmado con existencia sin
 * kardex). "Sin imagen" sale de la propia fila del listado. Sin resumen solo
 * se evalúa la imagen (no se adivina lo demás).
 */
export function kitHealthFlags(
  kit: { imageUrl?: string | null },
  summary: KitAvailabilitySummary | undefined,
): KitHealthFlag[] {
  const flags: KitHealthFlag[] = [];
  if (summary) {
    if (summary.stockMode === 'assemble_on_sale' && summary.componentsCount <= 0) {
      flags.push({
        key: 'no_recipe',
        label: 'Sin receta',
        title: 'Se arma al vender pero no tiene componentes: no se puede vender.',
        tone: 'bad',
      });
    }
    if (summary.branchesTotal <= 0) {
      flags.push({
        key: 'no_price',
        label: 'Sin precio',
        title: 'Ninguna sucursal con punto de venta de este país tiene precio vigente del kit.',
        tone: 'warn',
      });
    }
  }
  if (!kit.imageUrl) {
    flags.push({
      key: 'no_image',
      label: 'Sin imagen',
      title: 'Este kit no tiene imagen cargada (el POS la muestra al inscribir).',
      tone: 'warn',
    });
  }
  if (summary?.ownStockPhantom) {
    const { units, rows } = summary.ownStockPhantom;
    flags.push({
      key: 'phantom',
      label: 'Existencia fantasma',
      title: `Tiene ${fmt(units)} ${units === 1 ? 'pieza propia' : 'piezas propias'} en ${fmt(rows)} ${
        rows === 1 ? 'sucursal' : 'sucursales'
      } que ninguna venta usa: se arma al vender y solo cuentan sus componentes.`,
      tone: 'warn',
    });
  }
  if (summary?.stockMode === 'prebuilt' && summary.unbackedOwnStock) {
    flags.push({
      key: 'unbacked',
      label: 'Sin respaldo',
      title: 'Existencia propia sin movimientos de kardex que la respalden.',
      tone: 'warn',
    });
  }
  return flags;
}

/** "Sin receta; Sin imagen" para el CSV y los tooltips. */
export const healthText = (flags: readonly KitHealthFlag[]): string => flags.map((f) => f.label).join('; ');

// ================================
// Filtros
// ================================
export type HealthFilter = '' | 'pending' | 'ok';
export const HEALTH_FILTER_OPTIONS: { value: Exclude<HealthFilter, ''>; label: string }[] = [
  { value: 'pending', label: 'Con pendientes' },
  { value: 'ok', label: 'Sin pendientes' },
];
export const isHealthFilter = (v: string): v is HealthFilter =>
  v === '' || HEALTH_FILTER_OPTIONS.some((o) => o.value === v);

export function matchesHealthFilter(flags: readonly KitHealthFlag[], f: HealthFilter): boolean {
  if (!f) return true;
  return f === 'pending' ? flags.length > 0 : flags.length === 0;
}

/** Canal: se resuelve en el SERVIDOR (`GET /products` acepta ambos booleanos). */
export type ChannelFilter = '' | 'pos' | 'web';
export const CHANNEL_FILTER_OPTIONS: { value: Exclude<ChannelFilter, ''>; label: string }[] = [
  { value: 'pos', label: 'Punto de venta' },
  { value: 'web', label: 'Inscripción en línea' },
];
export const isChannelFilter = (v: string): v is ChannelFilter =>
  v === '' || CHANNEL_FILTER_OPTIONS.some((o) => o.value === v);

export function channelFilterParams(f: ChannelFilter): { availableInPos?: true; isVisibleEcommerce?: true } {
  if (f === 'pos') return { availableInPos: true };
  if (f === 'web') return { isVisibleEcommerce: true };
  return {};
}

/** Ventas del periodo: en el cliente sobre el resumen (el endpoint no filtra). */
export type SalesFilter = '' | 'with' | 'without';
export const SALES_FILTER_OPTIONS: { value: Exclude<SalesFilter, ''>; label: string }[] = [
  { value: 'with', label: 'Con ventas en el periodo' },
  { value: 'without', label: 'Sin ventas en el periodo' },
];
export const isSalesFilter = (v: string): v is SalesFilter =>
  v === '' || SALES_FILTER_OPTIONS.some((o) => o.value === v);

export function matchesSalesFilter(item: Pick<KitSalesSummaryItem, 'unitsPaid'> | undefined, f: SalesFilter): boolean {
  if (!f) return true;
  const paid = item?.unitsPaid ?? 0;
  return f === 'with' ? paid > 0 : paid <= 0;
}

export interface KitListClientFilters extends KitListFilters {
  health?: HealthFilter;
  sales?: SalesFilter;
}

export interface KitListContext<T> {
  availabilityById: Map<string, KitAvailabilitySummary>;
  salesById: Map<string, KitSalesSummaryItem>;
  /** Surtido del kit cuando el resumen no llegó (se lee de la propia fila). */
  modeOf: (kit: T) => KitStockMode | null;
}

/**
 * Aplica sobre la lista completa los filtros que el servidor no conoce:
 * surtido, disponibilidad, "le falta…", salud y ventas del periodo.
 */
export function filterKitList<T extends { id: string; imageUrl?: string | null }>(
  kits: T[],
  ctx: KitListContext<T>,
  filters: KitListClientFilters,
): T[] {
  const byAvailability = filterKitsByAvailability(kits, ctx.availabilityById, filters, ctx.modeOf);
  const health = filters.health ?? '';
  const sales = filters.sales ?? '';
  if (!health && !sales) return byAvailability;
  return byAvailability.filter((kit) => {
    if (health && !matchesHealthFilter(kitHealthFlags(kit, ctx.availabilityById.get(kit.id)), health)) return false;
    if (sales && !matchesSalesFilter(ctx.salesById.get(kit.id), sales)) return false;
    return true;
  });
}

// ================================
// Exportar CSV (las celdas se neutralizan en buildCsv, como el resto del admin)
// ================================
export const KITS_CSV_HEADERS = [
  'Clave',
  'Nombre',
  'Posición',
  'Surtido',
  'Componentes',
  'Disponible hoy',
  'Sucursales que venden',
  'Sucursales con precio',
  'Máximo vendible',
  'Le falta',
  'Salud',
  'Ventas cobradas',
  'Ventas canceladas',
  'Periodo',
  'Precio',
  'Moneda',
  'Países',
  'Punto de venta',
  'Inscripción en línea',
  'Activo',
  'Creado',
] as const;

export type KitCsvCell = string | number | boolean | null;

export interface KitCsvSource {
  id: string;
  code: string;
  name: string;
  kitPosition?: string | null;
  imageUrl?: string | null;
  price?: string | null;
  priceCurrency?: string | null;
  activeCountries?: string[] | null;
  availableInPos?: boolean | null;
  isVisibleEcommerce?: boolean | null;
  isActive: boolean;
  createdAt?: string | null;
}

export interface KitCsvContext {
  summary: KitAvailabilitySummary | undefined;
  sales: KitSalesSummaryItem | undefined;
  /** Nombre y rango del periodo tal como los mandó el API ("Septiembre 2026 (26-ago → 25-sep)"). */
  periodLabel: string;
  mode: KitStockMode | null;
  positionLabel: string;
  stockModeLabel: string;
}

/** "8050M en 13; 8203M en 9" (componentes que dejan sucursales en cero). */
export function limitingText(summary: KitAvailabilitySummary | undefined): string {
  if (!summary) return '';
  return summary.limiting
    .filter((l) => l.branchesShort > 0)
    .map((l) => `${l.code} en ${fmt(l.branchesShort)}`)
    .join('; ');
}

export function kitCsvRow(kit: KitCsvSource, ctx: KitCsvContext): KitCsvCell[] {
  const s = ctx.summary;
  const price = kit.price && Number(kit.price) > 0 ? Number(kit.price) : '';
  return [
    kit.code,
    kit.name,
    kit.kitPosition ? ctx.positionLabel : '',
    ctx.mode ? ctx.stockModeLabel : '',
    s ? s.componentsCount : '',
    s ? (s.branchesTotal <= 0 ? 'Sin sucursales con precio' : `${s.branchesSellable} de ${s.branchesTotal}`) : '',
    s ? s.branchesSellable : '',
    s ? s.branchesTotal : '',
    s ? s.maxSellable : '',
    limitingText(s),
    healthText(kitHealthFlags(kit, s)),
    ctx.sales ? ctx.sales.unitsPaid : '',
    ctx.sales ? ctx.sales.unitsCancelled : '',
    ctx.periodLabel,
    price,
    price === '' ? '' : (kit.priceCurrency ?? ''),
    (kit.activeCountries ?? []).join(' '),
    kit.availableInPos === true,
    kit.isVisibleEcommerce === true,
    kit.isActive,
    kit.createdAt ? kit.createdAt.slice(0, 10) : '',
  ];
}
