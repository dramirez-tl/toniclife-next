// hooks/useCommissions.ts - React Query hooks para comisiones MLM
// Aprobar / pagar / resumen de Tesorería: hooks/useTreasury.ts. Las
// mutaciones de Tesorería invalidan `commissionKeys.all`.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionsApi } from '@/services/commissionsApi';
import {
  CommissionFilters,
  CommissionsListResponse,
  CommissionPercentage,
  CommissionStructure,
  MonthlyCommissionTrend,
  CommissionLevelBreakdown,
} from '@/types/commissions';

// Query keys
export const commissionKeys = {
  all: ['commissions'] as const,
  lists: () => [...commissionKeys.all, 'list'] as const,
  list: (filters: CommissionFilters) => [...commissionKeys.lists(), filters] as const,
  adminList: (filters: CommissionFilters) => [...commissionKeys.all, 'admin', filters] as const,
  periods: () => [...commissionKeys.all, 'periods'] as const,
  percentages: () => [...commissionKeys.all, 'percentages'] as const,
  structure: (customerId: string, periodId?: string) => [...commissionKeys.all, 'structure', customerId, periodId] as const,
  trends: (customerId: string, months: number) => [...commissionKeys.all, 'trends', customerId, months] as const,
  levelBreakdown: (customerId: string, periodId: string) => [...commissionKeys.all, 'levelBreakdown', customerId, periodId] as const,
  customer: (customerId: string) => [...commissionKeys.all, 'customer', customerId] as const,
  currentPeriod: () => [...commissionKeys.all, 'currentPeriod'] as const,
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
 * Filtra una lista de periodos para mostrar SOLO hasta el actual (inclusive),
 * ocultando los periodos FUTUROS que aún no tienen datos. Se basa en el flag
 * `isCurrent` del propio listado: oculta los que empiezan después del actual.
 * Si ningún periodo está marcado como actual, devuelve la lista sin filtrar.
 */
export function periodsUpToCurrent<T extends Record<string, unknown>>(
  periods: T[],
): T[] {
  const current = periods.find((p) => (p as Record<string, unknown>).isCurrent);
  if (!current) return periods;
  const cur = current as Record<string, unknown>;
  const cs = String(cur.startDate ?? cur.start_date ?? '');
  const cn = Number(cur.periodNumber ?? cur.period_number ?? 0);
  return periods.filter((p) => {
    const row = p as Record<string, unknown>;
    const ps = String(row.startDate ?? row.start_date ?? '');
    if (cs && ps) return ps <= cs;
    const pn = Number(row.periodNumber ?? row.period_number ?? 0);
    if (cn > 0 && pn > 0) return pn <= cn;
    return true;
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
 * Hook para obtener estructura completa de comisiones (niveles + generaciones + contexto del usuario)
 * Acepta periodId opcional para obtener el rango del usuario en un periodo especifico
 */
export function useCommissionStructure(customerId: string, enabled = true, periodId?: string) {
  return useQuery<CommissionStructure>({
    queryKey: commissionKeys.structure(customerId, periodId),
    queryFn: () => commissionsApi.getCommissionStructure(customerId, periodId),
    enabled: enabled && !!customerId,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener tendencia mensual de un cliente
 */
export function useCommissionTrends(customerId: string, months: number = 6) {
  return useQuery<MonthlyCommissionTrend[]>({
    queryKey: commissionKeys.trends(customerId, months),
    queryFn: () => commissionsApi.getMonthlyTrend(customerId, months),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para el desglose exacto de comisión MLM por nivel
 */
export function useCommissionLevelBreakdown(
  customerId: string,
  periodId: string,
  enabled = true,
) {
  return useQuery<CommissionLevelBreakdown>({
    queryKey: commissionKeys.levelBreakdown(customerId, periodId),
    queryFn: () => commissionsApi.getLevelBreakdown(customerId, periodId),
    enabled: enabled && !!customerId && !!periodId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook para obtener el periodo actual (abierto)
 */
export function useCurrentPeriod() {
  return useQuery({
    queryKey: commissionKeys.currentPeriod(),
    queryFn: () => commissionsApi.getCurrentPeriod(),
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para obtener comisiones de un cliente específico con filtros
 */
export function useCustomerCommissions(
  customerId: string,
  filters: CommissionFilters = {},
  enabled = true,
) {
  return useQuery<CommissionsListResponse>({
    queryKey: [...commissionKeys.customer(customerId), filters],
    queryFn: () => commissionsApi.getCustomerCommissions(customerId, filters),
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
 * Hook para calcular comisiones (arranca el recálculo en segundo plano).
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

/**
 * Avance del recálculo del periodo. Hace polling cada 2.5s SOLO mientras el
 * backend reporta status 'running'; si está idle/done/error deja de refrescar.
 */
export function useCalculateProgress(periodId?: string) {
  return useQuery({
    queryKey: [...commissionKeys.all, 'calc-progress', periodId] as const,
    queryFn: () => commissionsApi.getCalculateProgress(periodId!),
    enabled: !!periodId,
    staleTime: 0,
    gcTime: 60 * 1000,
    refetchInterval: (query) =>
      query.state.data?.status === 'running' ? 2500 : false,
  });
}
