// hooks/useCommissions.ts - React Query hooks para comisiones MLM

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionsApi } from '@/services/commissionsApi';
import {
  Commission,
  CommissionFilters,
  CommissionsListResponse,
  CommissionSummary,
  CommissionPercentage,
  MonthlyCommissionTrend,
} from '@/types/commissions';

// Query keys
export const commissionKeys = {
  all: ['commissions'] as const,
  lists: () => [...commissionKeys.all, 'list'] as const,
  list: (filters: CommissionFilters) => [...commissionKeys.lists(), filters] as const,
  adminList: (filters: CommissionFilters) => [...commissionKeys.all, 'admin', filters] as const,
  summary: (periodId: string) => [...commissionKeys.all, 'summary', periodId] as const,
  projection: () => [...commissionKeys.all, 'projection'] as const,
  periods: () => [...commissionKeys.all, 'periods'] as const,
  percentages: () => [...commissionKeys.all, 'percentages'] as const,
  trends: (months: number) => [...commissionKeys.all, 'trends', months] as const,
  customer: (customerId: string) => [...commissionKeys.all, 'customer', customerId] as const,
};

/**
 * Hook para obtener lista de comisiones con filtros
 */
export function useCommissions(filters: CommissionFilters = {}) {
  return useQuery<CommissionsListResponse>({
    queryKey: commissionKeys.list(filters),
    queryFn: () => commissionsApi.getCommissions(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para obtener todas las comisiones (Admin)
 */
export function useAllCommissions(filters: CommissionFilters = {}) {
  return useQuery<CommissionsListResponse>({
    queryKey: commissionKeys.adminList(filters),
    queryFn: () => commissionsApi.getAllCommissions(filters),
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

/**
 * Hook para aprobar comisiones (Admin)
 */
export function useApproveCommissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commissionIds: string[]) => commissionsApi.approveCommissions(commissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.all });
    },
  });
}

/**
 * Hook para marcar comisiones como pagadas (Admin)
 */
export function useMarkCommissionsAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commissionIds: string[]) => commissionsApi.markAsPaid(commissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.all });
    },
  });
}

/**
 * Hook para obtener resumen de comisiones de un periodo
 */
export function useCommissionSummary(periodId: string) {
  return useQuery<CommissionSummary>({
    queryKey: commissionKeys.summary(periodId),
    queryFn: () => commissionsApi.getSummary(periodId),
    enabled: !!periodId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para obtener proyección de comisiones
 */
export function useCommissionProjection() {
  return useQuery({
    queryKey: commissionKeys.projection(),
    queryFn: () => commissionsApi.getProjection(),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obtener lista de periodos
 */
export function useCommissionPeriods() {
  return useQuery({
    queryKey: commissionKeys.periods(),
    queryFn: () => commissionsApi.getPeriods(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener estructura de porcentajes
 */
export function useCommissionPercentages() {
  return useQuery<CommissionPercentage[]>({
    queryKey: commissionKeys.percentages(),
    queryFn: () => commissionsApi.getPercentages(),
    staleTime: 30 * 60 * 1000, // 30 minutos (rara vez cambia)
  });
}

/**
 * Hook para obtener tendencia mensual
 */
export function useCommissionTrends(months: number = 6) {
  return useQuery<MonthlyCommissionTrend[]>({
    queryKey: commissionKeys.trends(months),
    queryFn: () => commissionsApi.getMonthlyTrend(months),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para solicitar pago de comisiones
 */
export function useRequestPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commissionIds: string[]) => commissionsApi.requestPayment(commissionIds),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: commissionKeys.all });
    },
  });
}

/**
 * Hook para descargar estado de cuenta
 */
export function useDownloadStatement() {
  return useMutation({
    mutationFn: async (periodId: string) => {
      const blob = await commissionsApi.downloadStatement(periodId);

      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `estado-cuenta-${periodId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { success: true };
    },
  });
}

/**
 * Hook combinado para obtener todos los datos de comisiones de una vez
 */
export function useCommissionsDashboard(periodId: string) {
  const commissionsQuery = useCommissions({ periodId });
  const projectionQuery = useCommissionProjection();
  const trendsQuery = useCommissionTrends(6);
  const percentagesQuery = useCommissionPercentages();

  return {
    commissions: commissionsQuery.data,
    projection: projectionQuery.data,
    trends: trendsQuery.data,
    percentages: percentagesQuery.data,
    isLoading:
      commissionsQuery.isLoading ||
      projectionQuery.isLoading ||
      trendsQuery.isLoading,
    isError:
      commissionsQuery.isError ||
      projectionQuery.isError ||
      trendsQuery.isError,
    error: commissionsQuery.error || projectionQuery.error || trendsQuery.error,
  };
}

/**
 * Hook para obtener comisiones de un cliente específico
 */
export function useCustomerCommissions(customerId: string, enabled = true) {
  return useQuery<Commission[]>({
    queryKey: commissionKeys.customer(customerId),
    queryFn: () => commissionsApi.getCustomerCommissions(customerId),
    enabled: enabled && !!customerId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook para actualizar un porcentaje de comisión
 */
export function useUpdateCommissionPercentage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CommissionPercentage> }) =>
      commissionsApi.updatePercentage(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.percentages() });
    },
  });
}

/**
 * Hook para calcular comisiones
 */
export function useCalculateCommissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: { periodId: string; customerId?: string; recalculate?: boolean }) =>
      commissionsApi.calculateCommissions(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commissionKeys.all });
    },
  });
}
