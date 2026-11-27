// event-guests.service.ts - Lista de invitados de un evento privado.
// Backend: /events/:id/guests (lista, alta, edición, baja, carga masiva, Excel).
import api from '@/lib/api';
import type {
  AddEventGuestInput,
  BulkGuestsResult,
  EventGuestDto,
  EventGuestsQuery,
  EventGuestsResponse,
  GuestImportInput,
  GuestImportResult,
  UpdateEventGuestInput,
} from '@/types/event-guests';

class EventGuestsService {
  async list(eventId: string, query: EventGuestsQuery = {}): Promise<EventGuestsResponse> {
    const params: Record<string, string> = {};
    if (query.search) params.search = query.search;
    if (query.accessType) params.accessType = query.accessType;
    if (query.status) params.status = query.status;
    if (query.kind) params.kind = query.kind;
    if (query.flag) params.flag = query.flag;
    if (query.contact) params.contact = query.contact;
    if (query.invitation) params.invitation = query.invitation;
    if (query.removed) params.removed = 'true';
    if (query.page) params.page = String(query.page);
    if (query.limit) params.limit = String(query.limit);
    const { data } = await api.get<EventGuestsResponse>(`/events/${eventId}/guests`, { params });
    return data;
  }

  async add(eventId: string, input: AddEventGuestInput): Promise<EventGuestDto> {
    const { data } = await api.post<EventGuestDto>(`/events/${eventId}/guests`, input);
    return data;
  }

  async update(eventId: string, guestId: string, input: UpdateEventGuestInput): Promise<EventGuestDto> {
    const { data } = await api.patch<EventGuestDto>(`/events/${eventId}/guests/${guestId}`, input);
    return data;
  }

  /** No borra: el invitado queda fuera de la lista y se puede regresar. */
  async remove(eventId: string, guestId: string): Promise<EventGuestDto> {
    const { data } = await api.delete<EventGuestDto>(`/events/${eventId}/guests/${guestId}`);
    return data;
  }

  async restore(eventId: string, guestId: string): Promise<EventGuestDto> {
    const { data } = await api.post<EventGuestDto>(`/events/${eventId}/guests/${guestId}/restore`);
    return data;
  }

  async bulkRemove(eventId: string, ids: string[]): Promise<BulkGuestsResult> {
    const { data } = await api.post<BulkGuestsResult>(`/events/${eventId}/guests/remove`, { ids });
    return data;
  }

  /**
   * Carga masiva (multipart): el Excel de la responsable (campo "file") o la
   * lista pegada (campo "text"). Sin `apply` solo regresa la vista previa.
   */
  async import(eventId: string, input: GuestImportInput, apply: boolean): Promise<GuestImportResult> {
    const formData = new FormData();
    if (input.file) formData.append('file', input.file);
    else if (input.text) formData.append('text', input.text);
    if (input.accessType?.trim()) formData.append('accessType', input.accessType.trim());
    if (apply) formData.append('apply', 'true');
    const { data } = await api.post<GuestImportResult>(`/events/${eventId}/guests/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }

  /** La lista completa en Excel (hojas INVITADOS y RESUMEN). */
  async exportXlsx(eventId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/events/${eventId}/guests/export.xlsx`, {
      responseType: 'blob',
    });
    return data;
  }
}

export const eventGuestsService = new EventGuestsService();
