// branch-routes.ts — Qué países surte una sucursal (lógica PURA, para /admin/sucursales).
//
// Desactivar una sucursal deja sin envío a los países que surte SIN pasar por
// la pantalla de rutas (contrato de rutas §0.1-O / §7.2): el formulario de
// sucursales lo avisa antes. Solo front, con datos de `GET /fulfillment/routes`.

import type { FulfillmentRoutesResponse } from '@/types/fulfillment';

export interface BranchShippingCountry {
  countryCode: string;
  countryName: string;
  /** Hoy los pedidos de este país salen de ESTA sucursal. */
  resolvesHere: boolean;
  /** El país tiene otro almacén utilizable que tomaría su lugar. */
  hasBackup: boolean;
}

/** branchId → países a los que envía con ruta ACTIVA (las rutas en pausa no cuentan). */
export function shippingCountriesByBranch(
  data: FulfillmentRoutesResponse | null | undefined,
): Record<string, BranchShippingCountry[]> {
  const out: Record<string, BranchShippingCountry[]> = {};
  for (const country of data?.countries ?? []) {
    for (const route of country.routes) {
      if (!route.isActive) continue;
      (out[route.branchId] ??= []).push({
        countryCode: country.countryCode,
        countryName: country.countryName,
        resolvesHere: country.resolvesTo?.branchId === route.branchId,
        hasBackup: country.routes.some((r) => r.branchId !== route.branchId && r.usable),
      });
    }
  }
  return out;
}

/**
 * Quién puede consultar `GET /fulfillment/routes` desde /admin/sucursales: los
 * de rutas Y todo el que puede desactivar o eliminar una sucursal (el API los
 * admite en ese GET), para que el aviso le salga a quien puede cortar el envío.
 */
export const BRANCH_ROUTES_READ_PERMISSIONS = [
  'fulfillment:read',
  'fulfillment:manage',
  'branches:update',
  'branches:delete',
] as const;

/** Misma regla que PermissionGuard: super_admin y los comodines pasan; `modulo:*` cubre al módulo. */
export function canReadBranchRoutes(userPermissions: string[], userRoles: string[]): boolean {
  if (userRoles.includes('super_admin')) return true;
  if (userPermissions.includes('*') || userPermissions.includes('*:*')) return true;
  return BRANCH_ROUTES_READ_PERMISSIONS.some(
    (p) => userPermissions.includes(p) || userPermissions.includes(`${p.split(':')[0]}:*`),
  );
}

/** Quién puede ABRIR la pantalla Almacenes y envíos (no basta con poder desactivar sucursales). */
export function canOpenRoutesScreen(userPermissions: string[], userRoles: string[]): boolean {
  if (userRoles.includes('super_admin')) return true;
  if (userPermissions.includes('*') || userPermissions.includes('*:*')) return true;
  return ['fulfillment:read', 'fulfillment:manage', 'fulfillment:*'].some((p) => userPermissions.includes(p));
}

export function shippingBadgeText(countries: BranchShippingCountry[]): string {
  return `Envía a: ${countries.map((c) => c.countryCode).join(', ')}`;
}

const joinNames = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;

/**
 * Cómo deja de estar activa la sucursal. "Eliminar" en /admin/sucursales es un
 * borrado LÓGICO (`DELETE /branches/:id` → is_active = false), así que para los
 * envíos tiene exactamente el mismo efecto que desactivarla.
 */
export type BranchOffAction = 'deactivate' | 'delete';

const OFF_VERB: Record<BranchOffAction, string> = { deactivate: 'desactivas', delete: 'eliminas' };

/**
 * Texto del aviso al desactivar O eliminar una sucursal que surte envíos;
 * null = no hace falta avisar.
 */
export function deactivateBranchWarning(
  countries: BranchShippingCountry[],
  action: BranchOffAction = 'deactivate',
): string | null {
  const verb = OFF_VERB[action];
  const affected = countries.filter((c) => c.resolvesHere);
  if (affected.length === 0) {
    return countries.length > 0
      ? `Esta sucursal es almacén de respaldo para los envíos de ${joinNames(countries.map((c) => c.countryName))}; si la ${verb} deja de ser una opción.`
      : null;
  }
  const losing = affected.filter((c) => !c.hasBackup).map((c) => c.countryName);
  const moving = affected.filter((c) => c.hasBackup).map((c) => c.countryName);
  const parts: string[] = [`Esta sucursal surte los envíos de ${joinNames(affected.map((c) => c.countryName))}.`];
  if (losing.length > 0) {
    parts.push(
      `Si la ${verb}, ${joinNames(losing)} ${losing.length === 1 ? 'se queda' : 'se quedan'} sin envío a domicilio.`,
    );
  }
  if (moving.length > 0) {
    parts.push(
      `${losing.length > 0 ? 'Los pedidos de' : `Si la ${verb}, los pedidos de`} ${joinNames(moving)} pasan a su almacén de respaldo.`,
    );
  }
  return parts.join(' ');
}

/** No se pudieron leer las rutas: no se sabe si la sucursal surte envíos, y se dice. */
export function unverifiedBranchWarning(action: BranchOffAction = 'deactivate'): string {
  return `No se pudo comprobar si esta sucursal surte los envíos de la tienda en línea. Si los surte y la ${OFF_VERB[action]}, su país se queda sin envío a domicilio. Revísalo en Almacenes y envíos antes de continuar.`;
}

/**
 * Texto del diálogo al desactivar o eliminar una sucursal; null = no hace falta
 * preguntar por las rutas. `routesKnown=false` (la consulta falló o no ha
 * llegado) NUNCA calla: advierte que no se pudo comprobar.
 */
export function branchOffDialogText(
  countries: BranchShippingCountry[] | undefined,
  action: BranchOffAction,
  routesKnown: boolean,
): string | null {
  if (!routesKnown) return unverifiedBranchWarning(action);
  return deactivateBranchWarning(countries ?? [], action);
}
