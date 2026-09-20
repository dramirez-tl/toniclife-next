'use client';

// Guard ÚNICO de /admin/tesoreria/dispersion (contrato §1.11, lectura de
// Tesorería). Lotes/pagar/conciliar se gatean botón a botón (mlm:pay | mlm:admin).

import { PermissionGuard } from '@/components/auth';
import { TREASURY_READ_PERMISSIONS } from '@/components/admin/treasury/useTreasuryPermissions';

export default function DispersionLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={TREASURY_READ_PERMISSIONS}>{children}</PermissionGuard>;
}
