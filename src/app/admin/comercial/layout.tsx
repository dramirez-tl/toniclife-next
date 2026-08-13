'use client';

// Guard del árbol /admin/comercial/* (mig 120): antes estas páginas no tenían
// PermissionGuard y cualquier colaborador entraba por URL directa.
import { PermissionGuard } from '@/components/auth';

export default function ComercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard
      permissions={[
        'comercial',
        'courses:read',
        'courses:manage',
        'materials:read',
        'materials:manage',
        'config',
      ]}
    >
      {children}
    </PermissionGuard>
  );
}
