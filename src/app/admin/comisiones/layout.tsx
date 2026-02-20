'use client';

import { PermissionGuard } from '@/components/auth';

export default function ComisionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['commissions:read']}>
      {children}
    </PermissionGuard>
  );
}
