'use client';

import { PermissionGuard } from '@/components/auth';

export default function ReportesLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['reports:read']}>
      {children}
    </PermissionGuard>
  );
}
