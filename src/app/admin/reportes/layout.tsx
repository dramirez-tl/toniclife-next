'use client';

import { PermissionGuard } from '@/components/auth';

// reports:sales_lookup (mig 163) y reports:new_distributors (mig 173): Call
// Center entra a Reportes solo para Ventas por Usuario y Nuevos Inscritos.
export default function ReportesLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['reports:read', 'reports:sales_lookup', 'reports:new_distributors']}>
      {children}
    </PermissionGuard>
  );
}
