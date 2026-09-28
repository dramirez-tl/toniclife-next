// branch-catalog.ts — Catálogo POS por sucursal (lógica PURA, sin React ni DOM,
// cubierta por vitest). La usan Inventario → Catálogo por sucursal, el diálogo
// "Habilitar catálogo", Productos → Catálogo ("Habilitar en sucursal…") y
// /admin/sucursales (aviso `catalogSeeded`).
//
// Incidente 28-sep-2026 (sucursales 427 MX ACAPULCO DIAMANTE, 404 CEDEA
// IZTAPALAPA y 428): el POS de una sucursal SOLO muestra los productos con
// fila en stock_levels para esa sucursal. Las 69 sucursales de la carga del
// 23-jun traen sus filas; una sucursal dada de alta desde el admin no traía
// ninguna y su POS salía vacío. "Habilitar el catálogo" crea esas filas con
// existencia 0: los productos aparecen en el POS como agotados hasta que se
// cargan existencias con un traspaso o un conteo inicial.

import type {
  BranchCatalogCoverageRow,
  BranchCatalogEnableMode,
  BranchCatalogEnableResult,
  BranchCatalogSkipReason,
  BranchCatalogSkipped,
  EnableBranchCatalogDto,
} from '@/types/inventory';
import { BRANCH_CATALOG_MAX_PRODUCT_IDS } from '@/types/inventory';

// ================================
// TEXTOS (espejo de BranchCatalogSkipReason / BRANCH_CATALOG_ENABLE_MODES del API)
// ================================

/** Razones por las que el API omite un producto, en el orden de prioridad del API. */
export const BRANCH_CATALOG_SKIP_REASON_LABEL: Record<BranchCatalogSkipReason, string> = {
  unknown: 'ya no existe',
  inactive: 'inactivo',
  not_pos: 'no disponible en POS',
  service: 'servicio',
  dynamic_kit: 'kit que se arma al vender (no lleva existencia propia)',
  no_price_for_country: 'sin precio vigente en el país',
};

export const BRANCH_CATALOG_MODE_LABEL: Record<BranchCatalogEnableMode, string> = {
  eligible: 'Elegibles del país',
  copy_from_branch: 'Copiar de otra sucursal',
  products: 'Elegir productos',
};

export const BRANCH_CATALOG_MODE_HELP: Record<BranchCatalogEnableMode, string> = {
  eligible:
    'Todos los productos activos, disponibles en POS y con precio vigente en el país de la sucursal (sin servicios ni kits que se arman al vender).',
  copy_from_branch: 'Los productos que otra sucursal ya tiene en su catálogo, filtrados con la misma regla.',
  products: 'Solo los productos seleccionados; los que no cumplen la regla se omiten.',
};

/** Regla de elegibilidad, en palabras, para el aviso de la pantalla. */
export const BRANCH_CATALOG_RULE_TEXT =
  'El POS de una sucursal solo muestra los productos que tienen una fila de existencias en esa sucursal. ' +
  'Habilitar el catálogo crea esas filas con existencia 0 para los productos elegibles: activos, disponibles en POS, ' +
  'que no sean servicios ni kits que se arman al vender, y con precio vigente en el país de la sucursal.';

/** Aviso fijo del diálogo: la existencia NO se carga aquí. */
export const BRANCH_CATALOG_STOCK_NOTE =
  'Los productos aparecerán en el POS con existencia 0 (agotado). Carga existencias con un traspaso o con un conteo inicial o ajuste.';

/** Aviso cuando la sucursal destino es almacén (warnings: ['warehouse']). */
export const BRANCH_CATALOG_WAREHOUSE_WARNING =
  'Esta sucursal es un almacén. Se puede habilitar igual, pero revisa que de verdad opere como punto de venta.';

// ================================
// PERMISOS
// ================================

/**
 * ¿Puede habilitar el catálogo? POST /inventory/branches/:id/catalog/enable
 * exige `inventory:update`. Misma semántica que `sucHasPerm` en /admin/sucursales
 * (comodín de módulo, comodín global y bypass de super_admin).
 */
export function canEnableBranchCatalog(userRoles: readonly string[], userPermissions: readonly string[]): boolean {
  if (userRoles.includes('super_admin')) return true;
  return (
    userPermissions.includes('inventory:update') ||
    userPermissions.includes('inventory:*') ||
    userPermissions.includes('*') ||
    userPermissions.includes('*:*')
  );
}

// ================================
// COBERTURA (tabla)
// ================================

/** Una sucursal se considera "nueva" durante sus primeros 30 días. */
export const NEW_BRANCH_DAYS = 30;

export function isNewBranch(createdAt: string | null | undefined, now: number | Date = Date.now()): boolean {
  if (!createdAt) return false;
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) return false;
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const age = nowMs - created;
  return age >= 0 && age < NEW_BRANCH_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * - `sin_catalogo`: ninguna fila (el POS sale vacío). También cubre la sucursal
 *   sin país (elegibles 0), que tampoco puede vender nada.
 * - `incompleto`: hay filas, pero faltan elegibles.
 * - `completo`: todos los elegibles tienen fila.
 */
export type BranchCatalogCoverageStatus = 'sin_catalogo' | 'incompleto' | 'completo';

export function coverageStatus(
  row: Pick<BranchCatalogCoverageRow, 'presentCount' | 'missingCount'>,
): BranchCatalogCoverageStatus {
  if (row.presentCount <= 0) return 'sin_catalogo';
  return row.missingCount > 0 ? 'incompleto' : 'completo';
}

/** Minúsculas y sin acentos, para buscar "acapulco" y encontrar "ACAPULCO". */
const normalize = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Filtra por código, nombre o país (sin distinguir mayúsculas ni acentos). */
export function filterCoverageRows<T extends Pick<BranchCatalogCoverageRow, 'code' | 'name' | 'countryCode'>>(
  rows: readonly T[],
  search: string,
): T[] {
  const q = normalize(search);
  if (!q) return [...rows];
  return rows.filter((row) =>
    [row.code, row.name, row.countryCode ?? ''].some((field) => normalize(field).includes(q)),
  );
}

export interface CoverageTotals {
  branches: number;
  sinCatalogo: number;
  incompletas: number;
  completas: number;
}

export function coverageTotals(rows: readonly Pick<BranchCatalogCoverageRow, 'presentCount' | 'missingCount'>[]): CoverageTotals {
  const totals: CoverageTotals = { branches: rows.length, sinCatalogo: 0, incompletas: 0, completas: 0 };
  for (const row of rows) {
    const status = coverageStatus(row);
    if (status === 'sin_catalogo') totals.sinCatalogo += 1;
    else if (status === 'incompleto') totals.incompletas += 1;
    else totals.completas += 1;
  }
  return totals;
}

// ================================
// BODY DE POST /inventory/branches/:id/catalog/enable
// ================================

export interface EnableBranchCatalogParams {
  mode: BranchCatalogEnableMode;
  sourceBranchId?: string | null;
  productIds?: readonly string[] | null;
  /** Solo `false` escribe; cualquier otra cosa es vista previa. */
  dryRun?: boolean;
}

/**
 * Arma el body del API o devuelve null cuando al modo le falta su parámetro
 * (así el diálogo no dispara una vista previa que el API rechazaría con 400).
 * En modo products deduplica y recorta al tope del API (500).
 */
export function buildEnableBranchCatalogDto(params: EnableBranchCatalogParams): EnableBranchCatalogDto | null {
  const dryRun = params.dryRun === false ? false : true;
  switch (params.mode) {
    case 'eligible':
      return { mode: 'eligible', dryRun };
    case 'copy_from_branch':
      if (!params.sourceBranchId) return null;
      return { mode: 'copy_from_branch', sourceBranchId: params.sourceBranchId, dryRun };
    case 'products': {
      const ids = Array.from(new Set((params.productIds ?? []).filter((id) => typeof id === 'string' && id.trim() !== '')));
      if (ids.length === 0) return null;
      return { mode: 'products', productIds: ids.slice(0, BRANCH_CATALOG_MAX_PRODUCT_IDS), dryRun };
    }
    default:
      return null;
  }
}

// ================================
// RESULTADO (toasts)
// ================================

const plural = (n: number, singular: string, pluralForm: string) => (n === 1 ? singular : pluralForm);

/** Plural de las etiquetas que son adjetivo/sustantivo; las frases no cambian. */
const SKIP_REASON_PLURAL: Partial<Record<BranchCatalogSkipReason, string>> = {
  unknown: 'ya no existen',
  inactive: 'inactivos',
  service: 'servicios',
};

/** "2 inactivos" / "1 inactivo" / "3 sin precio vigente en el país". */
export function skipReasonCountLabel(reason: string, n: number): string {
  const labels = BRANCH_CATALOG_SKIP_REASON_LABEL as Record<string, string | undefined>;
  const singular = labels[reason] ?? reason;
  const label = n === 1 ? singular : ((SKIP_REASON_PLURAL as Record<string, string | undefined>)[reason] ?? singular);
  return `${n} ${label}`;
}

/** "3 inactivos, 2 sin precio vigente en el país" (en el orden de prioridad del API). */
export function skippedSummary(skipped: Pick<BranchCatalogSkipped, 'byReason'> | null | undefined): string {
  if (!skipped?.byReason) return '';
  const known = Object.keys(BRANCH_CATALOG_SKIP_REASON_LABEL) as BranchCatalogSkipReason[];
  const extra = Object.keys(skipped.byReason).filter((r) => !(known as string[]).includes(r));
  return [...known, ...extra]
    .map((reason) => {
      const n = (skipped.byReason as Record<string, number | undefined>)[reason];
      return n && n > 0 ? skipReasonCountLabel(reason, n) : null;
    })
    .filter((part): part is string => part !== null)
    .join(', ');
}

/**
 * Texto del toast tras habilitar (dryRun: false):
 * "Se habilitaron 12 productos en 427 · 221 ya estaban · 3 omitidos (2 inactivos, 1 servicio)".
 */
export function enableResultMessage(
  result: Pick<BranchCatalogEnableResult, 'branch' | 'created' | 'alreadyPresent' | 'skipped'>,
): string {
  const code = result.branch.code;
  const parts: string[] = [];
  if (result.created <= 0) parts.push(`No se habilitó ningún producto en ${code}`);
  else if (result.created === 1) parts.push(`Se habilitó 1 producto en ${code}`);
  else parts.push(`Se habilitaron ${result.created} productos en ${code}`);
  if (result.alreadyPresent > 0) {
    parts.push(`${result.alreadyPresent} ya ${plural(result.alreadyPresent, 'estaba', 'estaban')}`);
  }
  if (result.skipped.total > 0) {
    const detail = skippedSummary(result.skipped);
    parts.push(`${result.skipped.total} ${plural(result.skipped.total, 'omitido', 'omitidos')}${detail ? ` (${detail})` : ''}`);
  }
  return parts.join(' · ');
}

// ================================
// RESPUESTA DE POST/PATCH /branches (catalogSeeded)
// ================================

export interface SeededCatalog {
  created: number;
  eligible: number;
}

/**
 * Catálogo que el API sembró al dar de alta (o activar el POS de) la sucursal.
 * `catalogSeeded` ({ created, eligible }) solo viene cuando ESA operación creó
 * filas; un API sin ese cambio no lo manda → null (no se dice nada). Espejo de
 * createdCashRegisterFromResponse.
 */
export function seededCatalogFromResponse(response: unknown): SeededCatalog | null {
  if (!response || typeof response !== 'object') return null;
  const seeded = (response as { catalogSeeded?: unknown }).catalogSeeded;
  if (!seeded || typeof seeded !== 'object') return null;
  const { created, eligible } = seeded as { created?: unknown; eligible?: unknown };
  const createdN = typeof created === 'number' && Number.isFinite(created) ? created : 0;
  if (createdN <= 0) return null;
  const eligibleN = typeof eligible === 'number' && Number.isFinite(eligible) && eligible >= createdN ? eligible : createdN;
  return { created: createdN, eligible: eligibleN };
}

/** Texto del toast cuando el API avisa que sembró el catálogo POS. */
export function seededCatalogToast(seeded: SeededCatalog): string {
  const head =
    seeded.created === 1
      ? 'Se habilitó 1 producto en el catálogo del POS'
      : `Se habilitaron ${seeded.created} productos en el catálogo del POS`;
  return `${head} (existencia 0). Carga existencias con un traspaso o un conteo inicial.`;
}
