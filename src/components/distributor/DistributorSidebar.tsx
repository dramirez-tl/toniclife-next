'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  HomeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  TrophyIcon,
  ShoppingCartIcon,
  AcademicCapIcon,
  Cog6ToothIcon,
  BellIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
  FolderIcon,
  PhoneIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  SparklesIcon,
  RocketLaunchIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutAsync, selectUser } from '@/store/slices/authSlice';
import { toast } from 'sonner';
import { useDistributorDashboard } from '@/hooks/useDistributor';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: { name: string; href: string }[];
}

// Convierte código de país ISO a emoji de bandera (ej: "MX" → 🇲🇽)
const countryCodeToFlag = (code: string): string =>
  code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');

interface DistributorSidebarProps {
  onNavigate?: () => void;
}

const navigation: NavItem[] = [
  { name: 'Panel Principal', href: '/distribuidor', icon: HomeIcon },
  { name: 'Mi Red', href: '/distribuidor/red', icon: UsersIcon },
  { name: 'Comisiones', href: '/distribuidor/comisiones', icon: CurrencyDollarIcon },
  { name: 'Ventas', href: '/distribuidor/ventas', icon: ShoppingCartIcon },
  {
    name: 'Mi Negocio',
    href: '/distribuidor/negocio',
    icon: ChartBarIcon,
    children: [
      { name: 'Reportes', href: '/distribuidor/reportes' },
      { name: 'Metas', href: '/distribuidor/metas' },
      { name: 'Ranking', href: '/distribuidor/ranking' },
      { name: 'Actividad', href: '/distribuidor/actividad' },
    ],
  },
  { name: 'Programa Arranque', href: '/distribuidor/programa-arranque', icon: RocketLaunchIcon },
  { name: 'Prospectos', href: '/distribuidor/prospectos', icon: UserGroupIcon },
  { name: 'Clientes', href: '/distribuidor/clientes', icon: ClipboardDocumentListIcon },
  {
    name: 'Herramientas',
    href: '/distribuidor/herramientas',
    icon: FolderIcon,
    children: [
      { name: 'Materiales', href: '/distribuidor/materiales' },
      { name: 'Scripts de Venta', href: '/distribuidor/scripts' },
      { name: 'Capacitación', href: '/distribuidor/capacitacion' },
    ],
  },
  { name: 'Eventos', href: '/distribuidor/eventos', icon: CalendarIcon },
  { name: 'Pagos', href: '/distribuidor/pagos', icon: DocumentTextIcon },
  { name: 'Comunicación', href: '/distribuidor/comunicacion', icon: ChatBubbleLeftRightIcon },
  { name: 'Soporte', href: '/distribuidor/soporte', icon: PhoneIcon },
];

const bottomNavigation: NavItem[] = [
  { name: 'Notificaciones', href: '/distribuidor/notificaciones', icon: BellIcon },
  { name: 'Configuración', href: '/distribuidor/configuracion', icon: Cog6ToothIcon },
];

// Módulos temporalmente deshabilitados mientras se confirman ajustes
const disabledModules = new Set([
  'Mi Negocio',
  'Prospectos',
  'Clientes',
  'Herramientas',
  'Eventos',
  'Pagos',
  'Comunicación',
  'Soporte',
]);

export function DistributorSidebar({ onNavigate }: DistributorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Obtener datos del dashboard para las estadísticas del sidebar
  const { networkSummary, commissionsSummary, profile } = useDistributorDashboard();

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      toast.success('Sesión cerrada correctamente');
      router.push('/login');
    } catch {
      toast.error('Error al cerrar sesión');
    }
  };

  const getUserInitials = () => {
    if (!user) return 'DI';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'DI';
  };

  const getUserDisplayName = () => {
    if (!user) return 'Distribuidor';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Distribuidor';
  };

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    if (href === '/distribuidor') {
      return pathname === '/distribuidor';
    }
    return pathname.startsWith(href);
  };

  const isChildActive = (children?: { name: string; href: string }[]) => {
    if (!children) return false;
    return children.some((child) => pathname === child.href || pathname.startsWith(child.href + '/'));
  };

  const renderNavItem = (item: NavItem) => {
    const isDisabled = disabledModules.has(item.name);
    const active = isActive(item.href);
    const childActive = isChildActive(item.children);
    const isExpanded = expandedItems.includes(item.name) || childActive;

    // Disabled items: non-clickable, grayed out
    if (isDisabled) {
      return (
        <div
          key={item.name}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/25 cursor-not-allowed select-none"
          title="Disponible pronto"
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span>{item.name}</span>
        </div>
      );
    }

    if (item.children) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpand(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active || childActive
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </div>
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronRightIcon className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <ul className="mt-1 ml-8 space-y-1">
              {item.children.map((child) => {
                const childIsActive = pathname === child.href;
                return (
                  <li key={child.name}>
                    <Link
                      href={child.href}
                      onClick={onNavigate}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        childIsActive
                          ? 'bg-[#3E667D] text-white font-medium'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {child.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active
            ? 'bg-[#3E667D] text-white'
            : 'text-white/70 hover:bg-white/5 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span>{item.name}</span>
        </div>
        {item.badge && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-[#3E667D] to-[#002a5c] text-white flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-white/10 px-4">
        <Link
          href="/distribuidor"
          className="flex items-center"
          aria-label="Ir al panel de distribuidor"
          onClick={onNavigate}
        >
          <Image
            src="/images/logo/logo-text-light.png"
            alt="Tonic Life"
            width={280}
            height={90}
            className="h-20 w-auto"
            onError={(e) => {
              // Fallback si no existe el logo blanco
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </Link>
      </div>

      {/* User Card */}
      <div className="px-3 py-4 border-b border-white/10">
        <div className="bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#C8DDF2] to-[#5a9420] rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold">{getUserInitials()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {user?.countryCode && <span className="mr-1">{countryCodeToFlag(user.countryCode)}</span>}
                {getUserDisplayName()}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <TrophyIcon className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-xs text-yellow-400 font-medium">
                  {profile?.rankLabel || 'Distribuidor'}
                </span>
              </div>
            </div>
          </div>
          {/* Quick Stats */}
          <div className="space-y-2 mt-3">
            {/* Network breakdown */}
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-[10px] text-white/60 uppercase tracking-wide text-center mb-1.5">Mi Red</p>
              <div className="grid grid-cols-3 gap-1">
                <div className="text-center">
                  <p className="text-sm font-bold text-white">
                    {(networkSummary?.totalNetwork || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-white/50">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-emerald-400">
                    {(networkSummary?.totalDistributors || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-white/50">Activos</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white/40">
                    {(networkSummary?.inactiveDistributors || 0).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-white/50">Inactivos</p>
                </div>
              </div>
            </div>
            {/* Commissions */}
            <div className="bg-white/5 rounded-lg p-2 text-center">
              {(commissionsSummary?.totalNet || 0) === 0 ? (
                <>
                  <p className="text-sm font-semibold text-white/70">Periodo activo</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wide">Comisiones al cierre</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-white">
                    ${(commissionsSummary?.totalNet || 0).toLocaleString(user?.currencyCode === 'USD' ? 'en-US' : 'es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-[10px] text-white/60 uppercase tracking-wide">Comisiones</p>
                    {user?.currencyCode && (
                      <span className="text-[9px] bg-white/10 text-white/70 px-1 py-0.5 rounded font-medium">
                        {user.currencyCode}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>{renderNavItem(item)}</li>
          ))}
        </ul>

        {/* Aviso de módulos en ajuste */}
        <div className="mt-3 mx-1 p-3 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-start gap-2">
            <WrenchScrewdriverIcon className="h-4 w-4 text-amber-400/80 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/50 leading-relaxed">
              Algunos módulos se habilitarán en breve. Estamos confirmando unos ajustes para ti.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-white/10" />

        {/* Bottom navigation */}
        <ul className="space-y-1">
          {bottomNavigation.map((item) => (
            <li key={item.name}>{renderNavItem(item)}</li>
          ))}
        </ul>
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-white/10 p-3">
        <div className="space-y-1">
          <Link
            href="/productos"
            onClick={onNavigate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            <span>Ir a la Tienda</span>
          </Link>
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span>Volver al sitio</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
