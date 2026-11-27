'use client';

// /distribuidor/eventos — Los eventos a los que el distribuidor está invitado,
// con su boleto (código QR) y los de sus acompañantes.
//
// Sistemas (Diego, 27-nov-2026): "que en el panel del distribuidor, en la
// sección de eventos, salga su boleto". Datos reales: GET /my-events/invitations
// (eventos privados ACTIVADOS en los que está en la lista). ES/EN por
// `distributor.events`.

import { useLocale, useTranslations } from 'next-intl';
import { CalendarDaysIcon, ClockIcon, MapPinIcon, TicketIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InvitationTicketCard, type TicketLabels } from '@/components/events/InvitationTicketCard';
import { localeLanguage } from '@/i18n/config';
import { useMyEventInvitations } from '@/hooks/useEventInvitations';
import { formatEventSchedule } from '@/lib/events/format';
import { ticketState, type TicketState } from '@/lib/events/invitations';
import type { InvitationTicket, MyEventInvitation } from '@/types/event-invitations';

/** "jueves, 3 de diciembre de 2026" / "Thursday, December 3, 2026" (sin zona horaria). */
function eventDate(ymd: string, lang: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toLocaleDateString(
    lang === 'en' ? 'en-US' : 'es-MX',
    { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  );
}

export default function EventosPage() {
  const t = useTranslations('distributor.events');
  const lang = localeLanguage(useLocale());
  const { data, isLoading, isError, refetch, isFetching } = useMyEventInvitations();
  const items = data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C8DDF2]/40 text-[#3E667D]">
          <TicketIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-600">{t('subtitle')}</p>
        </div>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-5" aria-label={t('loading')}>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-medium text-red-700">{t('error')}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => refetch()} disabled={isFetching}>
              {t('retry')}
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <CalendarDaysIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="font-medium text-gray-700">{t('emptyTitle')}</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{t('emptyText')}</p>
          </CardContent>
        </Card>
      ) : (
        items.map((item) => <EventInvitation key={item.event.id} item={item} lang={lang} />)
      )}
    </div>
  );
}

function EventInvitation({ item, lang }: { item: MyEventInvitation; lang: string }) {
  const t = useTranslations('distributor.events');
  const ev = item.event;
  const schedule = formatEventSchedule(ev);
  const place = [ev.venueName, ev.venueAddress, [ev.city, ev.state].filter(Boolean).join(', ')].filter(Boolean);
  const mine = item.tickets.filter((ticket) => ticket.mine);
  const companions = item.tickets.filter((ticket) => !ticket.mine);

  const stateText = (state: TicketState, ticket: InvitationTicket): string => {
    switch (state) {
      case 'partial':
        return t('statePartial', { done: ticket.checkedInSeats, total: ticket.seats });
      case 'used':
        return t('stateUsed');
      case 'void':
        return t('stateVoid');
      case 'cancelled':
        return t('stateCancelled');
      default:
        return t('stateOk');
    }
  };
  const labels = (ticket: InvitationTicket, state: TicketState): TicketLabels => ({
    heading: ticket.mine ? t('myTicket') : t('companionTicket'),
    access: t('access'),
    seats: ticket.seats === 1 ? t('seatsOne') : t('seatsMany', { count: ticket.seats }),
    state: stateText(state, ticket),
    showQr: t('showQr'),
    qrAlt: t('qrAlt', { name: ticket.fullName }),
    open: t('openTicket'),
  });
  const card = (ticket: InvitationTicket) => {
    const state = ticketState(ticket, ev.status);
    return <InvitationTicketCard key={ticket.ticketToken} ticket={ticket} state={state} labels={labels(ticket, state)} />;
  };

  return (
    <Card className="overflow-hidden">
      {ev.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ev.imageUrl} alt="" className="max-h-64 w-full bg-white object-contain" />
      )}
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{ev.name}</h2>
          <dl className="mt-2 space-y-1.5 text-sm text-gray-700">
            <div className="flex items-start gap-2">
              <CalendarDaysIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
              <dd className="first-letter:uppercase">{eventDate(ev.eventDate, lang)}</dd>
            </div>
            {schedule && (
              <div className="flex items-start gap-2">
                <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                <dd>{schedule}</dd>
              </div>
            )}
            {place.length > 0 && (
              <div className="flex items-start gap-2">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                <dd>{place.join(' · ')}</dd>
              </div>
            )}
          </dl>
        </div>

        {mine.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{mine.map(card)}</div>}

        {companions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">{t('companions')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">{companions.map(card)}</div>
          </div>
        )}

        {ev.ticketNotes && (
          <p className="whitespace-pre-line border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">
            {ev.ticketNotes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
