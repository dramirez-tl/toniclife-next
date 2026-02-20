'use client';

import { PermissionGuard } from '@/components/auth';

export default function FacturacionLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['billing:read']}>
      {children}
    </PermissionGuard>
  );
}
