// useEvents.ts - React Query hooks del módulo Eventos (boletos).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsService } from '@/services/events.service';
import type {
  CheckInInput,
  CreateEventInput,
  EventBranchAllotment,
  EventQuery,
  EventTicketsQuery,
  UpdateEventInput,
  UpsertEventProductInput,
} from '@/types/events';

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (query: EventQuery) => [...eventKeys.lists(), query] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  branches: (id: string) => [...eventKeys.all, 'branches', id] as const,
  products: (id: string) => [...eventKeys.all, 'products', id] as const,
  tickets: (id: string, query: EventTicketsQuery) =>
    [...eventKeys.all, 'tickets', id, query] as const,
  publicTicket: (token: string) => [...eventKeys.all, 'public-ticket', token] as const,
};

export const useEvents = (query: EventQuery = {}) =>
  useQuery({
    queryKey: eventKeys.list(query),
    queryFn: () => eventsService.list(query),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

export const useEvent = (id: string) =>
  useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsService.getById(id),
    enabled: !!id,
    staleTime: 15 * 1000,
  });

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => eventsService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.all }),
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEventInput }) =>
      eventsService.update(id, input),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(eventKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
};

export const useEventBranches = (id: string) =>
  useQuery({
    queryKey: eventKeys.branches(id),
    queryFn: () => eventsService.getBranches(id),
    enabled: !!id,
    staleTime: 15 * 1000,
  });

export const useSetEventBranches = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, branches }: { id: string; branches: EventBranchAllotment[] }) =>
      eventsService.setBranches(id, branches),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(eventKeys.branches(id), data);
      // Las estadísticas del evento (asignados/restantes) cambian con la asignación.
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
};

// ── Claves que generan boletos (mig 155) ──

export const useEventProducts = (id: string) =>
  useQuery({
    queryKey: eventKeys.products(id),
    queryFn: () => eventsService.getProducts(id),
    enabled: !!id,
    staleTime: 15 * 1000,
  });

export const useUpsertEventProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpsertEventProductInput }) =>
      eventsService.upsertProduct(id, input),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(eventKeys.products(id), data);
      // EventDto.products (ficha y listado) también cambia.
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
};

export const useRemoveEventProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      eventsService.removeProduct(id, productId),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(eventKeys.products(id), data);
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
};

// ── Imagen / flyer ──

export const useUploadEventImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      file,
      onProgress,
    }: {
      id: string;
      file: File;
      onProgress?: (percent: number) => void;
    }) => eventsService.uploadImage(id, file, onProgress),
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(eventKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
};

export const useEventTickets = (id: string, query: EventTicketsQuery = {}) =>
  useQuery({
    queryKey: eventKeys.tickets(id, query),
    queryFn: () => eventsService.getTickets(id, query),
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });

export const useResendTicketEmail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ticketId, to }: { id: string; ticketId: string; to?: string }) =>
      eventsService.resendTicketEmail(id, ticketId, to),
    onSuccess: (_data, { id }) =>
      queryClient.invalidateQueries({ queryKey: [...eventKeys.all, 'tickets', id] }),
  });
};

export const useCheckIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CheckInInput }) =>
      eventsService.checkIn(id, input),
    onSuccess: (data, { id, input }) => {
      // Solo una entrada registrada cambia contadores y lista de boletos.
      if (data.checkedIn && !input.dryRun) {
        queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: [...eventKeys.all, 'tickets', id] });
      }
    },
  });
};

/** Boleto público (sin sesión). No reintenta en 404. */
export const usePublicTicket = (token: string) =>
  useQuery({
    queryKey: eventKeys.publicTicket(token),
    queryFn: () => eventsService.getPublicTicket(token),
    enabled: !!token,
    retry: (count, err) => {
      const status = (err as { status?: number })?.status;
      return status !== 404 && count < 1;
    },
    staleTime: 60 * 1000,
  });
