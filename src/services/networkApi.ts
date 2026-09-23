// services/networkApi.ts - Llamadas API al backend para red MLM (axios)
// Usa endpoints de /distributor/network/ (JWT only, sin permisos admin)

import api from '@/lib/axios';
import { saveBlob } from '@/lib/download';
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
  NetworkChildren,
  NetworkChildrenQuery,
  NetworkExportJob,
  NetworkExportStart,
  NetworkMembers,
  NetworkMembersQuery,
  NetworkOverview,
} from '@/types/network';

/**
 * Estado de un job de exportación de la red (en segundo plano). Vive en
 * types/network.ts (wire ampliado del export v2); se re-exporta porque
 * customers.service.ts y el admin lo importan de aquí.
 */
export type { NetworkExportJob } from '@/types/network';

/** Nombre de archivo del header Content-Disposition (`attachment; filename="x.csv"`), o null. */
export function filenameFromDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      // cae al filename simple
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
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
   * (Legacy, árbol recursivo) Hijos directos de un nodo vía network/tree/:id.
   * Sin usos fuera de useNetwork.ts; se retira en P6. El explorador nuevo usa
   * getChildren(query) → GET network/children.
   * Backend: GET /distributor/network/tree/:customerId?depth=1
   */
  async getTreeChildren(customerId: string): Promise<NetworkChildrenResponse> {
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

  // -------------------------------------------------------------------------
  // "Mi red" para redes grandes (contrato /distribuidor/red §4): resumen,
  // explorador por líneas y lista plana con filtros/orden en el servidor.
  // Todas bajo JWT del distribuidor; el periodo por defecto lo resuelve el
  // servidor con CURRENT_DATE (26→25).
  // -------------------------------------------------------------------------

  /**
   * Resumen del periodo: 6 indicadores + desglose por nivel + "en riesgo".
   * Backend: GET /distributor/network/overview?periodId=
   */
  async getOverview(periodId?: string | null): Promise<NetworkOverview> {
    const params: Record<string, string> = {};
    if (periodId) params.periodId = periodId;
    const { data } = await api.get<NetworkOverview>(`/distributor/network/overview`, { params });
    return data;
  }

  /**
   * Hijos directos de un nodo de mi red (explorador). `parent` = 'me' o
   * memberId; `parents` (≤ 50) abre varias líneas a la vez y responde byParent.
   * Backend: GET /distributor/network/children
   */
  async getChildren(query: NetworkChildrenQuery = {}): Promise<NetworkChildren> {
    const params: Record<string, string> = {};
    if (query.parents && query.parents.length) params.parents = query.parents.join(',');
    else if (query.parent) params.parent = query.parent;
    if (query.periodId) params.periodId = query.periodId;
    if (query.page) params.page = String(query.page);
    if (query.limit) params.limit = String(query.limit);
    const { data } = await api.get<NetworkChildren>(`/distributor/network/children`, { params });
    return data;
  }

  /**
   * Lista plana de mi red con búsqueda, filtros, orden y paginación en el
   * servidor (no recorre el árbol). Solo se envían los parámetros definidos:
   * el ValidationPipe del API rechaza claves desconocidas.
   * Backend: GET /distributor/network/members
   */
  async getMembers(query: NetworkMembersQuery = {}): Promise<NetworkMembers> {
    const params: Record<string, string> = {};
    if (query.search) params.search = query.search;
    if (query.level !== undefined) params.level = String(query.level);
    if (query.levelDeeper) params.levelDeeper = 'true';
    if (query.status) params.status = query.status;
    if (query.activity) params.activity = query.activity;
    if (query.rankNumber !== undefined) params.rankNumber = String(query.rankNumber);
    if (query.joinedPeriodId) params.joinedPeriodId = query.joinedPeriodId;
    if (query.under) params.under = query.under;
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.sortOrder) params.sortOrder = query.sortOrder;
    if (query.page) params.page = String(query.page);
    if (query.limit) params.limit = String(query.limit);
    if (query.periodId) params.periodId = query.periodId;
    const { data } = await api.get<NetworkMembers>(`/distributor/network/members`, { params });
    return data;
  }

  /**
   * Inicia la exportación de la red COMPLETA en SEGUNDO PLANO (el servidor genera
   * el CSV con el formato de siempre). `periodId` opcional (sin él, el periodo
   * actual). Responde { jobId, phase, queuePosition?, reused? }: si ya hay un job
   * del mismo periodo devuelve su jobId; si hay un archivo generado hace < 10 min,
   * reused=true. 429 = ocupado (cola/disco/6 arranques por minuto).
   * Backend: POST /distributor/network/export
   */
  async startNetworkExport(periodId?: string | null): Promise<NetworkExportStart> {
    const { data } = await api.post<NetworkExportStart>(
      `/distributor/network/export`,
      periodId ? { periodId } : undefined,
    );
    return data;
  }

  /**
   * Cancela un job en espera o en curso (el archivo temporal se borra).
   * Responde el estado con status 'error' y phase 'cancelled'; 409 si ya terminó.
   * Backend: DELETE /distributor/network/export-job/:jobId
   */
  async cancelNetworkExport(jobId: string): Promise<NetworkExportJob> {
    const { data } = await api.delete<NetworkExportJob>(`/distributor/network/export-job/${jobId}`);
    return data;
  }

  /**
   * Jobs vivos del distribuidor (en espera, en curso, listos, con error o
   * cancelados), del más reciente al más antiguo: para reconectar al montar.
   * Backend: GET /distributor/network/export-jobs
   */
  async listNetworkExportJobs(): Promise<NetworkExportJob[]> {
    const { data } = await api.get<NetworkExportJob[]>(`/distributor/network/export-jobs`);
    return Array.isArray(data) ? data : [];
  }

  /**
   * Estado/progreso del job (Map.get en el servidor, O(1)). 404 = no existe,
   * expiró (10 min tras terminar) o el servidor se reinició.
   * Backend: GET /distributor/network/export-job/:jobId
   */
  async getNetworkExportJob(jobId: string): Promise<NetworkExportJob> {
    const { data } = await api.get<NetworkExportJob>(
      `/distributor/network/export-job/${jobId}`,
    );
    return data;
  }

  /**
   * Descarga el CSV ya generado del job (stream) y dispara el save-as en el
   * navegador. Sin `filename` se toma del Content-Disposition del servidor.
   * Backend: GET /distributor/network/export-job/:jobId/file
   */
  async downloadNetworkExportFile(jobId: string, filename?: string | null): Promise<string> {
    const res = await api.get(`/distributor/network/export-job/${jobId}/file`, {
      responseType: 'blob',
    });
    const headers = (res.headers ?? {}) as Record<string, unknown>;
    const name =
      filename ||
      filenameFromDisposition(headers['content-disposition'] ?? headers['Content-Disposition']) ||
      'descendencia-red.csv';
    saveBlob(res.data as BlobPart, name);
    return name;
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
   * Obtiene la upline (linea ascendente) del distribuidor autenticado. El
   * endpoint es "mi upline" (JWT): no viaja ningún id.
   * Backend: GET /distributor/network/upline
   */
  async getUpline(): Promise<NetworkNode[]> {
    const { data } = await api.get(`/distributor/network/upline`);
    return Array.isArray(data) ? data.map((node: BackendNetworkNode) => transformBackendNode(node)) : [];
  }

  /**
   * Agrega un distribuidor a la red (admin)
   * Backend: POST /mlm/network/:customerId/add
   */
  async addToNetwork(customerId: string, body: { sponsorId: string; position?: string }): Promise<{ success: boolean }> {
    await api.post<{ message: string }>(`/mlm/network/${customerId}/add`, body);
    return { success: true };
  }

  /**
   * Mueve un distribuidor dentro de la red (admin)
   * Backend: PUT /mlm/network/:customerId/move
   */
  async moveInNetwork(customerId: string, body: { newSponsorId: string; reason?: string }): Promise<{ success: boolean }> {
    await api.put<{ message: string }>(`/mlm/network/${customerId}/move`, {
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

    // Forma mínima del cliente que devuelve GET /customers (lista paginada o arreglo).
    interface SearchCustomer {
      id: string;
      customerNumber?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      rank?: { code?: string | null } | null;
    }
    const customers: SearchCustomer[] = result.data || result;

    return customers.map((customer) => {
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
