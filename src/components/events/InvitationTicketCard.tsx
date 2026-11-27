'use client';

// InvitationTicketCard - El boleto de un invitado a un evento privado: su
// nombre, su acceso, sus lugares, el estado y el código QR para la entrada.
// Lo usan la página pública (/invitacion/<código>) y el panel del distribuidor
// (Eventos). Los textos llegan por `labels` para que el panel los traduzca.

import { QrCodeIcon } from '@heroicons/react/24/outline';
import { ticketIsOff, type TicketState } from '@/lib/events/invitations';
import type { InvitationTicket } from '@/types/event-invitations';

export interface TicketLabels {
  /** Encabezado del recuadro ("Tu boleto", "Boleto de tu acompañante", "Invitado"). */
  heading: string;
  access: string;
  /** "2 lugares". */
  seats: string;
  /** Texto del estado ("Vigente", "Ya ingresó"…). */
  state: string;
  showQr: string;
  qrAlt: string;
  /** Texto del botón que abre el boleto en su página; sin él no hay botón. */
  open?: string;
}

const STATE_CLASS: Record<TicketState, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  partial: 'bg-sky-100 text-sky-800',
  used: 'bg-sky-100 text-sky-800',
  void: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface Props {
  ticket: InvitationTicket;
  state: TicketState;
  labels: TicketLabels;
  /** Tamaño del QR en px (la página pública lo pinta grande). */
  qrSize?: number;
}

export function InvitationTicketCard({ ticket, state, labels, qrSize = 200 }: Props) {
  const off = ticketIsOff(state);
  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{labels.heading}</p>
      <p className="text-lg font-semibold text-gray-900">{ticket.fullName}</p>
      <p className="mt-1 text-sm text-gray-700">
        {ticket.accessType && (
          <>
            <span className="text-gray-500">{labels.access}:</span>{' '}
            <span className="font-medium text-[#3E667D]">{ticket.accessType}</span>
            {' · '}
          </>
        )}
        {labels.seats}
      </p>
      <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${STATE_CLASS[state]}`}>
        {labels.state}
      </span>

      <div className="mt-4 flex flex-col items-center">
        <div className={`rounded-xl bg-white p-2 ring-1 ring-gray-200 ${off ? 'opacity-30 grayscale' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ticket.qrUrl}
            alt={labels.qrAlt}
            width={qrSize}
            height={qrSize}
            style={{ width: qrSize, height: qrSize }}
          />
        </div>
        {!off && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-800">
            <QrCodeIcon className="h-5 w-5 text-[#3E667D]" />
            {labels.showQr}
          </p>
        )}
        {labels.open && (
          <a
            href={ticket.ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-sm font-medium text-[#3E667D] underline-offset-2 hover:underline"
          >
            {labels.open}
          </a>
        )}
      </div>
    </div>
  );
}
