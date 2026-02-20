// hooks/useAccount.ts - React Query hooks for user account (storefront)

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

// Types
export interface MyOrdersResponse {
  data: MyOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MyOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  subtotal: string;
  taxAmount: string;
  shippingAmount: string;
  discountAmount: string;
  itemCount: number;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  items?: MyOrderItem[];
}

export interface MyOrderItem {
  id: string;
  productName: string;
  productSku: string;
  productImage?: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export interface AccountStats {
  totalOrders: number;
  wishlistItems: number;
  savedAddresses: number;
  loyaltyPoints: number;
}

// Query keys
export const accountKeys = {
  all: ['account'] as const,
  orders: () => [...accountKeys.all, 'orders'] as const,
  ordersList: (page: number, limit: number) => [...accountKeys.orders(), page, limit] as const,
  orderDetail: (id: string) => [...accountKeys.orders(), id] as const,
  stats: () => [...accountKeys.all, 'stats'] as const,
};

// API functions
const accountApi = {
  getMyOrders: async (page = 1, limit = 10): Promise<MyOrdersResponse> => {
    const response = await api.get('/orders/my-orders', {
      params: { page, limit },
    });
    return response.data;
  },

  getMyOrderDetail: async (id: string): Promise<MyOrder> => {
    const response = await api.get(`/orders/my-orders/${id}`);
    return response.data;
  },

  getMyOrderTracking: async (id: string) => {
    const response = await api.get(`/orders/my-orders/${id}/tracking`);
    return response.data;
  },
};

// Hooks
export function useMyOrders(page = 1, limit = 10) {
  return useQuery({
    queryKey: accountKeys.ordersList(page, limit),
    queryFn: () => accountApi.getMyOrders(page, limit),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useMyOrderDetail(id: string) {
  return useQuery({
    queryKey: accountKeys.orderDetail(id),
    queryFn: () => accountApi.getMyOrderDetail(id),
    enabled: !!id,
  });
}

export function useMyOrderTracking(id: string) {
  return useQuery({
    queryKey: [...accountKeys.orderDetail(id), 'tracking'],
    queryFn: () => accountApi.getMyOrderTracking(id),
    enabled: !!id,
  });
}

// Hook to get account stats - fetches directly from API
export function useAccountStats() {
  return useQuery<AccountStats>({
    queryKey: accountKeys.stats(),
    queryFn: async () => {
      // Fetch orders count
      const ordersResponse = await accountApi.getMyOrders(1, 1);

      return {
        totalOrders: ordersResponse.total || 0,
        wishlistItems: 0, // TODO: Implement when wishlist API is available
        savedAddresses: 0, // TODO: Implement when addresses API is available
        loyaltyPoints: 0, // TODO: Get from customer/user profile when available
      };
    },
    staleTime: 60 * 1000,
  });
}
