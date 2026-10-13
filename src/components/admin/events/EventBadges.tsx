// EventBadges - Insignias de estado del evento y del boleto.
import { Badge } from '@/components/ui/badge';
import {
  EVENT_STATUS_LABEL,
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

export function EventStatusBadge({ status, className = '' }: { status: EventStatus; className?: string }) {
  return (
    <Badge variant="outline" className={`${EVENT_STATUS_CLASS[status] ?? ''} ${className}`}>
      {EVENT_STATUS_LABEL[status] ?? status}
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
