// services/networkApi.ts - Llamadas API al backend para red MLM (axios)
// Usa endpoints de /distributor/network/ (JWT only, sin permisos admin)

import api from '@/lib/axios';
import type {
  NetworkTreeResponse,
  NetworkChildrenResponse,
  NetworkMemberDetail,
  NetworkSearchResult,
  NetworkNode,
  RankType,
  DownlineListResponse,
  DownlineQuery,
  DirectLinesVolumeResponse,
} from '@/types/network';

/** Estado de un job de exportación de la red (en segundo plano). */
export interface NetworkExportJob {
  jobId: string;
  status: 'running' | 'done' | 'error';
  percent: number;
  processed: number;
  total: number;
  filename: string;
  error?: string;
}

// Mapeo de codigos de rango del backend a tipos del frontend
const rankCodeToType: Record<string, RankType> = {
  'DIST': 'distribuidor',
  'BRONCE': 'bronce',
  'PLATA': 'plata',
  'ORO': 'oro',
  'PLATINO': 'platino',
  'DIAMANTE': 'diamante',
  'DIAMANTE_DOBLE': 'doble_diamante',
  'DIAMANTE_TRIPLE': 'triple_diamante',
  'CORONA': 'sirius',
  'CORONA_DIAMANTE': 'azul',
};

// Interfaz para la respuesta del backend
interface BackendNetworkNode {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  parentId?: string;
  sponsorMemberId?: string;
  depth: number;
  path?: string;
  rank?: {
    id: string;
    code: string;
    name: string;
    rankNumber: number;
  };
  personalPoints?: number;
  groupPoints?: number;
  kitType?: string;
  status?: string;
  directDownlinesCount: number;
  children?: BackendNetworkNode[];
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
  joinDate?: string;
  daysSinceJoin?: number;
}

interface BackendTreeResponse {
  root: BackendNetworkNode;
  totalNodes: number;
  levelsLoaded: number;
}

// Interfaz para datos del usuario raiz
export interface RootUserData {
  id: string;
  name: string;
  code?: string;
  rank?: RankType;
  networkCount?: number;
  directCount?: number;
}

/**
 * Transforma un nodo del backend al formato del frontend
 */
function transformBackendNode(backendNode: BackendNetworkNode, customerNumber?: string): NetworkNode {
  const rankType = backendNode.rank?.code
    ? rankCodeToType[backendNode.rank.code] || 'distribuidor'
    : 'distribuidor';

  // Contar descendientes totales recursivamente
  const countDescendants = (node: BackendNetworkNode): number => {
    if (!node.children || node.children.length === 0) return 0;
    return node.children.reduce((acc, child) => acc + 1 + countDescendants(child), 0);
  };

  const networkCount = countDescendants(backendNode);
  const hasChildren = backendNode.directDownlinesCount > 0 || (backendNode.children && backendNode.children.length > 0);

  return {
    id: backendNode.customerId,
    code: customerNumber || `TL-${backendNode.customerId.substring(0, 6).toUpperCase()}`,
    name: backendNode.customerName,
    rank: rankType,
    level: backendNode.depth,
    directCount: backendNode.directDownlinesCount,
    networkCount: networkCount,
    hasChildren: hasChildren ?? false,
    isExpanded: (backendNode.children && backendNode.children.length > 0) ?? false,
    isLoaded: backendNode.children !== undefined,
    children: backendNode.children?.map(child => transformBackendNode(child)),
    // Indicadores
    monthlyStatus: backendNode.monthlyStatus,
    rankProgress: backendNode.rankProgress ? {
      ...backendNode.rankProgress,
      nextRank: rankCodeToType[backendNode.rankProgress.nextRankCode] || 'distribuidor',
    } : undefined,
    isNewMember: backendNode.isNewMember,
    joinDate: backendNode.joinDate,
    daysSinceJoin: backendNode.daysSinceJoin,
  };
}

/**
 * Transforma la respuesta del backend al formato del frontend
 */
function transformBackendTreeResponse(
  backendResponse: BackendTreeResponse,
  rootUserData?: RootUserData
): NetworkTreeResponse {
  const root = transformBackendNode(backendResponse.root, rootUserData?.code);

  // Sobrescribir datos del nodo raiz con datos del usuario autenticado si estan disponibles
  if (rootUserData) {
    root.name = rootUserData.name;
    root.code = rootUserData.code || root.code;
    root.rank = rootUserData.rank || root.rank;
    if (rootUserData.networkCount !== undefined) {
      root.networkCount = rootUserData.networkCount;
    }
    if (rootUserData.directCount !== undefined) {
      root.directCount = rootUserData.directCount;
    }
  }

  return {
    root,
    totalNodes: backendResponse.totalNodes,
    maxDepthLoaded: backendResponse.levelsLoaded,
  };
}

class NetworkApi {
  /**
   * Obtiene el arbol de red del distribuidor autenticado
   * Backend: GET /distributor/network/tree?depth=N
   */
  async getTree(userId: string, depth: number = 3, rootUserData?: RootUserData): Promise<NetworkTreeResponse> {
    const { data: backendResponse } = await api.get<BackendTreeResponse>(
      `/distributor/network/tree`,
      { params: { depth: depth.toString() } },
    );
    return transformBackendTreeResponse(backendResponse, rootUserData);
  }

  /**
   * Obtiene los hijos directos de un nodo (lazy loading)
   * Backend: GET /distributor/network/tree/:customerId?depth=1
   */
  async getChildren(customerId: string): Promise<NetworkChildrenResponse> {
    const { data: backendResponse } = await api.get<BackendTreeResponse>(
      `/distributor/network/tree/${customerId}`,
      { params: { depth: '1' } },
    );
    const rootNode = transformBackendNode(backendResponse.root);

    return {
      parentId: customerId,
      children: rootNode.children || [],
      hasMore: false,
    };
  }

  /**
   * Obtiene estadisticas detalladas de un miembro de la red
   * Backend: GET /distributor/network/member/:customerId
   */
  async getStats(customerId: string): Promise<NetworkMemberDetail> {
    const { data: member } = await api.get(`/distributor/network/member/${customerId}`);

    const rankType = member.rank?.code
      ? rankCodeToType[member.rank.code] || 'distribuidor'
      : 'distribuidor';

    return {
      id: member.id,
      code: member.customerNumber || `TL-${member.id.substring(0, 6).toUpperCase()}`,
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone,
      rank: rankType,
      rankLabel: member.rank?.name || 'Distribuidor',
      sponsorId: member.sponsorId,
      sponsorName: member.sponsorName,
      joinDate: member.joinDate,
      status: member.status || 'active',
      stats: {
        customerId: member.id,
        networkCount: member.stats?.networkCount || 0,
        directCount: member.stats?.directCount || 0,
        maxDepth: member.stats?.maxDepth || 0,
        totalBusinessPoints: member.stats?.totalBusinessPoints || '0',
        personalSales: member.stats?.personalSales || 0,
        teamSales: member.stats?.teamSales || 0,
        currentCommission: member.stats?.currentCommission || 0,
        historicCommission: member.stats?.historicCommission || 0,
      },
    };
  }

  /**
   * Obtiene los downlines del distribuidor autenticado (paginado)
   * Backend: GET /distributor/network/downlines
   */
  async getDownlines(query: DownlineQuery = {}): Promise<DownlineListResponse> {
    const params: Record<string, string> = {};
    if (query.search) params.search = query.search;
    if (query.level !== undefined) params.level = query.level.toString();
    if (query.status) params.status = query.status;
    if (query.qualified !== undefined) params.qualified = query.qualified ? 'true' : 'false';
    if (query.rankNumber !== undefined) params.rankNumber = query.rankNumber.toString();
    if (query.joinedPeriodId) params.joinedPeriodId = query.joinedPeriodId;
    if (query.page) params.page = query.page.toString();
    if (query.limit) params.limit = query.limit.toString();
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.sortOrder) params.sortOrder = query.sortOrder;

    const { data } = await api.get<DownlineListResponse>(`/distributor/network/downlines`, { params });
    return data;
  }

  /**
   * Inicia la exportación de la red COMPLETA en SEGUNDO PLANO (el servidor genera
   * el CSV). Devuelve el jobId para seguir el avance. Backend: POST /distributor/network/export
   */
  async startNetworkExport(): Promise<{ jobId: string }> {
    const { data } = await api.post<{ jobId: string }>(`/distributor/network/export`);
    return data;
  }

  /** Estado/progreso del job de exportación. Backend: GET /distributor/network/export-job/:jobId */
  async getNetworkExportJob(jobId: string): Promise<NetworkExportJob> {
    const { data } = await api.get<NetworkExportJob>(
      `/distributor/network/export-job/${jobId}`,
    );
    return data;
  }

  /** Descarga el CSV ya generado del job y dispara el save-as en el navegador. */
  async downloadNetworkExportFile(jobId: string, filename: string): Promise<void> {
    const res = await api.get(`/distributor/network/export-job/${jobId}/file`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data as BlobPart], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'descendencia-red.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Volumen de grupo por línea directa (con tope/rollover) del periodo.
   * Backend: GET /distributor/network/direct-lines
   */
  async getDirectLines(periodId?: string): Promise<DirectLinesVolumeResponse> {
    const params: Record<string, string> = {};
    if (periodId) params.periodId = periodId;
    const { data } = await api.get<DirectLinesVolumeResponse>(
      `/distributor/network/direct-lines`,
      { params },
    );
    return data;
  }

  /**
   * Obtiene la upline (linea ascendente) del distribuidor autenticado
   * Backend: GET /distributor/network/upline
   */
  async getUpline(customerId: string): Promise<NetworkNode[]> {
    const { data } = await api.get(`/distributor/network/upline`);
    return Array.isArray(data) ? data.map((node: BackendNetworkNode) => transformBackendNode(node)) : [];
  }

  /**
   * Agrega un distribuidor a la red (admin)
   * Backend: POST /mlm/network/:customerId/add
   */
  async addToNetwork(customerId: string, body: { sponsorId: string; position?: string }): Promise<{ success: boolean }> {
    const { data } = await api.post<{ message: string }>(`/mlm/network/${customerId}/add`, body);
    return { success: true };
  }

  /**
   * Mueve un distribuidor dentro de la red (admin)
   * Backend: PUT /mlm/network/:customerId/move
   */
  async moveInNetwork(customerId: string, body: { newSponsorId: string; reason?: string }): Promise<{ success: boolean }> {
    const { data } = await api.put<{ message: string }>(`/mlm/network/${customerId}/move`, {
      newUplineId: body.newSponsorId,
    });
    return { success: true };
  }

  /**
   * Busca distribuidores por nombre o codigo
   * Backend: GET /customers?search=...&limit=10
   */
  async search(query: string): Promise<NetworkSearchResult[]> {
    const { data: result } = await api.get('/customers', {
      params: { search: query, limit: '10' },
    });

    const customers = result.data || result;

    return customers.map((customer: any) => {
      const rankType = customer.rank?.code
        ? rankCodeToType[customer.rank.code] || 'distribuidor'
        : 'distribuidor';

      return {
        id: customer.id,
        code: customer.customerNumber || `TL-${customer.id.substring(0, 6).toUpperCase()}`,
        name: `${customer.firstName} ${customer.lastName}`,
        rank: rankType,
        path: '', // Backend does not return path in search
      };
    });
  }
}

export const networkApi = new NetworkApi();
