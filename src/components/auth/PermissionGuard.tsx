'use client';

import { useAppSelector } from '@/store/hooks';
import { selectUser, selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';

interface PermissionGuardProps {
  children: React.ReactNode;
  /** Colon-format permissions, e.g. ['products:read','products:*'] */
  permissions?: string[];
  /** Role codes, e.g. ['super_admin','administrador'] */
  roles?: string[];
  /** 'some' = at least one match (default), 'every' = all must match */
  match?: 'some' | 'every';
  /** Custom fallback UI instead of the default "Unauthorized" card */
  fallback?: React.ReactNode;
}

/**
 * Checks if the user has a specific permission.
 * Supports wildcards on BOTH sides:
 * - Required side: 'products:*' matches any user permission starting with 'products:'.
 * - User side: if user has 'settings:*' it covers any required 'settings:read', 'settings:update', etc.
 */
function hasPermission(userPermissions: string[], required: string): boolean {
  // Check if user has a wildcard that covers the required permission
  const [reqModule] = required.split(':');
  if (userPermissions.includes(`${reqModule}:*`)) return true;

  // Check if required is a wildcard (e.g. 'products:*')
  if (required.endsWith(':*')) {
    const prefix = required.slice(0, -1); // 'products:'
    return userPermissions.some((p) => p.startsWith(prefix));
  }

  // Check global wildcard
  if (userPermissions.includes('*') || userPermissions.includes('*:*')) return true;

  return userPermissions.includes(required);
}

export function PermissionGuard({
  children,
  permissions = [],
  roles = [],
  match = 'some',
  fallback,
}: PermissionGuardProps) {
  const user = useAppSelector(selectUser);
  const userPermissions = useAppSelector(selectUserPermissions);
  const userRoles = useAppSelector(selectUserRoles);

  // ---------- bypass for super_admin ----------
  if (userRoles.includes('super_admin')) {
    return <>{children}</>;
  }

  // ---------- evaluate ----------
  const checks: boolean[] = [];

  if (permissions.length > 0) {
    const permResult =
      match === 'every'
        ? permissions.every((p) => hasPermission(userPermissions, p))
        : permissions.some((p) => hasPermission(userPermissions, p));
    checks.push(permResult);
  }

  if (roles.length > 0) {
    const roleResult =
      match === 'every'
        ? roles.every((r) => userRoles.includes(r))
        : roles.some((r) => userRoles.includes(r));
    checks.push(roleResult);
  }

  // If nothing was requested, allow (no guard configured)
  if (checks.length === 0) {
    return <>{children}</>;
  }

  // At least one check must pass
  const allowed = checks.some(Boolean);

  if (allowed) {
    return <>{children}</>;
  }

  // ---------- unauthorized fallback ----------
  if (fallback) return <>{fallback}</>;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md mx-auto p-8">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Acceso denegado</h2>
        <p className="text-gray-500 text-sm">
          No tienes los permisos necesarios para acceder a esta seccion.
          Contacta al administrador si crees que esto es un error.
        </p>
      </div>
    </div>
  );
}
