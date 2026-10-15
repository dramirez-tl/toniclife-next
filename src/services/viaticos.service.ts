// viaticos.service.ts - Cliente del módulo de viáticos (API /viaticos).

import api from '@/lib/axios';
import type {
  ApproveViaticoDto,
  CancelViaticoDto,
  CreateViaticoDto,
  RejectViaticoDto,
  UpdateViaticoDto,
  Viatico,
  ViaticoListResponse,
  ViaticoQueryParams,
  ViaticoSummary,
} from '@/types/viaticos';

class ViaticosService {
  async getSummary(): Promise<ViaticoSummary> {
    const { data } = await api.get<ViaticoSummary>('/viaticos/summary');
    return data;
  }

  async list(params: ViaticoQueryParams = {}): Promise<ViaticoListResponse> {
    const { data } = await api.get<ViaticoListResponse>('/viaticos', { params });
    return data;
  }

  async getById(id: string): Promise<Viatico> {
    const { data } = await api.get<Viatico>(`/viaticos/${id}`);
    return data;
  }

  async create(dto: CreateViaticoDto): Promise<Viatico> {
    const { data } = await api.post<Viatico>('/viaticos', dto);
    return data;
  }

  async update(id: string, dto: UpdateViaticoDto): Promise<Viatico> {
    const { data } = await api.patch<Viatico>(`/viaticos/${id}`, dto);
    return data;
  }

  async cancel(id: string, dto: CancelViaticoDto = {}): Promise<Viatico> {
    const { data } = await api.post<Viatico>(`/viaticos/${id}/cancel`, dto);
    return data;
  }

  async approve(id: string, dto: ApproveViaticoDto = {}): Promise<Viatico> {
    const { data } = await api.post<Viatico>(`/viaticos/${id}/approve`, dto);
    return data;
  }

  async reject(id: string, dto: RejectViaticoDto): Promise<Viatico> {
    const { data } = await api.post<Viatico>(`/viaticos/${id}/reject`, dto);
    return data;
  }
}

export const viaticosService = new ViaticosService();
