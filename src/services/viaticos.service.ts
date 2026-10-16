// viaticos.service.ts - Cliente del módulo de viáticos (API /viaticos).

import api from '@/lib/axios';
import type {
  ApproveViaticoDto,
  CancelViaticoDto,
  CreateViaticoDto,
  RejectViaticoDto,
  SubmitViaticoProofDto,
  UpdateViaticoDto,
  Viatico,
  ViaticoConceptCatalog,
  ViaticoFileKind,
  ViaticoFileUrl,
  ViaticoListResponse,
  ViaticoQueryParams,
  ViaticoSummary,
} from '@/types/viaticos';

class ViaticosService {
  async getSummary(): Promise<ViaticoSummary> {
    const { data } = await api.get<ViaticoSummary>('/viaticos/summary');
    return data;
  }

  async getConcepts(): Promise<ViaticoConceptCatalog> {
    const { data } = await api.get<ViaticoConceptCatalog>('/viaticos/concepts');
    return data;
  }

  /** Excel con los mismos filtros del listado (hojas Solicitudes + Detalle por día). */
  async exportXlsx(params: ViaticoQueryParams = {}): Promise<Blob> {
    const { status, mine, search, from, to } = params;
    const { data } = await api.get<Blob>('/viaticos/export.xlsx', {
      params: { status, mine, search, from, to },
      responseType: 'blob',
    });
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

  // ---- Comprobación (mig 158) ----

  /** Sube comprobantes (receipt) o la ficha de devolución (refund). */
  async uploadFiles(id: string, kind: ViaticoFileKind, files: File[]): Promise<Viatico> {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    const { data } = await api.post<Viatico>(`/viaticos/${id}/files`, form, {
      params: { kind },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    });
    return data;
  }

  async deleteFile(id: string, fileId: string): Promise<Viatico> {
    const { data } = await api.delete<Viatico>(`/viaticos/${id}/files/${fileId}`);
    return data;
  }

  /** URL firmada (10 min) para ver/descargar un archivo. */
  async getFileUrl(id: string, fileId: string): Promise<ViaticoFileUrl> {
    const { data } = await api.get<ViaticoFileUrl>(`/viaticos/${id}/files/${fileId}/url`);
    return data;
  }

  async submitProof(id: string, dto: SubmitViaticoProofDto): Promise<Viatico> {
    const { data } = await api.post<Viatico>(`/viaticos/${id}/proof`, dto);
    return data;
  }

  async verifyProof(id: string, notes?: string): Promise<Viatico> {
    const { data } = await api.post<Viatico>(`/viaticos/${id}/proof/verify`, { notes });
    return data;
  }

  async returnProof(id: string, reason: string): Promise<Viatico> {
    const { data } = await api.post<Viatico>(`/viaticos/${id}/proof/return`, { reason });
    return data;
  }
}

export const viaticosService = new ViaticosService();
