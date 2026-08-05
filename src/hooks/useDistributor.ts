// hooks/useDistributor.ts - React Query hooks para Centro de Negocio

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { distributorApi } from '@/services/distributorApi';
import type {
  RegisterMemberRequest,
  RegisterPreferredRequest,
} from '@/services/distributorApi';
import {
  DistributorProfile,
  PeriodPoints,
  RankProgress,
  NetworkSummary,
  RecentActivity,
  TopPerformer,
  DashboardResponse,
  Goal,
} from '@/types/distributor';

// Query keys
export const distributorKeys = {
  all: ['distributor'] as const,
  dashboard: (periodId?: string) => [...distributorKeys.all, 'dashboard', periodId ?? 'current'] as const,
  profile: () => [...distributorKeys.all, 'profile'] as const,
  points: () => [...distributorKeys.all, 'points'] as const,
  rankProgress: () => [...distributorKeys.all, 'rankProgress'] as const,
  networkSummary: () => [...distributorKeys.all, 'networkSummary'] as const,
  activity: (limit: number) => [...distributorKeys.all, 'activity', limit] as const,
  topPerformers: (limit: number) => [...distributorKeys.all, 'topPerformers', limit] as const,
  goals: () => [...distributorKeys.all, 'goals'] as const,
  referralLink: () => [...distributorKeys.all, 'referralLink'] as const,
  preferences: () => [...distributorKeys.all, 'preferences'] as const,
};

/**
 * Hook para obtener el dashboard completo del distribuidor
 */
export function useDashboard(periodId?: string, enabled = true) {
  return useQuery<DashboardResponse>({
    queryKey: distributorKeys.dashboard(periodId),
    queryFn: () => distributorApi.getDashboard(periodId),
    staleTime: 2 * 60 * 1000, // 2 minutos
    enabled,
  });
}

/**
 * Hook para obtener el perfil del distribuidor
 */
export function useDistributorProfile() {
  return useQuery<DistributorProfile>({
    queryKey: distributorKeys.profile(),
    queryFn: () => distributorApi.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener los puntos del periodo actual
 */
export function usePeriodPoints() {
  return useQuery<PeriodPoints>({
    queryKey: distributorKeys.points(),
    queryFn: () => distributorApi.getPeriodPoints(),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener el progreso de rango
 */
export function useRankProgress() {
  return useQuery<RankProgress>({
    queryKey: distributorKeys.rankProgress(),
    queryFn: () => distributorApi.getRankProgress(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener resumen de la red
 */
export function useNetworkSummary() {
  return useQuery<NetworkSummary>({
    queryKey: distributorKeys.networkSummary(),
    queryFn: () => distributorApi.getNetworkSummary(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener actividad reciente
 */
export function useRecentActivity(limit: number = 10) {
  return useQuery<RecentActivity[]>({
    queryKey: distributorKeys.activity(limit),
    queryFn: () => distributorApi.getRecentActivity(limit),
    staleTime: 1 * 60 * 1000, // 1 minuto
  });
}

/**
 * Hook para obtener top performers
 */
export function useTopPerformers(limit: number = 5) {
  return useQuery<TopPerformer[]>({
    queryKey: distributorKeys.topPerformers(limit),
    queryFn: () => distributorApi.getTopPerformers(limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener las metas del distribuidor
 */
export function useGoals() {
  return useQuery<Goal[]>({
    queryKey: distributorKeys.goals(),
    queryFn: () => distributorApi.getGoals(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para generar enlace de referido
 */
export function useGenerateReferralLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => distributorApi.generateReferralLink(),
    onSuccess: (data) => {
      queryClient.setQueryData(distributorKeys.referralLink(), data);
    },
  });
}

/**
 * Hook para dar de alta un nuevo miembro en la red.
 * Al crearlo, invalida la red (downlines/tree) y el resumen de red.
 */
export function useRegisterMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: RegisterMemberRequest) =>
      distributorApi.registerMember(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network'] });
      queryClient.invalidateQueries({
        queryKey: distributorKeys.networkSummary(),
      });
    },
  });
}

/** Lista de clientes preferentes del distribuidor. */
export function usePreferredCustomers() {
  return useQuery({
    queryKey: [...distributorKeys.all, 'preferredCustomers'] as const,
    queryFn: () => distributorApi.getPreferredCustomers(),
    staleTime: 60 * 1000,
  });
}

/** Alta de un cliente preferente. */
export function useRegisterPreferred() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: RegisterPreferredRequest) =>
      distributorApi.registerPreferred(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...distributorKeys.all, 'preferredCustomers'],
      });
    },
  });
}

/**
 * Hook combinado para obtener todos los datos del dashboard de una vez
 * Útil para la página principal del Centro de Negocio
 */
export function useDistributorDashboard(periodId?: string) {
  const dashboardQuery = useDashboard(periodId);
  const profileQuery = useDistributorProfile();
  const pointsQuery = usePeriodPoints();
  const rankProgressQuery = useRankProgress();
  const networkQuery = useNetworkSummary();
  const activityQuery = useRecentActivity(5);
  const topPerformersQuery = useTopPerformers(5);
  const goalsQuery = useGoals();

  // Si el dashboard completo está disponible, usamos esos datos
  // De lo contrario, combinamos las queries individuales
  const dashboard = dashboardQuery.data?.dashboard;
  const hasDashboardData = !!dashboard;

  return {
    // Datos del dashboard
    profile: dashboard?.profile || profileQuery.data,
    points: dashboard?.points || pointsQuery.data,
    rankProgress: dashboard?.rankProgress || rankProgressQuery.data,
    networkSummary: dashboard?.networkSummary || networkQuery.data,
    salesSummary: dashboard?.salesSummary,
    commissionsSummary: dashboard?.commissionsSummary,
    recentActivity: dashboard?.recentActivity || activityQuery.data,
    topPerformers: dashboard?.topPerformers || topPerformersQuery.data,
    stats: dashboardQuery.data?.stats,
    goals: goalsQuery.data,
    lastUpdated: dashboardQuery.data?.lastUpdated,

    // Estados de carga: si el dashboard ya tiene datos, no bloquear por queries individuales
    isLoading: hasDashboardData
      ? false
      : dashboardQuery.isLoading || profileQuery.isLoading || pointsQuery.isLoading,
    isRefreshing: dashboardQuery.isFetching,

    // Errores: solo mostrar error si el dashboard Y los fallbacks fallan
    isError: dashboardQuery.isError && profileQuery.isError,
    error: dashboardQuery.error,

    // Funciones de refetch
    refetch: () => {
      dashboardQuery.refetch();
      profileQuery.refetch();
      pointsQuery.refetch();
      rankProgressQuery.refetch();
      networkQuery.refetch();
      activityQuery.refetch();
      topPerformersQuery.refetch();
    },
  };
}

/**
 * Preferencias del panel (idioma). Fuente de verdad = cuenta (users.language).
 */
export function useDistributorPreferences() {
  return useQuery({
    queryKey: distributorKeys.preferences(),
    queryFn: () => distributorApi.getPreferences(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUpdateDistributorPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (language: 'es' | 'en') =>
      distributorApi.updatePreferences(language),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: distributorKeys.preferences() });
    },
  });
}

/**
 * Hook para copiar el enlace de referido al portapapeles
 */
export function useCopyReferralLink() {
  return useMutation({
    mutationFn: async (link: string) => {
      await navigator.clipboard.writeText(link);
      return { success: true };
    },
  });
}

/**
 * Hook para compartir via Web Share API
 */
export function useShareReferralLink() {
  return useMutation({
    mutationFn: async ({
      link,
      title,
      text,
    }: {
      link: string;
      title: string;
      text: string;
    }) => {
      if (navigator.share) {
        await navigator.share({
          title,
          text,
          url: link,
        });
        return { success: true, method: 'native' };
      } else {
        // Fallback: copiar al portapapeles
        await navigator.clipboard.writeText(link);
        return { success: true, method: 'clipboard' };
      }
    },
  });
}
