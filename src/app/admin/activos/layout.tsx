'use client';

import { PermissionGuard } from '@/components/auth';

export default function ActivosLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={['assets', 'assets:read']}>{children}</PermissionGuard>;
}
