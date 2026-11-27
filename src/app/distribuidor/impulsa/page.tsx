'use client';

// IMPULSA · portada. La ruta de los primeros 90 días del nuevo Distribuidor, en 6 Victorias. Es una
// sección aparte del panel (su entrada en el menú, sus rutas y su marca), separada de RISE Academy:
// aquí la persona ve en qué día va y su paso de hoy, y entra a su Victoria.

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImpulsaHeader } from '@/components/distributor/impulsa/ImpulsaHeader';
import { ImpulsaRouteSection } from '@/components/distributor/impulsa/ImpulsaRouteSection';
import { ImpulsaSteps } from '@/components/distributor/impulsa/ImpulsaSteps';
import { useImpulsaOverview } from '@/hooks/useImpulsa';
import { routePercent } from '@/lib/impulsa';

export default function ImpulsaHomePage() {
  const t = useTranslations('distributor.impulsa');
  const { data, isLoading, isError, refetch } = useImpulsaOverview();
  const participant = data?.participant ?? null;
  const inRoute = participant?.inRoute === true;

  return (
    <div className="min-h-screen bg-gray-50">
      <ImpulsaHeader
        size="lg"
        backHref="/distribuidor"
        backLabel={t('backToPanel')}
        eyebrow={t('eyebrow')}
        title={participant && inRoute ? t('dayToday', { day: participant.day }) : t('routeTitle')}
        subtitle={participant && !inRoute ? t('finished') : t('routeSubtitle')}
      >
        {participant ? (
          <div className="w-full sm:w-60">
            {/* Recorridos los 90 días se encienden los 6 puntos (sin aro de "hoy"). */}
            <ImpulsaSteps current={inRoute ? participant.currentVictory : null} className={inRoute ? 'mb-3' : undefined} />
            {inRoute && (
              <>
                <p className="mb-1 text-sm font-semibold text-impulsa-blue">{t('dayOf', { day: participant.day })}</p>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-impulsa-blue/15"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={90}
                  aria-valuenow={Math.min(participant.day, 90)}
                  aria-label={t('dayOf', { day: participant.day })}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-impulsa-yellow to-impulsa-orange"
                    style={{ width: `${routePercent(participant.day)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        ) : null}
      </ImpulsaHeader>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div data-testid="impulsa-route-loading">
            <Skeleton className="h-24 rounded-xl" />
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          </div>
        ) : isError || !data ? (
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <p className="text-sm text-muted-foreground">{t('loadError')}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                {t('retry')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ImpulsaRouteSection data={data} />
        )}
      </div>
    </div>
  );
}
