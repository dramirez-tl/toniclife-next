'use client';

// Boleto público: el asistente abre la liga del correo (o escanea su QR) y ve
// su boleto con el código QR para la entrada. Sin autenticación (como
// /formulario e /induccion): llama GET /public/events/tickets/:token.

import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  GiftIcon,
  MapPinIcon,
  QrCodeIcon,
  TicketIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { usePublicTicket } from '@/hooks/useEvents';
import { formatEventDateLong, formatEventSchedule } from '@/lib/events/format';
import type { PublicTicketDto, TicketStatus } from '@/types/events';

const STATUS_UI: Record<TicketStatus, { label: string; cls: string }> = {
  issued: { label: 'Vigente', cls: 'bg-emerald-100 text-emerald-800' },
  checked_in: { label: 'Ya ingresó', cls: 'bg-sky-100 text-sky-800' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-800' },
};

export default function BoletoPublicoPage() {
  const params = useParams();
  const token = (params?.token as string) || '';
  const { data, isLoading, isError, error } = usePublicTicket(token);

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
          <TicketCard ticket={data} />
        )}

        <p className="mt-6 text-center text-xs text-gray-400">
          Si tienes dudas con tu boleto, acude a la sucursal donde lo compraste.
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
          ? 'La liga no corresponde a ningún boleto. Revisa que la hayas abierto completa desde tu correo.'
          : 'Revisa tu conexión e intenta de nuevo en unos momentos.'}
      </p>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: PublicTicketDto }) {
  const ev = ticket.event;
  const status = STATUS_UI[ticket.status] ?? STATUS_UI.issued;
  const cancelled = ticket.status === 'cancelled';
  const schedule = formatEventSchedule(ev);
  const place = [ev.venueName, ev.venueAddress].filter(Boolean);
  const cityState = [ev.city, ev.state].filter(Boolean).join(', ');

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-md">
      {ev.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ev.imageUrl} alt="" className="h-44 w-full object-cover" />
      )}

      <div className="space-y-4 p-5">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-gray-900">{ev.name}</h1>
          {ev.speaker && <p className="mt-0.5 text-base text-[#3E667D]">{ev.speaker}</p>}
        </div>

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

        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Asistente</p>
          <p className="text-lg font-semibold text-gray-900">
            {ticket.attendeeName || 'Portador del boleto'}
          </p>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Boleto</p>
          <p className="font-mono text-2xl font-bold tracking-wider text-[#3E667D]">
            {ticket.ticketNumber}
          </p>
          <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${status.cls}`}>
            {status.label}
          </span>
          {ticket.status === 'checked_in' && ticket.checkedInAt && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-sky-700">
              <CheckCircleIcon className="h-4 w-4" />
              Entrada registrada
            </p>
          )}
        </div>

        <div className="flex flex-col items-center">
          <div className={`rounded-xl bg-white p-2 ring-1 ring-gray-200 ${cancelled ? 'opacity-30 grayscale' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ticket.qrUrl}
              alt={`Código QR del boleto ${ticket.ticketNumber}`}
              width={240}
              height={240}
              className="h-60 w-60"
            />
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-800">
            <QrCodeIcon className="h-5 w-5 text-[#3E667D]" />
            {cancelled ? 'Este boleto está cancelado.' : 'Presenta este QR en la entrada'}
          </p>
        </div>

        {ev.includedProductName && (
          <p className="inline-flex items-center gap-2 rounded-lg bg-[#C8DDF2]/30 px-3 py-2 text-sm text-[#2f5165]">
            <GiftIcon className="h-5 w-5 shrink-0" />
            <span>
              Incluye: {ev.includedQuantity} × {ev.includedProductName}
            </span>
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
