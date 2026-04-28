import api from '@/lib/axios';
import type {
  RankProjectionRequest,
  RankProjectionResponse,
  RankRule,
} from '@/types/simulacion';

class SimulacionesService {
  private basePath = '/simulations';

  async listRanks(): Promise<RankRule[]> {
    const { data } = await api.get<RankRule[]>(`${this.basePath}/ranks`);
    return data;
  }

  async runRankProjection(
    dto: RankProjectionRequest,
  ): Promise<RankProjectionResponse> {
    const { data } = await api.post<RankProjectionResponse>(
      `${this.basePath}/rank-projection`,
      dto,
    );
    return data;
  }
}

export const simulacionesService = new SimulacionesService();
