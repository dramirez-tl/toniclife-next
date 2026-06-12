'use client';

// useMaintenance.ts - Hooks React Query del módulo de mantenimiento
// (overview con conteos, limpieza por bloques, carga masiva CSV).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '@/services/maintenance.service';

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  overview: () => [...maintenanceKeys.all, 'overview'] as const,
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

export const useImportCsv = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, file }: { key: string; file: File }) =>
      maintenanceService.importCsv(key, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
};
