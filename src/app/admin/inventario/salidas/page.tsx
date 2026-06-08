'use client';

import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { MovementsListPage } from '@/components/inventory/MovementsListPage';
import { MovementType } from '@/types/inventory';

export default function SalidasPage() {
  return (
    <MovementsListPage
      movementType={MovementType.EXIT}
      title="Salidas de Producto"
      subtitle="Registro de salidas de mercancía del inventario"
      icon={ArrowUpTrayIcon}
      newHref="/admin/inventario/salidas/nuevo"
      newLabel="Nueva Salida"
      basePath="/admin/inventario/salidas"
      noun="salida"
      emptyLabel="No hay salidas registradas"
    />
  );
}
