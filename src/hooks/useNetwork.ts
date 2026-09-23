// hooks/useNetwork.ts - Hooks con React Query para datos de red MLM
'use client';

import { useCallback, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { networkApi } from '@/services/networkApi';
import { NetworkChildrenQuery, NetworkExportJob, NetworkMembersQuery } from '@/types/network';
import { EXPORT_MAX_POLL_FAILURES, pollIntervalFor } from '@/lib/network/export-job';
import { isHttpStatus } from '@/lib/network/network-error';

/** Solo las claves con valor, para que la queryKey sea estable entre renders. */
const compactQuery = (query: object): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(query as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : (v as string | number | boolean)]),
  );

// Keys para React Query. Todas cuelgan de networkKeys.all: useRegisterMember
// invalida ['network'] y con eso se refrescan resumen, explorador y lista.
export const networkKeys = {
  all: ['network'] as const,
  /** Ficha del socio (MemberSheet) vía network/member/:id. */
  stats: (userId: string) => [...networkKeys.all, 'stats', userId] as const,
  directLines: (periodId?: string) => [...networkKeys.all, 'direct-lines', periodId ?? 'current'] as const,
  // "Mi red" para redes grandes (contrato §4.1)
  overview: (periodId?: string | null) => [...networkKeys.all, 'overview', periodId ?? 'current'] as const,
  children: (query: NetworkChildrenQuery) => [...networkKeys.all, 'children', compactQuery(query)] as const,
  members: (query: NetworkMembersQuery) => [...networkKeys.all, 'members', compactQuery(query)] as const,
  exportJobs: () => [...networkKeys.all, 'export-jobs'] as const,
  exportJob: (jobId: string) => [...networkKeys.all, 'export-job', jobId] as const,
};

/**
 * Ficha de un socio de mi red (GET network/member/:id, con guarda de
 * pertenencia en el servidor). La usa MemberSheet.
 */
export const useNetworkStats = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.stats(userId),
    queryFn: () => networkApi.getStats(userId),
    staleTime: 2 * 60 * 1000, // 2 minutos
    enabled,
  });
};

/**
 * Hook: volumen de grupo por línea directa (con tope/rollover) del periodo.
 */
export const useNetworkDirectLines = (periodId?: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.directLines(periodId),
    queryFn: () => networkApi.getDirectLines(periodId),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
};

// ---------------------------------------------------------------------------
// "Mi red" para redes grandes (contrato /distribuidor/red §5 y §6.3)
// ---------------------------------------------------------------------------

const FIVE_MIN = 5 * 60 * 1000;
const TEN_MIN = 10 * 60 * 1000;

/**
 * Resumen del periodo (6 indicadores + por nivel + en riesgo). Mismas
 * definiciones que el home. Al cambiar de periodo conserva las cifras
 * anteriores mientras llegan las nuevas (placeholderData).
 */
export const useNetworkOverview = (periodId?: string | null, enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.overview(periodId),
    queryFn: () => networkApi.getOverview(periodId),
    enabled,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    placeholderData: keepPreviousData,
  });
};

/**
 * Hijos directos de un nodo (explorador por líneas, lazy). `parent` = 'me' o
 * memberId; `parents` abre varias líneas a la vez (≤ 50).
 */
export const useNetworkChildren = (query: NetworkChildrenQuery, enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.children(query),
    queryFn: () => networkApi.getChildren(query),
    enabled,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
  });
};

/**
 * Lista plana con filtros/orden/paginación en el servidor. keepPreviousData:
 * al cambiar de página o filtro la tabla no parpadea (la UI muestra
 * `list.updating` con isPlaceholderData).
 */
export const useNetworkMembers = (query: NetworkMembersQuery, enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.members(query),
    queryFn: () => networkApi.getMembers(query),
    enabled,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    placeholderData: keepPreviousData,
  });
};

/** Jobs de exportación vivos (para reconectar al montar la tarjeta o el watcher). */
export const useNetworkExportJobs = (enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.exportJobs(),
    queryFn: () => networkApi.listNetworkExportJobs(),
    enabled,
    staleTime: 0,
    gcTime: FIVE_MIN,
    retry: 1,
  });
};

export interface UseNetworkExportJobResult {
  /** Último estado conocido del job (se conserva aunque el sondeo se detenga). */
  job: NetworkExportJob | undefined;
  isLoading: boolean;
  error: unknown;
  /** 8 fallos de red consecutivos: el sondeo se detiene sin borrar el job; `resume()` lo reanuda. */
  unreachable: boolean;
  /** 404: el job no existe, expiró o el servidor se reinició (interrupted/expired lo decide export-job.ts). */
  gone: boolean;
  /** Reanuda el sondeo tras `unreachable` (reintento manual). */
  resume: () => void;
  refetch: () => void;
}

/** Contador de fallos y reloj del sondeo, por job (se reinicia solo al cambiar de job). */
interface PollTracker {
  jobId: string | null;
  failures: number;
  /** Reloj (ms) desde que se sonda este job. */
  since: number;
}

/**
 * Sondeo del job de exportación: refetchInterval = pollAfterMs del servidor
 * (2000 en espera, 1000 en curso; 3000 pasados 60 s), pausado con la pestaña
 * oculta (document.visibilityState) y reanudado al volver (refetchOnWindowFocus).
 * 8 fallos de red consecutivos ⇒ `unreachable` (el job queda en caché para
 * mostrar su último estado); un 404 detiene el sondeo (`gone`). El estado es
 * Map.get en el servidor (O(1)): varias pestañas pueden sondear sin costo.
 * La query se comparte entre la tarjeta de descarga y NetworkExportWatcher.
 */
export const useNetworkExportJob = (
  jobId: string | null | undefined,
  options: { enabled?: boolean } = {},
): UseNetworkExportJobResult => {
  const enabled = (options.enabled ?? true) && Boolean(jobId);
  const tracker = useRef<PollTracker>({ jobId: null, failures: 0, since: 0 });
  /** Job declarado inalcanzable (8 fallos seguidos); al cambiar de job deja de aplicar sin efecto alguno. */
  const [unreachableFor, setUnreachableFor] = useState<string | null>(null);
  const unreachable = Boolean(jobId) && unreachableFor === jobId;

  // Solo desde callbacks (nunca en el render): contador y reloj limpios cuando
  // cambia el job sondeado.
  const track = useCallback((id: string): PollTracker => {
    if (tracker.current.jobId !== id) tracker.current = { jobId: id, failures: 0, since: Date.now() };
    return tracker.current;
  }, []);

  const query = useQuery({
    queryKey: networkKeys.exportJob(jobId ?? ''),
    enabled: enabled && !unreachable,
    retry: false,
    staleTime: 0,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const id = jobId as string;
      const t = track(id);
      try {
        const job = await networkApi.getNetworkExportJob(id);
        t.failures = 0;
        return job;
      } catch (err) {
        // Un 404 no es un fallo de red: el job ya no está (no se reintenta).
        if (!isHttpStatus(err, 404)) {
          t.failures += 1;
          if (t.failures >= EXPORT_MAX_POLL_FAILURES) setUnreachableFor(id);
        }
        throw err;
      }
    },
    refetchInterval: (q) => {
      if (!jobId) return false;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
      if (q.state.error && isHttpStatus(q.state.error, 404)) return false;
      const t = track(jobId);
      if (t.failures >= EXPORT_MAX_POLL_FAILURES) return false;
      return pollIntervalFor(q.state.data, Date.now() - t.since);
    },
  });

  const resume = useCallback(() => {
    tracker.current = { jobId: jobId ?? null, failures: 0, since: Date.now() };
    setUnreachableFor(null);
  }, [jobId]);

  const { refetch: refetchQuery } = query;
  const refetch = useCallback(() => {
    void refetchQuery();
  }, [refetchQuery]);

  return {
    job: query.data,
    isLoading: query.isLoading,
    error: query.error,
    unreachable,
    gone: Boolean(query.error) && isHttpStatus(query.error, 404),
    resume,
    refetch,
  };
};

/** Inicia la exportación (periodo opcional) y refresca la lista de jobs vivos. */
export const useStartNetworkExport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periodId?: string | null) => networkApi.startNetworkExport(periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: networkKeys.exportJobs() });
    },
  });
};

/** Cancela un job en espera o en curso; deja el estado devuelto (phase cancelled) en la caché del job. */
export const useCancelNetworkExport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => networkApi.cancelNetworkExport(jobId),
    onSuccess: (job) => {
      queryClient.setQueryData(networkKeys.exportJob(job.jobId), job);
      queryClient.invalidateQueries({ queryKey: networkKeys.exportJobs() });
    },
  });
};
