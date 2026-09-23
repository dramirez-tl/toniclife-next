// branch-cash-register.ts — ¿Tiene caja registradora la sucursal? (lógica PURA,
// para /admin/sucursales). Sin React ni DOM, cubierto por vitest.
//
// Incidente 23-sep-2026 (sucursal 428 MX INDIOS VERDES TL): el POS dice "No hay
// una caja registradora configurada para esta sucursal" al confirmar el pago.
// Sin una fila ACTIVA en cash_registers el POS no puede abrir sesión ni cobrar.
// Las sucursales de la carga masiva traen 'Caja Principal' ('<código>-C1');
// una sucursal dada de alta desde el admin no traía ninguna. Aquí se calcula
// qué sucursal está así y el payload para crearle su caja con POST /pos/registers.

import type { CashRegister, CashRegisterListResponse, CreateCashRegisterInput } from '@/types/pos';
import type { Branch } from '@/types/branch';

/** Nombre y banderas de la caja por defecto: las MISMAS que tienen las 69 cajas
 *  de la carga masiva (toniclife-api load.service.ts, fase de sucursales). */
export const MAIN_CASH_REGISTER_NAME = 'Caja Principal';

/** CreateCashRegisterDto.code: @MaxLength(20) (cash_registers.code es varchar(20)). */
export const CASH_REGISTER_CODE_MAX_LENGTH = 20;

/** Tope de sufijos -C1..-Cn a probar antes de rendirse. */
const MAX_MAIN_REGISTER_SUFFIX = 20;

// ================================
// ROLES (espejo del API)
// ================================

// POST y GET /pos/registers se protegen con @Roles, no con permisos. El JWT
// trae el CÓDIGO de rol de BD ('administrador', 'call_center'…) y el RolesGuard
// del API lo expande con ROLE_ALIASES antes de comparar. Esto es un ESPEJO de
// toniclife-api/src/modules/auth/guards/roles.guard.ts y de los @Roles de
// pos.controller.ts: si cambian allá, se cambian aquí. Solo sirve para no
// ofrecer un botón que el API va a rechazar con 403.
const API_ROLE_ALIASES: Record<string, string[]> = {
  administrador: ['admin', 'administrador', 'manager'],
  almacen: ['warehouse', 'almacen'],
  rh: ['hr', 'hr_manager', 'rh'],
  auditor: ['auditor'],
  contabilidad: ['accountant', 'finance', 'contabilidad'],
  operaciones: ['operaciones'],
  call_center: ['call_center', 'cashier'],
  laboratorio: ['laboratorio'],
  comercial: ['comercial'],
  supervisor: ['supervisor'],
  customer: ['customer'],
};

/** @Roles de GET /pos/registers (listado de cajas). */
export const CASH_REGISTER_LIST_ROLES = [
  'super_admin',
  'admin',
  'manager',
  'cashier',
  'call_center',
  'cedeas',
  'operaciones',
] as const;

/** @Roles de POST /pos/registers (crear caja). */
export const CASH_REGISTER_CREATE_ROLES = ['super_admin', 'admin'] as const;

/** Misma regla que RolesGuard: alias expandidos y super_admin siempre pasa. */
export function hasApiRole(userRoles: readonly string[], required: readonly string[]): boolean {
  const expanded = new Set<string>();
  for (const role of userRoles) {
    expanded.add(role);
    for (const alias of API_ROLE_ALIASES[role] ?? []) expanded.add(alias);
  }
  if (expanded.has('super_admin')) return true;
  return required.some((role) => expanded.has(role));
}

export const canListCashRegisters = (userRoles: readonly string[]) =>
  hasApiRole(userRoles, CASH_REGISTER_LIST_ROLES);

export const canCreateCashRegister = (userRoles: readonly string[]) =>
  hasApiRole(userRoles, CASH_REGISTER_CREATE_ROLES);

// ================================
// LISTADO COMPLETO DE CAJAS
// ================================

/** CashRegisterQueryDto.limit: @Max(100). */
export const CASH_REGISTER_PAGE_LIMIT = 100;
/** Tope de páginas (2,000 cajas; hoy son 69). Pasado el tope se falla en vez de
 *  dar un "Sin caja" falso por una lista incompleta. */
export const CASH_REGISTER_MAX_PAGES = 20;

/**
 * Trae TODAS las cajas (activas e inactivas) paginando GET /pos/registers SIN
 * filtros: con ≤100 cajas es una sola llamada. Sin filtros a propósito: en el
 * API (CashRegisterService.findAll, 23-sep-2026) cualquier filtro (branchId,
 * isActive, status, search) arma `$1` dentro de un sql.unsafe que no recibe sus
 * parámetros y la consulta truena; el cruce por sucursal se hace aquí.
 */
export async function fetchAllCashRegisters(
  fetchPage: (page: number, limit: number) => Promise<CashRegisterListResponse>,
): Promise<CashRegister[]> {
  const first = await fetchPage(1, CASH_REGISTER_PAGE_LIMIT);
  const totalPages = Math.max(1, Number(first.totalPages) || 1);
  if (totalPages > CASH_REGISTER_MAX_PAGES) {
    throw new Error(
      `Hay ${first.total} cajas registradoras; el listado de sucursales solo revisa hasta ${
        CASH_REGISTER_MAX_PAGES * CASH_REGISTER_PAGE_LIMIT
      }.`,
    );
  }
  const all = [...(first.data ?? [])];
  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchPage(page, CASH_REGISTER_PAGE_LIMIT);
    all.push(...(next.data ?? []));
  }
  return all;
}

// ================================
// CRUCE SUCURSAL → CAJA
// ================================

export interface BranchRegisterSummary {
  /** Cajas activas (is_active = true): con al menos una el POS puede cobrar. */
  active: CashRegister[];
  /** Códigos de TODAS las cajas de la sucursal, activas o no (el código es
   *  único por sucursal aunque la caja esté inactiva). */
  codes: string[];
}

/** branchId → cajas de esa sucursal. Deduplica por id (paginado con OFFSET). */
export function summarizeRegistersByBranch(
  registers: readonly CashRegister[] | null | undefined,
): Record<string, BranchRegisterSummary> {
  const out: Record<string, BranchRegisterSummary> = {};
  const seen = new Set<string>();
  for (const register of registers ?? []) {
    if (!register?.branchId || seen.has(register.id)) continue;
    seen.add(register.id);
    const entry = (out[register.branchId] ??= { active: [], codes: [] });
    entry.codes.push(register.code);
    if (register.isActive) entry.active.push(register);
  }
  return out;
}

/**
 * - `ok`: tiene al menos una caja activa.
 * - `missing`: sucursal ACTIVA con POS y sin caja activa → el POS no cobra.
 * - `not-applicable`: inactiva o sin POS (no necesita caja).
 * - `unknown`: no se pudo consultar el listado de cajas (403, error, cargando).
 */
export type BranchRegisterStatus = 'ok' | 'missing' | 'not-applicable' | 'unknown';

export function branchRegisterStatus(
  branch: Pick<Branch, 'id' | 'isActive' | 'isPosEnabled'>,
  summary: Record<string, BranchRegisterSummary> | null | undefined,
): BranchRegisterStatus {
  if (!branch.isActive || !branch.isPosEnabled) return 'not-applicable';
  if (!summary) return 'unknown';
  return (summary[branch.id]?.active.length ?? 0) > 0 ? 'ok' : 'missing';
}

/** Sucursales activas con POS y sin caja activa (para el aviso del listado). */
export function branchesMissingRegister<T extends Pick<Branch, 'id' | 'isActive' | 'isPosEnabled'>>(
  branches: readonly T[] | null | undefined,
  summary: Record<string, BranchRegisterSummary> | null | undefined,
): T[] {
  if (!summary) return [];
  return (branches ?? []).filter((b) => branchRegisterStatus(b, summary) === 'missing');
}

// ================================
// PAYLOAD DE "CREAR CAJA PRINCIPAL"
// ================================

/** '<código de sucursal>-C<n>'. Si no cabe en 20 se recorta el código de la
 *  sucursal, nunca el sufijo (misma regla que defaultRegisterCode del API). */
export function mainCashRegisterCode(branchCode: string, n = 1): string {
  const suffix = `-C${n}`;
  const base = branchCode.trim().slice(0, CASH_REGISTER_CODE_MAX_LENGTH - suffix.length);
  return `${base}${suffix}`;
}

/** Primer '<código>-C<n>' libre en la sucursal. Una caja INACTIVA conserva su
 *  código (UNIQUE branch_id+code): reutilizarlo daría 409 "Ya existe una caja". */
export function nextMainCashRegisterCode(branchCode: string, takenCodes: readonly string[] = []): string {
  const taken = new Set(takenCodes.map((c) => c.trim().toUpperCase()));
  for (let n = 1; n <= MAX_MAIN_REGISTER_SUFFIX; n++) {
    const code = mainCashRegisterCode(branchCode, n);
    if (!taken.has(code.toUpperCase())) return code;
  }
  throw new Error(
    `La sucursal ${branchCode} ya usa los códigos ${mainCashRegisterCode(branchCode, 1)} a ${mainCashRegisterCode(
      branchCode,
      MAX_MAIN_REGISTER_SUFFIX,
    )}.`,
  );
}

/** Body de POST /pos/registers (CreateCashRegisterDto) para la caja por defecto. */
export function mainCashRegisterPayload(
  branch: Pick<Branch, 'id' | 'code'>,
  takenCodes: readonly string[] = [],
): CreateCashRegisterInput {
  return {
    branchId: branch.id,
    name: MAIN_CASH_REGISTER_NAME,
    code: nextMainCashRegisterCode(branch.code, takenCodes),
    allowNegativeBalance: false,
    requireOpeningAmount: true,
    autoPrintTicket: true,
  };
}

// ================================
// RESPUESTA DE POST/PATCH /branches
// ================================

/**
 * Caja que el API creó al dar de alta (o activar el POS de) la sucursal. El
 * campo `cashRegisterCreated` ({ id, code, name }) solo viene cuando ESA
 * operación creó la caja; un API sin ese cambio no lo manda → null (no se
 * dice nada). También acepta `true` por si llega como bandera.
 */
export function createdCashRegisterFromResponse(response: unknown): { code?: string; name?: string } | null {
  if (!response || typeof response !== 'object') return null;
  const created = (response as { cashRegisterCreated?: unknown }).cashRegisterCreated;
  if (created === true) return {};
  if (!created || typeof created !== 'object') return null;
  const { code, name } = created as { code?: unknown; name?: unknown };
  return {
    code: typeof code === 'string' && code.trim() ? code : undefined,
    name: typeof name === 'string' && name.trim() ? name : undefined,
  };
}

/** Texto del toast cuando el API avisa que creó la caja. */
export function createdCashRegisterToast(created: { code?: string; name?: string }): string {
  const name = created.name ?? MAIN_CASH_REGISTER_NAME;
  return created.code ? `Se creó la ${name} (${created.code})` : `Se creó la ${name}`;
}
