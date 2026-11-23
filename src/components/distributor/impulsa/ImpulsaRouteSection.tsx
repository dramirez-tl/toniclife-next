'use client';

// IMPULSA en la portada de RISE Academy: la ruta de los primeros 90 días en sus 6 Victorias. El
// Distribuidor ve en qué día va, cuál es su Victoria de hoy y entra a ella con un clic ("clic en la
// Victoria 1 y ahí está todo"). Las Victorias que aún no se liberan salen como "Próximamente".

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon, ChevronRightIcon, LockClosedIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useImpulsaOverview } from '@/hooks/useImpulsa';
import { routePercent } from '@/lib/impulsa';
import { cn } from '@/lib/utils';
import type { ImpulsaVictory } from '@/types/impulsa';

export const IMPULSA_BASE_PATH = '/distribuidor/capacitacion/impulsa';

function VictoryTile({ victory, inRoute }: { victory: ImpulsaVictory; inRoute: boolean }) {
  const t = useTranslations('distributor.impulsa');
  const available = victory.availability === 'available';
  const current = inRoute && victory.moment === 'current';
  const done = victory.moment === 'completed';
  const status = !available
    ? t('status.comingSoon')
    : current
      ? t('status.current')
      : done
        ? t('status.completed')
        : t('status.upcoming');

  const body = (
    <div
      className={cn(
        'flex h-full flex-col rounded-xl border p-4 text-left transition-shadow',
        current && 'border-primary bg-primary text-primary-foreground shadow-md',
        !current && available && 'border-border bg-card hover:shadow-md',
        !available && 'border-dashed border-border bg-muted/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('font-serif text-2xl font-bold', current ? 'text-amber-300' : 'text-primary')}>
          {victory.code}
        </span>
        {done && available ? (
          <CheckCircleIcon className="h-5 w-5 text-emerald-600" aria-hidden />
        ) : !available ? (
          <LockClosedIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      <p className={cn('mt-1 text-xs', current ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
        {t('days', { from: victory.dayFrom, to: victory.dayTo })}
      </p>
      <p className={cn('mt-1 text-sm font-semibold leading-snug', !current && 'text-foreground')}>{victory.title}</p>
      <p
        className={cn(
          'mt-auto pt-3 text-[11px] font-medium uppercase tracking-wide',
          current ? 'text-amber-200' : available ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {status}
      </p>
    </div>
  );

  if (!available) {
    return (
      <div aria-disabled className="h-full" title={status}>
        {body}
      </div>
    );
  }
  return (
    <Link
      href={`${IMPULSA_BASE_PATH}/${victory.number}`}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      aria-label={`${t('victory', { number: victory.number })}: ${victory.title}. ${status}`}
    >
      {body}
    </Link>
  );
}

export function ImpulsaRouteSection() {
  const t = useTranslations('distributor.impulsa');
  const { data, isLoading, isError, refetch } = useImpulsaOverview();

  if (isLoading) {
    return (
      <Card className="mb-8" data-testid="impulsa-route-loading">
        <CardContent className="p-6">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="mt-3 h-8 w-80" />
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  // Sin perfil de distribuidor (personal del corporativo) no hay ruta que mostrar.
  if (isError || !data) {
    return isError ? (
      <Card className="mb-8">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted-foreground">{t('loadError')}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {t('retry')}
          </Button>
        </CardContent>
      </Card>
    ) : null;
  }

  const { participant, victories, card, todayTitle, teamCount } = data;
  const current = victories.find((v) => v.number === participant.currentVictory) ?? null;
  const openNumber = current && current.availability === 'available' ? current.number : 1;

  return (
    <Card className="mb-8 overflow-hidden" data-testid="impulsa-route">
      <CardContent className="p-0">
        <div className="border-b border-border bg-gradient-to-r from-[#1f3a4a] to-[#3E667D] px-6 py-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">{t('eyebrow')}</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl font-bold sm:text-3xl">
                {participant.inRoute ? t('dayToday', { day: participant.day }) : t('routeTitle')}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-white/80">
                {participant.inRoute ? t('routeSubtitle') : t('finished')}
              </p>
            </div>
            {participant.inRoute && (
              <div className="w-full max-w-xs">
                <p className="mb-1 text-right text-xs text-white/70">{t('dayOf', { day: participant.day })}</p>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-white/20"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={90}
                  aria-valuenow={Math.min(participant.day, 90)}
                  aria-label={t('dayOf', { day: participant.day })}
                >
                  <div className="h-full rounded-full bg-amber-300" style={{ width: `${routePercent(participant.day)}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {victories.map((victory) => (
              <VictoryTile key={victory.number} victory={victory} inRoute={participant.inRoute} />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="min-w-0">
              {todayTitle ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('todayAction')}</p>
                  <p className="text-base font-semibold text-foreground">{todayTitle}</p>
                </>
              ) : (
                <p className="text-base font-semibold text-foreground">{t('routeTitle')}</p>
              )}
              {card && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t('cardProgress', { done: card.checksDone, total: card.checksTotal })}
                </p>
              )}
              {!data.ready && <p className="mt-0.5 text-xs text-amber-700">{t('notReady')}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline">
                <Link href={`${IMPULSA_BASE_PATH}/equipo`}>
                  <UserGroupIcon className="h-4 w-4" />
                  {teamCount > 0 ? t('teamCount', { count: teamCount }) : t('teamCta')}
                </Link>
              </Button>
              <Button asChild>
                <Link href={`${IMPULSA_BASE_PATH}/${openNumber}`}>
                  {participant.inRoute && current?.availability === 'available'
                    ? t('open', { number: openNumber })
                    : t('seeVictory', { number: openNumber })}
                  <ChevronRightIcon className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
