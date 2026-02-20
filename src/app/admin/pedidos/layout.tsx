'use client';

import { PermissionGuard } from '@/components/auth';

export default function PedidosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['orders:read']}>
      {children}
    </PermissionGuard>
  );
}
