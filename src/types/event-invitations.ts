// event-invitations.ts - Invitaciones y boleto de un evento privado.
// Espejo de los DTOs del API (/events/:id/guests/invitations, /my-events/invitations,
// /public/events/invitations/:token).

export const INVITATION_CHANNELS = ['email', 'whatsapp'] as const;
export type InvitationChannel = (typeof INVITATION_CHANNELS)[number];

export const INVITATION_CHANNEL_LABEL: Record<InvitationChannel, string> = {
  email: 'Correo',
  whatsapp: 'WhatsApp',
};

/** Invitados por llamada de envío (el API rechaza más). */
export const INVITATION_BATCH_SIZE = 20;

export interface InvitationPreviewInput {
  channels: InvitationChannel[];
  /** Solo estos invitados; sin él, toda la lista. */
  guestIds?: string[];
  accessType?: string;
  /** Volver a mandar también a quien ya la recibió por ese canal. */
  resend?: boolean;
}

export interface InvitationSkipCount {
  reason: string;
  label: string;
  guests: number;
}

export interface InvitationChannelPreview {
  /** false = por este canal hoy no se puede mandar. */
  available: boolean;
  reason: string | null;
  toSend: number;
  skipped: InvitationSkipCount[];
}

export interface InvitationPreview {
  /** false = el evento todavía no admite envíos (en borrador, cerrado…). */
  canSend: boolean;
  reason: string | null;
  guests: number;
  email: InvitationChannelPreview | null;
  whatsapp: InvitationChannelPreview | null;
  whatsappTemplate: { name: string; status: string | null; category: string | null };
  /** A quiénes les saldría algo por al menos un canal (se mandan en tandas). */
  guestIds: string[];
}

export interface InvitationSendInput {
  channels: InvitationChannel[];
  guestIds: string[];
  resend?: boolean;
}

export interface InvitationChannelResult {
  status: 'sent' | 'failed' | 'skipped';
  to: string | null;
  detail: string | null;
}

export interface InvitationSendResult {
  results: { guestId: string; email: InvitationChannelResult | null; whatsapp: InvitationChannelResult | null }[];
  emailSent: number;
  emailFailed: number;
  whatsappSent: number;
  whatsappFailed: number;
}

export interface InvitationEvent {
  id: string;
  code: string;
  name: string;
  description: string | null;
  eventDate: string;
  startTime: string | null;
  doorsTime: string | null;
  endTime: string | null;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  state: string | null;
  imageUrl: string | null;
  ticketNotes: string | null;
  /** active | closed | cancelled (en borrador el boleto no se muestra). */
  status: string;
}

export interface InvitationTicket {
  fullName: string;
  accessType: string | null;
  seats: number;
  /** Lugares que ya ingresaron al evento. */
  checkedInSeats: number;
  /** false = lo quitaron de la lista: el boleto ya no vale. */
  valid: boolean;
  /** true = es el boleto del propio distribuidor; false = de su acompañante. */
  mine: boolean;
  ticketToken: string;
  ticketUrl: string;
  qrUrl: string;
}

export interface PublicInvitation {
  ticket: InvitationTicket;
  event: InvitationEvent;
}

export interface MyEventInvitation {
  event: InvitationEvent;
  /** El propio primero y después los de sus acompañantes. */
  tickets: InvitationTicket[];
}

export interface MyEventInvitations {
  ready: boolean;
  items: MyEventInvitation[];
}
