'use client';

import { PermissionGuard } from '@/components/auth';

export default function RhLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['hr:read']}>
      {children}
    </PermissionGuard>
  );
}
