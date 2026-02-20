'use client';

import { PermissionGuard } from '@/components/auth';

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['inventory:read']}>
      {children}
    </PermissionGuard>
  );
}
