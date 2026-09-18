'use client';

// ¿Puede escribir en Preparación fiscal? `billing:manage` (Contabilidad) o
// comodines; super_admin (Sistemas) siempre. Con `billing:read` solo se mira.

import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';

export function hasBillingManagePermission(permissions: string[], roles: string[]): boolean {
  if (roles.includes('super_admin')) return true;
  return permissions.some(
    (p) => p === 'billing:manage' || p === 'billing:*' || p === '*' || p === '*:*',
  );
}

export function useCanManageBilling(): boolean {
  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  return useMemo(() => hasBillingManagePermission(permissions, roles), [permissions, roles]);
}
