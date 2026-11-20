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
export const BRANCH_SCOPED_ROLE_CODES: readonly string[] = [
  'cedeas_supervisor',
  // Dueño de CEDEA (mig 180, 31-oct-2026): mismo alcance; además ve "Mi CEDEA".
  'cedea_owner',
  // Supervisión de zona (mig 215, 20-nov-2026): ventas y existencias de sus
  // sucursales, solo consulta, además de sus viáticos.
  'supervisor_zona',
];

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

// ---------------------------------------------------------------------------
// Lista "Sucursales que puede ver" del formulario de usuario (20-nov-2026):
// son ~70 sucursales; se filtra con un buscador y se puede ver solo lo marcado.
// ---------------------------------------------------------------------------

export interface BranchChoice {
  id: string;
  code?: string | null;
  name: string;
}

/** Sin acentos ni mayúsculas, para comparar lo tecleado con el nombre. */
function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Sucursales cuyo número o nombre contiene TODAS las palabras buscadas (sin
 * importar acentos, mayúsculas ni el orden). Con `onlyIds`, además, solo las de
 * esa lista (para "ver solo las marcadas"). Sin texto devuelve todas.
 */
export function filterBranchChoices<T extends BranchChoice>(
  branches: readonly T[],
  search: string,
  onlyIds?: readonly string[] | null,
): T[] {
  const words = foldText(search).split(/\s+/).filter(Boolean);
  return branches.filter((branch) => {
    if (onlyIds && !onlyIds.includes(branch.id)) return false;
    if (words.length === 0) return true;
    const haystack = foldText(`${branch.code ?? ''} ${branch.name}`);
    return words.every((word) => haystack.includes(word));
  });
}

/** "Ninguna marcada" · "1 marcada" · "11 marcadas". */
export function checkedBranchesLabel(count: number): string {
  if (count <= 0) return 'Ninguna marcada';
  return count === 1 ? '1 marcada' : `${count} marcadas`;
}
