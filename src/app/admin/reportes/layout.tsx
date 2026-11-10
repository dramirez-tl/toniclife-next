'use client';

import { PermissionGuard } from '@/components/auth';

// reports:sales_lookup (mig 163) y reports:new_distributors (mig 173): Call
// Center entra a Reportes solo para Ventas por Usuario y Nuevos Inscritos.
// reports:product_sales (mig 197): Almacén entra solo a Piezas por Producto y
// Ventas por Producto. El candado real es el API: cada reporte exige su permiso.
export default function ReportesLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard
      permissions={['reports:read', 'reports:sales_lookup', 'reports:new_distributors', 'reports:product_sales']}
    >
      {children}
    </PermissionGuard>
  );
}
