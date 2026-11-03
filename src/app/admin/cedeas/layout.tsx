'use client';

import { PermissionGuard } from '@/components/auth';

// CEDEAS › Punto de venta (mig 183, 3-nov-2026): permiso cedeas:pos_lock
// (CEDEAS, Administrador, Super Administrador).
export default function CedeasLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={['cedeas:pos_lock']}>{children}</PermissionGuard>;
}
