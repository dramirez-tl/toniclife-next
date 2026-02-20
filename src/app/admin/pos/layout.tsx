'use client';

import { PermissionGuard } from '@/components/auth';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['pos:read']}>
      {children}
    </PermissionGuard>
  );
}
