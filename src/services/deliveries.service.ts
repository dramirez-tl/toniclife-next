// deliveries.service.ts - Entregas a domicilio (API pos/deliveries, mig 161)

import api from '@/lib/api';
import { normalizeDeliveryCarriers } from '@/lib/deliveries/carrier-choice';
import type {
  Delivery,
  DeliveryCarrierOption,
  DeliveryListResponse,
  DeliveryQuery,
  UpdateDeliveryPayload,
  UpdateDeliveryStatusPayload,
} from '@/types/deliveries';

export const deliveriesService = {
  async getDeliveries(query: DeliveryQuery = {}): Promise<DeliveryListResponse> {
    const params = new URLSearchParams();
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.status) params.append('status', query.status);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.mine) params.append('mine', '1');
    if (query.includeUnpaid) params.append('includeUnpaid', '1');
    if (query.customerId) params.append('customerId', query.customerId);
    if (query.search) params.append('search', query.search);
    if (query.kind) params.append('kind', query.kind);
    if (query.mode) params.append('mode', query.mode);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    const qs = params.toString();
    const { data } = await api.get<DeliveryListResponse>(`/pos/deliveries${qs ? `?${qs}` : ''}`);
    return data;
  },

  async getDelivery(id: string): Promise<Delivery> {
    const { data } = await api.get<Delivery>(`/pos/deliveries/${id}`);
    return data;
  },

  async updateStatus(id: string, payload: UpdateDeliveryStatusPayload): Promise<Delivery> {
    const { data } = await api.patch<Delivery>(`/pos/deliveries/${id}/status`, payload);
    return data;
  },

  async update(id: string, payload: UpdateDeliveryPayload): Promise<Delivery> {
    const { data } = await api.patch<Delivery>(`/pos/deliveries/${id}`, payload);
    return data;
  },

  /**
   * Termina la captura de un ENVÍO de Call Center (API mig 211) desde Almacén: ya se puede
   * surtir. Necesita al menos una venta cobrada; terminar uno ya terminado no hace nada.
   */
  async closeShipment(shipmentId: string): Promise<{ id: string; folio: string; salesCount: number }> {
    const { data } = await api.post<{ id: string; folio: string; salesCount: number }>(
      `/pos/shipments/${shipmentId}/close`,
      { fromWarehouse: true },
    );
    return data;
  },

  /**
   * Paqueterías ACTIVAS del catálogo por país (mig 200) para marcar un envío. Lista
   * vacía = no hay catálogo (migración pendiente o ninguna registrada): se escribe a mano.
   */
  async getCarriers(): Promise<DeliveryCarrierOption[]> {
    const { data } = await api.get<unknown>('/pos/deliveries/carriers');
    return normalizeDeliveryCarriers(data);
  },
};
