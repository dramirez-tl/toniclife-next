'use client';

// La ruta de IMPULSA en su portada: las 6 Victorias de los primeros 90 días y el paso de hoy. El
// Distribuidor ve cuál es su Victoria de hoy y entra a ella con un clic ("clic en la Victoria 1 y
// ahí está todo"). Las Victorias que aún no se liberan salen como "Próximamente".

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CheckCircleIcon, ChevronRightIcon, LockClosedIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { IMPULSA_TEAM_PATH, victoryPath } from '@/lib/impulsa';
import { cn } from '@/lib/utils';
import type { ImpulsaOverview, ImpulsaVictory } from '@/types/impulsa';

function VictoryTile({ victory, inRoute }: { victory: ImpulsaVictory; inRoute: boolean }) {
  const t = useTranslations('distributor.impulsa');
  const available = victory.availability === 'available';
  const current = inRoute && victory.moment === 'current';
  // La de hoy se pinta llena en azul solo si ya se puede abrir. Si es la de hoy pero aún no se
  // libera (hoy, de la V2 en adelante) va como "Próximamente", con el borde azul para ubicarla:
  // el relleno azul con el fondo gris de "Próximamente" dejaba el texto blanco sobre gris.
  const highlighted = current && available;
  const done = victory.moment === 'completed';
  const status = !available
    ? current
      ? `${t('status.current')} · ${t('status.comingSoon')}`
      : t('status.comingSoon')
    : current
      ? t('status.current')
      : done
        ? t('status.completed')
        : t('status.upcoming');

  const body = (
    <div
      className={cn(
        'flex h-full flex-col rounded-xl border p-4 text-left transition-shadow',
        highlighted && 'border-impulsa-blue bg-impulsa-blue text-white shadow-md',
        !highlighted && available && 'border-border bg-card hover:border-impulsa-blue/40 hover:shadow-md',
        !available && 'border-dashed bg-muted/40',
        !available && (current ? 'border-impulsa-blue' : 'border-border'),
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-2xl font-bold', highlighted ? 'text-impulsa-yellow' : 'text-impulsa-blue')}>
          {victory.code}
        </span>
        {done && available ? (
          <CheckCircleIcon className="h-5 w-5 text-emerald-600" aria-hidden />
        ) : !available ? (
          <LockClosedIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      <p className={cn('mt-1 text-xs', highlighted ? 'text-white/80' : 'text-muted-foreground')}>
        {t('days', { from: victory.dayFrom, to: victory.dayTo })}
      </p>
      <p className={cn('mt-1 text-sm font-semibold leading-snug', !highlighted && 'text-foreground')}>{victory.title}</p>
      <p
        className={cn(
          'mt-auto pt-3 text-[11px] font-semibold uppercase tracking-wide',
          highlighted ? 'text-white' : available || current ? 'text-impulsa-blue' : 'text-muted-foreground',
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
      href={victoryPath(victory.number)}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      aria-label={`${t('victory', { number: victory.number })}: ${victory.title}. ${status}`}
    >
      {body}
    </Link>
  );
}

export function ImpulsaRouteSection({ data }: { data: ImpulsaOverview }) {
  const t = useTranslations('distributor.impulsa');
  const { participant, victories, card, todayTitle, teamCount } = data;
  const current = victories.find((v) => v.number === participant.currentVictory) ?? null;
  const openNumber = current && current.availability === 'available' ? current.number : 1;

  return (
    <div data-testid="impulsa-route">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-impulsa-yellow bg-impulsa-yellow/15 p-4 sm:p-5">
        <div className="min-w-0">
          {todayTitle ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-impulsa-blue">{t('todayAction')}</p>
              <p className="text-lg font-bold text-foreground">{todayTitle}</p>
            </>
          ) : (
            <p className="text-lg font-bold text-foreground">{t('routeTitle')}</p>
          )}
          {card && (
            <p className="mt-0.5 text-sm text-foreground/80">
              {t('cardProgress', { done: card.checksDone, total: card.checksTotal })}
            </p>
          )}
          {!data.ready && <p className="mt-0.5 text-xs text-foreground/80">{t('notReady')}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="bg-white">
            <Link href={IMPULSA_TEAM_PATH}>
              <UserGroupIcon className="h-4 w-4" />
              {teamCount > 0 ? t('teamCount', { count: teamCount }) : t('teamCta')}
            </Link>
          </Button>
          <Button asChild>
            <Link href={victoryPath(openNumber)}>
              {participant.inRoute && current?.availability === 'available'
                ? t('open', { number: openNumber })
                : t('seeVictory', { number: openNumber })}
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('victoriesTitle')}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {victories.map((victory) => (
          <VictoryTile key={victory.number} victory={victory} inRoute={participant.inRoute} />
        ))}
      </div>
    </div>
  );
}
