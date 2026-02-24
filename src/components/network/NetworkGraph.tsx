// components/network/NetworkGraph.tsx - Optimized ReactFlow visualization for 4000+ node networks
'use client';

import { useCallback, useMemo, useState, useEffect, useRef, memo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  Position,
  MarkerType,
  BackgroundVariant,
  NodeMouseHandler,
  Panel,
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NetworkNode, RankType } from '@/types/network';
import { RANK_COLORS, RANK_LABELS, RANK_BG_COLORS, RANK_TEXT_COLORS } from '@/constants/ranks';
import {
  UserGroupIcon,
  ChevronUpIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

// --- Constants ---
const NODE_WIDTH = 200;
const NODE_HEIGHT = 130;
const H_SPACING = 30;
const V_SPACING = 70;
const MAX_VISIBLE_CHILDREN = 50;

// --- Types ---
interface NetworkGraphProps {
  data: NetworkNode;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  selectedNodeId?: string | null;
  className?: string;
}

type CustomNodeData = {
  label: string;
  code: string;
  rank: RankType;
  directCount: number;
  networkCount: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isLoaded: boolean;
  level: number;
  isSelected: boolean;
  isVisuallyExpanded: boolean;
  onToggleExpand?: (nodeId: string) => void;
  onNodeClick?: (nodeId: string) => void;
  // Indicadores
  monthlyStatus?: {
    status: 'qualified' | 'purchased' | 'inactive';
    currentPoints: number;
    qualificationThreshold: number;
  };
  rankProgress?: {
    currentRankCode: string;
    nextRankCode: string;
    nextRankName: string;
    progressPercent: number;
    currentGroupPoints: number;
    requiredGroupPoints: number;
    isNearPromotion: boolean;
  };
  isNewMember?: boolean;
  daysSinceJoin?: number;
  [key: string]: unknown;
};

type CollapsedGroupData = {
  parentId: string;
  hiddenCount: number;
  totalChildren: number;
  onNodeClick?: (nodeId: string) => void;
  [key: string]: unknown;
};

// --- Custom Nodes ---

// Semáforo colors
const SEMAFORO_COLORS: Record<string, string> = {
  qualified: '#22C55E',
  purchased: '#EAB308',
  inactive: '#EF4444',
};
const SEMAFORO_LABELS: Record<string, string> = {
  qualified: 'Calificado',
  purchased: 'Compró pero no califica',
  inactive: 'Sin compras este mes',
};

const DistributorNode = memo(function DistributorNode({ id, data }: { id: string; data: CustomNodeData }) {
  const rankColor = RANK_COLORS[data.rank] || RANK_COLORS.distribuidor;
  const rankBgColor = RANK_BG_COLORS[data.rank] || RANK_BG_COLORS.distribuidor;
  const rankTextColor = RANK_TEXT_COLORS[data.rank] || RANK_TEXT_COLORS.distribuidor;
  const rankLabel = RANK_LABELS[data.rank] || 'Distribuidor';

  const showRankProgress = data.rankProgress?.isNearPromotion === true;

  const handleClick = useCallback(() => {
    data.onNodeClick?.(id);
  }, [id, data.onNodeClick]);

  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    data.onToggleExpand?.(id);
  }, [id, data.onToggleExpand]);

  const initials = useMemo(() => {
    const parts = data.label.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return data.label.substring(0, 2).toUpperCase();
  }, [data.label]);

  return (
    <div
      onClick={handleClick}
      className={`
        relative bg-white rounded-xl shadow-lg border-2 transition-all duration-200 cursor-pointer
        hover:shadow-xl hover:scale-[1.03] hover:border-[#7AB82E]
        ${data.isSelected ? 'border-[#7AB82E] ring-2 ring-[#7AB82E]/30 shadow-xl' : 'border-gray-200'}
      `}
      style={{ width: NODE_WIDTH, padding: '10px', paddingBottom: data.hasChildren ? 20 : 10 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#003B7A] !border-2 !border-white !-top-1.5"
      />

      {/* Semáforo — esquina superior derecha */}
      {data.monthlyStatus && (
        <div
          className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full border border-white shadow-sm"
          style={{ backgroundColor: SEMAFORO_COLORS[data.monthlyStatus.status] }}
          title={`${SEMAFORO_LABELS[data.monthlyStatus.status]} (${data.monthlyStatus.currentPoints.toLocaleString()} / ${data.monthlyStatus.qualificationThreshold.toLocaleString()} pts)`}
        />
      )}

      {/* Badge Nuevo — esquina superior izquierda */}
      {data.isNewMember && (
        <span
          className="absolute top-1.5 left-1.5 px-1 py-px rounded text-[7px] font-bold text-white leading-none"
          style={{ backgroundColor: '#3B82F6' }}
          title={data.daysSinceJoin !== undefined ? `Se inscribió hace ${data.daysSinceJoin} días` : 'Nuevo inscrito'}
        >
          NUEVO
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${rankColor} 0%, ${rankColor}cc 100%)` }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate leading-tight" title={data.label}>
            {data.label}
          </p>
          <p className="text-[10px] text-gray-500 font-mono">{data.code}</p>
        </div>
      </div>

      {/* Rank + Level */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
          style={{ backgroundColor: rankBgColor, color: rankTextColor }}
        >
          {rankLabel}
        </span>
        <span className="text-[10px] text-gray-400 font-medium">Niv. {data.level}</span>
      </div>

      {/* Rank progress bar — solo si isNearPromotion */}
      {showRankProgress && data.rankProgress && (
        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] text-amber-600 font-semibold truncate">
              &rarr; {data.rankProgress.nextRankName} {data.rankProgress.progressPercent}%
            </span>
          </div>
          <div className="w-full h-[3px] bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${data.rankProgress.progressPercent}%`,
                background: 'linear-gradient(90deg, #F59E0B, #EAB308)',
              }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-2 text-[10px] text-gray-600 border-t border-gray-100 pt-1.5">
        <div className="flex items-center gap-1">
          <UserGroupIcon className="w-3 h-3 text-[#003B7A]" />
          <span><strong className="text-gray-900">{data.directCount}</strong> dir.</span>
        </div>
        <div className="text-gray-300">|</div>
        <span><strong className="text-gray-900">{data.networkCount}</strong> red</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-white !-bottom-1.5 !bg-transparent"
        style={{ pointerEvents: 'none' }}
      />

      {/* Expand/Collapse button */}
      {data.hasChildren && (
        <button
          onClick={handleToggle}
          className={`
            absolute -bottom-3.5 left-1/2 transform -translate-x-1/2
            w-7 h-7 rounded-full flex items-center justify-center
            border-2 border-white shadow-md cursor-pointer z-10 transition-colors
            ${data.isVisuallyExpanded ? 'bg-[#7AB82E] hover:bg-[#6aa025]' : 'bg-[#003B7A] hover:bg-[#002d5e]'}
          `}
          title={data.isVisuallyExpanded
            ? 'Colapsar'
            : data.isLoaded
              ? `Expandir (${data.directCount} hijos)`
              : `Cargar hijos (${data.directCount})`
          }
        >
          {data.isVisuallyExpanded ? (
            <ChevronUpIcon className="w-3.5 h-3.5 text-white" />
          ) : (
            <span className="text-[9px] font-bold text-white">
              {data.directCount > 0 ? `+${data.directCount}` : '▼'}
            </span>
          )}
        </button>
      )}
    </div>
  );
});

const CollapsedGroupNode = memo(function CollapsedGroupNode({ data }: { id: string; data: CollapsedGroupData }) {
  const handleClick = useCallback(() => {
    data.onNodeClick?.(data.parentId);
  }, [data.onNodeClick, data.parentId]);

  return (
    <div
      onClick={handleClick}
      className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl shadow-sm cursor-pointer
        hover:border-[#003B7A] hover:shadow-md transition-all duration-200 flex flex-col items-center justify-center"
      style={{ width: NODE_WIDTH, height: 60, padding: '8px' }}
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-gray-400 !border-white !-top-1" />
      <UsersIcon className="w-5 h-5 text-gray-400 mb-1" />
      <p className="text-xs font-semibold text-gray-600">
        +{data.hiddenCount} distribuidores más
      </p>
      <p className="text-[10px] text-gray-400">{data.totalChildren} hijos en total</p>
    </div>
  );
});

// --- Node types ---
const nodeTypes = {
  distributor: DistributorNode,
  collapsedGroup: CollapsedGroupNode,
};

// --- Layout engine: only computes VISIBLE nodes ---

function buildVisibleGraph(
  root: NetworkNode,
  expandedNodes: Set<string>,
  onToggleExpand: (nodeId: string) => void,
  onNodeClick: (nodeId: string) => void,
  selectedNodeId: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Subtree width cache (avoids recomputation)
  const widthCache = new Map<string, number>();

  function getSubtreeWidth(node: NetworkNode): number {
    const cached = widthCache.get(node.id);
    if (cached !== undefined) return cached;

    const isExpanded = expandedNodes.has(node.id);
    if (!isExpanded || !node.children || node.children.length === 0) {
      const w = NODE_WIDTH;
      widthCache.set(node.id, w);
      return w;
    }

    const visibleChildren = node.children.slice(0, MAX_VISIBLE_CHILDREN);
    const hasOverflow = node.children.length > MAX_VISIBLE_CHILDREN;
    const childCount = visibleChildren.length + (hasOverflow ? 1 : 0);

    let totalWidth = 0;
    for (const child of visibleChildren) {
      totalWidth += getSubtreeWidth(child);
    }
    if (hasOverflow) {
      totalWidth += NODE_WIDTH; // collapsed group placeholder
    }
    totalWidth += (childCount - 1) * H_SPACING;

    const w = Math.max(NODE_WIDTH, totalWidth);
    widthCache.set(node.id, w);
    return w;
  }

  function processNode(node: NetworkNode, x: number, y: number, parentId?: string) {
    const isVisuallyExpanded = expandedNodes.has(node.id);

    nodes.push({
      id: node.id,
      type: 'distributor',
      position: { x, y },
      data: {
        label: node.name,
        code: node.code,
        rank: node.rank,
        directCount: node.directCount,
        networkCount: node.networkCount,
        hasChildren: node.hasChildren,
        isExpanded: node.isExpanded,
        isLoaded: node.isLoaded,
        level: node.level,
        isSelected: selectedNodeId === node.id,
        isVisuallyExpanded,
        onToggleExpand,
        onNodeClick,
        monthlyStatus: node.monthlyStatus,
        rankProgress: node.rankProgress,
        isNewMember: node.isNewMember,
        daysSinceJoin: node.daysSinceJoin,
      } satisfies CustomNodeData,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        style: { stroke: '#CBD5E1', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#CBD5E1', width: 12, height: 12 },
      });
    }

    // Only render children if visually expanded
    if (!isVisuallyExpanded || !node.children || node.children.length === 0) return;

    const visibleChildren = node.children.slice(0, MAX_VISIBLE_CHILDREN);
    const hasOverflow = node.children.length > MAX_VISIBLE_CHILDREN;
    const childY = y + NODE_HEIGHT + V_SPACING;

    // Calculate widths for centering
    const childWidths: number[] = visibleChildren.map(c => getSubtreeWidth(c));
    if (hasOverflow) childWidths.push(NODE_WIDTH);

    const totalWidth = childWidths.reduce((a, b) => a + b, 0)
      + (childWidths.length - 1) * H_SPACING;

    let childX = x + NODE_WIDTH / 2 - totalWidth / 2;

    visibleChildren.forEach((child, i) => {
      const childCenterX = childX + childWidths[i] / 2 - NODE_WIDTH / 2;
      processNode(child, childCenterX, childY, node.id);
      childX += childWidths[i] + H_SPACING;
    });

    // Overflow placeholder
    if (hasOverflow) {
      const overflowId = `overflow-${node.id}`;
      const overflowX = childX + NODE_WIDTH / 2 - NODE_WIDTH / 2;
      nodes.push({
        id: overflowId,
        type: 'collapsedGroup',
        position: { x: overflowX, y: childY + 35 },
        data: {
          parentId: node.id,
          hiddenCount: node.children.length - MAX_VISIBLE_CHILDREN,
          totalChildren: node.children.length,
          onNodeClick,
        } satisfies CollapsedGroupData,
        targetPosition: Position.Top,
      });
      edges.push({
        id: `e-${node.id}-${overflowId}`,
        source: node.id,
        target: overflowId,
        type: 'smoothstep',
        style: { stroke: '#CBD5E1', strokeWidth: 1.5, strokeDasharray: '5 3' },
      });
    }
  }

  processNode(root, 0, 0);
  return { nodes, edges };
}

// --- Inner component (needs ReactFlowProvider context) ---

function NetworkGraphInner({
  data,
  onNodeClick,
  onNodeDoubleClick,
  selectedNodeId,
  className = '',
}: NetworkGraphProps) {
  const { fitView, setCenter } = useReactFlow();
  const [isClient, setIsClient] = useState(false);
  const hasFittedRef = useRef(false);

  // Local expand/collapse state — starts with only root expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set([data.id]));

  // When data changes (e.g. new depth loaded), auto-expand nodes that have loaded children
  useEffect(() => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      // Always keep root expanded
      next.add(data.id);
      return next;
    });
  }, [data.id]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Toggle expand/collapse for a node
  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        // If node is not loaded, trigger backend fetch via double-click handler
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
        const target = findNode(data);
        if (target && target.hasChildren && !target.isLoaded) {
          onNodeDoubleClick?.(nodeId);
        }
      }
      return next;
    });
  }, [data, onNodeDoubleClick]);

  const handleNodeClick = useCallback((nodeId: string) => {
    onNodeClick?.(nodeId);
  }, [onNodeClick]);

  // Build visible graph
  const { visibleNodes, visibleEdges } = useMemo(() => {
    const { nodes, edges } = buildVisibleGraph(
      data,
      expandedNodes,
      handleToggleExpand,
      handleNodeClick,
      selectedNodeId ?? null,
    );
    return { visibleNodes: nodes, visibleEdges: edges };
  }, [data, expandedNodes, handleToggleExpand, handleNodeClick, selectedNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(visibleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(visibleEdges);

  // Sync when data/expand state changes
  useEffect(() => {
    setNodes(visibleNodes);
    setEdges(visibleEdges);
  }, [visibleNodes, visibleEdges, setNodes, setEdges]);

  // Fit view once on initial render
  useEffect(() => {
    if (nodes.length > 0 && !hasFittedRef.current) {
      hasFittedRef.current = true;
      // Small delay to let ReactFlow finish layout
      requestAnimationFrame(() => {
        fitView({ padding: 0.3, maxZoom: 1, duration: 300 });
      });
    }
  }, [nodes.length, fitView]);

  // Center on selected node
  useEffect(() => {
    if (!selectedNodeId) return;
    const target = nodes.find(n => n.id === selectedNodeId);
    if (target) {
      setCenter(
        target.position.x + NODE_WIDTH / 2,
        target.position.y + NODE_HEIGHT / 2,
        { zoom: 1, duration: 400 },
      );
    }
  }, [selectedNodeId, nodes, setCenter]);

  // Handle double-click on ReactFlow node (for loading unloaded nodes)
  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      // Toggle expand visually
      handleToggleExpand(node.id);
    },
    [handleToggleExpand]
  );

  if (!isClient) {
    return (
      <div className={`w-full h-full min-h-[600px] bg-white rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003B7A] mx-auto mb-4" />
          <p className="text-gray-600">Cargando visualización...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full min-h-[600px] bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={true}
        zoomOnDoubleClick={false}
        minZoom={0.02}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep', animated: false }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          className="!bg-white !shadow-lg !border !border-gray-200 !rounded-lg"
        />

        {/* Help panel */}
        <Panel position="top-right" className="!m-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200 max-w-[180px]">
            <p className="text-xs font-semibold text-gray-700 mb-2">Controles</p>
            <ul className="text-[11px] text-gray-600 space-y-1">
              <li className="flex items-start gap-1.5">
                <span className="text-[#003B7A] font-medium">Click:</span>
                <span>Ver detalles</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#003B7A] font-medium">Botón ▼:</span>
                <span>Expandir/colapsar</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#003B7A] font-medium">Scroll:</span>
                <span>Zoom</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#003B7A] font-medium">Arrastrar:</span>
                <span>Mover vista</span>
              </li>
            </ul>
          </div>
        </Panel>

        {/* Rank + Semáforo legend */}
        <Panel position="bottom-left" className="!m-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Rangos</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
              {([
                'distribuidor', 'bronce', 'plata', 'oro', 'platino', 'diamante',
              ] as RankType[]).map((rank) => (
                <div key={rank} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: RANK_COLORS[rank] }}
                  />
                  <span className="text-[11px] text-gray-600">{RANK_LABELS[rank]}</span>
                </div>
              ))}
            </div>
            <p className="text-xs font-semibold text-gray-700 mb-1.5 border-t border-gray-200 pt-2">Estado mensual</p>
            <div className="flex flex-col gap-1">
              {([
                { key: 'qualified', label: 'Calificado' },
                { key: 'purchased', label: 'Compró' },
                { key: 'inactive', label: 'Sin compras' },
              ]).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: SEMAFORO_COLORS[key] }}
                  />
                  <span className="text-[11px] text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// --- Public component (wraps with ReactFlowProvider) ---

export function NetworkGraph(props: NetworkGraphProps) {
  return (
    <ReactFlowProvider>
      <NetworkGraphInner {...props} />
    </ReactFlowProvider>
  );
}
