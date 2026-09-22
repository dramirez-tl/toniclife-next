'use client';

// permissions.ts — permisos por ACCIÓN del módulo Productos.
// Misma semántica que `PermissionGuard` (comodines en ambos lados y bypass de
// super_admin). Con solo `products:read` la ficha y el listado son de lectura.

import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';
import { canEditKitFields } from '@/lib/kits/kit-editor';

function hasPermission(userPermissions: string[], required: string): boolean {
  const [module] = required.split(':');
  if (userPermissions.includes(`${module}:*`)) return true;
  if (userPermissions.includes('*') || userPermissions.includes('*:*')) return true;
  return userPermissions.includes(required);
}

export interface ProductPermissions {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  /**
   * Campos sensibles de un kit (cómo se surte, inscripción, posición, receta,
   * bonos, vaciar existencia): `products:kits_manage` O `products:update`
   * (respaldo del contrato de kits §4.2). Sin ninguno, la sección Kit es de lectura.
   */
  canManageKits: boolean;
}

/**
 * ¿Puede activar/desactivar ESTE producto? CAMBIAR `isActive` exige
 * `products:delete` en ambos sentidos (403 PRD_FORBIDDEN, field `isActive`):
 * desactivar va por DELETE /products/:id y reactivar por PATCH { isActive: true },
 * que además pide `products:update`.
 */
export function canToggleProductActive(
  permissions: Pick<ProductPermissions, 'canUpdate' | 'canDelete'>,
  isActive: boolean,
): boolean {
  return isActive ? permissions.canDelete : permissions.canDelete && permissions.canUpdate;
}

export function useProductPermissions(): ProductPermissions {
  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  return useMemo(() => {
    if (roles.includes('super_admin')) {
      return { canRead: true, canCreate: true, canUpdate: true, canDelete: true, canManageKits: true };
    }
    return {
      canRead: hasPermission(permissions, 'products:read'),
      canCreate: hasPermission(permissions, 'products:create'),
      canUpdate: hasPermission(permissions, 'products:update'),
      canDelete: hasPermission(permissions, 'products:delete'),
      canManageKits: canEditKitFields(permissions, roles),
    };
  }, [permissions, roles]);
}
