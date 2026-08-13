'use client';

// Guard del árbol /admin/rrhh/* (mig 120): las subpáginas (empleados,
// departamentos, organigrama, asistencia, vacaciones, viáticos) no tenían
// PermissionGuard y quedaban accesibles por URL directa.
import { PermissionGuard } from '@/components/auth';

export default function RrhhLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionGuard permissions={['hr:read', 'hr:*', 'hr']}>
      {children}
    </PermissionGuard>
  );
}
