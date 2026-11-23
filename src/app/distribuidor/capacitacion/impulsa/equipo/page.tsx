'use client';

// IMPULSA · Mi equipo: los nuevos distribuidores que acompaño en sus primeros 90 días. Para cada uno,
// en qué día va, cuánto lleva de su Tarjeta de Ruta, el aviso de hoy con su acción sugerida y el
// mensaje que le puedo mandar (opcional). El mensaje sale de MI WhatsApp con un clic: no es un envío
// del sistema. Si su Patrocinador no está activo, lo acompaña su línea ascendente.

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowLeftIcon, CheckCircleIcon, ClipboardDocumentIcon, PhoneIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useImpulsaTeam } from '@/hooks/useImpulsa';
import { daysAgoLabel, formatPhone, telUrl, whatsappUrl } from '@/lib/impulsa';
import type { ImpulsaTeamMember } from '@/types/impulsa';

const RISE_ACADEMY_PATH = '/distribuidor/capacitacion';

function MemberCard({ member, today }: { member: ImpulsaTeamMember; today: string }) {
  const t = useTranslations('distributor.impulsa.teamPage');
  const [message, setMessage] = useState(member.notice?.suggestedMessage ?? '');
  const whatsapp = whatsappUrl(member.phone, member.phoneCountryCode, message);
  const call = telUrl(member.phone);
  const card = member.card;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyError'));
    }
  };

  return (
    <Card data-testid="impulsa-team-member">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-foreground">{member.name}</p>
            <p className="text-xs text-muted-foreground">
              #{member.customerNumber}
              {member.phone ? ` · ${formatPhone(member.phone)}` : ` · ${t('noPhone')}`}
            </p>
            {member.viaUpline && <p className="mt-1 text-xs font-medium text-amber-700">{t('viaUpline')}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-primary-foreground">
              {t('day', { day: member.day })}
            </span>
            {member.victory && (
              <span className="rounded-full border border-primary/30 px-3 py-1 text-sm font-semibold text-primary">
                {member.victory.code}
              </span>
            )}
          </div>
        </div>

        {card && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{t('card', { done: card.checksDone, total: card.checksTotal })}</span>
              <span className={card.sessionDone ? 'flex items-center gap-1 font-semibold text-emerald-700' : ''}>
                {card.sessionDone ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4" aria-hidden />
                    {t('sessionDone')}
                  </>
                ) : (
                  t('session', { done: card.sessionChecks, total: card.sessionTotal })
                )}
              </span>
            </div>
            <div
              className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={card.percent}
              aria-label={t('card', { done: card.checksDone, total: card.checksTotal })}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${card.percent}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {member.lastActivityAt
                ? t('lastActivity', { when: daysAgoLabel(member.lastActivityAt, today) })
                : t('noActivity')}
            </p>
          </div>
        )}

        {member.notice ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t('noticeTitle')}</p>
              <p className="mt-1 text-sm font-semibold text-[#1f3a4a]">{member.notice.action}</p>
              <p className="mt-1 text-sm text-[#1f3a4a]/90">{member.notice.notice}</p>
            </div>
            <div>
              <label htmlFor={`msg-${member.customerNumber}`} className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                {t('suggestedTitle')}
              </label>
              <Textarea
                id={`msg-${member.customerNumber}`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="mt-1 bg-white"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('suggestedHint')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {whatsapp && (
                <Button asChild size="sm">
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    {t('sendWhatsapp')}
                  </a>
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
                <ClipboardDocumentIcon className="h-4 w-4" />
                {t('copy')}
              </Button>
              {call && (
                <Button asChild variant="outline" size="sm">
                  <a href={call}>
                    <PhoneIcon className="h-4 w-4" />
                    {t('call')}
                  </a>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{t('noNotice')}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ImpulsaTeamPage() {
  const t = useTranslations('distributor.impulsa.teamPage');
  const ti = useTranslations('distributor.impulsa');
  const { data, isLoading, isError, refetch } = useImpulsaTeam();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#1f3a4a] via-[#2f5165] to-[#3E667D] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Link href={RISE_ACADEMY_PATH} className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
            <ArrowLeftIcon className="h-4 w-4" />
            {t('back')}
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">{ti('eyebrow')}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold italic sm:text-4xl">{t('title')}</h1>
          <p className="mt-1 text-base text-white/80">{t('subtitle')}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="py-16 text-center">
            <p className="text-base text-muted-foreground">{t('loadError')}</p>
            <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
              {ti('retry')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-4">
              {!data.ready && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                  {ti('notReady')}
                </p>
              )}
              {data.members.length === 0 ? (
                <Card>
                  <CardContent className="p-10 text-center">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-primary/40" aria-hidden />
                    <p className="mt-3 text-lg font-bold text-foreground">{t('emptyTitle')}</p>
                    <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{t('emptyBody')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.members.map((member) => (
                    <MemberCard key={member.customerNumber} member={member} today={data.today} />
                  ))}
                </div>
              )}
            </div>
            <aside>
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('actionsTitle')}</h2>
                  <ol className="mt-3 space-y-2">
                    {data.actions.map((action) => (
                      <li key={action.code} className="rounded-lg border border-border px-3 py-2 text-sm text-foreground">
                        {action.action}
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
