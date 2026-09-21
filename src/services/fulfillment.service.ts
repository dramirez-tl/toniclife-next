// fulfillment.service.ts — Rutas de surtido del ecommerce (contrato de rutas §6).
//
// Consume `/fulfillment/*` (admin; JwtAuthGuard + PermissionsGuard):
//   lecturas  → fulfillment:read | fulfillment:manage
//   escritura → fulfillment:manage
// El PUT reemplaza por completo las rutas de los países LISTADOS; los demás no
// se tocan. El orden de `routes` es la prioridad (el API renumera 1..n).

import api from '@/lib/axios';
import type {
  FulfillmentDiagnosticsResponse,
  FulfillmentHistoryResponse,
  FulfillmentRoutesResponse,
  FulfillmentSimulatePayload,
  FulfillmentSimulateResponse,
  FulfillmentWarehouseOption,
  SaveFulfillmentRoutesPayload,
  SaveFulfillmentRoutesResponse,
} from '@/types/fulfillment';

const BASE = '/fulfillment';

class FulfillmentService {
  /** §6.1 — todos los países activos con sus rutas, ajustes y versión. */
  async getRoutes(): Promise<FulfillmentRoutesResponse> {
    const response = await api.get<FulfillmentRoutesResponse>(`${BASE}/routes`);
    return response.data;
  }

  /** §6.2 — sucursales activas que se pueden elegir como almacén. */
  async getWarehouseOptions(q?: string): Promise<FulfillmentWarehouseOption[]> {
    const response = await api.get<FulfillmentWarehouseOption[] | { data: FulfillmentWarehouseOption[] }>(
      `${BASE}/warehouse-options`,
      { params: q?.trim() ? { q: q.trim() } : undefined },
    );
    const body = response.data;
    return Array.isArray(body) ? body : (body?.data ?? []);
  }

  /** §6.3 — guarda las rutas de los países listados (con control de versión). */
  async saveRoutes(payload: SaveFulfillmentRoutesPayload): Promise<SaveFulfillmentRoutesResponse> {
    const response = await api.put<SaveFulfillmentRoutesResponse>(`${BASE}/routes`, payload);
    return response.data;
  }

  /** §6.4 — avisos y cobertura de existencias por país. */
  async getDiagnostics(): Promise<FulfillmentDiagnosticsResponse> {
    const response = await api.get<FulfillmentDiagnosticsResponse>(`${BASE}/diagnostics`);
    return response.data;
  }

  /** §6.5 — qué almacén surtiría un pedido de prueba (nunca escribe). */
  async simulate(payload: FulfillmentSimulatePayload): Promise<FulfillmentSimulateResponse> {
    const response = await api.post<FulfillmentSimulateResponse>(`${BASE}/simulate`, payload);
    return response.data;
  }

  /** §6.6 — historial de cambios (paginado por cursor). */
  async getHistory(params: { limit?: number; cursor?: string | null } = {}): Promise<FulfillmentHistoryResponse> {
    const response = await api.get<FulfillmentHistoryResponse>(`${BASE}/history`, {
      params: {
        limit: params.limit ?? 50,
        ...(params.cursor ? { cursor: params.cursor } : {}),
      },
    });
    return response.data;
  }
}

export const fulfillmentService = new FulfillmentService();
