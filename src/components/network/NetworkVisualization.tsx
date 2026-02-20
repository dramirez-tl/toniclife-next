// components/network/NetworkVisualization.tsx - Contenedor principal de visualización
'use client';

import { useState, useCallback, useMemo } from 'react';
import { NetworkGraph } from './NetworkGraph';
import { UserDetailPanel } from './UserDetailPanel';
import { NetworkSearch } from './NetworkSearch';
import { useNetworkTree, useExpandNode, useRefreshNetwork, RootUserData } from '@/hooks/useNetwork';
import { NetworkNode, NetworkSearchResult } from '@/types/network';
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

// Datos extendidos del usuario raíz para el panel de detalles
export interface RootUserDetailData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  code: string;
  rank: string;
  rankLabel: string;
  joinDate?: string;
  networkCount?: number;
  directCount?: number;
  maxDepth?: number;
  personalSales?: number;
  teamSales?: number;
  totalBusinessPoints?: string;
  currentCommission?: number;
  historicCommission?: number;
}

interface NetworkVisualizationProps {
  rootUserId: string;
  rootUserData?: RootUserData;
  rootUserDetailData?: RootUserDetailData;
  initialDepth?: number;
  className?: string;
}

export function NetworkVisualization({
  rootUserId,
  rootUserData,
  rootUserDetailData,
  initialDepth = 3,
  className = '',
}: NetworkVisualizationProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [depth, setDepth] = useState(initialDepth);

  const { data: treeData, isLoading, error, refetch } = useNetworkTree(rootUserId, depth, rootUserData);
  const expandNode = useExpandNode();
  const { refresh } = useRefreshNetwork();

  // Manejar click en nodo
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsPanelOpen(true);
  }, []);

  // Manejar doble click para expandir/colapsar
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    if (treeData?.root) {
      // Buscar el nodo en el árbol
      const findNode = (node: NetworkNode): NetworkNode | null => {
        if (node.id === nodeId) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child);
            if (found) return found;
          }
        }
        return null;
      };

      const targetNode = findNode(treeData.root);
      if (targetNode && targetNode.hasChildren && !targetNode.isLoaded) {
        // Cargar hijos desde el backend
        expandNode.mutate(nodeId);
      }
    }
  }, [treeData, expandNode]);

  // Manejar búsqueda
  const handleSearchSelect = useCallback((result: NetworkSearchResult) => {
    setSelectedNodeId(result.id);
    setIsPanelOpen(true);
    // TODO: Navegar al nodo en el grafo (focus y centrar)
  }, []);

  // Navegar al patrocinador
  const handleNavigateToSponsor = useCallback((sponsorId: string) => {
    setSelectedNodeId(sponsorId);
    // TODO: Focus en el nodo en el grafo
  }, []);

  // Refrescar datos
  const handleRefresh = useCallback(() => {
    refresh();
    refetch();
  }, [refresh, refetch]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    if (!treeData?.root) return { total: 0, levels: 0 };

    let total = 0;
    let maxLevel = 0;

    const countNodes = (node: NetworkNode) => {
      total++;
      maxLevel = Math.max(maxLevel, node.level);
      node.children?.forEach(countNodes);
    };

    countNodes(treeData.root);

    return {
      total: total - 1, // Excluir la raíz
      levels: maxLevel,
    };
  }, [treeData]);

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <div className="text-center">
          <InformationCircleIcon className="h-16 w-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar la red</h3>
          <p className="text-gray-500 mb-4">No pudimos cargar la información de tu red.</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#003B7A]/90"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-[700px] bg-gray-100 rounded-xl overflow-hidden ${className}`}>
      {/* Área principal del grafo */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isPanelOpen ? 'lg:mr-0' : ''}`}>
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Búsqueda */}
            <div className="w-full lg:w-96">
              <NetworkSearch
                onSelectResult={handleSearchSelect}
                placeholder="Buscar distribuidor..."
              />
            </div>

            {/* Controles */}
            <div className="flex items-center gap-3">
              {/* Selector de profundidad */}
              <div className="flex items-center gap-2">
                <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={depth}
                  onChange={(e) => setDepth(parseInt(e.target.value))}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                >
                  <option value={2}>2 niveles</option>
                  <option value={3}>3 niveles</option>
                  <option value={4}>4 niveles</option>
                  <option value={5}>5 niveles</option>
                </select>
              </div>

              {/* Botón refrescar */}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Refrescar datos"
              >
                <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Toggle panel */}
              <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
                title={isPanelOpen ? 'Ocultar panel' : 'Mostrar panel'}
              >
                {isPanelOpen ? (
                  <ChevronRightIcon className="h-5 w-5" />
                ) : (
                  <ChevronLeftIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Stats rápidos */}
          <div className="flex items-center gap-6 mt-3 text-sm text-gray-600">
            <span>
              <strong className="text-gray-900">{stats.total}</strong> distribuidores en red
            </span>
            <span>
              <strong className="text-gray-900">{stats.levels}</strong> niveles de profundidad
            </span>
            {expandNode.isPending && (
              <span className="text-[#7AB82E]">Cargando más nodos...</span>
            )}
          </div>
        </div>

        {/* Grafo */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003B7A] mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando visualización de red...</p>
              </div>
            </div>
          ) : treeData?.root ? (
            <NetworkGraph
              data={treeData.root}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              selectedNodeId={selectedNodeId}
              className="h-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center">
                <InformationCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay datos de red disponibles</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel lateral */}
      <div
        className={`
          bg-white border-l border-gray-200 transition-all duration-300 overflow-hidden
          ${isPanelOpen ? 'w-full lg:w-[380px]' : 'w-0'}
          fixed lg:relative inset-y-0 right-0 z-40 lg:z-auto
        `}
      >
        {isPanelOpen && (
          <UserDetailPanel
            userId={selectedNodeId}
            rootUserId={rootUserId}
            rootUserDetailData={rootUserDetailData}
            onClose={() => setIsPanelOpen(false)}
            onNavigateToSponsor={handleNavigateToSponsor}
          />
        )}
      </div>

      {/* Overlay para móvil */}
      {isPanelOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  );
}
