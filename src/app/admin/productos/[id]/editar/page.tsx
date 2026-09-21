'use client';

// /admin/productos/[id]/editar — envoltorio. Toda la ficha (secciones, guardado
// por sección, permisos, guard de salida) vive en ProductFormShell, el mismo
// formulario que usa /admin/productos/nuevo.

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { PermissionGuard } from '@/components/auth';
import { ProductFormShell } from '@/components/admin/products/form/ProductFormShell';

export default function EditarProductoAdminPage() {
  const params = useParams<{ id: string }>();
  return (
    <PermissionGuard permissions={['products:read', 'products:*']}>
      <Suspense fallback={<div className="min-h-screen bg-gray-50" role="status" aria-label="Cargando" />}>
        <ProductFormShell key={params.id} mode="edit" productId={params.id} />
      </Suspense>
    </PermissionGuard>
  );
}
