'use client';

// Guard ÚNICO de /admin/comisiones (contrato §1.11, lectura de Tesorería).
// La página ya no repite el PermissionGuard; los botones se gatean uno a uno.

import { PermissionGuard } from '@/components/auth';
import { TREASURY_READ_PERMISSIONS } from '@/components/admin/treasury/useTreasuryPermissions';

export default function ComisionesLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={TREASURY_READ_PERMISSIONS}>{children}</PermissionGuard>;
}
