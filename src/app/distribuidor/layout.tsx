'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DistributorSidebar } from '@/components/distributor/DistributorSidebar';
import { DistributorTopNav } from '@/components/distributor/DistributorTopNav';
import { DistributorMoreMenu } from '@/components/distributor/DistributorMoreMenu';
import { ComingSoon } from '@/components/distributor/ComingSoon';

// Secciones que aún viven sobre datos de demostración (no conectadas al API).
// Se muestran como "próximamente" para no presentar números ficticios como
// reales (auditoría jun-2026). Al conectar una sección, quitar su entrada.
const COMING_SOON_ROUTES: Record<string, string> = {
  '/distribuidor/actividad': 'Actividad',
  '/distribuidor/clientes': 'Mis clientes',
  '/distribuidor/comunicacion': 'Comunicación',
  '/distribuidor/eventos': 'Eventos',
  '/distribuidor/integraciones': 'Integraciones',
  '/distribuidor/inventario': 'Mi inventario',
  '/distribuidor/metas': 'Metas',
  '/distribuidor/prospectos': 'Prospectos',
  '/distribuidor/ranking': 'Ranking',
  '/distribuidor/reportes': 'Reportes',
  '/distribuidor/scripts': 'Guiones de venta',
  '/distribuidor/soporte': 'Soporte',
};

// Roles que tienen acceso al panel de distribuidor (canonical + legacy-migration + admin)
// Legacy migration created generic "role1"–"role46" codes for ~170k distributor users,
// so we generate them dynamically instead of listing all 46.
const LEGACY_ROLE_CODES = Array.from({ length: 46 }, (_, i) => `role${i + 1}`);
const DISTRIBUTOR_ROLES = [
  'customer', 'distribuidor', 'distributor', 'dashboard', 'cliente-dashboard',
  'super_admin', 'administrador', 'admin',
  // Legacy admin codes (also allowed to access distribuidor panel)
  'ventas', 'asistencia', 'clientes', 'solicitud-viaticos', 'productos',
  'ventas-totales-sucursal', 'documentos', 'aprobacion-viaticos',
  'corte-caja-sucursal', 'inventario', 'rrhh-trabajadores', 'puntos-periodo', 'factura-libre',
  'subadmin', 'almacen', 'ventas_mostrador', 'rh', 'contabilidad', 'auditor', 'viewer',
  // Legacy generic distributor codes (role1 through role46)
  ...LEGACY_ROLE_CODES,
];

export default function DistributorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();
  const comingSoonTitle = pathname ? COMING_SOON_ROUTES[pathname] : undefined;

  return (
    <AuthGuard requiredRoles={DISTRIBUTOR_ROLES}>
      <div className="min-h-screen bg-gray-50">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <DistributorSidebar />
        </div>

        {/* Mobile: barra superior fija con pestañas */}
        <div className="lg:hidden">
          <DistributorTopNav onOpenMore={() => setMoreOpen(true)} />
        </div>

        {/* Mobile: panel "Más" deslizable */}
        {moreOpen && (
          <div className="lg:hidden">
            <div
              className="fixed inset-0 z-50 bg-black/50"
              onClick={() => setMoreOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85%] overflow-y-auto shadow-xl">
              <DistributorMoreMenu onNavigate={() => setMoreOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="lg:pl-64">
          <main className="p-4 lg:p-6">
            {comingSoonTitle ? <ComingSoon title={comingSoonTitle} /> : children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
