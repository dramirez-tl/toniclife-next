// hooks/useDistributor.ts - React Query hooks para Centro de Negocio

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { distributorApi } from '@/services/distributorApi';
import type {
  RegisterMemberRequest,
  RegisterPreferredRequest,
} from '@/services/distributorApi';
import {
  DistributorProfile,
  PeriodPoints,
  NetworkSummary,
  DashboardResponse,
  RankRoadmapResponse,
} from '@/types/distributor';

// Query keys
export const distributorKeys = {
  all: ['distributor'] as const,
  dashboard: (periodId?: string) => [...distributorKeys.all, 'dashboard', periodId ?? 'current'] as const,
  profile: () => [...distributorKeys.all, 'profile'] as const,
  points: () => [...distributorKeys.all, 'points'] as const,
  rankRoadmap: (periodId?: string) => [...distributorKeys.all, 'rankRoadmap', periodId ?? 'current'] as const,
  networkSummary: () => [...distributorKeys.all, 'networkSummary'] as const,
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
    // Al cambiar de periodo se conserva el payload anterior mientras llega el
    // nuevo (la home atenúa las tarjetas en vez de volver al skeleton).
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Hook para obtener el perfil del distribuidor (periodo actual).
 * `enabled` permite usarlo solo como respaldo del agregado /dashboard.
 */
export function useDistributorProfile(enabled = true) {
  return useQuery<DistributorProfile>({
    queryKey: distributorKeys.profile(),
    queryFn: () => distributorApi.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled,
  });
}

/**
 * Hook para obtener los puntos del periodo actual.
 * `enabled` permite usarlo solo como respaldo del agregado /dashboard.
 */
export function usePeriodPoints(enabled = true) {
  return useQuery<PeriodPoints>({
    queryKey: distributorKeys.points(),
    queryFn: () => distributorApi.getPeriodPoints(),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

/**
 * Camino de rango del periodo (misiones del siguiente rango + patas).
 * periodId vacío = periodo actual en el backend.
 */
export function useRankRoadmap(periodId?: string, enabled = true) {
  return useQuery<RankRoadmapResponse>({
    queryKey: distributorKeys.rankRoadmap(periodId),
    queryFn: () => distributorApi.getRankRoadmap(periodId),
    staleTime: 5 * 60 * 1000,
    // Igual que useDashboard: al cambiar de periodo se conserva el payload
    // anterior (la home y RankRoadmap ya atenuan con isFetching) en vez de
    // colapsar el bloque "siguiente rango" a skeleton.
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Hook para obtener resumen de la red (periodo actual).
 * `enabled` permite usarlo solo como respaldo del agregado /dashboard.
 */
export function useNetworkSummary(enabled = true) {
  return useQuery<NetworkSummary>({
    queryKey: distributorKeys.networkSummary(),
    queryFn: () => distributorApi.getNetworkSummary(),
    staleTime: 5 * 60 * 1000,
    enabled,
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
 * Hook combinado del dashboard del distribuidor (home, chrome del panel,
 * /red y /ventas). Dispara SOLO el agregado GET /distributor/dashboard.
 *
 * Los endpoints individuales (/profile, /points, /network-summary) quedan como
 * RESPALDO y se piden únicamente cuando el agregado falló (antes se pedían
 * siempre y sus 7 payloads se descartaban en cada montaje). El respaldo es
 * del periodo actual (sin periodId), igual que antes.
 *
 * Sin periodId la clave es ['distributor','dashboard','current']: la home
 * debe pasar undefined cuando el periodo elegido es el actual para compartir
 * esa entrada con el sidebar/topnav y no pedir el mismo periodo dos veces.
 */
export function useDistributorDashboard(periodId?: string) {
  const dashboardQuery = useDashboard(periodId);

  // Respaldo solo con el agregado en error (fail-over real, no en paralelo).
  const fallbackEnabled = dashboardQuery.isError;
  const profileQuery = useDistributorProfile(fallbackEnabled);
  const pointsQuery = usePeriodPoints(fallbackEnabled);
  const networkQuery = useNetworkSummary(fallbackEnabled);

  const dashboard = dashboardQuery.data?.dashboard;
  const hasDashboardData = !!dashboard;

  return {
    // Datos del dashboard (agregado primero; respaldo individual si falló)
    profile: dashboard?.profile || profileQuery.data,
    points: dashboard?.points || pointsQuery.data,
    networkSummary: dashboard?.networkSummary || networkQuery.data,
    commissionsSummary: dashboard?.commissionsSummary,
    // Solo los lee /distribuidor/ventas; vienen únicamente en el agregado
    // (ya no hay respaldo /top-performers).
    salesSummary: dashboard?.salesSummary,
    topPerformers: dashboard?.topPerformers,
    // Comisiones del periodo anterior al resuelto (viene en el mismo payload;
    // evita una segunda llamada a /dashboard desde la home).
    previousPeriodCommissions: dashboardQuery.data?.previousPeriodCommissions ?? null,

    // Estados de carga: con placeholderData (keepPreviousData) el cambio de
    // periodo conserva el payload anterior => isLoading false + isRefreshing.
    // Las queries de respaldo deshabilitadas reportan isLoading=false.
    isLoading: hasDashboardData
      ? false
      : dashboardQuery.isLoading || profileQuery.isLoading || pointsQuery.isLoading,
    isRefreshing: dashboardQuery.isFetching,

    // Errores: solo mostrar error si el agregado Y el respaldo fallan
    isError: dashboardQuery.isError && profileQuery.isError,
    error: dashboardQuery.error,

    // refetch() de React Query ignora `enabled`: los respaldos solo se
    // reintentan si ya estaban activos (agregado en error).
    refetch: () => {
      dashboardQuery.refetch();
      if (fallbackEnabled) {
        profileQuery.refetch();
        pointsQuery.refetch();
        networkQuery.refetch();
      }
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
