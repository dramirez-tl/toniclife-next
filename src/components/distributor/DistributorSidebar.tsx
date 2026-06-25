'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingCartIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutAsync, selectUser } from '@/store/slices/authSlice';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDistributorDashboard } from '@/hooks/useDistributor';
import { startDistributorTour } from '@/lib/distributorTour';
import { CORE_NAV, MORE_GROUPS, COMING_SOON } from './distributorNav';

// Anclas del tour guiado (ver distributorTour.ts).
const CORE_TOUR_KEY: Record<string, string> = {
  '/distribuidor': 'd-core-inicio',
  '/distribuidor/red': 'd-core-red',
  '/distribuidor/comisiones': 'd-core-comisiones',
  '/distribuidor/ventas': 'd-core-ventas',
};
const ITEM_TOUR_KEY: Record<string, string> = {
  '/distribuidor/compartir-carrito': 'd-carrito',
};
const GROUP_TOUR_KEY: Record<string, string> = {
  Herramientas: 'd-herramientas',
  'Mi cuenta': 'd-cuenta',
};

// Convierte código de país ISO a emoji de bandera (ej: "MX" → 🇲🇽)
const countryCodeToFlag = (code: string): string =>
  code.toUpperCase().split('').map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('');

interface DistributorSidebarProps {
  onNavigate?: () => void;
}

export function DistributorSidebar({ onNavigate }: DistributorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  const { networkSummary, profile, points } = useDistributorDashboard();

  // Progreso hacia el mínimo personal para calificar (3,300 pts por defecto).
  const qualifyProgress = Math.min(
    100,
    points?.personalPointsRequired
      ? Math.round(((points.personalPoints || 0) / points.personalPointsRequired) * 100)
      : 0,
  );

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

  const isCoreActive = (href: string) =>
    href === '/distribuidor' ? pathname === href : pathname.startsWith(href);

  const isMoreActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const linkClass = (active: boolean) =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      active ? 'bg-[#3E667D] text-white' : 'text-white/70 hover:bg-white/5 hover:text-white',
    );

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo/svg/logo-text-dark-r.svg"
            alt="Tonic Life"
            className="w-[140px] h-auto"
          />
        </Link>
      </div>

      {/* User Card */}
      <div className="px-3 py-4 border-b border-white/10">
        <div className="bg-white/5 rounded-xl p-3" data-tour="d-profile">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">{getUserInitials()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {getUserDisplayName()}
                {user?.countryCode && <span className="ml-1">{countryCodeToFlag(user.countryCode)}</span>}
              </p>
              <p className="text-xs text-yellow-400 font-medium mt-0.5">
                {profile?.rankLabel || 'Distribuidor'}
              </p>
            </div>
          </div>
          {/* Número de distribuidor (clic para copiar) */}
          {user?.customerNumber && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(String(user.customerNumber));
                toast.success('Número de distribuidor copiado');
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 transition-colors hover:bg-white/10"
              title="Copiar número de distribuidor"
            >
              <span className="text-[10px] uppercase tracking-wide text-white/50">Distribuidor</span>
              <span className="text-xs font-bold text-white">#{user.customerNumber}</span>
              <ClipboardDocumentIcon className="h-3.5 w-3.5 text-white/50" />
            </button>
          )}
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
            {/* Puntos para calificar (mínimo personal del periodo) */}
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-[10px] text-white/60 uppercase tracking-wide text-center mb-1">
                {points?.isPersonalQualified ? 'Calificado este periodo' : 'Puntos para calificar'}
              </p>
              <p className="text-center text-sm font-bold text-white">
                {(points?.personalPoints || 0).toLocaleString()}{' '}
                <span className="font-normal text-white/50">
                  / {(points?.personalPointsRequired || 3300).toLocaleString()}
                </span>
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    points?.isPersonalQualified ? 'bg-emerald-400' : 'bg-yellow-400',
                  )}
                  style={{ width: `${qualifyProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {/* Núcleo */}
        <ul className="space-y-1">
          {CORE_NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={linkClass(isCoreActive(item.href))}
                data-tour={CORE_TOUR_KEY[item.href]}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Grupos secundarios */}
        {MORE_GROUPS.map((group) => (
          <div key={group.title} className="mt-5" data-tour={GROUP_TOUR_KEY[group.title]}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={linkClass(isMoreActive(item.href))}
                    data-tour={ITEM_TOUR_KEY[item.href]}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Próximamente */}
        <div className="mt-5">
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
            Próximamente
          </p>
          <ul className="space-y-1">
            {COMING_SOON.map((item) => (
              <li key={item.name}>
                <div
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/25 cursor-not-allowed select-none"
                  title="Disponible pronto"
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="border-t border-white/10 p-3">
        <div className="space-y-1">
          <Link
            href="/productos"
            onClick={onNavigate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            data-tour="d-tienda"
          >
            <ShoppingCartIcon className="h-5 w-5" />
            <span>Ir a la Tienda</span>
          </Link>
          <button
            type="button"
            onClick={() => startDistributorTour()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            data-tour="d-help"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
            <span>Ver tutorial</span>
          </button>
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
