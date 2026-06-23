'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BellIcon,
  EllipsisHorizontalIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { useDistributorDashboard } from '@/hooks/useDistributor';
import { startDistributorTour } from '@/lib/distributorTour';
import { RankMedal } from './RankMedal';
import { CORE_NAV } from './distributorNav';

// Anclas del tour guiado móvil (ver distributorTour.ts).
const CORE_TOUR_KEY: Record<string, string> = {
  '/distribuidor': 'm-core-inicio',
  '/distribuidor/red': 'm-core-red',
  '/distribuidor/comisiones': 'm-core-comisiones',
  '/distribuidor/ventas': 'm-core-ventas',
};

interface DistributorTopNavProps {
  onOpenMore: () => void;
}

export function DistributorTopNav({ onOpenMore }: DistributorTopNavProps) {
  const pathname = usePathname();
  const user = useAppSelector(selectUser);
  const { profile } = useDistributorDashboard();

  const isActive = (href: string) =>
    href === '/distribuidor' ? pathname === href : pathname.startsWith(href);

  // "Más" se marca activo cuando la ruta no pertenece a ninguna pestaña núcleo.
  const moreActive = !CORE_NAV.some((item) => isActive(item.href));

  const firstName = user?.firstName || profile?.firstName || 'Distribuidor';
  const rankLabel = profile?.rankLabel || 'Distribuidor';

  const tabClass = (active: boolean) =>
    cn(
      'flex flex-col items-center gap-0.5 whitespace-nowrap border-b-2 px-3 py-2 text-[11px] font-medium transition-colors',
      active ? 'border-white text-white' : 'border-transparent text-white/60 hover:text-white',
    );

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-[#3E667D] to-[#2f5165] text-white shadow-md">
      {/* App bar */}
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2.5" data-tour="m-profile">
          <RankMedal rank={profile?.rank} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Hola, {firstName}</p>
            <p className="truncate text-[11px] leading-tight text-white/70">
              {rankLabel} · ID {profile?.code || '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => startDistributorTour()}
            className="rounded-full p-2 transition-colors hover:bg-white/10"
            aria-label="Ver tutorial"
            data-tour="m-help"
          >
            <QuestionMarkCircleIcon className="h-5 w-5" />
          </button>
          <Link
            href="/distribuidor/notificaciones"
            className="rounded-full p-2 transition-colors hover:bg-white/10"
            aria-label="Notificaciones"
          >
            <BellIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>

      {/* Pestañas */}
      <nav className="flex items-stretch gap-1 overflow-x-auto px-2">
        {CORE_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={tabClass(isActive(item.href))}
            data-tour={CORE_TOUR_KEY[item.href]}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={onOpenMore}
          className={cn('h-auto', tabClass(moreActive))}
          data-tour="m-more"
        >
          <EllipsisHorizontalIcon className="h-5 w-5" />
          <span>Más</span>
        </Button>
      </nav>
    </div>
  );
}
