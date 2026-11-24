// useEventGuests.ts - React Query hooks de la lista de invitados (eventos privados).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventGuestsService } from '@/services/event-guests.service';
import { eventKeys } from '@/hooks/useEvents';
import type {
  AddEventGuestInput,
  EventGuestsQuery,
  GuestImportInput,
  UpdateEventGuestInput,
} from '@/types/event-guests';

export const eventGuestKeys = {
  all: (eventId: string) => [...eventKeys.all, 'guests', eventId] as const,
  list: (eventId: string, query: EventGuestsQuery) => [...eventGuestKeys.all(eventId), query] as const,
};

export const useEventGuests = (eventId: string, query: EventGuestsQuery = {}) =>
  useQuery({
    queryKey: eventGuestKeys.list(eventId, query),
    queryFn: () => eventGuestsService.list(eventId, query),
    enabled: !!eventId,
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });

/** Tras cualquier cambio: la lista y las cifras del evento (encabezado y listado). */
function useRefreshGuests(eventId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: eventGuestKeys.all(eventId) });
    queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
  };
}

export const useAddEventGuest = (eventId: string) => {
  const refresh = useRefreshGuests(eventId);
  return useMutation({
    mutationFn: (input: AddEventGuestInput) => eventGuestsService.add(eventId, input),
    onSuccess: refresh,
  });
};

export const useUpdateEventGuest = (eventId: string) => {
  const refresh = useRefreshGuests(eventId);
  return useMutation({
    mutationFn: ({ guestId, input }: { guestId: string; input: UpdateEventGuestInput }) =>
      eventGuestsService.update(eventId, guestId, input),
    onSuccess: refresh,
  });
};

export const useRemoveEventGuest = (eventId: string) => {
  const refresh = useRefreshGuests(eventId);
  return useMutation({
    mutationFn: (guestId: string) => eventGuestsService.remove(eventId, guestId),
    onSuccess: refresh,
  });
};

export const useRestoreEventGuest = (eventId: string) => {
  const refresh = useRefreshGuests(eventId);
  return useMutation({
    mutationFn: (guestId: string) => eventGuestsService.restore(eventId, guestId),
    onSuccess: refresh,
  });
};

export const useBulkRemoveEventGuests = (eventId: string) => {
  const refresh = useRefreshGuests(eventId);
  return useMutation({
    mutationFn: (ids: string[]) => eventGuestsService.bulkRemove(eventId, ids),
    onSuccess: refresh,
  });
};

/** Vista previa (apply=false, no guarda) o carga (apply=true). */
export const useImportEventGuests = (eventId: string) => {
  const refresh = useRefreshGuests(eventId);
  return useMutation({
    mutationFn: ({ input, apply }: { input: GuestImportInput; apply: boolean }) =>
      eventGuestsService.import(eventId, input, apply),
    onSuccess: (data) => {
      if (data.applied) refresh();
    },
  });
};
