'use client';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useState } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { NotificationBell } from '@/components/admin/NotificationBell';

// Roles que tienen acceso al panel de administración
const ADMIN_ROLES = [
  // Core admin roles
  'super_admin', 'administrador', 'subadmin',
  // Operational roles
  'operaciones', 'ventas_mostrador', 'call_center', 'sucursales', 'supervisor',
  'auxiliar_sucursal', 'auxiliar',
  // Finance & accounting
  'contabilidad', 'contabilidad_two', 'contabilidad_viaticos', 'aux_contabilidad',
  'comisiones', 'comercial', 'comercial_two', 'comercial_three', 'comercial_usa',
  // Warehouse & production
  'almacen', 'laboratorio', 'materia_prima', 'aux_materia_prima', 'produccion',
  'soporte', 'mantenimiento',
  // Distribution centers
  'cedea', 'cedea_two', 'cedeas', 'cedeas2', 'cedeas_viaticos', 'cedis',
  // HR & admin support
  'rh', 'rh_viaticos', 'viaticos', 'solicitud_viaticos', 'asistente_direccion',
  // Audit & special
  'auditor', 'auditor_two', 'checador', 'dircomer',
  // Other
  'help', 'jc', 'neo', 'usa_admin', 'compras', 'viewer',
  // Legacy-migration codes (default_module values used as role codes during migration)
  'ventas', 'asistencia', 'clientes', 'solicitud-viaticos', 'productos',
  'ventas-totales-sucursal', 'documentos', 'aprobacion-viaticos',
  'corte-caja-sucursal', 'inventario', 'rrhh-trabajadores', 'puntos-periodo', 'factura-libre',
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard requiredRoles={ADMIN_ROLES}>
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú lateral"
      >
        <AdminSidebar mobile onNavigate={() => setSidebarOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-white px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <span className="font-semibold text-[#3E667D]">Tonic Life Admin</span>
          </div>
          <NotificationBell />
        </header>

        {/* Desktop top bar (notification bell) */}
        <div className="hidden lg:flex sticky top-0 z-20 h-12 items-center justify-end border-b bg-white/80 backdrop-blur-sm px-6">
          <NotificationBell />
        </div>

        {/* Page content */}
        <main className="min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-3rem)]">
          {children}
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
