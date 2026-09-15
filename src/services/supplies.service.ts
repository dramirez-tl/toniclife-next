// supplies.service.ts - Cliente de los INSUMOS de TI (consumibles).
// Rutas del API: /it-supplies. Misma instancia de axios que assets.service.ts.

import api from '@/lib/axios';
import type {
  CreateSupplyDto,
  CreateSupplyMovementDto,
  SupplyDetail,
  SupplyListResponse,
  SupplyMovementListResponse,
  SupplyMovementQueryParams,
  SupplyQueryParams,
  SupplyStats,
  UpdateSupplyDto,
} from '@/types/supply';

class SuppliesService {
  // ================================
  // INSUMOS
  // ================================

  async getSupplies(params?: SupplyQueryParams): Promise<SupplyListResponse> {
    const { data } = await api.get<SupplyListResponse>('/it-supplies', { params });
    return data;
  }

  async getStats(): Promise<SupplyStats> {
    const { data } = await api.get<SupplyStats>('/it-supplies/stats');
    return data;
  }

  /** Búsqueda por código escaneado: resuelve el supply_tag o el código de la etiqueta. */
  async getSupplyByTag(code: string): Promise<SupplyDetail> {
    const { data } = await api.get<SupplyDetail>(
      `/it-supplies/by-tag/${encodeURIComponent(code)}`,
    );
    return data;
  }

  async getSupplyById(id: string): Promise<SupplyDetail> {
    const { data } = await api.get<SupplyDetail>(`/it-supplies/${id}`);
    return data;
  }

  async createSupply(dto: CreateSupplyDto): Promise<SupplyDetail> {
    const { data } = await api.post<SupplyDetail>('/it-supplies', dto);
    return data;
  }

  async updateSupply(id: string, dto: UpdateSupplyDto): Promise<SupplyDetail> {
    const { data } = await api.patch<SupplyDetail>(`/it-supplies/${id}`, dto);
    return data;
  }

  /** Baja lógica (is_active = false); la bitácora se conserva. */
  async deleteSupply(id: string): Promise<SupplyDetail> {
    const { data } = await api.delete<SupplyDetail>(`/it-supplies/${id}`);
    return data;
  }

  async restoreSupply(id: string): Promise<SupplyDetail> {
    const { data } = await api.post<SupplyDetail>(`/it-supplies/${id}/restore`);
    return data;
  }

  // ================================
  // MOVIMIENTOS (bitácora)
  // ================================

  async getMovements(
    id: string,
    params?: SupplyMovementQueryParams,
  ): Promise<SupplyMovementListResponse> {
    const { data } = await api.get<SupplyMovementListResponse>(
      `/it-supplies/${id}/movements`,
      { params },
    );
    return data;
  }

  /** Registra entrada, consumo, desecho o ajuste; el API actualiza los contadores. */
  async addMovement(id: string, dto: CreateSupplyMovementDto): Promise<SupplyDetail> {
    const { data } = await api.post<SupplyDetail>(`/it-supplies/${id}/movements`, dto);
    return data;
  }

  // ================================
  // ETIQUETA
  // ================================

  /** Pega una etiqueta ya impresa al estante/caja del insumo. */
  async linkLabel(id: string, code: string): Promise<{ linked: boolean; code: string }> {
    const { data } = await api.post<{ linked: boolean; code: string }>(
      `/it-supplies/${id}/label`,
      { code },
    );
    return data;
  }

  async unlinkLabel(
    id: string,
    options?: { void?: boolean; reason?: string },
  ): Promise<{ unlinked: boolean; code: string | null }> {
    const { data } = await api.delete<{ unlinked: boolean; code: string | null }>(
      `/it-supplies/${id}/label`,
      { params: { void: options?.void ? 'true' : undefined, reason: options?.reason } },
    );
    return data;
  }

  /** Cuenta una impresión más de la etiqueta del insumo. */
  async markLabelPrinted(id: string): Promise<SupplyDetail> {
    const { data } = await api.post<SupplyDetail>(`/it-supplies/${id}/label/printed`);
    return data;
  }
}

export const suppliesService = new SuppliesService();
export default suppliesService;
