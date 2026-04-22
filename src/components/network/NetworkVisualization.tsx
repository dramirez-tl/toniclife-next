// components/network/NetworkVisualization.tsx - Contenedor principal de visualización
'use client';

import { useState, useCallback, useMemo } from 'react';
import { confirmAction } from '@/lib/utils';
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
  UsersIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

// Banner de alerta desplegable
function AlertBanner({
  color,
  icon,
  label,
  items,
  onSelect,
}: {
  color: 'amber' | 'blue';
  icon: 'fire' | 'star';
  label: string;
  items: { id: string; label: string }[];
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const colors = color === 'amber'
    ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', hoverBg: 'hover:bg-amber-100' }
    : { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', hoverBg: 'hover:bg-blue-100' };
  const emoji = icon === 'fire' ? '\uD83D\uDD25' : '\u2B50';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.border} ${colors.text} ${colors.hoverBg} transition-colors`}
      >
        <span>{emoji}</span>
        {label}
        <ChevronDownIcon className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-1 z-50 w-72 max-h-48 overflow-y-auto rounded-lg border shadow-lg ${colors.bg} ${colors.border}`}>
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => { onSelect(item.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs ${colors.text} ${colors.hoverBg} border-b last:border-b-0 ${colors.border} transition-colors`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [depth, setDepth] = useState(Math.max(2, Math.min(initialDepth, 10)));
  const [isLoadTriggered, setIsLoadTriggered] = useState(false);

  const { data: treeData, isLoading, error, refetch } = useNetworkTree(rootUserId, depth, rootUserData, isLoadTriggered);
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

  // Manejar cambio de profundidad con confirmación para valores altos
  const handleDepthChange = useCallback(async (newDepth: number) => {
    if (newDepth >= 4 && isLoadTriggered) {
      const ok = await confirmAction(
        `Cargar ${newDepth} niveles puede tardar bastante si tu red es grande. ¿Deseas continuar?`
      );
      if (!ok) return;
    }
    setDepth(newDepth);
  }, [isLoadTriggered]);

  // Refrescar datos
  const handleRefresh = useCallback(() => {
    refresh();
    refetch();
  }, [refresh, refetch]);

  // Máximo de niveles disponibles (del resumen de red o default 5)
  const maxAvailableDepth = useMemo(() => {
    const fromData = rootUserDetailData?.maxDepth;
    return fromData && fromData > 0 ? Math.min(fromData, 10) : 5;
  }, [rootUserDetailData?.maxDepth]);

  // Estadísticas rápidas — usa datos del response sin recorrer el árbol
  const stats = useMemo(() => {
    if (!treeData) return { total: 0, levels: 0 };
    return {
      total: Math.max(0, treeData.totalNodes - 1), // Excluir la raíz
      levels: treeData.maxDepthLoaded,
    };
  }, [treeData]);

  // Alertas: nodos cerca de subir de rango y nuevos inscritos (solo nodos cargados)
  const alerts = useMemo(() => {
    if (!treeData?.root) return { nearPromotion: [] as { id: string; name: string; nextRankName: string; percent: number }[], newMembers: [] as { id: string; name: string; daysSinceJoin: number }[] };

    const nearPromotion: { id: string; name: string; nextRankName: string; percent: number }[] = [];
    const newMembers: { id: string; name: string; daysSinceJoin: number }[] = [];

    const walk = (node: NetworkNode, isRoot = false) => {
      if (!isRoot) {
        if (node.rankProgress?.isNearPromotion) {
          nearPromotion.push({ id: node.id, name: node.name, nextRankName: node.rankProgress.nextRankName, percent: node.rankProgress.progressPercent });
        }
        if (node.isNewMember && node.daysSinceJoin !== undefined) {
          newMembers.push({ id: node.id, name: node.name, daysSinceJoin: node.daysSinceJoin });
        }
      }
      node.children?.forEach(c => walk(c));
    };
    walk(treeData.root, true);
    return { nearPromotion, newMembers };
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#3E667D]/90"
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
                <SearchableSelect
                  options={Array.from({ length: Math.max(maxAvailableDepth - 1, 1) }, (_, i) => {
                    const n = i + 2;
                    const hint = n <= 2 ? ' (rapido)' : n >= 4 ? ' (lento)' : '';
                    return { value: String(n), label: `${n} niveles${hint}` };
                  })}
                  value={String(depth)}
                  onChange={(val) => handleDepthChange(parseInt(val))}
                  showAllOption={false}
                />
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
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
              <span className="inline-flex items-center gap-1.5 text-[#3E667D]">
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                Cargando más nodos...
              </span>
            )}
          </div>

          {/* Alert banners */}
          {(alerts.nearPromotion.length > 0 || alerts.newMembers.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {alerts.nearPromotion.length > 0 && (
                <AlertBanner
                  color="amber"
                  icon="fire"
                  label={`${alerts.nearPromotion.length} cerca de subir de rango`}
                  items={alerts.nearPromotion.map(n => ({
                    id: n.id,
                    label: `${n.name} — ${n.nextRankName} ${n.percent}%`,
                  }))}
                  onSelect={(nodeId: string) => { setSelectedNodeId(nodeId); setIsPanelOpen(true); }}
                />
              )}
              {alerts.newMembers.length > 0 && (
                <AlertBanner
                  color="blue"
                  icon="star"
                  label={`${alerts.newMembers.length} nuevos inscritos`}
                  items={alerts.newMembers.map(n => ({
                    id: n.id,
                    label: `${n.name} — hace ${n.daysSinceJoin} días`,
                  }))}
                  onSelect={(nodeId: string) => { setSelectedNodeId(nodeId); setIsPanelOpen(true); }}
                />
              )}
            </div>
          )}
        </div>

        {/* Grafo */}
        <div className="flex-1 relative">
          {!isLoadTriggered && !treeData ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-gradient-to-br from-[#3E667D] to-[#3E667D]/70 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <UsersIcon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Visualizar tu Red</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Carga el arbol de tu red para ver la estructura de tus distribuidores. Esta consulta puede tomar unos segundos.
                </p>
                <button
                  onClick={() => setIsLoadTriggered(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#3E667D] text-white font-semibold rounded-lg hover:bg-[#2f5165] transition-colors shadow-md"
                >
                  <UsersIcon className="h-5 w-5" />
                  Cargar Red
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D] mx-auto mb-4"></div>
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
