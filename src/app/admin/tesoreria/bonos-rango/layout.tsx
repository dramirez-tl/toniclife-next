'use client';

// Guard de /admin/tesoreria/bonos-rango (2-nov-2026): lectura = quien lee
// comisiones en Tesorería (mismo permiso que el API en GET reports/rank-bonuses).

import { PermissionGuard } from '@/components/auth';
import { TREASURY_READ_PERMISSIONS } from '@/components/admin/treasury';

export default function BonosRangoLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={TREASURY_READ_PERMISSIONS}>{children}</PermissionGuard>;
}
