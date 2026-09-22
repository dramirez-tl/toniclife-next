// kit-sales.ts — lógica PURA (sin React ni red) de la sección Ventas de un
// kit/paquete (contrato de kits §5.2). Fuente: GET /products/:id/kit-sales
// (KitSalesDto del API). Los periodos son los de commission_periods
// [start_date, end_date] (26 → 25): las fechas se muestran TAL COMO VIENEN,
// aquí no se recalcula ningún periodo.

export type KitSaleChannel = 'pos' | 'pos_migrated' | 'web';

export interface KitSaleLine {
  /** pos_sales.id u orders.id. */
  id: string;
  /** Folio: sale_number (POS) u order_number (web). */
  folio: string;
  /** Fecha/hora ISO de la venta. */
  at: string;
  branchCode: string | null;
  /** completed | cancelled. */
  status: string;
  quantity: number;
  channel: KitSaleChannel;
}

export interface KitSalesBranch {
  branchId: string;
  code: string;
  name: string;
  units: number;
}

export interface KitSalesPeriod {
  periodId: string;
  periodNumber: number;
  name: string;
  /** YYYY-MM-DD, tal cual lo manda el API. */
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isClosed: boolean;
  units: { paid: number; cancelled: number };
  byChannel: { pos: number; posMigrated: number; web: number };
  topBranches: KitSalesBranch[];
  /** Solo en el periodo vigente; [] en los demás. */
  lastSales: KitSaleLine[];
}

export interface KitSales {
  productId: string;
  code: string;
  name: string;
  periods: KitSalesPeriod[];
  generatedAt: string | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);

export function normalizeChannel(v: unknown): KitSaleChannel {
  return v === 'pos_migrated' || v === 'web' ? v : 'pos';
}

function normalizeLine(raw: unknown): KitSaleLine | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    folio: str(raw.folio) || '—',
    at: str(raw.at),
    branchCode: str(raw.branchCode) || null,
    status: str(raw.status) || 'completed',
    quantity: num(raw.quantity),
    channel: normalizeChannel(raw.channel),
  };
}

function normalizeBranch(raw: unknown): KitSalesBranch | null {
  if (!isRecord(raw)) return null;
  const branchId = str(raw.branchId);
  const code = str(raw.code);
  if (!branchId && !code) return null;
  return { branchId, code, name: str(raw.name) || code, units: num(raw.units) };
}

function normalizePeriod(raw: unknown): KitSalesPeriod | null {
  if (!isRecord(raw)) return null;
  const name = str(raw.name);
  const periodNumber = num(raw.periodNumber, -1);
  if (!name && periodNumber < 0) return null;
  const units = isRecord(raw.units) ? raw.units : {};
  const byChannel = isRecord(raw.byChannel) ? raw.byChannel : {};
  return {
    periodId: str(raw.periodId),
    periodNumber,
    name: name || `Periodo ${periodNumber}`,
    startDate: str(raw.startDate),
    endDate: str(raw.endDate),
    isCurrent: bool(raw.isCurrent),
    isClosed: bool(raw.isClosed),
    units: { paid: num(units.paid), cancelled: num(units.cancelled) },
    byChannel: { pos: num(byChannel.pos), posMigrated: num(byChannel.posMigrated), web: num(byChannel.web) },
    topBranches: (Array.isArray(raw.topBranches) ? raw.topBranches : [])
      .map(normalizeBranch)
      .filter((b): b is KitSalesBranch => b !== null),
    lastSales: (Array.isArray(raw.lastSales) ? raw.lastSales : [])
      .map(normalizeLine)
      .filter((l): l is KitSaleLine => l !== null),
  };
}

/** `null` si el cuerpo no tiene la forma mínima (productId). */
export function normalizeKitSales(raw: unknown): KitSales | null {
  if (!isRecord(raw)) return null;
  const productId = str(raw.productId);
  if (!productId) return null;
  return {
    productId,
    code: str(raw.code),
    name: str(raw.name),
    periods: (Array.isArray(raw.periods) ? raw.periods : [])
      .map(normalizePeriod)
      .filter((p): p is KitSalesPeriod => p !== null),
    generatedAt: str(raw.generatedAt) || null,
  };
}

// ================================
// Textos
// ================================
const MONTH_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * "2026-08-26" → "26-ago". Se lee la cadena, sin `Date` (nada de desfases de
 * zona horaria). Otra forma ⇒ se devuelve tal cual.
 */
export function shortPeriodDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return iso;
  return `${day}-${MONTH_SHORT[month - 1]}`;
}

const nf = new Intl.NumberFormat('es-MX');
const n = (v: number): string => nf.format(Math.max(0, Math.trunc(v)));

/** "Septiembre 2026 (26-ago → 25-sep)". */
export function periodTitle(p: Pick<KitSalesPeriod, 'name' | 'startDate' | 'endDate'>): string {
  if (!p.startDate && !p.endDate) return p.name;
  return `${p.name} (${shortPeriodDate(p.startDate)} → ${shortPeriodDate(p.endDate)})`;
}

/** "77 cobradas, 1 cancelada · POS 77 · Migradas 0 · En línea 0". */
export function periodTotals(p: Pick<KitSalesPeriod, 'units' | 'byChannel'>): string {
  const paid = `${n(p.units.paid)} ${p.units.paid === 1 ? 'cobrada' : 'cobradas'}`;
  const cancelled = `${n(p.units.cancelled)} ${p.units.cancelled === 1 ? 'cancelada' : 'canceladas'}`;
  return `${paid}, ${cancelled} · POS ${n(p.byChannel.pos)} · Migradas ${n(p.byChannel.posMigrated)} · En línea ${n(p.byChannel.web)}`;
}

/** Línea completa del contrato: "{periodo} ({inicio} → {fin}): {totales}". */
export function periodSentence(p: KitSalesPeriod): string {
  return `${periodTitle(p)}: ${periodTotals(p)}`;
}

/** "Sucursal 268: 30 · Sucursal 164: 12". */
export function topBranchesSentence(branches: readonly KitSalesBranch[]): string {
  if (branches.length === 0) return 'Sin ventas por sucursal.';
  return branches.map((b) => `${b.name}: ${n(b.units)}`).join(' · ');
}

export const CHANNEL_LABEL: Record<KitSaleChannel, string> = {
  pos: 'POS',
  pos_migrated: 'Migrada',
  web: 'En línea',
};

export const saleStatusLabel = (status: string): string => (status === 'cancelled' ? 'Cancelada' : 'Cobrada');

/**
 * A dónde lleva cada venta: los pedidos web tienen ficha propia; las ventas del
 * POS no tienen detalle en el admin (se abre el POS web).
 */
export function saleHref(line: Pick<KitSaleLine, 'id' | 'channel'>): string {
  return line.channel === 'web' ? `/admin/pedidos/${line.id}` : '/admin/pos';
}

/** Total de unidades cobradas en los periodos recibidos. */
export const totalPaid = (periods: readonly KitSalesPeriod[]): number =>
  periods.reduce((acc, p) => acc + p.units.paid, 0);

// ================================
// Resumen de TODOS los kits en UN periodo (pestaña Kits, columna "Ventas del
// periodo"). Fuente: GET /products/kits/sales-summary?periodNumber=
// (KitSalesSummaryDto). El periodo lo elige y lo delimita el API
// (commission_periods, 26 → 25): aquí solo se muestra.
// ================================
export interface KitSalesSummaryItem {
  productId: string;
  code: string;
  unitsPaid: number;
  unitsCancelled: number;
}

export interface KitSalesSummary {
  periodId: string;
  periodNumber: number;
  name: string;
  /** YYYY-MM-DD, tal cual lo manda el API. */
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  /** Todos los kits/paquetes (0 si no vendieron). */
  items: KitSalesSummaryItem[];
}

function normalizeSummaryItem(raw: unknown): KitSalesSummaryItem | null {
  if (!isRecord(raw)) return null;
  const productId = str(raw.productId);
  if (!productId) return null;
  return {
    productId,
    code: str(raw.code),
    unitsPaid: num(raw.unitsPaid),
    unitsCancelled: num(raw.unitsCancelled),
  };
}

/** `null` si el cuerpo no tiene la forma mínima (nombre o número de periodo). */
export function normalizeKitSalesSummary(raw: unknown): KitSalesSummary | null {
  if (!isRecord(raw)) return null;
  const name = str(raw.name);
  const periodNumber = num(raw.periodNumber, -1);
  if (!name && periodNumber < 0) return null;
  return {
    periodId: str(raw.periodId),
    periodNumber,
    name: name || `Periodo ${periodNumber}`,
    startDate: str(raw.startDate),
    endDate: str(raw.endDate),
    isCurrent: bool(raw.isCurrent),
    items: (Array.isArray(raw.items) ? raw.items : [])
      .map(normalizeSummaryItem)
      .filter((i): i is KitSalesSummaryItem => i !== null),
  };
}

/** "26-ago → 25-sep" (vacío si el API no mandó fechas). */
export function periodRange(p: Pick<KitSalesSummary, 'startDate' | 'endDate'>): string {
  if (!p.startDate && !p.endDate) return '';
  return `${shortPeriodDate(p.startDate)} → ${shortPeriodDate(p.endDate)}`;
}

/** Celda del listado: "77 en Septiembre 2026". */
export function salesCellText(unitsPaid: number, periodName: string): string {
  return `${n(unitsPaid)} en ${periodName}`;
}

/** Tooltip de la celda: "77 cobradas y 1 cancelada en Septiembre 2026 (26-ago → 25-sep)." */
export function salesCellTitle(
  item: Pick<KitSalesSummaryItem, 'unitsPaid' | 'unitsCancelled'> | undefined,
  period: Pick<KitSalesSummary, 'name' | 'startDate' | 'endDate'>,
): string {
  const paid = item?.unitsPaid ?? 0;
  const cancelled = item?.unitsCancelled ?? 0;
  const range = periodRange(period);
  const when = `${period.name}${range ? ` (${range})` : ''}`;
  if (paid <= 0 && cancelled <= 0) return `Sin ventas cobradas ni canceladas en ${when}.`;
  const paidText = `${n(paid)} ${paid === 1 ? 'cobrada' : 'cobradas'}`;
  const cancelledText = cancelled > 0 ? ` y ${n(cancelled)} ${cancelled === 1 ? 'cancelada' : 'canceladas'}` : '';
  return `${paidText}${cancelledText} en ${when}.`;
}
