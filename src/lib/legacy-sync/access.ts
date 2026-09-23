// access.ts - Quién puede abrir el panel de la sincronización legacy (D12 del
// contrato de sincronización §10).
//
// La autoridad es el API: los GET de /maintenance/legacy-sync aceptan a
// super_admin y Sistemas (@Roles en el método) y los PATCH/PUT solo a
// super_admin. El front NO repite esa lista de roles (regla del portal por
// categoría: nada de listas de roles quemadas): decide la LECTURA con la
// respuesta del propio API a GET /status (sonda; un 403 = sin acceso) y las
// ESCRITURAS con el bypass universal de super_admin, el mismo de RolesGuard y
// PermissionGuard. Si el API cambia quién lee, el front lo sigue solo.

import { isForbiddenError } from './format';

/** Ruta propia del panel (la pestaña ?tab=sync de /admin/sistema es solo de super_admin). */
export const LEGACY_SYNC_PAGE = '/admin/sistema/sync';

/**
 * allowed = puede abrir la página; denied = el API respondió 403;
 * checking = consultando sin datos; unknown = otro error (API caído, 5xx):
 * la página se abre y muestra el error con "Reintentar", pero el menú y el
 * enlace "Ver detalle" no se muestran.
 */
export type LegacySyncReadAccess = 'allowed' | 'denied' | 'checking' | 'unknown';

export function legacySyncReadAccess(input: {
  isSuperAdmin: boolean;
  hasData: boolean;
  error?: unknown;
  loading?: boolean;
}): LegacySyncReadAccess {
  if (input.isSuperAdmin || input.hasData) return 'allowed';
  if (input.loading) return 'checking';
  if (isForbiddenError(input.error)) return 'denied';
  return 'unknown';
}

/** Interruptor y decisiones de retenciones: solo super_admin (PATCH/PUT del API). */
export function canManageLegacySync(roles: readonly string[] | null | undefined): boolean {
  return Array.isArray(roles) && roles.includes('super_admin');
}

/**
 * /admin/sistema es exclusivo de super_admin, pero las alertas del API
 * enlazan a /admin/sistema?tab=sync y también le llegan a Sistemas: a quien
 * no es super_admin y pide esa pestaña se le manda a la ruta propia.
 */
export function sistemaRedirectFor(tab: string | null | undefined): string | null {
  return tab === 'sync' ? LEGACY_SYNC_PAGE : null;
}
