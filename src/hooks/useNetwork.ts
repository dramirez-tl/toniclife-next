// hooks/useNetwork.ts - Hooks con React Query para datos de red MLM
'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { networkApi, RootUserData } from '@/services/networkApi';
import { NetworkNode, NetworkTreeResponse } from '@/types/network';

// Re-exportar RootUserData para facilitar su uso
export type { RootUserData } from '@/services/networkApi';

// Keys para React Query
export const networkKeys = {
  all: ['network'] as const,
  tree: (userId: string, depth: number) => [...networkKeys.all, 'tree', userId, depth] as const,
  children: (userId: string) => [...networkKeys.all, 'children', userId] as const,
  stats: (userId: string) => [...networkKeys.all, 'stats', userId] as const,
  search: (query: string) => [...networkKeys.all, 'search', query] as const,
  downlines: (userId: string) => [...networkKeys.all, 'downlines', userId] as const,
  upline: (userId: string) => [...networkKeys.all, 'upline', userId] as const,
};

/**
 * Hook para obtener el árbol de red con límite de profundidad
 * @param userId - ID del usuario raíz
 * @param depth - Profundidad máxima del árbol
 * @param rootUserData - Datos opcionales del usuario raíz (para mock en desarrollo)
 */
export const useNetworkTree = (userId: string, depth: number = 3, rootUserData?: RootUserData) => {
  return useQuery({
    queryKey: networkKeys.tree(userId, depth),
    queryFn: () => networkApi.getTree(userId, depth, rootUserData),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
  });
};

/**
 * Hook para cargar hijos de un nodo (lazy loading)
 */
export const useNetworkChildren = (userId: string, enabled: boolean = false) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: networkKeys.children(userId),
    queryFn: () => networkApi.getChildren(userId),
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
 * Hook para obtener los downlines directos de un distribuidor
 */
export const useNetworkDownlines = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.downlines(userId),
    queryFn: () => networkApi.getDownlines(userId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook para obtener la upline de un distribuidor
 */
export const useNetworkUpline = (userId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: networkKeys.upline(userId),
    queryFn: () => networkApi.getUpline(userId),
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
      return networkApi.getChildren(nodeId);
    },
    onSuccess: (data, nodeId) => {
      // Actualizar el árbol en cache agregando los hijos cargados
      queryClient.setQueriesData(
        { queryKey: networkKeys.all },
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
