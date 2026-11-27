'use client';

// IMPULSA · una Victoria. "El Distribuidor da clic en la Victoria 1 y ahí está todo": su semana paso
// a paso, el mensaje y el microvideo de cada día, sus guías, su Tarjeta de Ruta y quién lo acompaña.
// Lo mismo en cada Victoria; las que aún no se liberan dicen "Próximamente".

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  DocumentTextIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImpulsaDayItem } from '@/components/distributor/impulsa/ImpulsaDayItem';
import { ImpulsaHeader } from '@/components/distributor/impulsa/ImpulsaHeader';
import { ImpulsaRouteCard } from '@/components/distributor/impulsa/ImpulsaRouteCard';
import { useImpulsaVictory } from '@/hooks/useImpulsa';
import { IMPULSA_PATH, formatPhone, telUrl, whatsappUrl } from '@/lib/impulsa';
import { materialsService } from '@/services/materials.service';
import { cn } from '@/lib/utils';
import type { ImpulsaVictoryDetail } from '@/types/impulsa';

// El reproductor de un curso completo es el mismo de la plataforma; ahí un curso de IMPULSA se
// presenta como de IMPULSA y regresa a su Victoria.
const COURSE_PLAYER_PATH = '/distribuidor/capacitacion';

function SponsorBox({ detail }: { detail: ImpulsaVictoryDetail }) {
  const t = useTranslations('distributor.impulsa.victoryPage');
  const { sponsor, callCenter, helpText } = detail;
  const call = sponsor ? telUrl(sponsor.phone) : null;
  const whatsapp = sponsor ? whatsappUrl(sponsor.phone, sponsor.phoneCountryCode, '') : null;
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {sponsor?.isUpline ? t('uplineTitle') : t('sponsorTitle')}
          </h2>
          {sponsor ? (
            <>
              <p className="mt-1 text-lg font-bold text-foreground">{sponsor.name}</p>
              {sponsor.customerNumber && (
                <p className="text-xs text-muted-foreground">{t('sponsorId', { number: sponsor.customerNumber })}</p>
              )}
              {sponsor.isUpline && <p className="mt-1 text-xs text-muted-foreground">{t('uplineNote')}</p>}
              {!sponsor.isActive && <p className="mt-1 text-xs text-amber-700">{t('sponsorInactive')}</p>}
              {sponsor.phone && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">{formatPhone(sponsor.phone)}</span>
                  {call && (
                    <Button asChild variant="outline" size="sm">
                      <a href={call}>
                        <PhoneIcon className="h-4 w-4" />
                        {t('call')}
                      </a>
                    </Button>
                  )}
                  {whatsapp && (
                    <Button asChild variant="outline" size="sm">
                      <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                        {t('whatsapp')}
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">{t('noSponsor')}</p>
          )}
        </div>
        <div className="rounded-lg bg-impulsa-blue p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-impulsa-yellow">{t('helpTitle')}</p>
          <p className="mt-1 text-sm text-white">{helpText}</p>
          <p className="mt-2 text-sm">
            <span className="text-white/80">{t('callCenter')} </span>
            <span className="font-semibold">{callCenter.phones.join(' · ')}</span>
            <span className="text-white/80"> · WhatsApp </span>
            <span className="font-semibold">{callCenter.whatsapp}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function GuidesBox({ detail }: { detail: ImpulsaVictoryDetail }) {
  const t = useTranslations('distributor.impulsa.victoryPage');
  const [downloading, setDownloading] = useState<string | null>(null);
  const download = async (id: string) => {
    try {
      setDownloading(id);
      const { url } = await materialsService.getDownloadUrl(id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error(t('downloadError'));
    } finally {
      setDownloading(null);
    }
  };
  const published = new Set(detail.guides.map((g) => g.title.trim().toLowerCase()));
  const pending = detail.expectedGuides.filter((name) => !published.has(name.trim().toLowerCase()));
  return (
    <Card id="guias" className="scroll-mt-24">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('guidesTitle')}</h2>
        {detail.guides.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('guidesEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {detail.guides.map((guide) => (
              <li key={guide.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <span className="flex min-w-0 items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{guide.title}</span>
                    {guide.description && (
                      <span className="block truncate text-xs text-muted-foreground">{guide.description}</span>
                    )}
                  </span>
                </span>
                <Button type="button" variant="outline" size="sm" disabled={downloading === guide.id} onClick={() => void download(guide.id)}>
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {t('download')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {pending.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">{t('pendingGuides', { list: pending.join(' · ') })}</p>
        )}
      </CardContent>
    </Card>
  );
}

function VictorySkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-3 h-10 w-96 max-w-full" />
        </div>
        <div className="h-1.5 bg-gradient-to-r from-impulsa-yellow to-impulsa-orange" aria-hidden />
      </div>
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function ImpulsaVictoryPage() {
  const params = useParams<{ victoria: string }>();
  const number = Number(params?.victoria);
  const t = useTranslations('distributor.impulsa');
  const tv = useTranslations('distributor.impulsa.victoryPage');
  const { data, isLoading, isError, refetch } = useImpulsaVictory(number);
  // null = la persona aún no toca nada: se abre el día de hoy (o el primero si su semana ya pasó o
  // todavía no empieza). -1 = cerró el que estaba abierto.
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const defaultDay = data?.days.find((d) => d.moment === 'today')?.day ?? data?.days[0]?.day ?? null;
  const openDay = pickedDay ?? defaultDay;

  const validNumber = Number.isInteger(number) && number >= 1 && number <= 6;
  if (validNumber && isLoading) return <VictorySkeleton />;
  if (!validNumber || isError || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-base text-muted-foreground">{validNumber ? t('loadError') : tv('notFound')}</p>
        <div className="mt-4 flex justify-center gap-2">
          {validNumber && (
            <Button variant="outline" onClick={() => void refetch()}>
              {t('retry')}
            </Button>
          )}
          <Button asChild>
            <Link href={IMPULSA_PATH}>{t('back')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { victory, participant, stages, days } = data;
  const available = victory.availability === 'available';
  const openGuides = () => document.getElementById('guias')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-gray-50">
      <ImpulsaHeader
        backHref={IMPULSA_PATH}
        backLabel={t('back')}
        eyebrow={`${t('victory', { number: victory.number })} · ${t('days', { from: victory.dayFrom, to: victory.dayTo })}`}
        title={victory.title}
        subtitle={victory.tagline || undefined}
      >
        {participant.inRoute && (
          <span className="inline-flex items-center gap-2 rounded-full bg-impulsa-yellow px-4 py-2 text-sm font-bold text-foreground">
            <ClockIcon className="h-4 w-4" aria-hidden />
            {tv('today', { day: participant.day })}
          </span>
        )}
      </ImpulsaHeader>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {!available && (
          <Card>
            <CardContent className="p-8 text-center">
              <AcademicCapIcon className="mx-auto h-12 w-12 text-primary/40" aria-hidden />
              <h2 className="mt-3 text-xl font-bold text-foreground">{tv('comingSoonTitle')}</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{tv('comingSoonBody')}</p>
            </CardContent>
          </Card>
        )}

        {stages.length > 0 && (
          <section aria-label={tv('stagesTitle')}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tv('stagesTitle')}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {stages.map((stage) => (
                <div
                  key={stage.key}
                  className={cn(
                    'rounded-xl border-t-4 bg-card p-4 shadow-sm',
                    // Como los puntos del logo: lo recorrido en amarillo, hoy en azul, lo que viene en gris.
                    stage.moment === 'today'
                      ? 'border-impulsa-blue'
                      : stage.moment === 'past'
                        ? 'border-impulsa-yellow'
                        : 'border-gray-200',
                  )}
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-impulsa-blue">{stage.label}</p>
                  <p className="mt-1 text-lg font-bold text-foreground">{stage.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{tv('stageYou')}: </span>
                    {stage.distributor}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{tv('stageSponsor')}: </span>
                    {stage.sponsor}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-6">
            {days.length > 0 && (
              <section aria-label={tv('daysTitle')}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tv('daysTitle')}</h2>
                <div className="space-y-2">
                  {days.map((day) => (
                    <ImpulsaDayItem
                      key={day.code}
                      day={day}
                      open={openDay === day.day}
                      onToggle={() => setPickedDay(openDay === day.day ? -1 : day.day)}
                      onOpenGuides={openGuides}
                    />
                  ))}
                </div>
              </section>
            )}

            {data.card ? (
              <ImpulsaRouteCard victoryNumber={victory.number} card={data.card} ready={data.ready} />
            ) : (
              available &&
              !data.ready && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                  {t('card.notReady')}
                </p>
              )
            )}

            {data.principle && (
              <p className="rounded-xl border-l-4 border-impulsa-orange bg-card p-4 text-sm text-muted-foreground shadow-sm">
                {data.principle}
              </p>
            )}
          </div>

          <aside className="space-y-6">
            <SponsorBox detail={data} />
            <GuidesBox detail={data} />
            {data.courses.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tv('coursesTitle')}</h2>
                  <ul className="mt-3 space-y-2">
                    {data.courses.map((course) => (
                      <li key={course.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">{course.title}</span>
                          <span className="block text-xs text-muted-foreground">{tv('lessons', { count: course.lessonsCount })}</span>
                        </span>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`${COURSE_PLAYER_PATH}/${course.id}`}>{tv('openCourse')}</Link>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {data.always.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{tv('alwaysTitle')}</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
                    {data.always.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
