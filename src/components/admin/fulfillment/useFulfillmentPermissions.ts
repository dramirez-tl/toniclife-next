'use client';

// useFulfillmentPermissions — fulfillment:read / fulfillment:manage (contrato de rutas §2.14).
// Misma regla que PermissionGuard: super_admin entra por bypass y `fulfillment:*` cubre ambos.
// Nunca listas de roles: los permisos se otorgan desde la matriz de roles.

import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';

export const FULFILLMENT_READ_PERMISSIONS = ['fulfillment:read', 'fulfillment:manage'];
export const FULFILLMENT_MANAGE_PERMISSIONS = ['fulfillment:manage'];

function hasAny(userPermissions: string[], userRoles: string[], required: string[]): boolean {
  if (userRoles.includes('super_admin')) return true;
  if (userPermissions.includes('*') || userPermissions.includes('*:*')) return true;
  return required.some((p) => userPermissions.includes(p) || userPermissions.includes(`${p.split(':')[0]}:*`));
}

export function useFulfillmentPermissions() {
  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  return useMemo(
    () => ({
      canRead: hasAny(permissions, roles, FULFILLMENT_READ_PERMISSIONS),
      canManage: hasAny(permissions, roles, FULFILLMENT_MANAGE_PERMISSIONS),
    }),
    [permissions, roles],
  );
}

/**
 * ¿La sesión tiene al menos uno de estos permisos? Con la misma regla de arriba, para
 * las secciones de "Tienda en línea por país" que dependen de otro módulo (p. ej. los
 * ingresos en línea, que piden `reports:read`). El API sigue siendo quien decide.
 */
export function useHasAnyPermission(required: readonly string[]): boolean {
  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  return hasAny(permissions, roles, [...required]);
}
