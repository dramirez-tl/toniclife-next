'use client';

// Guard ÚNICO de /admin/tesoreria/bonos (Bono de Inscripción, 26-oct-2026:
// pasó de Reportes a Tesorería). Lectura = reports:read (lo exige el API en
// GET reports/kit-bonuses); marcar pagos y comprobantes se gatean botón a
// botón en la página (commissions:validate).

import { PermissionGuard } from '@/components/auth';

const KIT_BONUSES_PAGE_PERMISSIONS = ['reports:read', 'reports:*'];

export default function BonosLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={KIT_BONUSES_PAGE_PERMISSIONS}>{children}</PermissionGuard>;
}
