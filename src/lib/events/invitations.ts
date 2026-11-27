// invitations.ts - Reglas puras del envío de invitaciones y del boleto de un
// evento privado (sin red ni React): tandas, acumulado del envío y textos.

import type {
  InvitationChannel,
  InvitationPreview,
  InvitationSendResult,
  InvitationTicket,
} from '@/types/event-invitations';

/** Parte la lista en tandas del tamaño que admite el API. */
export function chunkIds(ids: readonly string[], size: number): string[][] {
  const step = Math.max(1, Math.floor(size));
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += step) out.push(ids.slice(i, i + step));
  return out;
}

export interface SendProgress {
  /** Invitados ya procesados (enviados, fallidos o saltados). */
  done: number;
  total: number;
  emailSent: number;
  emailFailed: number;
  whatsappSent: number;
  whatsappFailed: number;
}

export const emptyProgress = (total: number): SendProgress => ({
  done: 0,
  total,
  emailSent: 0,
  emailFailed: 0,
  whatsappSent: 0,
  whatsappFailed: 0,
});

/** Suma el resultado de una tanda al acumulado. */
export function addBatch(progress: SendProgress, batch: InvitationSendResult): SendProgress {
  return {
    ...progress,
    done: Math.min(progress.total, progress.done + batch.results.length),
    emailSent: progress.emailSent + batch.emailSent,
    emailFailed: progress.emailFailed + batch.emailFailed,
    whatsappSent: progress.whatsappSent + batch.whatsappSent,
    whatsappFailed: progress.whatsappFailed + batch.whatsappFailed,
  };
}

export const progressPercent = (p: SendProgress): number =>
  p.total <= 0 ? 0 : Math.min(100, Math.round((p.done / p.total) * 100));

/** Los canales elegidos que hoy sí pueden mandar. */
export function sendableChannels(
  preview: InvitationPreview | null | undefined,
  chosen: readonly InvitationChannel[],
): InvitationChannel[] {
  if (!preview || !preview.canSend) return [];
  return chosen.filter((c) => preview[c]?.available === true && (preview[c]?.toSend ?? 0) > 0);
}

/** "Se mandarán 358 correos y 362 WhatsApp" (solo los canales que sí salen). */
export function sendSummary(
  preview: InvitationPreview | null | undefined,
  chosen: readonly InvitationChannel[],
): string {
  const channels = sendableChannels(preview, chosen);
  const parts = channels.map((c) => {
    const n = preview?.[c]?.toSend ?? 0;
    const count = n.toLocaleString('es-MX');
    if (c === 'email') return n === 1 ? '1 correo' : `${count} correos`;
    return `${count} WhatsApp`;
  });
  if (parts.length === 0) return '';
  return `Se ${parts.length === 1 && (preview?.[channels[0]]?.toSend ?? 0) === 1 ? 'mandará' : 'mandarán'} ${parts.join(' y ')}`;
}

/** Resultado del envío en una frase, para el aviso final. */
export function resultSummary(p: SendProgress): string {
  const sent: string[] = [];
  if (p.emailSent > 0) sent.push(p.emailSent === 1 ? '1 correo' : `${p.emailSent.toLocaleString('es-MX')} correos`);
  if (p.whatsappSent > 0) sent.push(`${p.whatsappSent.toLocaleString('es-MX')} WhatsApp`);
  const failed = p.emailFailed + p.whatsappFailed;
  const head = sent.length > 0 ? `Salieron ${sent.join(' y ')}` : 'No salió ninguna invitación';
  return failed > 0 ? `${head}; ${failed.toLocaleString('es-MX')} fallaron` : head;
}

/** Estado del envío de un canal en la lista de invitados. */
export const INVITATION_STATUS_LABEL: Record<string, string> = {
  pending: 'Sin enviar',
  sent: 'Enviada',
  failed: 'Falló',
  skipped: 'No se envió',
};

/** "1 lugar" / "2 lugares". */
export const seatsLabel = (seats: number): string => (seats === 1 ? '1 lugar' : `${seats} lugares`);

/** Cuántos de sus lugares faltan por entrar (nunca negativo). */
export const seatsLeft = (ticket: Pick<InvitationTicket, 'seats' | 'checkedInSeats'>): number =>
  Math.max(0, ticket.seats - ticket.checkedInSeats);

/**
 * Estado del boleto: ok = vigente · partial = ya entró parte de sus lugares ·
 * used = ya entraron todos · void = lo quitaron de la lista · cancelled = el
 * evento se canceló.
 */
export type TicketState = 'ok' | 'partial' | 'used' | 'void' | 'cancelled';

export function ticketState(
  ticket: Pick<InvitationTicket, 'valid' | 'seats' | 'checkedInSeats'>,
  eventStatus: string,
): TicketState {
  if (eventStatus === 'cancelled') return 'cancelled';
  if (!ticket.valid) return 'void';
  if (ticket.seats > 0 && ticket.checkedInSeats >= ticket.seats) return 'used';
  if (ticket.checkedInSeats > 0) return 'partial';
  return 'ok';
}

/** Un boleto que ya no sirve para entrar (se pinta apagado). */
export const ticketIsOff = (state: TicketState): boolean => state === 'void' || state === 'cancelled';

/** Texto del estado en español (el panel del distribuidor usa sus traducciones). */
export function ticketStateLabel(
  state: TicketState,
  ticket: Pick<InvitationTicket, 'seats' | 'checkedInSeats'>,
): string {
  switch (state) {
    case 'cancelled':
      return 'Evento cancelado';
    case 'void':
      return 'Ya no vigente';
    case 'used':
      return 'Ya ingresó';
    case 'partial':
      return `Ingresaron ${ticket.checkedInSeats} de ${ticket.seats}`;
    default:
      return 'Vigente';
  }
}
