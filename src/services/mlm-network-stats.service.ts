// MLM Network Stats Service - Frontend API client for MLM network stats module
// Connects to: toniclife-api/src/modules/mlm/network-stats

import api from '@/lib/axios';
import type {
  NetworkStats,
  NetworkStatsStatus,
  TopPerformer,
} from '@/types/mlm-network-stats';

class MlmNetworkStatsService {
  /**
   * Get stats for a specific customer
   */
  async getCustomerStats(customerId: string): Promise<NetworkStats> {
    const response = await api.get<NetworkStats>(
      `/mlm/network-stats/customer/${customerId}`
    );
    return response.data;
  }

  /**
   * Get network stats refresh status
   */
  async getStatus(): Promise<NetworkStatsStatus> {
    const response = await api.get<NetworkStatsStatus>('/mlm/network-stats/status');
    return response.data;
  }

  /**
   * Get top performers by business points
   */
  async getTopByBusinessPoints(): Promise<TopPerformer[]> {
    const response = await api.get<TopPerformer[]>('/mlm/network-stats/top/business-points');
    return response.data;
  }

  /**
   * Get top performers by network size
   */
  async getTopByNetworkSize(): Promise<TopPerformer[]> {
    const response = await api.get<TopPerformer[]>('/mlm/network-stats/top/network-size');
    return response.data;
  }

  /**
   * Trigger network stats refresh
   */
  async refresh(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/mlm/network-stats/refresh');
    return response.data;
  }
}

export const mlmNetworkStatsService = new MlmNetworkStatsService();
export default mlmNetworkStatsService;
