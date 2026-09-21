// route-draft.ts — Borrador de las rutas de surtido (lógica PURA, sin React ni red).
//
// La pantalla "Almacenes y envíos" edita un borrador en memoria y lo guarda de
// una sola vez (contrato de rutas §7.3). Aquí vive todo lo que se puede probar
// sin DOM: construir el borrador desde el GET, reordenar (el ORDEN de la lista
// es la prioridad), pausar, quitar, agregar, el atajo "Elegir países" de un
// almacén, las validaciones que espejan los códigos FUL_* del API y el cuerpo
// del PUT (solo los países que cambiaron).
//
// Espejo de `fulfillment-routing.lib.ts` del API para lo ESTRUCTURAL: qué ruta
// es "entre países" y cuál es utilizable. El API sigue siendo la autoridad; el
// front lo calcula para avisar ANTES de guardar.

import type {
  FulfillmentCountry,
  FulfillmentCountryRoutesInput,
  FulfillmentCrossCountryMode,
  FulfillmentDiagnosticsResponse,
  FulfillmentRoutesResponse,
  FulfillmentSimulateDraft,
  FulfillmentStockMode,
  FulfillmentWarning,
  FulfillmentWarningSeverity,
  SaveFulfillmentRoutesPayload,
} from '@/types/fulfillment';

export const MAX_ROUTES_PER_COUNTRY = 5;
export const MAX_NOTES_LENGTH = 300;

/** Una fila del borrador: el almacén dentro de la lista de un país. */
export interface DraftRoute {
  branchId: string;
  branchCode: string;
  branchName: string;
  branchCountryCode: string | null;
  branchCity: string | null;
  branchIsActive: boolean;
  isActive: boolean;
  notes: string | null;
}

/** Almacén elegible (de `warehouse-options` o de una ruta existente). */
export interface DraftWarehouse {
  branchId: string;
  branchCode: string;
  branchName: string;
  branchCountryCode: string | null;
  branchCity: string | null;
  branchIsActive: boolean;
}

export interface RouteDraft {
  /** countryCode → lista ORDENADA (índice 0 = principal). */
  countries: Record<string, DraftRoute[]>;
  stockMode: FulfillmentStockMode;
}

/** Lo que hace falta para saber si una ruta surte: el candado y el país fiscal de cada país. */
export interface RoutingContext {
  crossCountry: FulfillmentCrossCountryMode;
  /** countryCode → COALESCE(tax_country_code, code). FN → MX. */
  fiscalByCountry: Record<string, string>;
}

export type CountryShippingStatus =
  | 'ready'
  | 'no_warehouse'
  | 'paused'
  | 'branch_inactive'
  | 'cross_pending';

export type AddRouteError = 'duplicate' | 'too_many' | 'branch_inactive';

export type DraftIssueCode = 'FUL_DUPLICATE_ROUTE' | 'FUL_TOO_MANY_ROUTES' | 'FUL_NOTES_TOO_LONG';

export interface DraftIssue {
  countryCode: string;
  code: DraftIssueCode;
  message: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Construcción
// ────────────────────────────────────────────────────────────────────────────

const norm = (code: string | null | undefined): string => (code ?? '').trim().toUpperCase();

/** Notas: recortadas; vacío = null (así "sin nota" no cuenta como cambio). */
export function normalizeNotes(notes: string | null | undefined): string | null {
  const trimmed = (notes ?? '').trim();
  return trimmed ? trimmed : null;
}

export function draftFromServer(data: FulfillmentRoutesResponse): RouteDraft {
  const countries: Record<string, DraftRoute[]> = {};
  for (const country of data.countries) {
    countries[norm(country.countryCode)] = [...country.routes]
      .sort(
        (a, b) =>
          a.priority - b.priority ||
          a.branchCode.localeCompare(b.branchCode) ||
          a.id.localeCompare(b.id),
      )
      .map((r) => ({
        branchId: r.branchId,
        branchCode: r.branchCode,
        branchName: r.branchName,
        branchCountryCode: r.branchCountryCode ? norm(r.branchCountryCode) : null,
        branchCity: r.branchCity ?? null,
        branchIsActive: r.branchIsActive,
        isActive: r.isActive,
        notes: normalizeNotes(r.notes),
      }));
  }
  return { countries, stockMode: data.settings.stockMode === 'first_active' ? 'first_active' : 'full_order' };
}

export function buildRoutingContext(data: FulfillmentRoutesResponse): RoutingContext {
  const fiscalByCountry: Record<string, string> = {};
  for (const c of data.countries) {
    fiscalByCountry[norm(c.countryCode)] = norm(c.fiscalCode) || norm(c.countryCode);
  }
  return {
    // Valor desconocido = block (el seguro), igual que el API.
    crossCountry: data.settings.crossCountry === 'allow' ? 'allow' : 'block',
    fiscalByCountry,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Reglas estructurales (espejo de la lib del API)
// ────────────────────────────────────────────────────────────────────────────

/**
 * "Entre países" = el país FISCAL del almacén es distinto del país fiscal del
 * destino. México y Frontera comparten país fiscal, así que 164 → FN no lo es.
 * Almacén sin país conocido → true (lo seguro).
 */
export function isCrossCountryRoute(
  route: Pick<DraftRoute, 'branchCountryCode'>,
  destCountryCode: string,
  ctx: RoutingContext,
): boolean {
  const branchCountry = norm(route.branchCountryCode);
  if (!branchCountry) return true;
  const branchFiscal = ctx.fiscalByCountry[branchCountry] ?? branchCountry;
  const dest = norm(destCountryCode);
  const destFiscal = ctx.fiscalByCountry[dest] ?? dest;
  return branchFiscal !== destFiscal;
}

export function isUsableRoute(route: DraftRoute, destCountryCode: string, ctx: RoutingContext): boolean {
  if (!route.isActive || !route.branchIsActive) return false;
  return ctx.crossCountry === 'allow' || !isCrossCountryRoute(route, destCountryCode, ctx);
}

/** Primer almacén utilizable de la lista = el que surtiría (null = el país se queda sin envío). */
export function resolveCountry(
  routes: DraftRoute[] | undefined,
  destCountryCode: string,
  ctx: RoutingContext,
): DraftRoute | null {
  return (routes ?? []).find((r) => isUsableRoute(r, destCountryCode, ctx)) ?? null;
}

export function countryStatus(
  routes: DraftRoute[] | undefined,
  destCountryCode: string,
  ctx: RoutingContext,
): CountryShippingStatus {
  const list = routes ?? [];
  if (list.length === 0) return 'no_warehouse';
  if (resolveCountry(list, destCountryCode, ctx)) return 'ready';
  const live = list.filter((r) => r.isActive);
  if (live.some((r) => r.branchIsActive && isCrossCountryRoute(r, destCountryCode, ctx))) {
    return 'cross_pending';
  }
  if (live.some((r) => !r.branchIsActive)) return 'branch_inactive';
  return 'paused';
}

// ────────────────────────────────────────────────────────────────────────────
// Operaciones (inmutables: devuelven un borrador nuevo)
// ────────────────────────────────────────────────────────────────────────────

function withCountry(draft: RouteDraft, countryCode: string, routes: DraftRoute[]): RouteDraft {
  return { ...draft, countries: { ...draft.countries, [norm(countryCode)]: routes } };
}

function routesOf(draft: RouteDraft, countryCode: string): DraftRoute[] {
  return draft.countries[norm(countryCode)] ?? [];
}

/** Sube (-1) o baja (+1) una fila. Fuera de rango = sin cambio (mismo objeto). */
export function moveRoute(
  draft: RouteDraft,
  countryCode: string,
  index: number,
  direction: -1 | 1,
): RouteDraft {
  const routes = routesOf(draft, countryCode);
  const target = index + direction;
  if (index < 0 || index >= routes.length || target < 0 || target >= routes.length) return draft;
  const next = [...routes];
  [next[index], next[target]] = [next[target], next[index]];
  return withCountry(draft, countryCode, next);
}

export function canMove(routes: DraftRoute[], index: number, direction: -1 | 1): boolean {
  const target = index + direction;
  return index >= 0 && index < routes.length && target >= 0 && target < routes.length;
}

export function setRouteActive(
  draft: RouteDraft,
  countryCode: string,
  branchId: string,
  isActive: boolean,
): RouteDraft {
  const routes = routesOf(draft, countryCode);
  if (!routes.some((r) => r.branchId === branchId && r.isActive !== isActive)) return draft;
  return withCountry(
    draft,
    countryCode,
    routes.map((r) => (r.branchId === branchId ? { ...r, isActive } : r)),
  );
}

export function setRouteNotes(
  draft: RouteDraft,
  countryCode: string,
  branchId: string,
  notes: string | null,
): RouteDraft {
  const clean = normalizeNotes(notes);
  const routes = routesOf(draft, countryCode);
  if (!routes.some((r) => r.branchId === branchId && r.notes !== clean)) return draft;
  return withCountry(
    draft,
    countryCode,
    routes.map((r) => (r.branchId === branchId ? { ...r, notes: clean } : r)),
  );
}

export function removeRoute(draft: RouteDraft, countryCode: string, branchId: string): RouteDraft {
  const routes = routesOf(draft, countryCode);
  if (!routes.some((r) => r.branchId === branchId)) return draft;
  return withCountry(
    draft,
    countryCode,
    routes.filter((r) => r.branchId !== branchId),
  );
}

/** Motivo por el que NO se puede agregar ese almacén a ese país (null = sí se puede). */
export function addRouteError(
  draft: RouteDraft,
  countryCode: string,
  warehouse: DraftWarehouse,
): AddRouteError | null {
  const routes = routesOf(draft, countryCode);
  if (routes.some((r) => r.branchId === warehouse.branchId)) return 'duplicate';
  if (routes.length >= MAX_ROUTES_PER_COUNTRY) return 'too_many';
  if (!warehouse.branchIsActive) return 'branch_inactive';
  return null;
}

/** Un almacén nuevo entra SIEMPRE al final de la lista del país (queda como respaldo). */
export function addRoute(
  draft: RouteDraft,
  countryCode: string,
  warehouse: DraftWarehouse,
): { draft: RouteDraft; error: AddRouteError | null } {
  const error = addRouteError(draft, countryCode, warehouse);
  if (error) return { draft, error };
  const route: DraftRoute = {
    branchId: warehouse.branchId,
    branchCode: warehouse.branchCode,
    branchName: warehouse.branchName,
    branchCountryCode: warehouse.branchCountryCode ? norm(warehouse.branchCountryCode) : null,
    branchCity: warehouse.branchCity,
    branchIsActive: warehouse.branchIsActive,
    isActive: true,
    notes: null,
  };
  return { draft: withCountry(draft, countryCode, [...routesOf(draft, countryCode), route]), error: null };
}

/**
 * Atajo "Elegir países" de un almacén: deja al almacén EXACTAMENTE en los
 * países marcados. Donde ya estaba conserva su lugar, su estado y su nota;
 * donde entra, entra al final. `skipped` = países donde no cupo o no se pudo.
 */
export function setWarehouseCountries(
  draft: RouteDraft,
  warehouse: DraftWarehouse,
  selectedCountryCodes: string[],
): { draft: RouteDraft; skipped: Array<{ countryCode: string; error: AddRouteError }> } {
  const selected = new Set(selectedCountryCodes.map(norm));
  const skipped: Array<{ countryCode: string; error: AddRouteError }> = [];
  let next = draft;
  const all = new Set([...Object.keys(draft.countries), ...selected]);
  for (const code of all) {
    const has = routesOf(next, code).some((r) => r.branchId === warehouse.branchId);
    if (selected.has(code) && !has) {
      const result = addRoute(next, code, warehouse);
      if (result.error) skipped.push({ countryCode: code, error: result.error });
      next = result.draft;
    } else if (!selected.has(code) && has) {
      next = removeRoute(next, code, warehouse.branchId);
    }
  }
  return { draft: next, skipped };
}

/** "Usar los mismos almacenes que México": copia la lista (mismo orden y estado, sin notas). */
export function copyCountryRoutes(draft: RouteDraft, fromCountryCode: string, toCountryCode: string): RouteDraft {
  const source = routesOf(draft, fromCountryCode);
  if (source.length === 0) return draft;
  return withCountry(
    draft,
    toCountryCode,
    source.map((r) => ({ ...r, notes: null })),
  );
}

export function setStockMode(draft: RouteDraft, stockMode: FulfillmentStockMode): RouteDraft {
  return draft.stockMode === stockMode ? draft : { ...draft, stockMode };
}

// ────────────────────────────────────────────────────────────────────────────
// Vista inversa: almacén → países
// ────────────────────────────────────────────────────────────────────────────

export interface DraftWarehouseSummary extends DraftWarehouse {
  /** Países a los que envía, en el orden de `countryOrder`. */
  countryCodes: string[];
}

export function warehousesFromDraft(draft: RouteDraft, countryOrder: string[]): DraftWarehouseSummary[] {
  const byBranch = new Map<string, DraftWarehouseSummary>();
  const order = [...countryOrder.map(norm), ...Object.keys(draft.countries)];
  const seen = new Set<string>();
  for (const code of order) {
    if (seen.has(code)) continue;
    seen.add(code);
    for (const r of routesOf(draft, code)) {
      const current = byBranch.get(r.branchId);
      if (current) current.countryCodes.push(code);
      else {
        byBranch.set(r.branchId, {
          branchId: r.branchId,
          branchCode: r.branchCode,
          branchName: r.branchName,
          branchCountryCode: r.branchCountryCode,
          branchCity: r.branchCity,
          branchIsActive: r.branchIsActive,
          countryCodes: [code],
        });
      }
    }
  }
  return [...byBranch.values()].sort((a, b) =>
    a.branchCode.localeCompare(b.branchCode, 'es', { numeric: true }),
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Validación y cuerpo del PUT
// ────────────────────────────────────────────────────────────────────────────

export function validateDraft(draft: RouteDraft): DraftIssue[] {
  const issues: DraftIssue[] = [];
  for (const [countryCode, routes] of Object.entries(draft.countries)) {
    const ids = routes.map((r) => r.branchId);
    if (new Set(ids).size !== ids.length) {
      issues.push({
        countryCode,
        code: 'FUL_DUPLICATE_ROUTE',
        message: 'El mismo almacén aparece dos veces en la lista de este país.',
      });
    }
    if (routes.length > MAX_ROUTES_PER_COUNTRY) {
      issues.push({
        countryCode,
        code: 'FUL_TOO_MANY_ROUTES',
        message: `Un país puede tener hasta ${MAX_ROUTES_PER_COUNTRY} almacenes.`,
      });
    }
    if (routes.some((r) => (r.notes ?? '').length > MAX_NOTES_LENGTH)) {
      issues.push({
        countryCode,
        code: 'FUL_NOTES_TOO_LONG',
        message: `Las notas admiten hasta ${MAX_NOTES_LENGTH} caracteres.`,
      });
    }
  }
  return issues;
}

function toInput(routes: DraftRoute[]): FulfillmentCountryRoutesInput['routes'] {
  return routes.map((r) => ({ branchId: r.branchId, isActive: r.isActive, notes: normalizeNotes(r.notes) }));
}

/** Países cuya lista (orden, estado o notas) es distinta de la guardada. */
export function changedCountryCodes(base: RouteDraft, draft: RouteDraft): string[] {
  const codes = new Set([...Object.keys(base.countries), ...Object.keys(draft.countries)]);
  return [...codes]
    .filter(
      (code) => JSON.stringify(toInput(routesOf(base, code))) !== JSON.stringify(toInput(routesOf(draft, code))),
    )
    .sort();
}

export function isDraftDirty(base: RouteDraft, draft: RouteDraft): boolean {
  return base.stockMode !== draft.stockMode || changedCountryCodes(base, draft).length > 0;
}

/** Cuerpo del PUT: SOLO los países que cambiaron (los demás no se tocan en el API). */
export function buildSavePayload(input: {
  base: RouteDraft;
  draft: RouteDraft;
  expectedVersion: string;
  confirmEmptyCountries?: string[];
  reason?: string | null;
}): SaveFulfillmentRoutesPayload {
  const { base, draft, expectedVersion } = input;
  const payload: SaveFulfillmentRoutesPayload = {
    expectedVersion,
    countries: changedCountryCodes(base, draft).map((countryCode) => ({
      countryCode,
      routes: toInput(routesOf(draft, countryCode)),
    })),
  };
  if (base.stockMode !== draft.stockMode) payload.settings = { stockMode: draft.stockMode };
  const confirm = [...new Set((input.confirmEmptyCountries ?? []).map(norm))].filter(Boolean).sort();
  if (confirm.length > 0) payload.confirmEmptyCountries = confirm;
  const reason = (input.reason ?? '').trim().slice(0, MAX_NOTES_LENGTH);
  if (reason) payload.reason = reason;
  return payload;
}

/** Borrador de UN país para "Probar con mis cambios sin guardar" (§6.5). */
export function buildSimulateDraft(draft: RouteDraft, countryCode: string): FulfillmentSimulateDraft {
  return {
    countryCode: norm(countryCode),
    routes: routesOf(draft, countryCode).map((r) => ({ branchId: r.branchId, isActive: r.isActive })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Avisos: lo estructural se recalcula sobre el BORRADOR (§7.3-2)
// ────────────────────────────────────────────────────────────────────────────

/** Avisos que dependen solo de la configuración: los del API se sustituyen por los del borrador. */
export const STRUCTURAL_WARNING_CODES = new Set<string>([
  'SELLABLE_NO_ROUTE',
  'ROUTE_BRANCH_INACTIVE',
  'ALL_ROUTES_PAUSED',
  'CROSS_COUNTRY_BLOCKED',
  'CROSS_COUNTRY_ROUTE',
  'ROUTE_NO_SELLABLE_PRODUCTS',
]);

const SEVERITY_ORDER: Record<FulfillmentWarningSeverity, number> = { error: 0, warning: 1, info: 2 };

const warehouseLabel = (r: Pick<DraftRoute, 'branchCode' | 'branchName'>) => `${r.branchCode} · ${r.branchName}`;

export function buildDraftWarnings(
  draft: RouteDraft,
  countries: Array<Pick<FulfillmentCountry, 'countryCode' | 'countryName' | 'sellableProducts'>>,
  ctx: RoutingContext,
): FulfillmentWarning[] {
  const out: FulfillmentWarning[] = [];
  for (const country of countries) {
    const code = norm(country.countryCode);
    const name = country.countryName;
    const routes = routesOf(draft, code);
    const resolved = resolveCountry(routes, code, ctx);

    if (routes.length === 0) {
      if (country.sellableProducts > 0) {
        out.push({
          code: 'SELLABLE_NO_ROUTE',
          severity: 'error',
          message: `${name} tiene productos a la venta, pero ningún almacén le envía: hoy no se puede enviar a ${name}.`,
          countryCode: code,
          branchId: null,
        });
      }
      continue;
    }

    if (!resolved) {
      out.push({
        code: 'ALL_ROUTES_PAUSED',
        severity: 'error',
        message: `${name} tiene almacenes en su lista, pero ninguno puede surtir ahora: hoy no se puede enviar a ${name}.`,
        countryCode: code,
        branchId: null,
      });
    }

    for (const r of routes) {
      if (r.isActive && !r.branchIsActive) {
        out.push({
          code: 'ROUTE_BRANCH_INACTIVE',
          severity: 'error',
          message: `${warehouseLabel(r)} está desactivada como sucursal, así que no surte a ${name}. Actívala en Sucursales o quítala de la lista.`,
          countryCode: code,
          branchId: r.branchId,
        });
      }
      if (r.isActive && r.branchIsActive && isCrossCountryRoute(r, code, ctx)) {
        out.push(
          ctx.crossCountry === 'allow'
            ? {
                code: 'CROSS_COUNTRY_ROUTE',
                severity: 'info',
                message: `${warehouseLabel(r)} envía a ${name} desde otro país: es un envío internacional. Los precios, impuestos y costo de envío son los de ${name}; las existencias, las del almacén.`,
                countryCode: code,
                branchId: r.branchId,
              }
            : {
                code: 'CROSS_COUNTRY_BLOCKED',
                severity: 'warning',
                message: `${warehouseLabel(r)} → ${name}: queda configurado, pero todavía no surte pedidos. Los envíos de un país a otro aún no están habilitados, porque la facturación y los paquetes todavía toman el país del almacén.`,
                countryCode: code,
                branchId: r.branchId,
              },
        );
      }
    }

    if (country.sellableProducts === 0) {
      out.push({
        code: 'ROUTE_NO_SELLABLE_PRODUCTS',
        severity: 'info',
        message: `${name} tiene almacén, pero todavía no tiene productos con precio al público.`,
        countryCode: code,
        branchId: null,
      });
    }
  }
  return out;
}

export function sortWarnings(warnings: FulfillmentWarning[]): FulfillmentWarning[] {
  return warnings
    .map((w, i) => ({ w, i }))
    .sort((a, b) => (SEVERITY_ORDER[a.w.severity] ?? 3) - (SEVERITY_ORDER[b.w.severity] ?? 3) || a.i - b.i)
    .map(({ w }) => w);
}

/**
 * Avisos de la pantalla = estructurales del BORRADOR + los que dependen de
 * datos (existencias, costos de envío, impuestos, pedidos pendientes) del
 * diagnóstico. Un aviso de datos de un almacén que ya no está en la lista del
 * país se descarta. Errores primero.
 */
export function mergeWarnings(
  structural: FulfillmentWarning[],
  diagnostics: FulfillmentDiagnosticsResponse | null | undefined,
  draft: RouteDraft,
): FulfillmentWarning[] {
  const fromData: FulfillmentWarning[] = [];
  for (const country of diagnostics?.countries ?? []) {
    for (const w of country.warnings ?? []) {
      if (STRUCTURAL_WARNING_CODES.has(w.code)) continue;
      const code = norm(w.countryCode ?? country.countryCode);
      if (w.branchId && !routesOf(draft, code).some((r) => r.branchId === w.branchId)) continue;
      fromData.push({ ...w, countryCode: code });
    }
  }
  const global = (diagnostics?.global ?? []).filter((w) => !STRUCTURAL_WARNING_CODES.has(w.code));
  return sortWarnings([...structural, ...fromData, ...global]);
}
