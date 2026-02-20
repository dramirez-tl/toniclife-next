// MLM Rollover Service - Frontend API client for MLM rollover module
// Connects to: toniclife-api/src/modules/mlm/rollover

import api from '@/lib/axios';
import type {
  RolloverStatus,
  RolloverStats,
  RolloverHistory,
  EffectiveSponsor,
} from '@/types/mlm-rollover';

class MlmRolloverService {
  /**
   * Get rollover status for a period
   */
  async getStatus(periodId: string): Promise<RolloverStatus> {
    const response = await api.get<RolloverStatus>(`/mlm/rollover/status/${periodId}`);
    return response.data;
  }

  /**
   * Get rollover stats for a period
   */
  async getStats(periodId: string): Promise<RolloverStats> {
    const response = await api.get<RolloverStats>(`/mlm/rollover/stats/${periodId}`);
    return response.data;
  }

  /**
   * Get rollover history for a customer
   */
  async getHistory(customerId: string): Promise<RolloverHistory[]> {
    const response = await api.get<RolloverHistory[]>(`/mlm/rollover/history/${customerId}`);
    return response.data;
  }

  /**
   * Get effective sponsor for a customer
   */
  async getEffectiveSponsor(customerId: string): Promise<EffectiveSponsor> {
    const response = await api.get<EffectiveSponsor>(
      `/mlm/rollover/effective-sponsor/${customerId}`
    );
    return response.data;
  }

  /**
   * Trigger rollover calculation for a period
   */
  async calculate(periodId: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      `/mlm/rollover/calculate/${periodId}`
    );
    return response.data;
  }
}

export const mlmRolloverService = new MlmRolloverService();
export default mlmRolloverService;
