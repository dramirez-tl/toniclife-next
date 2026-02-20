// types/network.ts - Tipos para visualización de red MLM

export type RankType =
  | 'distribuidor'
  | 'bronce'
  | 'plata'
  | 'oro'
  | 'platino'
  | 'diamante'
  | 'doble_diamante'
  | 'triple_diamante'
  | 'sirius'
  | 'azul';

export interface NetworkNode {
  id: string;
  code: string;              // Código de distribuidor
  name: string;              // Nombre completo
  rank: RankType;            // Rango actual
  level: number;             // Profundidad en la red
  directCount: number;       // Cantidad de hijos directos
  networkCount: number;      // Total en su red
  hasChildren: boolean;      // Para mostrar badge "+N"
  isExpanded: boolean;       // Estado de expansión
  isLoaded: boolean;         // Si ya se cargaron los hijos
  sponsorId?: string;        // ID del patrocinador
  children?: NetworkNode[];  // Hijos directos
}

export interface NetworkStats {
  customerId: string;
  networkCount: number;
  directCount: number;
  maxDepth: number;
  totalBusinessPoints: string;
  personalSales: number;
  teamSales: number;
  currentCommission: number;
  historicCommission: number;
}

export interface NetworkMemberDetail {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  rank: RankType;
  rankLabel: string;
  sponsorId?: string;
  sponsorName?: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'suspended';
  avatarUrl?: string;
  stats: NetworkStats;
}

export interface NetworkTreeResponse {
  root: NetworkNode;
  totalNodes: number;
  maxDepthLoaded: number;
}

export interface NetworkChildrenResponse {
  parentId: string;
  children: NetworkNode[];
  hasMore: boolean;
}

export interface NetworkSearchResult {
  id: string;
  code: string;
  name: string;
  rank: RankType;
  path: string; // Path desde la raíz para navegación
}

// Tipos para React Flow
export interface ReactFlowNodeData {
  id: string;
  label: string;
  code: string;
  rank: RankType;
  directCount: number;
  networkCount: number;
  hasChildren: boolean;
  isExpanded: boolean;
  isLoaded: boolean;
  level: number;
}

export interface ReactFlowEdgeData {
  source: string;
  target: string;
}

export interface ReactFlowGraphData {
  nodes: ReactFlowNodeData[];
  edges: ReactFlowEdgeData[];
}
