'use client';

// permissions.ts — permisos por ACCIÓN del módulo Productos.
// Misma semántica que `PermissionGuard` (comodines en ambos lados y bypass de
// super_admin). Con solo `products:read` la ficha y el listado son de lectura.

import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';

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
}

export function useProductPermissions(): ProductPermissions {
  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  return useMemo(() => {
    if (roles.includes('super_admin')) {
      return { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
    }
    return {
      canRead: hasPermission(permissions, 'products:read'),
      canCreate: hasPermission(permissions, 'products:create'),
      canUpdate: hasPermission(permissions, 'products:update'),
      canDelete: hasPermission(permissions, 'products:delete'),
    };
  }, [permissions, roles]);
}
