'use client';

// Guard ÚNICO de /admin/tesoreria/validacion-datos (contrato §1.11, lectura de
// Tesorería; revisar/verificar/asignar exige commissions:validate|mlm:admin y
// se gatea botón por botón dentro de la página).

import { PermissionGuard } from '@/components/auth';
import { TREASURY_READ_PERMISSIONS } from '@/components/admin/treasury/useTreasuryPermissions';

export default function ValidacionDatosLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={TREASURY_READ_PERMISSIONS}>{children}</PermissionGuard>;
}
