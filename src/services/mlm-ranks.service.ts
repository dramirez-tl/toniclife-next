// MLM Ranks Service - Frontend API client for MLM ranks module
// Connects to: toniclife-api/src/modules/mlm/ranks

import api from '@/lib/axios';
import type {
  MlmRank,
  RankQualification,
  RankSummary,
  CreateRankDto,
  UpdateRankDto,
} from '@/types/mlm-ranks';

class MlmRanksService {
  /**
   * Get all ranks
   */
  async getRanks(): Promise<MlmRank[]> {
    const response = await api.get<MlmRank[]>('/mlm/ranks');
    return response.data;
  }

  /**
   * Get rank by ID
   */
  async getRankById(id: string): Promise<MlmRank> {
    const response = await api.get<MlmRank>(`/mlm/ranks/${id}`);
    return response.data;
  }

  /**
   * Create a new rank
   */
  async createRank(dto: CreateRankDto): Promise<MlmRank> {
    const response = await api.post<MlmRank>('/mlm/ranks', dto);
    return response.data;
  }

  /**
   * Update an existing rank
   */
  async updateRank(id: string, dto: UpdateRankDto): Promise<MlmRank> {
    const response = await api.put<MlmRank>(`/mlm/ranks/${id}`, dto);
    return response.data;
  }

  /**
   * Get rank qualification for a customer in a period
   */
  async getQualification(customerId: string, periodId: string): Promise<RankQualification> {
    const response = await api.get<RankQualification>(
      `/mlm/ranks/qualification/${customerId}/${periodId}`
    );
    return response.data;
  }

  /**
   * Get rank summary for a period
   */
  async getSummary(periodId: string): Promise<RankSummary> {
    const response = await api.get<RankSummary>(`/mlm/ranks/summary/${periodId}`);
    return response.data;
  }

  /**
   * Trigger rank calculation
   */
  async calculateRanks(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/mlm/ranks/calculate');
    return response.data;
  }
}

export const mlmRanksService = new MlmRanksService();
export default mlmRanksService;
