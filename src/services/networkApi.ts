// services/networkApi.ts - Llamadas API al backend para red MLM (axios)
// Usa endpoints de /distributor/network/ (JWT only, sin permisos admin):
// ficha del socio, downlines (buscador de colocación del alta), overview/
// children/members (Mi red), export v2 y volumen por línea directa. El árbol
// recursivo (tree/upline/search) y las mutaciones admin (add/move) se retiraron
// en P6 del contrato /distribuidor/red: nadie los usaba.

import api from '@/lib/axios';
import { saveBlob } from '@/lib/download';
import type {
  NetworkMemberDetail,
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

class NetworkApi {
  /**
   * Ficha de un socio de mi red (el servidor verifica que pertenezca a ella).
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

}

export const networkApi = new NetworkApi();
