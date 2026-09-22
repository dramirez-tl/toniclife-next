// kit-editor.ts — lógica PURA (sin React ni red) del editor único de kits en la
// ficha de producto (contrato de kits §5.2): quién puede editar los campos
// sensibles, textos de las confirmaciones, cantidades con coma decimal,
// reordenar la receta, copiar la receta de otro kit y la vista previa de
// "Vaciar existencia propia".

import type { BulkComponentItem, BulkReplaceComponentsDto } from '@/types/kit';
import { normalizeStockMode, type KitStockMode } from './kit-availability';

// ================================
// Permisos
// ================================
export const KITS_MANAGE_PERMISSION = 'products:kits_manage';
/** Respaldo del contrato §4.2: sin la fila de `permissions` (mig 148) basta products:update. */
export const KITS_MANAGE_FALLBACK = 'products:update';

function hasPermission(userPermissions: readonly string[], required: string): boolean {
  const [module] = required.split(':');
  if (userPermissions.includes(`${module}:*`)) return true;
  if (userPermissions.includes('*') || userPermissions.includes('*:*')) return true;
  return userPermissions.includes(required);
}

/**
 * ¿Puede editar cómo se surte el kit, si es de inscripción, su posición, su
 * receta y sus bonos? `products:kits_manage` O `products:update` (respaldo).
 * Super Administrador siempre puede (mismo criterio que PermissionGuard).
 */
export function canEditKitFields(userPermissions: readonly string[], roles: readonly string[]): boolean {
  if (roles.includes('super_admin')) return true;
  return hasPermission(userPermissions, KITS_MANAGE_PERMISSION) || hasPermission(userPermissions, KITS_MANAGE_FALLBACK);
}

// ================================
// Modo de surtido: confirmación
// ================================
export interface OwnStockSummary {
  rows: number;
  units: number;
}

const nf = new Intl.NumberFormat('es-MX');
const n = (v: number): string => nf.format(Math.max(0, Math.trunc(v)));

/**
 * Consecuencia del cambio de modo (texto del diálogo, contrato §5.2 bloque 1).
 * A "Se arma al vender" con existencia propia: se pregunta si dejarla en cero
 * (el API responde 409 KIT_MODE_HAS_OWN_STOCK mientras no esté en cero).
 */
export function modeChangeConsequence(to: KitStockMode, ownStock: OwnStockSummary | null): string {
  if (to === 'prebuilt') {
    return 'Como prearmado arranca en 0: registra una entrada de inventario en cada sucursal que lo venda.';
  }
  if (ownStock && (ownStock.units > 0 || ownStock.rows > 0)) {
    return `Tiene ${n(ownStock.units)} piezas propias en ${n(ownStock.rows)} ${ownStock.rows === 1 ? 'sucursal' : 'sucursales'} que ninguna venta usa. ¿Dejarlas en cero?`;
  }
  return 'El POS descontará los componentes de la receta al cobrar; si falta uno solo, el kit no se podrá vender.';
}

/** `details` del 409 KIT_MODE_HAS_OWN_STOCK ({ rows, units }). */
export function ownStockFromDetails(details: Record<string, unknown> | null | undefined): OwnStockSummary | null {
  if (!details) return null;
  const rows = Number(details.rows);
  const units = Number(details.units);
  if (!Number.isFinite(rows) && !Number.isFinite(units)) return null;
  return { rows: Number.isFinite(rows) ? rows : 0, units: Number.isFinite(units) ? units : 0 };
}

// ================================
// Cantidades (coma decimal aceptada)
// ================================
/**
 * "1,5" → 1.5 · "2" → 2 · "1.250,5" → 1250.5 · "" → null · "abc" → NaN.
 * Con coma Y punto se toma el ÚLTIMO como separador decimal y el otro como
 * de miles; con uno solo, es el decimal.
 */
export function parseQuantity(input: string): number | null {
  const raw = input.trim();
  if (raw === '') return null;
  if (!/^[0-9.,\s]+$/.test(raw)) return NaN;
  const cleaned = raw.replace(/\s+/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    normalized = cleaned.split(thousands).join('').replace(decimal, '.');
  } else if (lastComma >= 0) {
    // Una sola coma = decimal; varias comas = miles ("1,250,000").
    normalized = cleaned.split(',').length > 2 ? cleaned.split(',').join('') : cleaned.replace(',', '.');
  } else {
    normalized = cleaned.split('.').length > 2 ? cleaned.split('.').join('') : cleaned;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

/** Número → texto para el campo (sin ceros de más; punto decimal, el campo acepta coma). */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '';
  return String(Math.round(value * 10_000) / 10_000);
}

export const isValidQuantity = (value: number | null): value is number =>
  value !== null && Number.isFinite(value) && value > 0;

// ================================
// Reordenar (▲▼)
// ================================
/** Mueve el renglón `index` una posición (`-1` sube, `1` baja); fuera de rango ⇒ misma lista. */
export function moveRow<T>(rows: readonly T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= rows.length || target < 0 || target >= rows.length) return [...rows];
  const next = [...rows];
  const [row] = next.splice(index, 1);
  next.splice(target, 0, row);
  return next;
}

// ================================
// Copiar receta de otro kit
// ================================
export interface RecipeSourceRow {
  componentProductId?: string | null;
  quantity: string | number;
  isActive?: boolean;
}

/**
 * Cuerpo de PUT /products/:id/components/bulk a partir de la receta GLOBAL de
 * otro kit: solo renglones activos con componente, sin duplicados, sin el
 * propio kit destino, `sortOrder` = posición. Cantidades ≤ 0 se omiten.
 */
export function recipeCopyPayload(source: readonly RecipeSourceRow[], targetProductId: string): BulkReplaceComponentsDto {
  const seen = new Set<string>();
  const components: BulkComponentItem[] = [];
  for (const row of source) {
    const id = row.componentProductId ?? '';
    if (!id || id === targetProductId || seen.has(id) || row.isActive === false) continue;
    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    seen.add(id);
    components.push({ componentProductId: id, quantity, sortOrder: components.length });
  }
  return { components };
}

// ================================
// Vaciar existencia propia (preview / resultado)
// ================================
export interface KitOwnStockBranch {
  branchId: string;
  code: string;
  name: string;
  units: number;
  reserved: number;
}

export interface KitOwnStockPreview {
  productId: string;
  code: string;
  name: string;
  stockMode: KitStockMode | null;
  rows: number;
  units: number;
  reserved: number;
  /** true = hoy no se puede ejecutar (hay reservas vivas). */
  blocked: boolean;
  branches: KitOwnStockBranch[];
}

export interface KitOwnStockClearResult {
  productId: string;
  code: string;
  rows: number;
  units: number;
  movements: { movementId: string; movementNumber: string; branchId: string; code: string; name: string; units: number }[];
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const num = (v: unknown, fallback = 0): number => {
  if (v === null || v === undefined || v === '') return fallback;
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : fallback;
};
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

export function normalizeOwnStockPreview(raw: unknown): KitOwnStockPreview | null {
  if (!isRecord(raw)) return null;
  const productId = str(raw.productId);
  if (!productId) return null;
  const branches = (Array.isArray(raw.branches) ? raw.branches : [])
    .filter(isRecord)
    .map((b) => ({
      branchId: str(b.branchId),
      code: str(b.code),
      name: str(b.name) || str(b.code),
      units: num(b.units),
      reserved: num(b.reserved),
    }));
  const reserved = num(raw.reserved);
  return {
    productId,
    code: str(raw.code),
    name: str(raw.name),
    stockMode: normalizeStockMode(raw.stockMode),
    rows: num(raw.rows, branches.length),
    units: num(raw.units),
    reserved,
    blocked: typeof raw.blocked === 'boolean' ? raw.blocked : reserved > 0,
    branches,
  };
}

export function normalizeOwnStockClearResult(raw: unknown): KitOwnStockClearResult | null {
  if (!isRecord(raw)) return null;
  const productId = str(raw.productId);
  if (!productId) return null;
  return {
    productId,
    code: str(raw.code),
    rows: num(raw.rows),
    units: num(raw.units),
    movements: (Array.isArray(raw.movements) ? raw.movements : []).filter(isRecord).map((m) => ({
      movementId: str(m.movementId),
      movementNumber: str(m.movementNumber),
      branchId: str(m.branchId),
      code: str(m.code),
      name: str(m.name) || str(m.code),
      units: num(m.units),
    })),
  };
}

/** "Se dejarán en cero 1,380 piezas en 69 sucursales." */
export function ownStockPreviewSentence(p: Pick<KitOwnStockPreview, 'rows' | 'units'>): string {
  return `Se dejarán en cero ${n(p.units)} ${p.units === 1 ? 'pieza' : 'piezas'} en ${n(p.rows)} ${p.rows === 1 ? 'sucursal' : 'sucursales'}.`;
}

/** "Se dieron de baja 1,380 piezas en 69 sucursales." */
export function ownStockClearedSentence(r: Pick<KitOwnStockClearResult, 'rows' | 'units'>): string {
  return `Se dieron de baja ${n(r.units)} ${r.units === 1 ? 'pieza' : 'piezas'} en ${n(r.rows)} ${r.rows === 1 ? 'sucursal' : 'sucursales'}.`;
}

// ================================
// Errores KIT_* (contrato §4.5)
// ================================
export const KIT_ERROR_CODES = [
  'KIT_RECIPE_EMPTY',
  'KIT_COMPONENT_INVALID',
  'KIT_RECIPE_LOCKED',
  'KIT_MODE_HAS_OWN_STOCK',
  'KIT_POSITION_REQUIRED',
  'KIT_NOT_READY',
  'KIT_NO_OWN_STOCK',
  'KIT_OWN_STOCK_RESERVED',
  'KIT_BONUS_CLOSED',
] as const;

export type KitErrorCode = (typeof KIT_ERROR_CODES)[number];

export const isKitErrorCode = (code: string | null | undefined): code is KitErrorCode =>
  !!code && (KIT_ERROR_CODES as readonly string[]).includes(code);

export interface ComponentInvalidRow {
  componentProductId: string;
  code: string;
  reason: string;
  label: string;
}

/** `details.components[]` del 422 KIT_COMPONENT_INVALID, por renglón. */
export function componentInvalidRows(details: Record<string, unknown> | null | undefined): ComponentInvalidRow[] {
  const list = details && Array.isArray(details.components) ? details.components : [];
  return list
    .filter(isRecord)
    .map((c) => ({
      componentProductId: str(c.componentProductId),
      code: str(c.code),
      reason: str(c.reason),
      label: str(c.label) || str(c.reason),
    }))
    .filter((c) => c.componentProductId !== '' || c.code !== '');
}
