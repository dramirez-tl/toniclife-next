// kit-availability.ts — lógica PURA (sin React ni red) de la disponibilidad de
// kits de inscripción y paquetes: tipos del contrato §4.1, textos en español
// claro para gente no técnica, filtros y orden de la pestaña Kits y los rótulos
// del POS web.
//
// Regla dura del negocio: un kit que se ARMA al vender no se puede vender si
// falta CUALQUIER componente; los PREARMADOS descuentan pieza propia.
//
// Fuente: GET /products/kits/availability y GET /products/:id/kit-availability
// (contrato kits §4.1). Todo lo que llega se trata como opcional: los
// normalizadores nunca lanzan y degradan a 0 / null.

export type KitStockMode = 'assemble_on_sale' | 'prebuilt';

export interface KitLimitingComponent {
  code: string;
  name: string;
  /** Sucursales del universo donde ESTE componente deja el kit en cero. */
  branchesShort: number;
}

/** Fila de GET /products/kits/availability. */
export interface KitAvailabilitySummary {
  productId: string;
  code: string;
  name: string;
  stockMode: KitStockMode | null;
  componentsCount: number;
  /** Universo: sucursales activas con POS donde el kit tiene precio vigente del país. */
  branchesTotal: number;
  branchesSellable: number;
  maxSellable: number;
  /** Top 3 componentes que más sucursales dejan en cero. */
  limiting: KitLimitingComponent[];
  /** Kit que se arma con existencia propia sembrada (ninguna venta la usa). */
  ownStockPhantom: { rows: number; units: number } | null;
  /** Prearmado con existencia propia sin movimientos de kardex que la respalden. */
  unbackedOwnStock: boolean;
}

export interface KitAvailabilityComponentRow {
  productId: string;
  code: string;
  name: string;
  qtyPerUnit: number;
  onHand: number;
  reserved: number;
  inTransit: number;
  available: number;
  /** Kits que este componente permite armar en la sucursal. */
  buildable: number;
  isActive: boolean;
  tracksInventory: boolean;
  hasPriceInKitCountries: boolean | null;
}

export interface KitAvailabilityBranchRow {
  branchId: string;
  code: string;
  name: string;
  isWarehouse: boolean;
  sellable: number;
  limitingCode: string | null;
}

export interface KitLimitingDetail {
  code: string;
  name: string;
  need: number;
  available: number;
}

/** Respuesta de GET /products/:id/kit-availability (con o sin `branchId`). */
export interface KitAvailabilityDetail {
  stockMode: KitStockMode | null;
  /** Solo con `branchId`: cuántos se pueden vender ahí. */
  sellable: number | null;
  limiting: KitLimitingDetail | null;
  components: KitAvailabilityComponentRow[];
  /** Sin `branchId`: todas las sucursales del universo. */
  branches: KitAvailabilityBranchRow[] | null;
  /** Prearmado: existencia propia (en la sucursal o total). */
  ownStock: number | null;
  /** Prearmado: `false` = existencia sin movimientos de kardex ("sin respaldo"). */
  hasKardex: boolean | null;
  ownStockPhantom: { rows: number; units: number } | null;
}

// ================================
// Normalización (el API se construye en paralelo: nada lanza)
// ================================
const num = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const bool = (v: unknown, fallback = false): boolean => (typeof v === 'boolean' ? v : fallback);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function normalizeStockMode(v: unknown): KitStockMode | null {
  return v === 'assemble_on_sale' || v === 'prebuilt' ? v : null;
}

function normalizePhantom(v: unknown): { rows: number; units: number } | null {
  if (!isRecord(v)) return null;
  const rows = num(v.rows);
  const units = num(v.units);
  return rows > 0 || units > 0 ? { rows, units } : null;
}

export function normalizeKitAvailabilitySummary(raw: unknown): KitAvailabilitySummary | null {
  if (!isRecord(raw)) return null;
  const productId = str(raw.productId ?? raw.id);
  if (!productId) return null;
  const limiting = Array.isArray(raw.limiting)
    ? raw.limiting
        .filter(isRecord)
        .map((l) => ({ code: str(l.code), name: str(l.name), branchesShort: num(l.branchesShort) }))
        .filter((l) => l.code)
    : [];
  return {
    productId,
    code: str(raw.code),
    name: str(raw.name),
    stockMode: normalizeStockMode(raw.stockMode),
    componentsCount: num(raw.componentsCount),
    branchesTotal: num(raw.branchesTotal),
    branchesSellable: num(raw.branchesSellable),
    maxSellable: num(raw.maxSellable),
    limiting,
    ownStockPhantom: normalizePhantom(raw.ownStockPhantom),
    unbackedOwnStock: bool(raw.unbackedOwnStock),
  };
}

export function normalizeKitAvailabilityDetail(raw: unknown): KitAvailabilityDetail | null {
  if (!isRecord(raw)) return null;
  const components: KitAvailabilityComponentRow[] = Array.isArray(raw.components)
    ? raw.components.filter(isRecord).map((c) => ({
        productId: str(c.productId),
        code: str(c.code),
        name: str(c.name),
        qtyPerUnit: num(c.qtyPerUnit, 1),
        onHand: num(c.onHand),
        reserved: num(c.reserved),
        inTransit: num(c.inTransit),
        available: num(c.available),
        buildable: num(c.buildable),
        isActive: bool(c.isActive, true),
        tracksInventory: bool(c.tracksInventory, true),
        hasPriceInKitCountries: typeof c.hasPriceInKitCountries === 'boolean' ? c.hasPriceInKitCountries : null,
      }))
    : [];
  const branches: KitAvailabilityBranchRow[] | null = Array.isArray(raw.branches)
    ? raw.branches.filter(isRecord).map((b) => ({
        branchId: str(b.branchId ?? b.id),
        code: str(b.code),
        name: str(b.name),
        isWarehouse: bool(b.isWarehouse),
        sellable: num(b.sellable),
        limitingCode: b.limitingCode ? str(b.limitingCode) : null,
      }))
    : null;
  const limiting = isRecord(raw.limiting)
    ? {
        code: str(raw.limiting.code),
        name: str(raw.limiting.name),
        need: num(raw.limiting.need),
        available: num(raw.limiting.available),
      }
    : null;
  return {
    stockMode: normalizeStockMode(raw.stockMode),
    sellable: raw.sellable === null || raw.sellable === undefined ? null : num(raw.sellable),
    limiting: limiting && limiting.code ? limiting : null,
    components,
    branches,
    ownStock: raw.ownStock === null || raw.ownStock === undefined ? null : num(raw.ownStock),
    hasKardex: typeof raw.hasKardex === 'boolean' ? raw.hasKardex : null,
    ownStockPhantom: normalizePhantom(raw.ownStockPhantom),
  };
}

// ================================
// Modo de surtido
// ================================
export const STOCK_MODE_LABEL: Record<KitStockMode, string> = {
  assemble_on_sale: 'Se arma al vender',
  prebuilt: 'Prearmado',
};

export const STOCK_MODE_HELP: Record<KitStockMode, string> = {
  assemble_on_sale:
    'La sucursal descuenta los componentes de la receta al cobrar. Si falta uno solo, el kit no se puede vender.',
  prebuilt: 'La sucursal recibe el kit ya armado y maneja su propia existencia, como cualquier producto.',
};

export const stockModeLabel = (mode: KitStockMode | null | undefined): string =>
  mode ? STOCK_MODE_LABEL[mode] : 'Sin definir';

/**
 * Modo real de un kit/paquete: `kitStockMode` si ya viaja (mig 146); si no, el
 * booleano `kitDeductsInventory` que el API de `main` sigue leyendo. `null` si
 * el producto no es kit ni paquete.
 */
export function resolveStockMode(p: {
  productType?: string | null;
  kitStockMode?: string | null;
  kitDeductsInventory?: boolean | null;
}): KitStockMode | null {
  if (p.productType !== 'kit' && p.productType !== 'pack') return null;
  const explicit = normalizeStockMode(p.kitStockMode);
  if (explicit) return explicit;
  return p.kitDeductsInventory ? 'assemble_on_sale' : 'prebuilt';
}

// ================================
// Textos (pestaña Kits y ficha)
// ================================
export type AvailabilityTone = 'good' | 'warn' | 'bad' | 'none';

const nf = new Intl.NumberFormat('es-MX');
export const fmt = (n: number): string => nf.format(Math.max(0, Math.trunc(n)));
const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** Semáforo: verde = todas venden; ámbar = alguna agotada; rojo = ninguna vende; gris = sin universo. */
export function availabilityTone(s: Pick<KitAvailabilitySummary, 'branchesTotal' | 'branchesSellable'>): AvailabilityTone {
  if (s.branchesTotal <= 0) return 'none';
  if (s.branchesSellable <= 0) return 'bad';
  if (s.branchesSellable < s.branchesTotal) return 'warn';
  return 'good';
}

export const AVAILABILITY_TONE_CLASS: Record<AvailabilityTone, string> = {
  good: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-800',
  bad: 'bg-red-100 text-red-800',
  none: 'bg-gray-100 text-gray-600',
};

/** "49 de 60 sucursales · máx 20" (chip del listado). */
export function availabilityShort(s: Pick<KitAvailabilitySummary, 'branchesTotal' | 'branchesSellable' | 'maxSellable'>): string {
  if (s.branchesTotal <= 0) return 'Sin sucursales con precio';
  if (s.branchesSellable <= 0) return `Agotado en las ${fmt(s.branchesTotal)}`;
  return `${fmt(s.branchesSellable)} de ${fmt(s.branchesTotal)} · máx ${fmt(s.maxSellable)}`;
}

/** "KPM05 se puede vender hoy en 47 de 60 sucursales." */
export function availabilitySentence(
  s: Pick<KitAvailabilitySummary, 'branchesTotal' | 'branchesSellable'>,
  kitCode?: string,
): string {
  const subject = kitCode ? `${kitCode} ` : 'Este kit ';
  if (s.branchesTotal <= 0) {
    return `${subject.trim()} no tiene precio vigente en ninguna sucursal con punto de venta de este país.`;
  }
  if (s.branchesSellable <= 0) {
    return `${subject.trim()} no se puede vender hoy en ninguna de las ${fmt(s.branchesTotal)} sucursales.`;
  }
  if (s.branchesSellable >= s.branchesTotal) {
    return `${subject.trim()} se puede vender hoy en las ${fmt(s.branchesTotal)} sucursales.`;
  }
  return `${subject.trim()} se puede vender hoy en ${fmt(s.branchesSellable)} de ${fmt(s.branchesTotal)} sucursales.`;
}

/** "Falta 8050M en 13 sucursales, 8203M en 9." — vacío si nada limita. */
export function limitingSentence(limiting: KitLimitingComponent[]): string {
  const parts = limiting
    .filter((l) => l.branchesShort > 0)
    .map((l) => `${l.code} en ${fmt(l.branchesShort)}`);
  if (parts.length === 0) return '';
  const first = limiting.find((l) => l.branchesShort > 0)!;
  const verb = first.branchesShort === 1 ? 'sucursal' : 'sucursales';
  // "Falta 8050M en 13 sucursales, 8203M en 9."
  const [head, ...rest] = parts;
  return `Falta ${head} ${verb}${rest.length ? `, ${rest.join(', ')}` : ''}.`;
}

/** Estados que el listado muestra como chips junto a la disponibilidad. */
export function summaryFlags(s: KitAvailabilitySummary): { key: string; label: string; tone: AvailabilityTone }[] {
  const flags: { key: string; label: string; tone: AvailabilityTone }[] = [];
  if (s.stockMode === 'assemble_on_sale' && s.componentsCount <= 0) {
    flags.push({ key: 'no_recipe', label: 'Sin receta', tone: 'bad' });
  }
  if (s.branchesTotal <= 0) flags.push({ key: 'no_price', label: 'Sin precio en este país', tone: 'warn' });
  if (s.ownStockPhantom) {
    flags.push({
      key: 'phantom',
      label: `Existencia fantasma (${fmt(s.ownStockPhantom.units)} pzas)`,
      tone: 'warn',
    });
  }
  if (s.stockMode === 'prebuilt' && s.unbackedOwnStock) {
    flags.push({ key: 'unbacked', label: 'Existencia sin respaldo', tone: 'warn' });
  }
  return flags;
}

// ================================
// Filtros y orden (pestaña Kits)
// ================================
export type AvailabilityFilter = '' | 'some_short' | 'all_short' | 'all_ok';

export const AVAILABILITY_FILTER_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'some_short', label: 'Agotado en alguna sucursal' },
  { value: 'all_short', label: 'Agotado en todas' },
  { value: 'all_ok', label: 'Se vende en todas' },
];

export const STOCK_MODE_FILTER_OPTIONS: { value: KitStockMode; label: string }[] = [
  { value: 'assemble_on_sale', label: 'Se arma al vender' },
  { value: 'prebuilt', label: 'Prearmado' },
];

export interface KitListFilters {
  availability?: AvailabilityFilter;
  stockMode?: KitStockMode | '';
  /** Clave del componente que falta ("Le falta…"). */
  missingCode?: string;
}

export function matchesAvailabilityFilter(s: KitAvailabilitySummary | undefined, f: AvailabilityFilter): boolean {
  if (!f) return true;
  if (!s || s.branchesTotal <= 0) return false;
  if (f === 'some_short') return s.branchesSellable < s.branchesTotal;
  if (f === 'all_short') return s.branchesSellable <= 0;
  return s.branchesSellable >= s.branchesTotal;
}

/**
 * Aplica los filtros de disponibilidad a la lista de kits. `byId` = resumen por
 * `productId`; `modeOf` resuelve el surtido del kit cuando el resumen no llegó.
 */
export function filterKitsByAvailability<T extends { id: string }>(
  kits: T[],
  byId: Map<string, KitAvailabilitySummary>,
  filters: KitListFilters,
  modeOf: (kit: T) => KitStockMode | null,
): T[] {
  const missing = (filters.missingCode ?? '').trim().toUpperCase();
  return kits.filter((kit) => {
    const s = byId.get(kit.id);
    if (filters.stockMode) {
      const mode = s?.stockMode ?? modeOf(kit);
      if (mode !== filters.stockMode) return false;
    }
    if (!matchesAvailabilityFilter(s, filters.availability ?? '')) return false;
    if (missing) {
      if (!s) return false;
      if (!s.limiting.some((l) => l.code.toUpperCase() === missing && l.branchesShort > 0)) return false;
    }
    return true;
  });
}

/** Opciones del filtro "Le falta…": cada componente limitante, con cuántos kits afecta. */
export function shortageOptions(rows: KitAvailabilitySummary[]): { code: string; name: string; kits: number }[] {
  const acc = new Map<string, { code: string; name: string; kits: number }>();
  for (const r of rows) {
    const seen = new Set<string>();
    for (const l of r.limiting) {
      if (l.branchesShort <= 0) continue;
      const key = l.code.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const cur = acc.get(key);
      if (cur) cur.kits += 1;
      else acc.set(key, { code: l.code, name: l.name, kits: 1 });
    }
  }
  return [...acc.values()].sort((a, b) => b.kits - a.kits || a.code.localeCompare(b.code));
}

/** Valor de orden: primero los más agotados (proporción vendible), luego por sucursales vendibles. */
export function availabilitySortValue(s: KitAvailabilitySummary | undefined): number {
  if (!s || s.branchesTotal <= 0) return -1;
  return Math.round((s.branchesSellable / s.branchesTotal) * 1000) + s.branchesSellable / 100000;
}

// ================================
// Ficha: sucursales y componentes
// ================================
export interface BranchesSummary {
  total: number;
  sellable: number;
  maxSellable: number;
  limiting: KitLimitingComponent[];
}

/** Resume la tabla por sucursal del detalle (sin `branchId`) en cifras y faltantes. */
export function summarizeBranches(
  branches: KitAvailabilityBranchRow[],
  componentNames: Map<string, string> = new Map(),
): BranchesSummary {
  const counts = new Map<string, number>();
  let sellable = 0;
  let maxSellable = 0;
  for (const b of branches) {
    if (b.sellable > 0) sellable += 1;
    if (b.sellable > maxSellable) maxSellable = b.sellable;
    if (b.sellable <= 0 && b.limitingCode) counts.set(b.limitingCode, (counts.get(b.limitingCode) ?? 0) + 1);
  }
  const limiting = [...counts.entries()]
    .map(([code, branchesShort]) => ({ code, name: componentNames.get(code) ?? '', branchesShort }))
    .sort((a, b) => b.branchesShort - a.branchesShort || a.code.localeCompare(b.code));
  return { total: branches.length, sellable, maxSellable, limiting };
}

/** "En Irapuato Centro se pueden vender 3." / "En X no se puede vender: falta 8050M." */
export function branchSentence(b: Pick<KitAvailabilityBranchRow, 'name' | 'sellable' | 'limitingCode'>): string {
  if (b.sellable > 0) return `En ${b.name} se ${plural(b.sellable, 'puede vender 1', `pueden vender ${fmt(b.sellable)}`)}.`;
  return b.limitingCode ? `En ${b.name} no se puede vender: falta ${b.limitingCode}.` : `En ${b.name} no se puede vender.`;
}

/** Piezas que faltan de un componente para armar UN kit (0 si alcanza). */
export const missingForOne = (c: Pick<KitAvailabilityComponentRow, 'qtyPerUnit' | 'available'>): number =>
  Math.max(0, c.qtyPerUnit - c.available);

/** "Con esta receta hoy se pueden vender 3 en Irapuato Centro." */
export function recipeHeadline(sellable: number | null, branchName: string): string {
  if (sellable === null) return `Elige una sucursal para ver cuántos se pueden vender.`;
  if (sellable <= 0) return `Con esta receta hoy no se puede vender ninguno en ${branchName}.`;
  return `Con esta receta hoy se ${plural(sellable, 'puede vender 1', `pueden vender ${fmt(sellable)}`)} en ${branchName}.`;
}

/** "Falta \"Omega sobre\" (8050M): requiere 1, hay 0." */
export function shortageText(l: KitLimitingDetail): string {
  const name = l.name ? `"${l.name}" (${l.code})` : l.code;
  return `Falta ${name}: requiere ${fmt(l.need)}, hay ${fmt(l.available)}.`;
}

/** Aviso de existencia propia sembrada en un kit que se arma. */
export function phantomSentence(p: { rows: number; units: number }): string {
  return `Tiene ${fmt(p.units)} ${plural(p.units, 'pieza propia', 'piezas propias')} en ${fmt(p.rows)} ${plural(
    p.rows,
    'sucursal',
    'sucursales',
  )} que ninguna venta usa: este kit se arma al vender y solo cuentan sus componentes.`;
}

// ================================
// POS web
// ================================
export interface PosKitStockLabel {
  text: string;
  tone: AvailabilityTone;
  soldOut: boolean;
}

/**
 * Rótulo de la tarjeta del kit en el POS. `stock` es lo que el API YA manda:
 * armables (se arma) o existencia propia (prearmado). Sin dato ⇒ null.
 */
export function posKitStockLabel(p: {
  stock?: number | null;
  kitStockMode?: KitStockMode | null;
  limitingComponent?: KitLimitingDetail | null;
}): PosKitStockLabel | null {
  if (p.stock === null || p.stock === undefined || !Number.isFinite(p.stock)) return null;
  if (p.stock <= 0) {
    const why = p.limitingComponent ? ` — falta ${p.limitingComponent.code}` : p.kitStockMode === 'assemble_on_sale' ? ' — falta un componente' : '';
    return { text: `Agotado${why}`, tone: 'bad', soldOut: true };
  }
  const label = p.kitStockMode === 'prebuilt' ? 'Quedan' : 'Disponibles';
  return { text: `${label}: ${fmt(p.stock)}`, tone: p.stock <= 2 ? 'warn' : 'good', soldOut: false };
}

/** Aviso (sin bloquear) en el alta de distribuidor cuando el kit elegido no se vende en la sucursal. */
export function posKitEnrollWarning(p: {
  kitCode: string;
  branchName?: string | null;
  limitingComponent?: KitLimitingDetail | null;
}): string {
  const where = p.branchName ? ` en ${p.branchName}` : ' en esta sucursal';
  const why = p.limitingComponent ? ` ${shortageText(p.limitingComponent)}` : '';
  return `${p.kitCode} está agotado${where}.${why} Puedes registrar al distribuidor, pero no podrás cobrarle este kit aquí hasta que haya existencias: pide traspaso o elige otro kit.`;
}

/** Toast tras el alta cuando el kit no se pudo agregar al carrito por estar agotado. */
export function posKitEnrolledSoldOutToast(kitCode: string, branchName?: string | null): string {
  const where = branchName ? ` en ${branchName}` : ' aquí';
  return `Registrado, pero ${kitCode} está agotado${where}: pide traspaso o elige otro kit.`;
}
