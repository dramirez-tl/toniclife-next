// events.service.ts - Eventos con venta de boletos (admin + boleto público).
// Backend: /events (alta, edición, sucursales, boletos, entrada) y
// /public/events/tickets/:token (boleto público, sin sesión).
import api from '@/lib/api';
import type {
  CheckInInput,
  CheckInResultDto,
  CreateEventInput,
  EventBranchAllotment,
  EventBranchDto,
  EventDto,
  EventListResponseDto,
  EventProductDto,
  EventQuery,
  EventTicketsQuery,
  EventTicketsResponseDto,
  PublicTicketDto,
  TicketEmailResultDto,
  UpdateEventInput,
  UpsertEventProductInput,
} from '@/types/events';

/**
 * El boleto público se consulta con fetch directo (igual que los formularios
 * públicos): el cliente axios lleva interceptores de sesión que no tienen
 * sentido para un asistente sin cuenta.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Error del boleto público con el status HTTP (404 = no existe). */
export class PublicTicketError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'PublicTicketError';
    this.status = status;
  }
}

class EventsService {
  async list(query: EventQuery = {}): Promise<EventListResponseDto> {
    const params: Record<string, string> = {};
    if (query.status) params.status = query.status;
    if (query.search) params.search = query.search;
    if (query.page) params.page = String(query.page);
    if (query.limit) params.limit = String(query.limit);
    const { data } = await api.get<EventListResponseDto>('/events', { params });
    return data;
  }

  async getById(id: string): Promise<EventDto> {
    const { data } = await api.get<EventDto>(`/events/${id}`);
    return data;
  }

  async create(input: CreateEventInput): Promise<EventDto> {
    const { data } = await api.post<EventDto>('/events', input);
    return data;
  }

  async update(id: string, input: UpdateEventInput): Promise<EventDto> {
    const { data } = await api.patch<EventDto>(`/events/${id}`, input);
    return data;
  }

  async getBranches(id: string): Promise<EventBranchDto[]> {
    const { data } = await api.get<EventBranchDto[]>(`/events/${id}/branches`);
    return data;
  }

  /** Reemplazo COMPLETO: las sucursales que no vienen se desactivan. */
  async setBranches(id: string, branches: EventBranchAllotment[]): Promise<EventBranchDto[]> {
    const { data } = await api.put<EventBranchDto[]>(`/events/${id}/branches`, { branches });
    return data;
  }

  // ── Claves que generan boletos (mig 155) ──

  async getProducts(id: string): Promise<EventProductDto[]> {
    const { data } = await api.get<EventProductDto[]>(`/events/${id}/products`);
    return data;
  }

  /** Upsert: el mismo productId actualiza boletos por unidad y etiqueta. */
  async upsertProduct(id: string, input: UpsertEventProductInput): Promise<EventProductDto[]> {
    const { data } = await api.post<EventProductDto[]>(`/events/${id}/products`, input);
    return data;
  }

  /** 400 EVENT_MAIN_PRODUCT si es la clave principal. */
  async removeProduct(id: string, productId: string): Promise<EventProductDto[]> {
    const { data } = await api.delete<EventProductDto[]>(`/events/${id}/products/${productId}`);
    return data;
  }

  // ── Imagen / flyer ──

  /**
   * Sube la imagen/flyer (multipart, campo "image": jpg/png/webp ≤ 5 MB) a S3.
   * Regresa la ficha ya con `imageUrl` pública (GET /public/events/:id/image).
   * Quitarla es `update(id, { imageUrl: null })`.
   */
  async uploadImage(
    id: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<EventDto> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post<EventDto>(`/events/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (evt) => {
            const total = evt.total ?? file.size;
            if (total > 0) onProgress(Math.min(100, Math.round((evt.loaded / total) * 100)));
          }
        : undefined,
    });
    return data;
  }

  async getTickets(id: string, query: EventTicketsQuery = {}): Promise<EventTicketsResponseDto> {
    const params: Record<string, string> = {};
    if (query.status) params.status = query.status;
    if (query.search) params.search = query.search;
    if (query.branchId) params.branchId = query.branchId;
    if (query.page) params.page = String(query.page);
    if (query.limit) params.limit = String(query.limit);
    const { data } = await api.get<EventTicketsResponseDto>(`/events/${id}/tickets`, { params });
    return data;
  }

  async resendTicketEmail(id: string, ticketId: string, to?: string): Promise<TicketEmailResultDto> {
    const { data } = await api.post<TicketEmailResultDto>(
      `/events/${id}/tickets/${ticketId}/email`,
      to ? { to } : {},
    );
    return data;
  }

  async checkIn(id: string, input: CheckInInput): Promise<CheckInResultDto> {
    const { data } = await api.post<CheckInResultDto>(`/events/${id}/check-in`, input);
    return data;
  }

  /** Boleto público (sin sesión). Lanza PublicTicketError con el status. */
  async getPublicTicket(token: string): Promise<PublicTicketDto> {
    const res = await fetch(`${API_BASE}/public/events/tickets/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new PublicTicketError(
        res.status,
        res.status === 404 ? 'Boleto no encontrado' : 'No se pudo cargar el boleto',
      );
    }
    return (await res.json()) as PublicTicketDto;
  }
}

export const eventsService = new EventsService();
