// Hooks de IMPULSA (la ruta de los primeros 90 días, por Victorias).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { impulsaService } from '@/services/impulsa.service';
import type {
  ImpulsaActivityMetric,
  ImpulsaAdminQuery,
  ImpulsaCard,
  ImpulsaVictoryDetail,
} from '@/types/impulsa';

export const impulsaKeys = {
  all: ['impulsa'] as const,
  overview: ['impulsa', 'me'] as const,
  victory: (number: number) => ['impulsa', 'victory', number] as const,
  team: ['impulsa', 'team'] as const,
  adminSummary: (query: Pick<ImpulsaAdminQuery, 'from' | 'to'>) => ['impulsa', 'admin', 'summary', query] as const,
  adminParticipants: (query: ImpulsaAdminQuery) => ['impulsa', 'admin', 'participants', query] as const,
  adminCatalog: ['impulsa', 'admin', 'catalog'] as const,
};

export function useImpulsaOverview(enabled = true) {
  return useQuery({
    queryKey: impulsaKeys.overview,
    queryFn: () => impulsaService.getOverview(),
    enabled,
    staleTime: 60_000,
    // Sin perfil de distribuidor el API contesta 403: no tiene caso reintentar.
    retry: false,
  });
}

export function useImpulsaVictory(number: number) {
  return useQuery({
    queryKey: impulsaKeys.victory(number),
    queryFn: () => impulsaService.getVictory(number),
    enabled: Number.isInteger(number) && number >= 1 && number <= 6,
    retry: false,
  });
}

export function useImpulsaTeam() {
  return useQuery({
    queryKey: impulsaKeys.team,
    queryFn: () => impulsaService.getTeam(),
    retry: false,
  });
}

/**
 * Guardar en la Tarjeta de Ruta de una Victoria. El API devuelve la tarjeta como quedó: se pone
 * en la pantalla sin volver a pedir toda la Victoria, y la portada se refresca aparte.
 */
function useCardMutation<TVariables>(number: number, mutationFn: (variables: TVariables) => Promise<ImpulsaCard>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (card) => {
      queryClient.setQueryData<ImpulsaVictoryDetail>(impulsaKeys.victory(number), (old) =>
        old ? { ...old, card } : old,
      );
      void queryClient.invalidateQueries({ queryKey: impulsaKeys.overview });
    },
  });
}

export function useImpulsaSetCheck(number: number) {
  return useCardMutation(number, ({ key, checked }: { key: string; checked: boolean }) =>
    impulsaService.setCheck(key, checked),
  );
}

export function useImpulsaAddActivity(number: number) {
  return useCardMutation(number, ({ metric, delta }: { metric: ImpulsaActivityMetric; delta: 1 | -1 }) =>
    impulsaService.addActivity(metric, delta),
  );
}

export function useImpulsaSetNextAction(number: number) {
  return useCardMutation(number, ({ date, note }: { date: string | null; note: string | null }) =>
    impulsaService.setNextAction(date, note),
  );
}

export function useImpulsaSetCommitment(number: number) {
  return useCardMutation(number, (accepted: boolean) => impulsaService.setCommitment(accepted));
}

// ===== Comercial =====

export function useImpulsaAdminSummary(query: Pick<ImpulsaAdminQuery, 'from' | 'to'>) {
  return useQuery({
    queryKey: impulsaKeys.adminSummary(query),
    queryFn: () => impulsaService.getAdminSummary(query),
  });
}

export function useImpulsaAdminParticipants(query: ImpulsaAdminQuery) {
  return useQuery({
    queryKey: impulsaKeys.adminParticipants(query),
    queryFn: () => impulsaService.getAdminParticipants(query),
    placeholderData: (previous) => previous,
  });
}

export function useImpulsaAdminCatalog() {
  return useQuery({
    queryKey: impulsaKeys.adminCatalog,
    queryFn: () => impulsaService.getAdminCatalog(),
    staleTime: 60_000,
  });
}

export function useImpulsaSetDayZero() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerNumber, date, note }: { customerNumber: string; date: string | null; note: string | null }) =>
      impulsaService.setDayZero(customerNumber, date, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: impulsaKeys.all });
    },
  });
}
