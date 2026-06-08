'use client';

import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { MovementsListPage } from '@/components/inventory/MovementsListPage';
import { MovementType } from '@/types/inventory';

export default function EntradasPage() {
  return (
    <MovementsListPage
      movementType={MovementType.ENTRY}
      title="Entradas de Producto"
      subtitle="Registro de entradas de mercancía al inventario"
      icon={ArrowDownTrayIcon}
      newHref="/admin/inventario/entradas/nuevo"
      newLabel="Nueva Entrada"
      basePath="/admin/inventario/entradas"
      noun="entrada"
      emptyLabel="No hay entradas registradas"
    />
  );
}
