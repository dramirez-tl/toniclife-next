// kit-readiness.ts — lógica PURA (sin React ni red) de "¿Está listo para vender?"
// de un kit/paquete (contrato de kits §5.2 bloque 6). Fuente: GET
// /products/:id/kit-readiness (KitReadinessDto del API). Todo lo que llega se
// trata como opcional: el normalizador nunca lanza.
//
// El API solo manda lo que FALTA (critical[] y warnings[]); las líneas "✔" se
// derivan aquí para que la ficha lea como una lista de verificación completa.

import { normalizeStockMode, type KitStockMode } from './kit-availability';

export type KitReadinessSeverity = 'critical' | 'warning';

export interface KitReadinessIssue {
  code: string;
  severity: KitReadinessSeverity;
  /** Texto para la ficha (español, lo redacta el API). */
  label: string;
  details: Record<string, unknown> | null;
}

export interface KitRecipeLock {
  pendingSales: number;
  pendingOrders: number;
  locked: boolean;
}

export interface KitReadiness {
  productId: string;
  code: string;
  name: string;
  productType: string;
  isActive: boolean;
  isEnrollmentKit: boolean;
  kitPosition: string | null;
  stockMode: KitStockMode | null;
  critical: KitReadinessIssue[];
  warnings: KitReadinessIssue[];
  /** true = sin críticos: la transición inactivo → activo pasaría. */
  canActivate: boolean;
  recipeLock: KitRecipeLock;
  ownStock: { rows: number; units: number; reserved: number };
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

function normalizeIssue(raw: unknown, severity: KitReadinessSeverity): KitReadinessIssue | null {
  if (!isRecord(raw)) return null;
  const code = str(raw.code);
  if (!code) return null;
  const sev = raw.severity === 'critical' || raw.severity === 'warning' ? raw.severity : severity;
  return {
    code,
    severity: sev,
    label: str(raw.label) || code,
    details: isRecord(raw.details) ? raw.details : null,
  };
}

/** `null` si el cuerpo no tiene la forma mínima (productId). */
export function normalizeKitReadiness(raw: unknown): KitReadiness | null {
  if (!isRecord(raw)) return null;
  const productId = str(raw.productId);
  if (!productId) return null;
  const lock = isRecord(raw.recipeLock) ? raw.recipeLock : {};
  const own = isRecord(raw.ownStock) ? raw.ownStock : {};
  const pendingSales = num(lock.pendingSales);
  const pendingOrders = num(lock.pendingOrders);
  const critical = (Array.isArray(raw.critical) ? raw.critical : [])
    .map((i) => normalizeIssue(i, 'critical'))
    .filter((i): i is KitReadinessIssue => i !== null);
  const warnings = (Array.isArray(raw.warnings) ? raw.warnings : [])
    .map((i) => normalizeIssue(i, 'warning'))
    .filter((i): i is KitReadinessIssue => i !== null);
  return {
    productId,
    code: str(raw.code),
    name: str(raw.name),
    productType: str(raw.productType),
    isActive: bool(raw.isActive),
    isEnrollmentKit: bool(raw.isEnrollmentKit),
    kitPosition: str(raw.kitPosition) || null,
    stockMode: normalizeStockMode(raw.stockMode),
    critical,
    warnings,
    canActivate: typeof raw.canActivate === 'boolean' ? raw.canActivate : critical.length === 0,
    recipeLock: {
      pendingSales,
      pendingOrders,
      locked: typeof lock.locked === 'boolean' ? lock.locked : pendingSales + pendingOrders > 0,
    },
    ownStock: { rows: num(own.rows), units: num(own.units), reserved: num(own.reserved) },
    generatedAt: str(raw.generatedAt) || null,
  };
}

// ================================
// Lista de verificación (✔ / ✘ / ⚠)
// ================================
export type ChecklistState = 'ok' | 'critical' | 'warning';

export interface ChecklistLine {
  /** Código de la regla del API (o de la línea derivada). */
  code: string;
  state: ChecklistState;
  label: string;
}

const POSITION_LABEL: Record<string, string> = {
  basic: 'Básico',
  premium: 'Premium',
  preferred: 'Preferente',
};

export const kitPositionLabel = (position: string | null | undefined): string =>
  position ? (POSITION_LABEL[position] ?? position) : 'Sin posición';

/**
 * Convierte el resultado del API en la lista que ve la ficha: primero las
 * reglas críticas (cumplidas ✔ o no ✘), después los avisos ⚠. Con `pricedCountries`
 * (viaja en `details` cuando falta) se dice en qué países sí hay precio.
 */
export function readinessChecklist(r: KitReadiness): ChecklistLine[] {
  const critical = new Map(r.critical.map((c) => [c.code, c] as const));
  const lines: ChecklistLine[] = [];

  const price = critical.get('no_distributor_price');
  lines.push(
    price
      ? { code: price.code, state: 'critical', label: price.label }
      : { code: 'distributor_price', state: 'ok', label: 'Precio de distribuidor vigente' },
  );

  if (r.stockMode === 'prebuilt') {
    lines.push({ code: 'recipe', state: 'ok', label: 'Prearmado: no necesita receta para venderse' });
  } else {
    const recipe = critical.get('recipe_empty');
    lines.push(
      recipe
        ? { code: recipe.code, state: 'critical', label: recipe.label }
        : { code: 'recipe', state: 'ok', label: 'Con receta' },
    );
  }

  if (r.productType === 'kit' && r.isEnrollmentKit) {
    const position = critical.get('position_missing');
    lines.push(
      position
        ? { code: position.code, state: 'critical', label: position.label }
        : { code: 'position', state: 'ok', label: `Posición ${kitPositionLabel(r.kitPosition)}` },
    );
  }

  // Críticos que no caben en las tres líneas fijas (reglas futuras del API).
  for (const c of r.critical) {
    if (!['no_distributor_price', 'recipe_empty', 'position_missing'].includes(c.code)) {
      lines.push({ code: c.code, state: 'critical', label: c.label });
    }
  }
  for (const w of r.warnings) lines.push({ code: w.code, state: 'warning', label: w.label });
  return lines;
}

/** "Listo para activar" / "No se puede activar: falta receta; sin precio…". */
export function readinessSummary(r: KitReadiness): string {
  if (r.critical.length === 0) {
    return r.isActive ? 'Listo para vender' : 'Listo para activar';
  }
  return `No se puede activar: ${r.critical.map((c) => c.label.toLowerCase()).join('; ')}.`;
}

/** Banner de la receta: "Hay 3 ventas/pedidos sin cobrar con este kit." (null si no hay). */
export function recipeLockSentence(lock: Pick<KitRecipeLock, 'pendingSales' | 'pendingOrders'>): string | null {
  const total = lock.pendingSales + lock.pendingOrders;
  if (total <= 0) return null;
  return `Hay ${total} ${total === 1 ? 'venta o pedido sin cobrar' : 'ventas/pedidos sin cobrar'} con este kit.`;
}

/**
 * Lista de faltantes críticos que viaja en `details.critical` del 422
 * KIT_NOT_READY ({ code, label }[]). Tolera cuerpos parciales.
 */
export function notReadyCritical(details: Record<string, unknown> | null | undefined): { code: string; label: string }[] {
  const list = details && Array.isArray(details.critical) ? details.critical : [];
  return list
    .filter(isRecord)
    .map((c) => ({ code: str(c.code), label: str(c.label) || str(c.code) }))
    .filter((c) => c.code !== '' || c.label !== '');
}

/** Sección de la ficha donde se corrige cada regla (ids de PRODUCT_SECTIONS). */
export const READINESS_SECTION: Record<string, string> = {
  no_distributor_price: 'precios',
  recipe_empty: 'componentes',
  position_missing: 'kit',
  public_below_distributor: 'precios',
  points_mismatch: 'precios',
  no_bonus: 'kit',
  bonus_too_low: 'kit',
  prebuilt_no_kardex: 'inventario',
  own_stock_phantom: 'inventario',
  no_image: 'imagenes',
  no_sat_code: 'fiscal',
  no_tax_rule: 'fiscal',
  no_category: 'tienda',
};
