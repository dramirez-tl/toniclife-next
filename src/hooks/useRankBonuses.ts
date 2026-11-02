// useRankBonuses.ts - Tesorería › Bonos de rango (2-nov-2026).
import { useQuery } from '@tanstack/react-query';
import { rankBonusesService } from '@/services/rank-bonuses.service';
import type { RankBonusesQuery } from '@/types/rank-bonuses';

export const rankBonusesKeys = {
  all: ['rank-bonuses'] as const,
  list: (query: RankBonusesQuery) => [...rankBonusesKeys.all, 'list', query] as const,
};

/** Bono Auto por rango (Platino+) del periodo: filas, totales por moneda y por rango. */
export function useRankBonuses(query: RankBonusesQuery = {}, enabled = true) {
  return useQuery({
    queryKey: rankBonusesKeys.list(query),
    queryFn: () => rankBonusesService.getRankBonuses(query),
    enabled,
    staleTime: 60 * 1000,
  });
}
