'use client';

import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useEffect, useState } from 'react';
import { Bars3Icon, ChevronDoubleLeftIcon } from '@heroicons/react/24/outline';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { ThemeToggle } from '@/components/admin/ThemeToggle';
import { cn } from '@/lib/utils';
import { LEGACY_ADMIN_ROLE_CODES } from '@/lib/auth-roles';

const THEME_KEY = 'admin-theme';
const SIDEBAR_KEY = 'admin-sidebar-collapsed';
type Theme = 'light' | 'dark';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  // Cargar preferencias guardadas (tema + sidebar colapsado).
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    const initial =
      saved ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    setCollapsed(localStorage.getItem(SIDEBAR_KEY) === '1');
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      return next;
    });
  };

  // Acceso por CATEGORÍA del rol (colaborador); la lista legacy solo rescata
  // sesiones cuyo token aún no trae roleCategory. Los MÓDULOS visibles los
  // deciden los PERMISOS del rol (AdminSidebar).
  return (
    <AuthGuard
      requiredCategory="colaborador"
      requiredRoles={LEGACY_ADMIN_ROLE_CODES}
    >
    {/* La clase `dark` solo envuelve el admin: el sitio público no se afecta.
        Va en un wrapper externo porque el variant shadcn es `&:is(.dark *)`. */}
    <div className={cn(theme === 'dark' && 'dark')}>
    <div className="min-h-screen bg-muted dark:bg-background">
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
        <AdminSidebar collapsed={collapsed} />
      </div>

      {/* Main content */}
      <div className={cn('transition-[padding] duration-300', collapsed ? 'lg:pl-0' : 'lg:pl-64')}>
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-2 p-2 text-muted-foreground hover:text-foreground"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <span className="font-semibold text-primary">Tonic Life Admin</span>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <NotificationBell />
        </header>

        {/* Desktop top bar */}
        <div className="hidden lg:flex sticky top-0 z-20 h-12 items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-6">
          <button
            onClick={toggleCollapsed}
            className="-ml-2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={collapsed ? 'Mostrar menú' : 'Ocultar menú'}
            aria-label={collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}
          >
            {collapsed ? (
              <Bars3Icon className="h-5 w-5" />
            ) : (
              <ChevronDoubleLeftIcon className="h-5 w-5" />
            )}
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <NotificationBell />
          </div>
        </div>

        {/* Page content */}
        <main className="min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-3rem)]">
          {children}
        </main>
      </div>
    </div>
    </div>
    </AuthGuard>
  );
}
