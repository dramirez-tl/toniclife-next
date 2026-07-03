'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { DistributorSidebar } from '@/components/distributor/DistributorSidebar';
import { DistributorTopNav } from '@/components/distributor/DistributorTopNav';
import { DistributorMoreMenu } from '@/components/distributor/DistributorMoreMenu';
import { ComingSoon } from '@/components/distributor/ComingSoon';
import { DistributorTour } from '@/components/distributor/DistributorTour';
import { OnboardingGate } from '@/components/distributor/OnboardingGate';
import { DistributorLocaleSync } from '@/components/distributor/DistributorLocaleSync';

// Secciones que aún viven sobre datos de demostración (no conectadas al API).
// Se muestran como "próximamente" para no presentar números ficticios como
// reales (auditoría jun-2026). El valor es la CLAVE i18n bajo
// distributor.comingSoonRoutes.* Al conectar una sección, quitar su entrada.
const COMING_SOON_ROUTES: Record<string, string> = {
  '/distribuidor/actividad': 'actividad',
  '/distribuidor/clientes': 'clientes',
  '/distribuidor/comunicacion': 'comunicacion',
  '/distribuidor/eventos': 'eventos',
  '/distribuidor/integraciones': 'integraciones',
  '/distribuidor/inventario': 'inventario',
  '/distribuidor/metas': 'metas',
  '/distribuidor/prospectos': 'prospectos',
  '/distribuidor/ranking': 'ranking',
  '/distribuidor/reportes': 'reportes',
  '/distribuidor/scripts': 'scripts',
  '/distribuidor/soporte': 'soporte',
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
  const t = useTranslations('distributor');
  const comingSoonKey = pathname ? COMING_SOON_ROUTES[pathname] : undefined;
  const comingSoonTitle = comingSoonKey
    ? t(`comingSoonRoutes.${comingSoonKey}`)
    : undefined;

  return (
    <AuthGuard requiredRoles={DISTRIBUTOR_ROLES}>
      {/* Aplica el idioma guardado en la cuenta (users.language) al panel */}
      <DistributorLocaleSync />
      {/* Tour guiado de primera vez (omitible + repetible desde "Ver tutorial") */}
      <DistributorTour />
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar rico: tablet (≥768px) y escritorio */}
        <div className="hidden md:block">
          <DistributorSidebar />
        </div>

        {/* Teléfono (<768px): barra superior fija con pestañas */}
        <div className="md:hidden">
          <DistributorTopNav onOpenMore={() => setMoreOpen(true)} />
        </div>

        {/* Teléfono: panel "Más" deslizable */}
        {moreOpen && (
          <div className="md:hidden">
            <div
              className="fixed inset-0 z-50 bg-black/50 animate-in fade-in duration-200"
              onClick={() => setMoreOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85%] overflow-y-auto shadow-xl animate-in slide-in-from-right duration-200">
              <DistributorMoreMenu onNavigate={() => setMoreOpen(false)} />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="md:pl-64">
          <main className="p-4 lg:p-6">
            <OnboardingGate>
              {comingSoonTitle ? <ComingSoon title={comingSoonTitle} /> : children}
            </OnboardingGate>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
