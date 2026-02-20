// services/networkApi.ts - Llamadas API al backend para red MLM (axios)

import api from '@/lib/axios';
import type {
  NetworkTreeResponse,
  NetworkChildrenResponse,
  NetworkMemberDetail,
  NetworkSearchResult,
  NetworkNode,
  RankType,
} from '@/types/network';

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
  uplineId?: string;
  sponsorId?: string;
  level: number;
  path?: string;
  rank?: {
    id: string;
    code: string;
    name: string;
    level: number;
  };
  personalPoints?: number;
  groupPoints?: number;
  kitType?: string;
  status?: string;
  directDownlinesCount: number;
  children?: BackendNetworkNode[];
}

interface BackendTreeResponse {
  root: BackendNetworkNode;
  totalNodes: number;
  levelsLoaded: number;
}

interface BackendStatsResponse {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  directDownlines: number;
  networkDepth: number;
  levelBreakdown?: {
    level: number;
    count: number;
    activeCount: number;
  }[];
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
    level: backendNode.level,
    directCount: backendNode.directDownlinesCount,
    networkCount: networkCount,
    hasChildren: hasChildren ?? false,
    isExpanded: (backendNode.children && backendNode.children.length > 0) ?? false,
    isLoaded: backendNode.children !== undefined,
    children: backendNode.children?.map(child => transformBackendNode(child)),
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
   * Obtiene el arbol de red con limite de profundidad
   * Backend: GET /mlm/network/:customerId/tree?depth=N
   */
  async getTree(userId: string, depth: number = 3, rootUserData?: RootUserData): Promise<NetworkTreeResponse> {
    const { data: backendResponse } = await api.get<BackendTreeResponse>(
      `/mlm/network/${userId}/tree`,
      { params: { depth: depth.toString() } },
    );
    return transformBackendTreeResponse(backendResponse, rootUserData);
  }

  /**
   * Obtiene los hijos directos de un nodo (lazy loading)
   * Backend: GET /mlm/network/:customerId/tree?depth=1
   */
  async getChildren(userId: string): Promise<NetworkChildrenResponse> {
    const { data: backendResponse } = await api.get<BackendTreeResponse>(
      `/mlm/network/${userId}/tree`,
      { params: { depth: '1' } },
    );
    const rootNode = transformBackendNode(backendResponse.root);

    return {
      parentId: userId,
      children: rootNode.children || [],
      hasMore: false,
    };
  }

  /**
   * Obtiene estadisticas detalladas de un distribuidor
   * Backend: GET /mlm/network/:customerId/stats + GET /customers/:customerId
   */
  async getStats(userId: string): Promise<NetworkMemberDetail> {
    // Fetch stats and customer data in parallel
    const [statsResponse, customerResponse] = await Promise.all([
      api.get<BackendStatsResponse>(`/mlm/network/${userId}/stats`),
      api.get(`/customers/${userId}`),
    ]);

    const stats = statsResponse.data;
    const customer = customerResponse.data;

    // Fetch period data for points and commissions
    let periodData: any = null;
    try {
      const periodResponse = await api.get(`/mlm/network-stats/customer/${userId}`);
      periodData = periodResponse.data;
    } catch {
      // Period data may not be available
    }

    // Fetch sponsor name if exists
    let sponsorName: string | undefined;
    if (customer.sponsorId) {
      try {
        const sponsorResponse = await api.get(`/customers/${customer.sponsorId}`);
        const sponsor = sponsorResponse.data;
        sponsorName = `${sponsor.firstName} ${sponsor.lastName}`;
      } catch {
        // Ignore errors fetching sponsor
      }
    }

    const rankType = customer.rank?.code
      ? rankCodeToType[customer.rank.code] || 'distribuidor'
      : 'distribuidor';

    return {
      id: customer.id,
      code: customer.customerNumber || `TL-${customer.id.substring(0, 6).toUpperCase()}`,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      rank: rankType,
      rankLabel: customer.rank?.name || 'Distribuidor',
      sponsorId: customer.sponsorId,
      sponsorName,
      joinDate: customer.createdAt,
      status: customer.status || 'active',
      stats: {
        customerId: customer.id,
        networkCount: stats.totalMembers,
        directCount: stats.directDownlines,
        maxDepth: stats.networkDepth,
        totalBusinessPoints: periodData?.points?.businessPointsMxn?.toString() || '0',
        personalSales: periodData?.sales?.personalSales || 0,
        teamSales: periodData?.sales?.teamSales || 0,
        currentCommission: periodData?.commissions?.totalNet || 0,
        historicCommission: periodData?.commissions?.totalPaid || 0,
      },
    };
  }

  /**
   * Obtiene los downlines directos de un distribuidor
   * Backend: GET /mlm/network/:customerId/downlines
   */
  async getDownlines(customerId: string): Promise<NetworkNode[]> {
    const { data } = await api.get(`/mlm/network/${customerId}/downlines`);
    return Array.isArray(data) ? data.map((node: BackendNetworkNode) => transformBackendNode(node)) : [];
  }

  /**
   * Obtiene la upline (linea ascendente) de un distribuidor
   * Backend: GET /mlm/network/:customerId/upline
   */
  async getUpline(customerId: string): Promise<NetworkNode[]> {
    const { data } = await api.get(`/mlm/network/${customerId}/upline`);
    return Array.isArray(data) ? data.map((node: BackendNetworkNode) => transformBackendNode(node)) : [];
  }

  /**
   * Agrega un distribuidor a la red
   * Backend: POST /mlm/network/:customerId/add
   */
  async addToNetwork(customerId: string, body: { sponsorId: string; position?: string }): Promise<{ success: boolean }> {
    const { data } = await api.post<{ message: string }>(`/mlm/network/${customerId}/add`, body);
    return { success: true };
  }

  /**
   * Mueve un distribuidor dentro de la red
   * Backend: PUT /mlm/network/:customerId/move
   */
  async moveInNetwork(customerId: string, body: { newSponsorId: string; reason?: string }): Promise<{ success: boolean }> {
    // Backend expects { newUplineId }, map from frontend field name
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
