'use client';

// Guard de /admin/tesoreria/cedeas (2-nov-2026): lectura = quien lee comisiones
// en Tesorería (mismo permiso que el API en GET reports/cedea/payouts); capturar
// el contrato se gatea botón a botón (commissions:validate | mlm:admin).

import { PermissionGuard } from '@/components/auth';
import { TREASURY_READ_PERMISSIONS } from '@/components/admin/treasury';

export default function CedeasLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={TREASURY_READ_PERMISSIONS}>{children}</PermissionGuard>;
}
