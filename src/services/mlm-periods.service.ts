// MLM Periods Service - Frontend API client for MLM periods module
// Connects to: toniclife-api/src/modules/mlm/periods

import api from '@/lib/axios';
import type {
  MlmPeriod,
  CreatePeriodDto,
  UpdatePeriodDto,
  PeriodPreview,
  PeriodExchangeRatesResponse,
  PeriodFxSnapshotResult,
} from '@/types/mlm-periods';

class MlmPeriodsService {
  /**
   * Get all periods
   */
  async getPeriods(): Promise<MlmPeriod[]> {
    const response = await api.get<MlmPeriod[]>('/mlm/periods');
    return response.data;
  }

  /**
   * Get current active period
   */
  async getCurrentPeriod(): Promise<MlmPeriod> {
    const response = await api.get<MlmPeriod>('/mlm/periods/current');
    return response.data;
  }

  /**
   * Get period by ID
   */
  async getPeriodById(id: string): Promise<MlmPeriod> {
    const response = await api.get<MlmPeriod>(`/mlm/periods/${id}`);
    return response.data;
  }

  /**
   * Preview the 12 periods of a year with the business-day close rule applied
   * (does not persist). Shows which closes shift and why.
   */
  async previewYear(year: number): Promise<PeriodPreview[]> {
    const response = await api.get<PeriodPreview[]>('/mlm/periods/preview', {
      params: { year },
    });
    return response.data;
  }

  /**
   * Create a new period
   */
  async createPeriod(dto: CreatePeriodDto): Promise<MlmPeriod> {
    const response = await api.post<MlmPeriod>('/mlm/periods', dto);
    return response.data;
  }

  /**
   * Update an existing period
   */
  async updatePeriod(id: string, dto: UpdatePeriodDto): Promise<MlmPeriod> {
    const response = await api.put<MlmPeriod>(`/mlm/periods/${id}`, dto);
    return response.data;
  }

  /**
   * Generate periods automatically
   */
  async generatePeriods(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/mlm/periods/generate');
    return response.data;
  }

  /**
   * Close a period
   */
  async closePeriod(id: string): Promise<MlmPeriod> {
    const response = await api.post<MlmPeriod>(`/mlm/periods/${id}/close`, { confirm: true });
    return response.data;
  }

  /**
   * Reopen a closed period
   */
  async reopenPeriod(id: string): Promise<MlmPeriod> {
    const response = await api.post<MlmPeriod>(`/mlm/periods/${id}/reopen`);
    return response.data;
  }

  /**
   * Exchange rates (X→MXN) frozen for a period, one row per active-country currency
   */
  async getExchangeRates(id: string): Promise<PeriodExchangeRatesResponse> {
    const response = await api.get<PeriodExchangeRatesResponse>(
      `/mlm/periods/${id}/exchange-rates`
    );
    return response.data;
  }

  /**
   * Manual override of one currency rate (open periods only)
   */
  async setExchangeRate(
    id: string,
    currencyCode: string,
    rateToMxn: number
  ): Promise<PeriodExchangeRatesResponse> {
    const response = await api.put<PeriodExchangeRatesResponse>(
      `/mlm/periods/${id}/exchange-rates/${currencyCode}`,
      { rateToMxn }
    );
    return response.data;
  }

  /**
   * Fetch live rates from the FX provider: fills missing + refreshes auto rates.
   * Never touches manual rates. Open periods only.
   */
  async refreshExchangeRates(id: string): Promise<PeriodFxSnapshotResult> {
    const response = await api.post<PeriodFxSnapshotResult>(
      `/mlm/periods/${id}/exchange-rates/refresh`
    );
    return response.data;
  }
}

export const mlmPeriodsService = new MlmPeriodsService();
export default mlmPeriodsService;
