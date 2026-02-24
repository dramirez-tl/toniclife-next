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

  // Indicadores visuales
  monthlyStatus?: {
    status: 'qualified' | 'purchased' | 'inactive';
    currentPoints: number;
    qualificationThreshold: number;
  };
  rankProgress?: {
    currentRankCode: string;
    nextRankCode: string;
    nextRankName: string;
    nextRank: RankType;
    progressPercent: number;
    currentGroupPoints: number;
    requiredGroupPoints: number;
    isNearPromotion: boolean;
  };
  isNewMember?: boolean;
  joinDate?: string;
  daysSinceJoin?: number;
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

// Tipos para vista de lista de downlines
export interface DownlineItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  level: number;
  rankName?: string;
  personalPoints?: number;
  status: string;
  createdAt: string;
}

export interface DownlineListResponse {
  data: DownlineItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DownlineQuery {
  search?: string;
  level?: number;
  status?: 'active' | 'inactive' | 'suspended';
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'level';
  sortOrder?: 'asc' | 'desc';
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
