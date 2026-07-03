'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  XMarkIcon,
  ShoppingCartIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutAsync, selectUser } from '@/store/slices/authSlice';
import { toast } from 'sonner';
import { useDistributorDashboard } from '@/hooks/useDistributor';
import { MORE_GROUPS, COMING_SOON } from './distributorNav';
import { DistributorLanguageToggle } from './DistributorLanguageToggle';

// Convierte código de país ISO a emoji de bandera (ej: "MX" → 🇲🇽)
const countryCodeToFlag = (code: string): string =>
  code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join('');

interface DistributorMoreMenuProps {
  onNavigate?: () => void;
}

export function DistributorMoreMenu({ onNavigate }: DistributorMoreMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const t = useTranslations('distributor');

  const user = useAppSelector(selectUser);
  const { networkSummary, profile, points } = useDistributorDashboard();

  // Progreso hacia el mínimo personal para calificar (3,300 pts por defecto).
  const qualifyProgress = Math.min(
    100,
    points?.personalPointsRequired
      ? Math.round(((points.personalPoints || 0) / points.personalPointsRequired) * 100)
      : 0,
  );

  const initials = (() => {
    const f = user?.firstName?.[0] || '';
    const l = user?.lastName?.[0] || '';
    return (f + l).toUpperCase() || 'DI';
  })();
  const displayName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || t('sidebar.distributor')
    : t('sidebar.distributor');

  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      toast.success(t('footer.loggedOut'));
      router.push('/login');
    } catch {
      toast.error(t('footer.logoutError'));
    }
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
        <h2 className="font-bold text-[#3E667D]">{t('moremenu.title')}</h2>
        <button
          onClick={onNavigate}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={t('moremenu.close')}
        >
          <XMarkIcon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Grupos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Identidad + stats rápidas (paridad con el sidebar de escritorio) */}
        <div className="rounded-xl bg-gradient-to-br from-[#3E667D] to-[#0A4B94] p-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
              <span className="text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {displayName}
                {user?.countryCode && (
                  <span className="ml-1">{countryCodeToFlag(user.countryCode)}</span>
                )}
              </p>
              <p className="mt-0.5 text-xs font-medium text-yellow-300">
                {profile?.rankLabel || t('sidebar.distributor')}
              </p>
            </div>
          </div>

          {/* Número de distribuidor (clic para copiar) */}
          {profile?.code && (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(String(profile.code));
                toast.success(t('sidebar.copied'));
              }}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2 py-1.5 transition-colors hover:bg-white/15"
              title={t('sidebar.copyTitle')}
            >
              <span className="text-[10px] uppercase tracking-wide text-white/60">
                {t('sidebar.distributor')}
              </span>
              <span className="text-xs font-bold">#{profile.code}</span>
              <ClipboardDocumentIcon className="h-3.5 w-3.5 text-white/60" />
            </button>
          )}

          {/* Desglose de red */}
          <div className="mt-3 rounded-lg bg-white/10 p-2">
            <p className="mb-1.5 text-center text-[10px] uppercase tracking-wide text-white/60">
              {t('sidebar.myNetwork')}
            </p>
            <div className="grid grid-cols-3 gap-1">
              <div className="text-center">
                <p className="text-sm font-bold">
                  {(networkSummary?.totalNetwork || 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-white/60">{t('sidebar.total')}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-emerald-300">
                  {(networkSummary?.totalDistributors || 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-white/60">{t('sidebar.active')}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-white/50">
                  {(networkSummary?.inactiveDistributors || 0).toLocaleString()}
                </p>
                <p className="text-[9px] text-white/60">{t('sidebar.inactive')}</p>
              </div>
            </div>
          </div>

          {/* Puntos para calificar (mínimo personal del periodo) */}
          <div className="mt-2 rounded-lg bg-white/10 p-2">
            <p className="mb-1 text-center text-[10px] uppercase tracking-wide text-white/60">
              {points?.isPersonalQualified ? t('sidebar.qualified') : t('sidebar.pointsToQualify')}
            </p>
            <p className="text-center text-sm font-bold">
              {(points?.personalPoints || 0).toLocaleString()}{' '}
              <span className="font-normal text-white/50">
                / {(points?.personalPointsRequired || 3300).toLocaleString()}
              </span>
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
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

        {MORE_GROUPS.map((group) => (
          <div key={group.key}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {t(`groups.${group.key}`)}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-[#3E667D] text-white'
                          : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{t(`nav.${item.key}`)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Próximamente */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            {t('groups.comingSoon')}
          </p>
          <ul className="space-y-1">
            {COMING_SOON.map((item) => (
              <li key={item.key}>
                <div
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed select-none"
                  title={t('groups.soon')}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span>{t(`comingSoonItems.${item.key}`)}</span>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                    {t('moremenu.soon')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Acciones */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        {/* Selector de idioma ES/EN (visible; persiste en la cuenta) */}
        <DistributorLanguageToggle tone="light" className="mb-1" />
        <Link
          href="/productos"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ShoppingCartIcon className="h-5 w-5" />
          <span>{t('footer.goToStore')}</span>
        </Link>
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5" />
          <span>{t('footer.backToSite')}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          <span>{t('footer.logout')}</span>
        </button>
      </div>
    </div>
  );
}
