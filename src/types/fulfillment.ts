// types/fulfillment.ts — Rutas de surtido del ecommerce (contrato de rutas §6).
//
// Qué almacén (sucursal) envía los pedidos de la tienda a qué país, con orden
// de preferencia. El orden de la lista ES la prioridad: el front nunca manda
// números, el API renumera 1..n en cada guardado.

export type FulfillmentStockMode = 'full_order' | 'first_active';
export type FulfillmentCrossCountryMode = 'block' | 'allow';
export type FulfillmentSharedCartMode = 'home_branch' | 'routes';

export interface FulfillmentSettings {
  stockMode: FulfillmentStockMode;
  crossCountry: FulfillmentCrossCountryMode;
  sharedCartMode: FulfillmentSharedCartMode;
}

export interface FulfillmentBranchRef {
  branchId: string;
  branchCode: string;
}

/** Una ruta almacén → país, tal como la devuelve `GET /fulfillment/routes`. */
export interface FulfillmentRoute {
  id: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  branchCountryCode: string | null;
  branchCity: string | null;
  branchIsActive: boolean;
  priority: number;
  isActive: boolean;
  isCrossCountry: boolean;
  usable: boolean;
  notes: string | null;
  updatedAt: string;
}

export interface FulfillmentCountry {
  countryCode: string;
  countryName: string;
  currencyCode: string | null;
  /** COALESCE(tax_country_code, code): FN → MX. */
  fiscalCode: string;
  isActive: boolean;
  sellableProducts: number;
  customers: number;
  resolvesTo: FulfillmentBranchRef | null;
  routes: FulfillmentRoute[];
}

export interface FulfillmentWarehouse {
  branchId: string;
  branchCode: string;
  branchName: string;
  branchCountryCode: string | null;
  branchIsActive: boolean;
  countryCodes: string[];
}

/** §6.1 `GET /fulfillment/routes`. */
export interface FulfillmentRoutesResponse {
  version: string;
  settings: FulfillmentSettings;
  countries: FulfillmentCountry[];
  warehouses: FulfillmentWarehouse[];
  /**
   * false = la migración 144 no está aplicada (el API arma la vista desde la
   * columna heredada): la pantalla queda en solo lectura. Ausente = lista.
   */
  schemaReady?: boolean;
}

/** §6.2 `GET /fulfillment/warehouse-options`. */
export interface FulfillmentWarehouseOption {
  branchId: string;
  code: string;
  name: string;
  countryCode: string | null;
  city: string | null;
  isWarehouse: boolean;
  suggested: boolean;
}

// ── §6.3 PUT /fulfillment/routes ──

export interface FulfillmentRouteInput {
  branchId: string;
  isActive: boolean;
  notes: string | null;
}

export interface FulfillmentCountryRoutesInput {
  countryCode: string;
  /** El ORDEN es la prioridad. */
  routes: FulfillmentRouteInput[];
}

export interface SaveFulfillmentRoutesPayload {
  expectedVersion: string;
  countries: FulfillmentCountryRoutesInput[];
  settings?: { stockMode?: FulfillmentStockMode };
  confirmEmptyCountries?: string[];
  reason?: string;
}

export type FulfillmentRouteChangeType =
  | 'added'
  | 'removed'
  | 'paused'
  | 'resumed'
  | 'reordered'
  | 'notes_changed';

/** Cambio aplicado que devuelve el PUT (`applied`): espejo de `RouteChange` de la lib del API. */
export interface FulfillmentAppliedChange {
  type: FulfillmentRouteChangeType;
  countryCode: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  /** Lugar en la lista (1..n) antes y después; null si no aplica. */
  fromPriority: number | null;
  toPriority: number | null;
  /** 'cross_country_blocked' = quedó configurada, pero todavía no surte pedidos. */
  notice?: 'cross_country_blocked';
}

export interface SaveFulfillmentRoutesResponse extends FulfillmentRoutesResponse {
  applied: FulfillmentAppliedChange[];
}

// ── §6.4 GET /fulfillment/diagnostics ──

export type FulfillmentWarningSeverity = 'error' | 'warning' | 'info';

export type FulfillmentWarningCode =
  | 'SELLABLE_NO_ROUTE'
  | 'ROUTE_BRANCH_INACTIVE'
  | 'ALL_ROUTES_PAUSED'
  | 'CROSS_COUNTRY_BLOCKED'
  | 'CROSS_COUNTRY_ROUTE'
  | 'WAREHOUSE_NO_STOCK'
  | 'LOW_COVERAGE'
  | 'PLACEHOLDER_STOCK'
  | 'SHIPPING_COSTS_MISSING'
  | 'TAX_RULES_MISSING'
  | 'ROUTE_NO_SELLABLE_PRODUCTS'
  | 'PENDING_ORDERS_ON_BRANCH'
  | 'WAREHOUSE_COUNT_IN_PROGRESS'
  | 'MIRROR_DRIFT'
  | 'NO_PICKUP_POINTS'
  | 'SCOPE_NOTE';

export interface FulfillmentWarning {
  /** Código conocido (o uno nuevo del API: se muestra con su `message`). */
  code: FulfillmentWarningCode | (string & {});
  severity: FulfillmentWarningSeverity;
  message: string;
  countryCode: string | null;
  branchId: string | null;
}

export interface FulfillmentDiagnosticsWarehouse {
  branchId: string;
  branchCode: string;
  branchName: string;
  priority: number;
  routeIsActive: boolean;
  branchIsActive: boolean;
  isCrossCountry: boolean;
  usable: boolean;
  sellableWithStock: number;
  sellableWithoutStockRow: number;
  placeholderRows: number;
  pendingOrders: number;
  countInProgress: boolean;
}

export interface FulfillmentDiagnosticsCountry {
  countryCode: string;
  countryName: string;
  currencyCode: string | null;
  sellableProducts: number;
  customers: number;
  shipping: { configured: boolean; source: 'settings' | 'defaults_country' | 'defaults_mx' };
  taxRulesActive: number;
  warehouses: FulfillmentDiagnosticsWarehouse[];
  resolvesTo: FulfillmentBranchRef | null;
  warnings: FulfillmentWarning[];
}

export interface FulfillmentDiagnosticsResponse {
  generatedAt: string;
  countries: FulfillmentDiagnosticsCountry[];
  global: FulfillmentWarning[];
}

// ── §6.5 POST /fulfillment/simulate ──

export interface FulfillmentSimulateItem {
  productId: string;
  /** 1–999 */
  quantity: number;
}

export interface FulfillmentSimulateDraft {
  countryCode: string;
  routes: Array<{ branchId: string; isActive: boolean }>;
}

export interface FulfillmentSimulatePayload {
  countryCode: string;
  /** 0–30 artículos. */
  items: FulfillmentSimulateItem[];
  draft?: FulfillmentSimulateDraft;
}

export interface FulfillmentShortage {
  productId: string;
  name: string;
  need: number;
  available: number;
}

export type FulfillmentSkipReason =
  | 'route_paused'
  | 'branch_inactive'
  | 'cross_country_blocked'
  | 'insufficient_stock';

export type FulfillmentResolveReason =
  | 'single_route'
  | 'first_active'
  | 'full_stock'
  | 'no_full_stock_fallback_first'
  | 'no_route'
  | 'no_usable_route';

export interface FulfillmentResolutionCandidate {
  routeId: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  priority: number;
  status: 'chosen' | 'skipped' | 'not_evaluated';
  skipReason: FulfillmentSkipReason | null;
  shortages: FulfillmentShortage[];
}

export interface FulfillmentResolution {
  countryCode: string;
  mode: FulfillmentStockMode;
  crossCountry: FulfillmentCrossCountryMode;
  branchId: string | null;
  reason: FulfillmentResolveReason;
  candidates: FulfillmentResolutionCandidate[];
}

export interface FulfillmentSimulateResponse extends FulfillmentResolution {
  messageEs: string;
}

// ── §6.6 GET /fulfillment/history ──

export interface FulfillmentHistoryEntry {
  id: string;
  at: string;
  action: string;
  /** null = "Sistema" (mantenimiento, cascada o migración). */
  actor: { email: string } | null;
  countryCode: string | null;
  branchCode: string | null;
  branchName: string | null;
  changedFields: string[] | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  summaryEs: string;
}

export interface FulfillmentHistoryResponse {
  data: FulfillmentHistoryEntry[];
  nextCursor: string | null;
}

// ── Errores `FUL_*` (§2.17 / §6.3) ──

export type FulfillmentErrorCode =
  | 'FUL_VERSION_CONFLICT'
  | 'FUL_COUNTRY_INVALID'
  | 'FUL_BRANCH_INVALID'
  | 'FUL_BRANCH_INACTIVE'
  | 'FUL_DUPLICATE_ROUTE'
  | 'FUL_TOO_MANY_ROUTES'
  | 'FUL_EMPTY_COUNTRY_CONFIRM_REQUIRED'
  | 'FUL_SETTING_INVALID'
  | 'FUL_NOTES_TOO_LONG'
  | 'FUL_PRODUCT_INVALID'
  | 'FUL_USE_ROUTES_SCREEN'
  | 'FUL_NO_ROUTE'
  | 'FUL_MIGRATION_PENDING';

export interface FulfillmentErrorBody {
  statusCode?: number;
  code?: FulfillmentErrorCode | (string & {});
  message?: string;
  field?: string;
  details?: unknown;
}
