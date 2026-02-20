'use client';

import { PermissionGuard } from '@/components/auth';

export default function UsuariosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['users:read']}>
      {children}
    </PermissionGuard>
  );
}
