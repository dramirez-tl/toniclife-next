// services/distributorsReport.service.ts - Reporte de distribuidores de
// Comercial (GET /reports/distributors/*, permiso comercial o reports:read).
// Solo se envían los parámetros definidos: el ValidationPipe del API rechaza
// claves desconocidas.

import api from '@/lib/axios';
import { saveBlob } from '@/lib/download';
import { filenameFromDisposition } from '@/services/networkApi';
import type {
  DistributorsOverview,
  DistributorsReport,
  DistributorsReportQuery,
  DistributorsScopeQuery,
} from '@/types/distributors-report';

const BASE = '/reports/distributors';

function scopeParams(scope: DistributorsScopeQuery): Record<string, string> {
  const params: Record<string, string> = {};
  if (scope.periodId) params.periodId = scope.periodId;
  if (scope.countryCode) params.countryCode = scope.countryCode;
  if (scope.branchId) params.branchId = scope.branchId;
  if (scope.status) params.status = scope.status;
  return params;
}

function listParams(query: DistributorsReportQuery, withPaging: boolean): Record<string, string> {
  const params = scopeParams(query);
  if (query.search) params.search = query.search;
  if (query.activity) params.activity = query.activity;
  if (query.rankNumber !== undefined) params.rankNumber = String(query.rankNumber);
  if (query.joinedPeriodId) params.joinedPeriodId = query.joinedPeriodId;
  if (query.sortBy) params.sortBy = query.sortBy;
  if (query.sortOrder) params.sortOrder = query.sortOrder;
  if (withPaging) {
    if (query.page) params.page = String(query.page);
    if (query.limit) params.limit = String(query.limit);
  }
  return params;
}

class DistributorsReportApi {
  /** Resumen del periodo sobre el alcance (país / sucursal / estado). */
  async getOverview(scope: DistributorsScopeQuery = {}): Promise<DistributorsOverview> {
    const { data } = await api.get<DistributorsOverview>(`${BASE}/overview`, { params: scopeParams(scope) });
    return data;
  }

  /** Lista con filtros, orden y paginación en el servidor. */
  async getList(query: DistributorsReportQuery = {}): Promise<DistributorsReport> {
    const { data } = await api.get<DistributorsReport>(BASE, { params: listParams(query, true) });
    return data;
  }

  /**
   * Descarga el CSV con los mismos filtros y orden (sin paginar; máximo
   * 25,000 filas, más ⇒ 400 REPORT_EXPORT_TOO_LARGE). Devuelve el nombre del archivo.
   */
  async exportCsv(query: DistributorsReportQuery = {}): Promise<string> {
    const res = await api.get(`${BASE}/export`, { params: listParams(query, false), responseType: 'blob' });
    const headers = (res.headers ?? {}) as Record<string, unknown>;
    const name =
      filenameFromDisposition(headers['content-disposition'] ?? headers['Content-Disposition']) || 'distribuidores.csv';
    saveBlob(res.data as BlobPart, name);
    return name;
  }
}

export const distributorsReportApi = new DistributorsReportApi();
