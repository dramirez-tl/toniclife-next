'use client';

import { PermissionGuard } from '@/components/auth';

export default function ProductosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['products:read']}>
      {children}
    </PermissionGuard>
  );
}
