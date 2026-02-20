'use client';

import { PermissionGuard } from '@/components/auth';

export default function AuditoriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['audit:read']}>
      {children}
    </PermissionGuard>
  );
}
