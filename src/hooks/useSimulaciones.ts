import { useMutation, useQuery } from '@tanstack/react-query';
import { simulacionesService } from '@/services/simulaciones.service';
import type {
  RankProjectionRequest,
  RankProjectionResponse,
  RankRule,
} from '@/types/simulacion';

export const simulacionesKeys = {
  all: ['simulaciones'] as const,
  ranks: () => [...simulacionesKeys.all, 'ranks'] as const,
};

export const useSimulationRanks = () => {
  return useQuery<RankRule[]>({
    queryKey: simulacionesKeys.ranks(),
    queryFn: () => simulacionesService.listRanks(),
    staleTime: 30 * 60 * 1000, // 30 min — cambian rara vez
    gcTime: 60 * 60 * 1000,
  });
};

export const useRunRankProjection = () => {
  return useMutation<RankProjectionResponse, Error, RankProjectionRequest>({
    mutationFn: (dto) => simulacionesService.runRankProjection(dto),
  });
};
