'use client';

// useTreasuryPermissions — permisos de Tesorería (contrato §1.11) para
// decidir LÓGICA (mostrar checkboxes, calcular alcance). Los botones se
// renderizan además dentro de `PermissionGuard fallback={<></>}`.
// Misma regla que PermissionGuard: super_admin bypass, wildcards módulo:*.

import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';

export const TREASURY_READ_PERMISSIONS = [
  'commissions:read',
  'commissions:*',
  'mlm:admin',
  'mlm:approve',
  'mlm:pay',
  'mlm:withhold',
  'commissions:validate',
];
export const TREASURY_APPROVE_PERMISSIONS = ['mlm:approve', 'mlm:admin'];
export const TREASURY_PAY_PERMISSIONS = ['mlm:pay', 'mlm:admin'];
export const TREASURY_WITHHOLD_PERMISSIONS = ['mlm:withhold', 'mlm:admin'];
export const TREASURY_VALIDATE_PERMISSIONS = ['commissions:validate', 'mlm:admin'];
export const MLM_ADMIN_PERMISSIONS = ['mlm:admin'];

function hasPermission(userPermissions: string[], required: string): boolean {
  const [reqModule] = required.split(':');
  if (userPermissions.includes(`${reqModule}:*`)) return true;
  if (required.endsWith(':*')) {
    const prefix = required.slice(0, -1);
    return userPermissions.some((p) => p.startsWith(prefix));
  }
  if (userPermissions.includes('*') || userPermissions.includes('*:*')) return true;
  return userPermissions.includes(required);
}

export function hasAnyTreasuryPermission(
  userPermissions: string[],
  userRoles: string[],
  required: string[],
): boolean {
  if (userRoles.includes('super_admin')) return true;
  return required.some((p) => hasPermission(userPermissions, p));
}

export function useTreasuryPermissions() {
  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  return useMemo(() => {
    const has = (required: string[]) => hasAnyTreasuryPermission(permissions, roles, required);
    return {
      canRead: has(TREASURY_READ_PERMISSIONS),
      canApprove: has(TREASURY_APPROVE_PERMISSIONS),
      canPay: has(TREASURY_PAY_PERMISSIONS),
      canWithhold: has(TREASURY_WITHHOLD_PERMISSIONS),
      canValidate: has(TREASURY_VALIDATE_PERMISSIONS),
      isMlmAdmin: has(MLM_ADMIN_PERMISSIONS),
      isSuperAdmin: roles.includes('super_admin'),
    };
  }, [permissions, roles]);
}
