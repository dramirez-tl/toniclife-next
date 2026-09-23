// hooks/useNetwork.ts - Hooks con React Query para datos de red MLM
'use client';

import { useCallback, useRef, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { networkApi, RootUserData } from '@/services/networkApi';
import {
  NetworkNode,
  NetworkTreeResponse,
  DownlineQuery,
  NetworkChildrenQuery,
  NetworkExportJob,
  NetworkMembersQuery,
} from '@/types/network';
import { EXPORT_MAX_POLL_FAILURES, pollIntervalFor } from '@/lib/network/export-job';
import { isHttpStatus } from '@/lib/network/network-error';

// Re-exportar RootUserData para facilitar su uso
export type { RootUserData } from '@/services/networkApi';

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
  tree: (userId: string, depth: number) => [...networkKeys.all, 'tree', userId, depth] as const,
  /** (Legacy) hijos vía network/tree/:id; se retira en P6. */
  treeChildren: (userId: string) => [...networkKeys.all, 'tree-children', userId] as const,
  stats: (userId: string) => [...networkKeys.all, 'stats', userId] as const,
  search: (query: string) => [...networkKeys.all, 'search', query] as const,
  downlines: (userId: string) => [...networkKeys.all, 'downlines', userId] as const,
  upline: (userId: string) => [...networkKeys.all, 'upline', userId] as const,
  directLines: (periodId?: string) => [...networkKeys.all, 'direct-lines', periodId ?? 'current'] as const,
  // "Mi red" para redes grandes (contrato §4.1)
  overview: (periodId?: string | null) => [...networkKeys.all, 'overview', periodId ?? 'current'] as const,
  children: (query: NetworkChildrenQuery) => [...networkKeys.all, 'children', compactQuery(query)] as const,
  members: (query: NetworkMembersQuery) => [...networkKeys.all, 'members', compactQuery(query)] as const,
  exportJobs: () => [...networkKeys.all, 'export-jobs'] as const,
  exportJob: (jobId: string) => [...networkKeys.all, 'export-job', jobId] as const,
};

/**
 * Hook para obtener el árbol de red con límite de profundidad
 * @param userId - ID del usuario raíz
 * @param depth - Profundidad máxima del árbol
 * @param rootUserData - Datos opcionales del usuario raíz (para mock en desarrollo)
 */
export const useNetworkTree = (userId: string, depth: number = 3, rootUserData?: RootUserData, enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.tree(userId, depth),
    queryFn: () => networkApi.getTree(userId, depth, rootUserData),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
  });
};

/**
 * (Legacy, árbol recursivo) Hijos de un nodo vía network/tree/:id. Sin usos;
 * se retira en P6. El explorador nuevo usa useNetworkChildren(query).
 */
export const useNetworkTreeChildren = (userId: string, enabled: boolean = false) => {
  return useQuery({
    queryKey: networkKeys.treeChildren(userId),
    queryFn: () => networkApi.getTreeChildren(userId),
    enabled, // Solo cargar cuando se solicite
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para obtener estadísticas de un distribuidor
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
 * Hook para buscar distribuidores
 */
export const useNetworkSearch = (query: string) => {
  return useQuery({
    queryKey: networkKeys.search(query),
    queryFn: () => networkApi.search(query),
    enabled: query.length >= 2, // Solo buscar con al menos 2 caracteres
    staleTime: 30 * 1000, // 30 segundos
  });
};

/**
 * Hook para obtener los downlines del distribuidor (paginado con filtros)
 */
export const useNetworkDownlines = (query: DownlineQuery = {}, enabled: boolean = true) => {
  return useQuery({
    queryKey: [...networkKeys.all, 'downlines', query] as const,
    queryFn: () => networkApi.getDownlines(query),
    enabled,
    staleTime: 5 * 60 * 1000,
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

/**
 * Hook para obtener la upline de un distribuidor
 */
export const useNetworkUpline = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.upline(userId),
    queryFn: () => networkApi.getUpline(),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para agregar un distribuidor a la red
 */
export const useAddToNetwork = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: { sponsorId: string; position?: string } }) =>
      networkApi.addToNetwork(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: networkKeys.all });
    },
  });
};

/**
 * Hook para mover un distribuidor dentro de la red
 */
export const useMoveInNetwork = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, data }: { customerId: string; data: { newSponsorId: string; reason?: string } }) =>
      networkApi.moveInNetwork(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: networkKeys.all });
    },
  });
};

/**
 * Hook para expandir/cargar hijos de un nodo
 */
export const useExpandNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: string) => {
      return networkApi.getTreeChildren(nodeId);
    },
    onSuccess: (data, nodeId) => {
      // Actualizar el árbol en cache agregando los hijos cargados
      queryClient.setQueriesData(
        {
          queryKey: networkKeys.all,
          predicate: (query) =>
            Array.isArray(query.queryKey) && query.queryKey[1] === 'tree',
        },
        (oldData: NetworkTreeResponse | undefined) => {
          if (!oldData) return oldData;

          const updateNode = (node: NetworkNode): NetworkNode => {
            if (node.id === nodeId) {
              return {
                ...node,
                children: data.children,
                isLoaded: true,
                isExpanded: true,
              };
            }
            if (node.children) {
              return {
                ...node,
                children: node.children.map(updateNode),
              };
            }
            return node;
          };

          return {
            ...oldData,
            root: updateNode(oldData.root),
          };
        }
      );
    },
  });
};

/**
 * Hook para toggle de expansión de un nodo (sin cargar datos)
 */
export const useToggleNode = () => {
  const queryClient = useQueryClient();

  return {
    toggle: (nodeId: string) => {
      queryClient.setQueriesData(
        { queryKey: networkKeys.all },
        (oldData: NetworkTreeResponse | undefined) => {
          if (!oldData) return oldData;

          const toggleNode = (node: NetworkNode): NetworkNode => {
            if (node.id === nodeId) {
              return {
                ...node,
                isExpanded: !node.isExpanded,
              };
            }
            if (node.children) {
              return {
                ...node,
                children: node.children.map(toggleNode),
              };
            }
            return node;
          };

          return {
            ...oldData,
            root: toggleNode(oldData.root),
          };
        }
      );
    },
  };
};

/**
 * Hook para invalidar cache y refrescar datos
 */
export const useRefreshNetwork = () => {
  const queryClient = useQueryClient();

  return {
    refresh: () => {
      queryClient.invalidateQueries({ queryKey: networkKeys.all });
    },
    refreshTree: (userId: string, depth: number) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.tree(userId, depth) });
    },
    refreshStats: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.stats(userId) });
    },
  };
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
