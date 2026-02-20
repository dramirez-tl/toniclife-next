// services/commissionsApi.ts - API de comisiones MLM (axios)

import api from '@/lib/axios';
import type {
  Commission,
  CommissionSummary,
  CommissionsListResponse,
  CommissionFilters,
  CommissionPercentage,
  MonthlyCommissionTrend,
  CommissionType,
  CommissionStatus,
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
   * Aprueba comisiones (Admin)
   * Backend: POST /mlm/commissions/approve
   */
  async approveCommissions(commissionIds: string[]): Promise<{ approved: number }> {
    const { data } = await api.post<{ approved: number }>('/mlm/commissions/approve', { commissionIds });
    return data;
  }

  /**
   * Marca comisiones como pagadas (Admin)
   * Backend: POST /mlm/commissions/mark-paid
   */
  async markAsPaid(commissionIds: string[], paymentReference?: string): Promise<{ paid: number }> {
    const { data } = await api.post<{ paid: number }>('/mlm/commissions/mark-paid', {
      commissionIds,
      paymentReference,
    });
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
   * Obtiene resumen de comisiones para un periodo
   * Backend: GET /mlm/commissions?periodId=... (summary comes with list response)
   * TODO: No dedicated summary endpoint - uses list response summary field
   */
  async getSummary(periodId: string): Promise<CommissionSummary> {
    const { data } = await api.get<CommissionsListResponse>('/mlm/commissions', {
      params: { periodId, limit: '1' },
    });
    return data.summary;
  }

  /**
   * Obtiene proyeccion de comisiones para el periodo actual
   * TODO: Endpoint not implemented in backend
   */
  async getProjection(): Promise<any> {
    const { data } = await api.get('/mlm/commissions/projection');
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
   * Obtiene estructura de porcentajes de comisiones
   * Backend: GET /mlm/commissions/percentages
   */
  async getPercentages(): Promise<CommissionPercentage[]> {
    const { data } = await api.get<CommissionPercentage[]>('/mlm/commissions/percentages');
    return data;
  }

  /**
   * Obtiene tendencia mensual de comisiones
   * TODO: Endpoint not implemented in backend
   */
  async getMonthlyTrend(months: number = 6): Promise<MonthlyCommissionTrend[]> {
    const { data } = await api.get<MonthlyCommissionTrend[]>('/mlm/commissions/trend', {
      params: { months: months.toString() },
    });
    return data;
  }

  /**
   * Solicita pago de comisiones pendientes
   * TODO: Endpoint not implemented in backend
   */
  async requestPayment(commissionIds: string[]): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post<{ success: boolean; message: string }>(
      '/mlm/commissions/request-payment',
      { commissionIds },
    );
    return data;
  }

  /**
   * Descarga estado de cuenta en PDF
   * TODO: Endpoint not implemented in backend
   */
  async downloadStatement(periodId: string): Promise<Blob> {
    const { data } = await api.get<Blob>(`/mlm/commissions/statement/${periodId}`, {
      responseType: 'blob',
    });
    return data;
  }

  /**
   * Obtiene comisiones de un cliente especifico
   * Backend: GET /mlm/commissions/customer/:customerId
   */
  async getCustomerCommissions(customerId: string): Promise<Commission[]> {
    const { data } = await api.get<CommissionsListResponse>(`/mlm/commissions/customer/${customerId}`);
    // The backend returns CommissionListResponseDto with data field
    return (data as any).data ?? data;
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
   * Calcula comisiones para un periodo
   * Backend: POST /mlm/commissions/calculate
   * Expects: CalculateCommissionsDto { periodId, customerId?, recalculate? }
   */
  async calculateCommissions(dto: {
    periodId: string;
    customerId?: string;
    recalculate?: boolean;
  }): Promise<{ calculated: number; skipped: number; errors: string[] }> {
    const { data } = await api.post<{ calculated: number; skipped: number; errors: string[] }>(
      '/mlm/commissions/calculate',
      dto,
    );
    return data;
  }
}

export const commissionsApi = new CommissionsApi();
