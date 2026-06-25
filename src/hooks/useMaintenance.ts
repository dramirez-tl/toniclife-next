'use client';

// useMaintenance.ts - Hooks React Query del módulo de mantenimiento
// (overview con conteos, limpieza por bloques, carga masiva CSV).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '@/services/maintenance.service';

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  overview: () => [...maintenanceKeys.all, 'overview'] as const,
  loadJobs: () => [...maintenanceKeys.all, 'load-jobs'] as const,
  periodSales: (periodId: string) =>
    [...maintenanceKeys.all, 'period-sales', periodId] as const,
};

export const useMaintenanceOverview = () =>
  useQuery({
    queryKey: maintenanceKeys.overview(),
    queryFn: () => maintenanceService.getOverview(),
    staleTime: 15 * 1000,
    gcTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useRunCleanupBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blockId: number) =>
      maintenanceService.runCleanupBlock(blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
};

/**
 * Lista los jobs de carga vivos. Hace polling cada 2.5s SOLO mientras haya un
 * job corriendo (si no, no consulta). Es la fuente de verdad del progreso: al
 * recargar/navegar la UI se reconecta a la carga que sigue en el backend.
 */
export const useLoadJobs = () =>
  useQuery({
    queryKey: maintenanceKeys.loadJobs(),
    queryFn: () => maintenanceService.getLoadJobs(),
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === 'running') ? 2500 : false,
    staleTime: 0,
    gcTime: 10 * 1000,
  });

/**
 * Arranca una carga en segundo plano. Solo dispara el POST; el progreso lo sigue
 * useLoadJobs. Al arrancar invalida la lista de jobs para que el polling empiece.
 */
export const useStartImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, file }: { key: string; file: File }) =>
      maintenanceService.startImport(key, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.loadJobs() });
    },
  });
};

/** Previsualiza las ventas de un periodo (solo cuando hay periodId). */
export const usePeriodSalesPreview = (periodId: string | null) =>
  useQuery({
    queryKey: maintenanceKeys.periodSales(periodId ?? ''),
    queryFn: () => maintenanceService.getPeriodSalesPreview(periodId as string),
    enabled: !!periodId,
    staleTime: 10 * 1000,
    gcTime: 30 * 1000,
  });

/** Resetea (borra) las ventas de un periodo. Invalida overview + preview. */
export const useResetPeriodSales = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodId: string) =>
      maintenanceService.resetPeriodSales(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
};
