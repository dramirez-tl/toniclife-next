'use client';

import { PermissionGuard } from '@/components/auth';

export default function RedLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['commissions:read']}>
      {children}
    </PermissionGuard>
  );
}
