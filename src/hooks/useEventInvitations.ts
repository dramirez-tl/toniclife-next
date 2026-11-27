// useEventInvitations.ts - React Query hooks de las invitaciones y del boleto de
// un evento privado.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventInvitationsService } from '@/services/event-invitations.service';
import { eventGuestKeys } from '@/hooks/useEventGuests';
import { eventKeys } from '@/hooks/useEvents';
import type { InvitationPreviewInput, InvitationSendInput } from '@/types/event-invitations';

export const eventInvitationKeys = {
  mine: () => [...eventKeys.all, 'my-invitations'] as const,
  public: (token: string) => [...eventKeys.all, 'public-invitation', token] as const,
};

/** Revisión previa del envío (no manda nada). Mutación: se pide al cambiar las opciones. */
export const useInvitationPreview = (eventId: string) =>
  useMutation({
    mutationFn: (input: InvitationPreviewInput) => eventInvitationsService.preview(eventId, input),
  });

/** Manda UNA tanda. El diálogo las encadena y refresca la lista al terminar. */
export const useSendInvitationBatch = (eventId: string) =>
  useMutation({
    mutationFn: (input: InvitationSendInput) => eventInvitationsService.send(eventId, input),
  });

/** Refresca la lista de invitados (estado de cada invitación y contadores). */
export const useRefreshGuestList = (eventId: string) => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: eventGuestKeys.all(eventId) });
};

/** Boletos del distribuidor de la sesión (panel › Eventos). */
export const useMyEventInvitations = () =>
  useQuery({
    queryKey: eventInvitationKeys.mine(),
    queryFn: () => eventInvitationsService.mine(),
    staleTime: 60 * 1000,
  });

/** Boleto público (sin sesión). No reintenta en 404. */
export const usePublicInvitation = (token: string) =>
  useQuery({
    queryKey: eventInvitationKeys.public(token),
    queryFn: () => eventInvitationsService.getPublic(token),
    enabled: !!token,
    retry: (count, err) => {
      const status = (err as { status?: number })?.status;
      return status !== 404 && count < 1;
    },
    staleTime: 60 * 1000,
  });
