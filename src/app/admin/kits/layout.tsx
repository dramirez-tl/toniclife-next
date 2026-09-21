'use client';

import { PermissionGuard } from '@/components/auth';

// Mismo candado que /admin/productos: los kits son productos (contrato §7.4).
export default function KitsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['products:read']}>
      {children}
    </PermissionGuard>
  );
}
