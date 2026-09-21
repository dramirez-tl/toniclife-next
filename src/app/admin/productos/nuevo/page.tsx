'use client';

// /admin/productos/nuevo — envoltorio del MISMO ProductFormShell en modo alta.
// Tras crear redirige a la ficha en la sección Precios.

import { Suspense } from 'react';
import { PermissionGuard } from '@/components/auth';
import { ProductFormShell } from '@/components/admin/products/form/ProductFormShell';

export default function NuevoProductoAdminPage() {
  return (
    <PermissionGuard permissions={['products:create', 'products:*']}>
      <Suspense fallback={<div className="min-h-screen bg-gray-50" role="status" aria-label="Cargando" />}>
        <ProductFormShell mode="create" />
      </Suspense>
    </PermissionGuard>
  );
}
