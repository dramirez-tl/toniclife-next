'use client';

import { PermissionGuard } from '@/components/auth';

export default function EventosLayout({ children }: { children: React.ReactNode }) {
  return <PermissionGuard permissions={['events', 'events:read']}>{children}</PermissionGuard>;
}
