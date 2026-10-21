// branch-scope.ts - Alcance por sucursal (CEDEAS Supervisor, 21-oct-2026).
//
// El API acota los reportes de los roles de BRANCH_SCOPED_ROLE_CODES a las
// sucursales de user_branches y manda la lista en el login/refresh como
// `scopedBranchIds` (null = sin restricción). Aquí solo se usa para:
//  - filtrar los selectores de sucursal (useActiveBranches),
//  - esconder lo que el API le niega (KPIs globales, analítica, bonos),
//  - mostrar el campo "Sucursales que puede ver" al editar un usuario con
//    uno de esos roles.
// La regla real vive en el API (fail-closed); esto es solo presentación.

import type { UserResponse } from '@/services/auth.service';

/** Códigos de rol cuyos reportes se acotan por sucursal (espejo del API). */
export const BRANCH_SCOPED_ROLE_CODES: readonly string[] = ['cedeas_supervisor'];

export function isBranchScopedRoleCode(code?: string | null): boolean {
  return !!code && BRANCH_SCOPED_ROLE_CODES.includes(code);
}

/** true = la sesión actual está acotada a sus sucursales. */
export function isBranchScopedUser(user?: Pick<UserResponse, 'scopedBranchIds'> | null): boolean {
  return Array.isArray(user?.scopedBranchIds);
}

/** Sucursales permitidas de la sesión (null = todas). */
export function scopedBranchIdsOf(user?: Pick<UserResponse, 'scopedBranchIds'> | null): string[] | null {
  return Array.isArray(user?.scopedBranchIds) ? user.scopedBranchIds : null;
}
