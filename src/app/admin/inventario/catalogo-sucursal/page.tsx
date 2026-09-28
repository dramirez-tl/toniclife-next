'use client';

// /admin/inventario/catalogo-sucursal — Catálogo por sucursal (qué productos
// ve el POS de cada sucursal y habilitar los que faltan). Hereda el
// PermissionGuard inventory:read del layout de Inventario.

import { Suspense } from 'react';
import { BranchCatalogCoveragePage, BranchCatalogCoverageSkeleton } from '@/components/inventory/BranchCatalogCoveragePage';

export default function CatalogoSucursalPage() {
  return (
    <Suspense fallback={<BranchCatalogCoverageSkeleton />}>
      <BranchCatalogCoveragePage />
    </Suspense>
  );
}
