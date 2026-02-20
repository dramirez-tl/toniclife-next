// orders.service.ts - Service for Orders API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

import api from '@/lib/api';
import type {
  Order,
  OrderQueryParams,
  OrderListResponse,
  UpdateOrderStatusDto,
  UpdateShippingDto,
  CancelOrderDto,
  TrackingInfo,
  Payment,
} from '@/types/order';

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
    const queryParams = new URLSearchParams();
    // Cast to any to access backend params not yet in the frontend type
    const p = params as any;

    if (p.customerId) queryParams.append('customerId', p.customerId);
    if (p.status) queryParams.append('status', p.status);
    if (p.paymentStatus) queryParams.append('paymentStatus', p.paymentStatus);
    if (p.shippingStatus) queryParams.append('shippingStatus', p.shippingStatus);
    if (p.orderType) queryParams.append('orderType', p.orderType);
    if (p.branchId) queryParams.append('branchId', p.branchId);
    if (p.dateFrom) queryParams.append('dateFrom', p.dateFrom);
    if (p.dateTo) queryParams.append('dateTo', p.dateTo);
    if (p.search) queryParams.append('search', p.search);
    if (p.page) queryParams.append('page', p.page.toString());
    if (p.limit) queryParams.append('limit', p.limit.toString());
    if (p.sortBy) queryParams.append('sortBy', p.sortBy);
    if (p.sortOrder) queryParams.append('sortOrder', p.sortOrder);

    const queryString = queryParams.toString();
    const response = await api.get<OrderListResponse>(
      `/orders${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
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
