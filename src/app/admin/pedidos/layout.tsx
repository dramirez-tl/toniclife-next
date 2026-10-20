'use client';

import { PermissionGuard } from '@/components/auth';

// orders:update (no orders:read): Call Center solo lee pedidos y usa Entregas a
// domicilio; este módulo se le oculta para no confundir (20-oct-2026). Mismo
// criterio que el ítem del menú en AdminSidebar.
export default function PedidosLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGuard permissions={['orders:update']}>
      {children}
    </PermissionGuard>
  );
}
