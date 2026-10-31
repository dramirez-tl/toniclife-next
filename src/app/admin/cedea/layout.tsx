'use client';

import { PermissionGuard } from '@/components/auth';

// Mi CEDEA (mig 180, 31-oct-2026): permiso reports:cedea_earnings (dueños de
// CEDEA, CEDEAS Supervisor, Administrador, Sistemas, Operaciones).
export default function CedeaLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={['reports:cedea_earnings']}>{children}</PermissionGuard>;
}
