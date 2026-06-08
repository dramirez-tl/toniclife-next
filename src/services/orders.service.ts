// orders.service.ts - Service for Orders API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

import api from '@/lib/api';
import type {
  Order,
  OrderQueryParams,
  OrderListResponse,
  OrderStats,
  UpdateOrderStatusDto,
  UpdateShippingDto,
  CancelOrderDto,
  TrackingInfo,
  Payment,
} from '@/types/order';

/** Build URLSearchParams shared by list, stats and export. */
function buildOrderParams(params: OrderQueryParams): URLSearchParams {
  const queryParams = new URLSearchParams();
  const p = params as Record<string, unknown>;
  const keys = [
    'customerId',
    'status',
    'paymentStatus',
    'branchId',
    'dateFrom',
    'dateTo',
    'search',
    'page',
    'limit',
    'sortBy',
    'sortOrder',
  ];
  for (const key of keys) {
    const value = p[key];
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  }
  if (p.isInvoiced !== undefined) {
    queryParams.append('isInvoiced', String(p.isInvoiced));
  }
  return queryParams;
}

class OrdersService {
  // ================================
  // PUBLIC ENDPOINTS
  // ================================

  async getPublicTracking(orderNumber: string): Promise<TrackingInfo> {
    const response = await api.get<TrackingInfo>(`/orders/tracking/${orderNumber}`);
    return response.data;
  }

  // ================================
  // CUSTOMER ENDPOINTS
  // ================================

  async getMyOrders(params: OrderQueryParams = {}): Promise<OrderListResponse> {
    const queryParams = new URLSearchParams();

    if (params.status) queryParams.append('status', params.status);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const response = await api.get<OrderListResponse>(
      `/orders/my-orders${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  }

  async getMyOrder(id: string): Promise<Order> {
    const response = await api.get<Order>(`/orders/my-orders/${id}`);
    return response.data;
  }

  async getMyOrderTracking(id: string): Promise<TrackingInfo> {
    const response = await api.get<TrackingInfo>(`/orders/my-orders/${id}/tracking`);
    return response.data;
  }

  // ================================
  // ADMIN ENDPOINTS
  // ================================

  async findAll(params: OrderQueryParams = {}): Promise<OrderListResponse> {
    const queryString = buildOrderParams(params).toString();
    const response = await api.get<OrderListResponse>(
      `/orders${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  }

  /** Aggregated stats (counts by status + real revenue), honoring filters. */
  async getStats(params: OrderQueryParams = {}): Promise<OrderStats> {
    const queryString = buildOrderParams(params).toString();
    const response = await api.get<OrderStats>(
      `/orders/stats${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  }

  /** Download CSV of orders matching the given filters. Triggers a browser download. */
  async exportCsv(params: OrderQueryParams = {}): Promise<void> {
    const queryString = buildOrderParams(params).toString();
    const response = await api.get(
      `/orders/export${queryString ? `?${queryString}` : ''}`,
      { responseType: 'blob' }
    );

    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    link.download = `pedidos-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async findById(id: string): Promise<Order> {
    const response = await api.get<Order>(`/orders/${id}`);
    return response.data;
  }

  async getTracking(id: string): Promise<TrackingInfo> {
    const response = await api.get<TrackingInfo>(`/orders/${id}/tracking`);
    return response.data;
  }

  async getPayments(id: string): Promise<Payment[]> {
    const response = await api.get<Payment[]>(`/orders/${id}/payments`);
    return response.data;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    const response = await api.patch<Order>(`/orders/${id}/status`, dto);
    return response.data;
  }

  async updateShipping(id: string, dto: UpdateShippingDto): Promise<Order> {
    const response = await api.patch<Order>(`/orders/${id}/shipping`, dto);
    return response.data;
  }

  async cancel(id: string, dto: CancelOrderDto): Promise<Order> {
    const response = await api.patch<Order>(`/orders/${id}/cancel`, dto);
    return response.data;
  }
}

export const ordersService = new OrdersService();
export default ordersService;
