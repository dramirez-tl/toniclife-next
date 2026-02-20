// components/network/NetworkGraph.tsx - Componente React Flow para visualización de red
'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
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
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

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
  isSelected?: boolean;
  onNodeClick?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
  [key: string]: unknown;
};

// Nodo personalizado para distribuidores
function DistributorNode({ id, data }: { id: string; data: CustomNodeData }) {
  const rankColor = RANK_COLORS[data.rank] || RANK_COLORS.distribuidor;
  const rankBgColor = RANK_BG_COLORS[data.rank] || RANK_BG_COLORS.distribuidor;
  const rankTextColor = RANK_TEXT_COLORS[data.rank] || RANK_TEXT_COLORS.distribuidor;
  const rankLabel = RANK_LABELS[data.rank] || 'Distribuidor';

  const handleClick = useCallback(() => {
    data.onNodeClick?.(id);
  }, [id, data]);

  const handleDoubleClick = useCallback(() => {
    data.onNodeDoubleClick?.(id);
  }, [id, data]);

  // Obtener iniciales del nombre
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
      onDoubleClick={handleDoubleClick}
      className={`
        relative bg-white rounded-xl shadow-lg border-2 transition-all duration-200 cursor-pointer
        hover:shadow-xl hover:scale-105 hover:border-[#7AB82E]
        ${data.isSelected ? 'border-[#7AB82E] ring-2 ring-[#7AB82E]/30 shadow-xl' : 'border-gray-200'}
      `}
      style={{ width: 200, padding: '12px' }}
    >
      {/* Handle superior - para recibir conexiones del padre */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-[#003B7A] !border-2 !border-white !-top-1.5"
      />

      {/* Header con avatar e info */}
      <div className="flex items-center gap-3 mb-2">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${rankColor} 0%, ${rankColor}cc 100%)`,
          }}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate" title={data.label}>
            {data.label}
          </p>
          <p className="text-xs text-gray-500 font-mono">{data.code}</p>
        </div>
      </div>

      {/* Badge de rango */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: rankBgColor,
            color: rankTextColor,
          }}
        >
          {rankLabel}
        </span>

        {/* Indicador de nivel */}
        <span className="text-[10px] text-gray-400 font-medium">
          Nivel {data.level}
        </span>
      </div>

      {/* Stats de red */}
      <div className="flex items-center gap-3 text-xs text-gray-600 border-t border-gray-100 pt-2">
        <div className="flex items-center gap-1">
          <UserGroupIcon className="w-3.5 h-3.5 text-[#003B7A]" />
          <span>
            <strong className="text-gray-900">{data.directCount}</strong> directos
          </span>
        </div>
        <div className="text-gray-300">|</div>
        <span>
          <strong className="text-gray-900">{data.networkCount}</strong> en red
        </span>
      </div>

      {/* Handle inferior - para enviar conexiones a hijos */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-3 !h-3 !border-2 !border-white !-bottom-1.5 ${
          data.hasChildren
            ? data.isExpanded
              ? '!bg-[#7AB82E]'
              : '!bg-[#003B7A]'
            : '!bg-gray-300'
        }`}
      />

      {/* Indicador de expansión (se muestra sobre el handle) */}
      {data.hasChildren && (
        <div
          className={`
            absolute -bottom-3 left-1/2 transform -translate-x-1/2
            w-6 h-6 rounded-full flex items-center justify-center
            border-2 border-white shadow-md cursor-pointer z-10
            ${data.isExpanded ? 'bg-[#7AB82E]' : 'bg-[#003B7A]'}
          `}
          title={data.isExpanded ? 'Colapsar' : 'Expandir (doble click)'}
        >
          {data.isExpanded ? (
            <ChevronDownIcon className="w-3.5 h-3.5 text-white" />
          ) : (
            <ChevronRightIcon className="w-3.5 h-3.5 text-white" />
          )}
        </div>
      )}
    </div>
  );
}

// Tipos de nodos personalizados
const nodeTypes = {
  distributor: DistributorNode,
};

// Convertir NetworkNode a nodos y edges de React Flow
function convertToReactFlowData(
  node: NetworkNode,
  onNodeClick?: (nodeId: string) => void,
  onNodeDoubleClick?: (nodeId: string) => void,
  selectedNodeId?: string | null,
  parentX = 0,
  levelY = 0
): { nodes: Node<CustomNodeData>[]; edges: Edge[] } {
  const nodes: Node<CustomNodeData>[] = [];
  const edges: Edge[] = [];

  // Calcular posiciones de forma jerárquica
  const nodeWidth = 220;
  const nodeHeight = 140;
  const horizontalSpacing = 40;
  const verticalSpacing = 80;

  function processNode(
    currentNode: NetworkNode,
    x: number,
    y: number,
    parentId?: string
  ): { width: number } {
    // Añadir nodo actual
    nodes.push({
      id: currentNode.id,
      type: 'distributor',
      position: { x, y },
      data: {
        label: currentNode.name,
        code: currentNode.code,
        rank: currentNode.rank,
        directCount: currentNode.directCount,
        networkCount: currentNode.networkCount,
        hasChildren: currentNode.hasChildren,
        isExpanded: currentNode.isExpanded,
        isLoaded: currentNode.isLoaded,
        level: currentNode.level,
        isSelected: selectedNodeId === currentNode.id,
        onNodeClick,
        onNodeDoubleClick,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    // Añadir edge al padre si existe
    if (parentId) {
      edges.push({
        id: `${parentId}-${currentNode.id}`,
        source: parentId,
        target: currentNode.id,
        type: 'smoothstep',
        style: {
          stroke: '#CBD5E1',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#CBD5E1',
          width: 15,
          height: 15,
        },
      });
    }

    // Procesar hijos
    if (currentNode.children && currentNode.children.length > 0) {
      const childY = y + nodeHeight + verticalSpacing;
      let totalChildWidth = 0;

      // Primero calcular el ancho total de los hijos
      const childWidths: number[] = [];
      for (const child of currentNode.children) {
        const childDescendants = countDescendants(child);
        const childWidth = Math.max(1, childDescendants) * (nodeWidth + horizontalSpacing);
        childWidths.push(childWidth);
        totalChildWidth += childWidth;
      }

      // Posicionar hijos centrados bajo el padre
      let childX = x - totalChildWidth / 2 + nodeWidth / 2;

      currentNode.children.forEach((child, index) => {
        const childCenterX = childX + childWidths[index] / 2 - nodeWidth / 2;
        processNode(child, childCenterX, childY, currentNode.id);
        childX += childWidths[index];
      });

      return { width: Math.max(nodeWidth, totalChildWidth) };
    }

    return { width: nodeWidth };
  }

  // Contar descendientes para calcular espacio necesario
  function countDescendants(node: NetworkNode): number {
    if (!node.children || node.children.length === 0) return 1;
    return node.children.reduce((sum, child) => sum + countDescendants(child), 0);
  }

  processNode(node, parentX, levelY);

  return { nodes, edges };
}

export function NetworkGraph({
  data,
  onNodeClick,
  onNodeDoubleClick,
  selectedNodeId,
  className = '',
}: NetworkGraphProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Convertir datos a formato React Flow
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = convertToReactFlowData(
      data,
      onNodeClick,
      onNodeDoubleClick,
      selectedNodeId,
      0,
      0
    );
    return { initialNodes: nodes, initialEdges: edges };
  }, [data, onNodeClick, onNodeDoubleClick, selectedNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Actualizar nodos cuando cambia el selectedNodeId o los datos
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = convertToReactFlowData(
      data,
      onNodeClick,
      onNodeDoubleClick,
      selectedNodeId,
      0,
      0
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [data, selectedNodeId, onNodeClick, onNodeDoubleClick, setNodes, setEdges]);

  // Manejar doble click en nodo
  const handleNodeDoubleClick: NodeMouseHandler<Node<CustomNodeData>> = useCallback(
    (event, node) => {
      onNodeDoubleClick?.(node.id);
    },
    [onNodeDoubleClick]
  );

  if (!isClient) {
    return (
      <div className={`w-full h-full min-h-[600px] bg-white rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003B7A] mx-auto mb-4"></div>
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
        fitView
        fitViewOptions={{
          padding: 0.3,
          minZoom: 0.3,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e2e8f0"
        />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          className="!bg-white !shadow-lg !border !border-gray-200 !rounded-lg"
        />

        {/* Panel de ayuda */}
        <Panel position="top-right" className="!m-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200 max-w-[180px]">
            <p className="text-xs font-semibold text-gray-700 mb-2">Controles</p>
            <ul className="text-[11px] text-gray-600 space-y-1">
              <li className="flex items-start gap-1.5">
                <span className="text-[#003B7A] font-medium">Click:</span>
                <span>Ver detalles</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#003B7A] font-medium">Doble click:</span>
                <span>Expandir red</span>
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

        {/* Leyenda de rangos */}
        <Panel position="bottom-left" className="!m-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Rangos</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                { rank: 'distribuidor' as RankType, label: 'Distribuidor' },
                { rank: 'bronce' as RankType, label: 'Bronce' },
                { rank: 'plata' as RankType, label: 'Plata' },
                { rank: 'oro' as RankType, label: 'Oro' },
                { rank: 'platino' as RankType, label: 'Platino' },
                { rank: 'diamante' as RankType, label: 'Diamante' },
              ].map(({ rank, label }) => (
                <div key={rank} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: RANK_COLORS[rank] }}
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
