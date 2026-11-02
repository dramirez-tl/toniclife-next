// rank-bonuses.service.ts - Tesorería › Bonos de rango (2-nov-2026):
// GET /reports/rank-bonuses y su CSV. Periodo = commission_periods (por id o
// número), nunca mes calendario.

import api from '@/lib/api';
import type { RankBonusesQuery, RankBonusesResponse } from '@/types/rank-bonuses';

function params(query: RankBonusesQuery): Record<string, string | number> {
  return {
    ...(query.periodNumber ? { periodNumber: query.periodNumber } : {}),
    ...(query.periodId ? { periodId: query.periodId } : {}),
  };
}

export const rankBonusesService = {
  async getRankBonuses(query: RankBonusesQuery = {}): Promise<RankBonusesResponse> {
    const response = await api.get<RankBonusesResponse>('/reports/rank-bonuses', {
      params: params(query),
    });
    return response.data;
  },

  /** CSV de los bonos de rango del periodo (blob + nombre sugerido por el API). */
  async exportRankBonuses(
    query: RankBonusesQuery = {},
  ): Promise<{ blob: Blob; disposition: string | null }> {
    const res = await api.get<Blob>('/reports/rank-bonuses/export', {
      params: params(query),
      responseType: 'blob',
    });
    const disposition = (res.headers?.['content-disposition'] as string | undefined) ?? null;
    return { blob: res.data, disposition };
  },
};

export default rankBonusesService;
