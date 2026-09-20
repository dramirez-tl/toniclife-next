'use client';

// Guard ÚNICO de /admin/tesoreria/retenciones (contrato §5.4): lectura con
// mlm:withhold | mlm:admin | commissions:read; la escritura se gatea botón a
// botón con PermissionGuard fallback vacío (mlm:withhold | mlm:admin).

import { PermissionGuard } from '@/components/auth';

const WITHHOLDINGS_PAGE_PERMISSIONS = ['mlm:withhold', 'mlm:admin', 'commissions:read', 'commissions:*'];

export default function RetencionesLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={WITHHOLDINGS_PAGE_PERMISSIONS}>{children}</PermissionGuard>;
}
