// services/commissionsApi.ts - API de comisiones MLM (axios)
// Aprobar / pagar / resumen / detalle de Tesorería viven en
// services/treasury.service.ts (contrato Tesorería §4.1). Aquí solo queda lo
// que consumen el panel del distribuidor y el recálculo de MLM.

import api from '@/lib/axios';
import type {
  CommissionsListResponse,
  CommissionFilters,
  CommissionPercentage,
  CommissionStructure,
  MonthlyCommissionTrend,
  CommissionLevelBreakdown,
} from '@/types/commissions';

// ===== API SERVICE =====

class CommissionsApi {
  /**
   * Obtiene lista de todas las comisiones (Admin)
   * Backend: GET /mlm/commissions
   * Returns: CommissionListResponseDto { data, summary, total, page, limit, totalPages }
   */
  async getAllCommissions(filters: CommissionFilters = {}): Promise<CommissionsListResponse> {
    const params: Record<string, string> = {};
    if (filters.periodId) params.periodId = filters.periodId;
    if (filters.commissionType) params.commissionType = filters.commissionType;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page.toString();
    if (filters.limit) params.limit = filters.limit.toString();

    const { data } = await api.get<CommissionsListResponse>('/mlm/commissions', { params });
    return data;
  }

  /**
   * Obtiene lista de comisiones con filtros (para un cliente)
   * Backend: GET /mlm/commissions (same endpoint, filters determine scope)
   */
  async getCommissions(filters: CommissionFilters = {}): Promise<CommissionsListResponse> {
    const params: Record<string, string> = {};
    if (filters.periodId) params.periodId = filters.periodId;
    if (filters.commissionType) params.commissionType = filters.commissionType;
    if (filters.status) params.status = filters.status;
    if (filters.page) params.page = filters.page.toString();
    if (filters.limit) params.limit = filters.limit.toString();

    const { data } = await api.get<CommissionsListResponse>('/mlm/commissions', { params });
    return data;
  }

  /**
   * Obtiene lista de periodos disponibles
   * Backend: GET /mlm/periods
   */
  async getPeriods(): Promise<any[]> {
    const { data } = await api.get<any[]>('/mlm/periods');
    return data;
  }

  /**
   * Obtiene el periodo actual (abierto)
   * Backend: GET /mlm/periods/current
   */
  async getCurrentPeriod(): Promise<any> {
    const { data } = await api.get('/mlm/periods/current');
    return data;
  }

  /**
   * Obtiene estructura de porcentajes de comisiones
   * Backend: GET /mlm/commissions/percentages
   */
  async getPercentages(): Promise<CommissionPercentage[]> {
    const { data } = await api.get<CommissionPercentage[]>('/mlm/commissions/percentages');
    return data;
  }

  /**
   * Obtiene estructura completa de comisiones (niveles + generaciones + contexto del usuario)
   * Backend: GET /mlm/commissions/structure/:customerId?periodId=...
   */
  async getCommissionStructure(customerId: string, periodId?: string): Promise<CommissionStructure> {
    const params: Record<string, string> = {};
    if (periodId) params.periodId = periodId;
    const { data } = await api.get<CommissionStructure>(`/mlm/commissions/structure/${customerId}`, { params });
    return data;
  }

  /**
   * Obtiene tendencia mensual de comisiones de un cliente
   * Backend: GET /mlm/commissions/customer/:customerId/trend
   * Montos ya convertidos a la moneda del distribuidor.
   */
  async getMonthlyTrend(customerId: string, months: number = 6): Promise<MonthlyCommissionTrend[]> {
    const { data } = await api.get<MonthlyCommissionTrend[]>(
      `/mlm/commissions/customer/${customerId}/trend`,
      { params: { months: months.toString() } },
    );
    return data;
  }

  /**
   * Obtiene comisiones de un cliente especifico con filtros
   * Backend: GET /mlm/commissions/customer/:customerId
   * Returns: CommissionListResponseDto { data, summary, total, page, limit, totalPages }
   */
  async getCustomerCommissions(
    customerId: string,
    filters: CommissionFilters = {},
  ): Promise<CommissionsListResponse> {
    const params: Record<string, string> = {};
    if (filters.periodId) params.periodId = filters.periodId;
    if (filters.commissionType) params.commissionType = filters.commissionType;
    if (filters.status) params.status = filters.status;
    if (filters.page) params.page = filters.page.toString();
    if (filters.limit) params.limit = filters.limit.toString();

    const { data } = await api.get<CommissionsListResponse>(
      `/mlm/commissions/customer/${customerId}`,
      { params },
    );
    return data;
  }

  /**
   * Obtiene el desglose exacto de la comisión MLM por nivel de red
   * Backend: GET /mlm/commissions/customer/:customerId/level-breakdown?periodId=...
   */
  async getLevelBreakdown(
    customerId: string,
    periodId: string,
  ): Promise<CommissionLevelBreakdown> {
    const { data } = await api.get<CommissionLevelBreakdown>(
      `/mlm/commissions/customer/${customerId}/level-breakdown`,
      { params: { periodId } },
    );
    return data;
  }

  /**
   * Actualiza un porcentaje de comision
   * Backend: PATCH /mlm/commissions/percentages/:id
   */
  async updatePercentage(id: string, dto: Partial<CommissionPercentage>): Promise<CommissionPercentage> {
    const { data } = await api.patch<CommissionPercentage>(`/mlm/commissions/percentages/${id}`, dto);
    return data;
  }

  /**
   * Calcula comisiones para un periodo.
   * Backend: POST /mlm/commissions/calculate
   * Sin customerId el backend ARRANCA el recálculo en segundo plano y responde
   * { started: true }; el avance se consulta con getCalculateProgress.
   */
  async calculateCommissions(dto: {
    periodId: string;
    customerId?: string;
    recalculate?: boolean;
  }): Promise<CalculateStartResponse> {
    const { data } = await api.post<CalculateStartResponse>(
      '/mlm/commissions/calculate',
      dto,
    );
    return data;
  }

  /**
   * Avance del recálculo del periodo (polling).
   * Backend: GET /mlm/commissions/calculate/progress/:periodId
   */
  async getCalculateProgress(periodId: string): Promise<CalculateProgress> {
    const { data } = await api.get<CalculateProgress>(
      `/mlm/commissions/calculate/progress/${periodId}`,
    );
    return data;
  }
}

export interface CalculateStartResponse {
  started: boolean;
  alreadyRunning?: boolean;
  calculated?: number;
  skipped?: number;
  errors?: string[];
}

export interface CalculateProgress {
  status: 'idle' | 'running' | 'done' | 'error';
  phase?: 'grupo' | 'comisiones';
  percent?: number;
  processed?: number;
  total?: number;
  startedAt?: string;
  finishedAt?: string;
  calculated?: number;
  skipped?: number;
  errorsCount?: number;
  error?: string;
}

export const commissionsApi = new CommissionsApi();
