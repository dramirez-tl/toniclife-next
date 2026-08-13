'use client';

import { PermissionGuard } from '@/components/auth';

export default function UsuariosLayout({ children }: { children: React.ReactNode }) {
  // customers:read (matriz mig 120): acceso SOLO a la pestaña de
  // Distribuidores y clientes (la página fuerza esa pestaña sin users:read).
  return (
    <PermissionGuard permissions={['users:read', 'customers:read']}>
      {children}
    </PermissionGuard>
  );
}
