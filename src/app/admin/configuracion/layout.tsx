'use client';

import { PermissionGuard } from '@/components/auth';

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['settings:read']}>
      {children}
    </PermissionGuard>
  );
}
