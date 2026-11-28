'use client';

// Boleto público de un invitado a un evento privado: abre la liga de su
// invitación (o escanea su QR) y ve su boleto con el código para la entrada.
// Sin autenticación (como /boleto): llama GET /public/events/invitations/:token.

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { CalendarDaysIcon, ClockIcon, MapPinIcon, TicketIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { InvitationTicketCard } from '@/components/events/InvitationTicketCard';
import { usePublicInvitation } from '@/hooks/useEventInvitations';
import { formatEventDateLong, formatEventSchedule } from '@/lib/events/format';
import { invitationTokenFromPath, seatsLabel, ticketState, ticketStateLabel } from '@/lib/events/invitations';
import type { PublicInvitation } from '@/types/event-invitations';

export default function InvitacionPublicaPage() {
  const params = useParams();
  // El botón de WhatsApp manda la liga con un `{{1}}` de más antes del código: se limpia.
  const token = invitationTokenFromPath(params?.token as string | undefined);
  const { data, isLoading, isError, error } = usePublicInvitation(token);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-4 flex items-center justify-center gap-2 text-[#3E667D]">
          <TicketIcon className="h-6 w-6" />
          <span className="text-lg font-bold tracking-tight">Tonic Life</span>
          <span className="text-sm text-gray-400">· Mi boleto</span>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-10 text-gray-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando tu boleto…
          </div>
        ) : isError || !data ? (
          <NotFound status={(error as { status?: number } | null)?.status} />
        ) : (
          <Ticket invitation={data} />
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Si tienes dudas con tu boleto, escríbele a quien te invitó o a tu líder.
        </p>
      </div>
    </main>
  );
}

function NotFound({ status }: { status?: number }) {
  const notFound = status === 404;
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
      <XCircleIcon className="mx-auto mb-3 h-12 w-12 text-red-400" />
      <h1 className="text-xl font-bold text-gray-900">
        {notFound ? 'Boleto no encontrado' : 'No se pudo cargar el boleto'}
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        {notFound
          ? 'La liga no corresponde a ningún boleto. Revisa que la hayas abierto completa desde tu invitación.'
          : 'Revisa tu conexión e intenta de nuevo en unos momentos.'}
      </p>
    </div>
  );
}

function Ticket({ invitation }: { invitation: PublicInvitation }) {
  const { event: ev, ticket } = invitation;
  const state = ticketState(ticket, ev.status);
  const schedule = formatEventSchedule(ev);
  const place = [ev.venueName, ev.venueAddress].filter(Boolean);
  const cityState = [ev.city, ev.state].filter(Boolean).join(', ');

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-md">
      {ev.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ev.imageUrl} alt="" className="max-h-56 w-full bg-white object-contain" />
      )}

      <div className="space-y-4 p-5">
        <h1 className="text-2xl font-bold leading-tight text-gray-900">{ev.name}</h1>

        <dl className="space-y-2 text-sm text-gray-700">
          <div className="flex items-start gap-2">
            <CalendarDaysIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
            <dd className="capitalize">{formatEventDateLong(ev.eventDate)}</dd>
          </div>
          {schedule && (
            <div className="flex items-start gap-2">
              <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
              <dd>{schedule}</dd>
            </div>
          )}
          {(place.length > 0 || cityState) && (
            <div className="flex items-start gap-2">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
              <dd>
                {place.map((line, i) => (
                  <span key={i} className={i === 0 ? 'block font-medium text-gray-900' : 'block'}>
                    {line}
                  </span>
                ))}
                {cityState && <span className="block text-gray-500">{cityState}</span>}
              </dd>
            </div>
          )}
        </dl>

        <InvitationTicketCard
          ticket={ticket}
          state={state}
          qrSize={240}
          labels={{
            heading: 'Invitado',
            access: 'Acceso',
            seats: seatsLabel(ticket.seats),
            state: ticketStateLabel(state, ticket),
            showQr: 'Presenta este QR en la entrada',
            qrAlt: `Código QR del boleto de ${ticket.fullName}`,
          }}
        />

        {state === 'void' && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            Este boleto ya no está en la lista de invitados del evento.
          </p>
        )}

        {ev.ticketNotes && (
          <p className="whitespace-pre-line border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">
            {ev.ticketNotes}
          </p>
        )}
      </div>
    </article>
  );
}
