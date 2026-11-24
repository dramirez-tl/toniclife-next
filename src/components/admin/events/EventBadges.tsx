// EventBadges - Insignias de estado del evento y del boleto.
import { Badge } from '@/components/ui/badge';
import {
  EVENT_STATUS_LABEL,
  PRIVATE_EVENT_STATUS_LABEL,
  TICKET_STATUS_LABEL,
  type EventStatus,
  type TicketStatus,
} from '@/types/events';

const EVENT_STATUS_CLASS: Record<EventStatus, string> = {
  draft: 'border-gray-200 bg-gray-100 text-gray-600',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  closed: 'border-amber-200 bg-amber-50 text-amber-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
};

const TICKET_STATUS_CLASS: Record<TicketStatus, string> = {
  issued: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  checked_in: 'border-sky-200 bg-sky-50 text-sky-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
};

export function EventStatusBadge({
  status,
  className = '',
  privateEvent = false,
}: {
  status: EventStatus;
  className?: string;
  /** Evento privado: no se vende, así que "En venta" se dice "Activo". */
  privateEvent?: boolean;
}) {
  const labels = privateEvent ? PRIVATE_EVENT_STATUS_LABEL : EVENT_STATUS_LABEL;
  return (
    <Badge variant="outline" className={`${EVENT_STATUS_CLASS[status] ?? ''} ${className}`}>
      {labels[status] ?? status}
    </Badge>
  );
}

/** Insignia "Privado": evento por invitación (no se vende). */
export function PrivateEventBadge({ className = '' }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={`border-violet-200 bg-violet-50 text-violet-700 ${className}`}
      title="Evento por invitación: no se vende en el POS; lleva lista de invitados"
    >
      Privado
    </Badge>
  );
}

export function TicketStatusBadge({ status, className = '' }: { status: TicketStatus; className?: string }) {
  return (
    <Badge variant="outline" className={`${TICKET_STATUS_CLASS[status] ?? ''} ${className}`}>
      {TICKET_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
