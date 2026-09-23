'use client';

// useMaintenance.ts - Hooks React Query del módulo de mantenimiento
// (overview con conteos, limpieza por bloques, carga masiva CSV).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '@/services/maintenance.service';
import { statusPollInterval } from '@/lib/legacy-sync/format';
import type {
  DecideLegacySyncHoldInput,
  LegacySyncHoldStatus,
} from '@/types/legacySync';

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  overview: () => [...maintenanceKeys.all, 'overview'] as const,
  loadJobs: () => [...maintenanceKeys.all, 'load-jobs'] as const,
  periodSales: (periodId: string) =>
    [...maintenanceKeys.all, 'period-sales', periodId] as const,
  legacySync: () => [...maintenanceKeys.all, 'legacy-sync'] as const,
  legacySyncStatus: () => [...maintenanceKeys.legacySync(), 'status'] as const,
  legacySyncRuns: (limit: number) =>
    [...maintenanceKeys.legacySync(), 'runs', limit] as const,
  legacySyncRun: (id: string) =>
    [...maintenanceKeys.legacySync(), 'run', id] as const,
  legacySyncHolds: (status: LegacySyncHoldStatus | 'all') =>
    [...maintenanceKeys.legacySync(), 'holds', status] as const,
};

// ── Sincronización legacy (pestaña /admin/sistema?tab=sync) ──

/** Polling del panel (§5.5): cada 60 s mientras la pestaña está visible. */
export const LEGACY_SYNC_POLL_MS = 60_000;

/**
 * Estado de la sincronización legacy->v2 (semáforo, última corrida, siguiente
 * ventana, "WhatsApp listo"). Sin reintentos: un 403 (rol sin acceso) o un 503
 * (migración 150 pendiente) se muestran de inmediato en vez de esperar tres
 * intentos; tras un 403 deja de consultar (p. ej. Comercial en la pestaña de
 * Inducción). `enabled` permite montarlo en otras pantallas sin consultar.
 */
export const useLegacySyncStatus = (opts: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: maintenanceKeys.legacySyncStatus(),
    queryFn: () => maintenanceService.getLegacySyncStatus(),
    enabled: opts.enabled ?? true,
    refetchInterval: (query) =>
      statusPollInterval(query.state.error, LEGACY_SYNC_POLL_MS),
    refetchIntervalInBackground: false,
    staleTime: 30 * 1000,
    retry: false,
  });

/** Últimas corridas de la bitácora (default 24). Mismo polling que el estado. */
export const useLegacySyncRuns = (limit = 24) =>
  useQuery({
    queryKey: maintenanceKeys.legacySyncRuns(limit),
    queryFn: () => maintenanceService.getLegacySyncRuns(limit),
    refetchInterval: LEGACY_SYNC_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 30 * 1000,
    retry: false,
  });

/** Detalle de una corrida (con legacySnapshot); solo cuando hay id. */
export const useLegacySyncRun = (id: string | null) =>
  useQuery({
    queryKey: maintenanceKeys.legacySyncRun(id ?? ''),
    queryFn: () => maintenanceService.getLegacySyncRun(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

/** Retenciones por doble identidad (default: pendientes) + SQL de renumeración. */
export const useLegacySyncHolds = (status: LegacySyncHoldStatus | 'all' = 'pending') =>
  useQuery({
    queryKey: maintenanceKeys.legacySyncHolds(status),
    queryFn: () => maintenanceService.getLegacySyncHolds(status),
    refetchInterval: LEGACY_SYNC_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 30 * 1000,
    retry: false,
  });

/** Decisión humana sobre una retención. Invalida estado, corridas y retenciones. */
export const useDecideHold = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DecideLegacySyncHoldInput }) =>
      maintenanceService.decideLegacySyncHold(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.legacySync() });
    },
  });
};

/** Interruptor "Sincronización automática" (legacy_sync.auto_enabled). */
export const useToggleLegacySync = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (autoEnabled: boolean) =>
      maintenanceService.setLegacySyncAutoEnabled(autoEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.legacySync() });
    },
  });
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

/** Arranca el PREVIEW del SYNC de clientes. Invalida load-jobs para el polling. */
export const useStartSyncPreview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => maintenanceService.startSyncPreview(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.loadJobs() });
    },
  });
};

/** Arranca el APPLY del SYNC de clientes (token del preview + force opcional). */
export const useStartSyncApply = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      token,
      force,
    }: {
      file: File;
      token: string;
      force: boolean;
    }) => maintenanceService.startSyncApply(file, token, force),
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
    mutationFn: ({
      periodId,
      revertStock,
    }: {
      periodId: string;
      revertStock?: boolean;
    }) => maintenanceService.resetPeriodSales(periodId, { revertStock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.all });
    },
  });
};
