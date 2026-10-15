'use client';

import { PermissionGuard } from '@/components/auth';

export default function ViaticosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard
      permissions={['viaticos', 'viaticos:request', 'viaticos:approve', 'viaticos:read']}
    >
      {children}
    </PermissionGuard>
  );
}
