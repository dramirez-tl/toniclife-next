// event-invitations.service.ts - Invitaciones y boleto de un evento privado.
// Backend: /events/:id/guests/invitations (revisión previa y envío por tandas),
// /my-events/invitations (boletos del distribuidor) y
// /public/events/invitations/:token (boleto público, sin sesión).
import api from '@/lib/api';
import type {
  InvitationPreview,
  InvitationPreviewInput,
  InvitationSendInput,
  InvitationSendResult,
  MyEventInvitations,
  PublicInvitation,
} from '@/types/event-invitations';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Error del boleto público con el status HTTP (404 = no existe o aún no se publica). */
export class PublicInvitationError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'PublicInvitationError';
    this.status = status;
  }
}

class EventInvitationsService {
  /** No manda nada: dice a cuántos les saldría por cada canal y a cuántos no. */
  async preview(eventId: string, input: InvitationPreviewInput): Promise<InvitationPreview> {
    const { data } = await api.post<InvitationPreview>(`/events/${eventId}/guests/invitations/preview`, input);
    return data;
  }

  /** Manda una tanda (máximo INVITATION_BATCH_SIZE invitados). Puede tardar: son envíos uno por uno. */
  async send(eventId: string, input: InvitationSendInput): Promise<InvitationSendResult> {
    const { data } = await api.post<InvitationSendResult>(`/events/${eventId}/guests/invitations/send`, input, {
      timeout: 120_000,
    });
    return data;
  }

  /** Eventos a los que el distribuidor de la sesión está invitado, con sus boletos. */
  async mine(): Promise<MyEventInvitations> {
    const { data } = await api.get<MyEventInvitations>('/my-events/invitations');
    return data;
  }

  /** Boleto público (sin sesión). Lanza PublicInvitationError con el status. */
  async getPublic(token: string): Promise<PublicInvitation> {
    const res = await fetch(`${API_BASE}/public/events/invitations/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new PublicInvitationError(
        res.status,
        res.status === 404 ? 'Boleto no encontrado' : 'No se pudo cargar el boleto',
      );
    }
    return (await res.json()) as PublicInvitation;
  }
}

export const eventInvitationsService = new EventInvitationsService();
