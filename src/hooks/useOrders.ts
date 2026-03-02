// useOrders.ts - React Query hooks for Orders API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '@/services/orders.service';
import type {
  OrderQueryParams,
  UpdateOrderStatusDto,
  UpdateShippingDto,
  CancelOrderDto,
} from '@/types/order';

// ================================
// PUBLIC HOOKS
// ================================

export function usePublicTracking(orderNumber: string | null) {
  return useQuery({
    queryKey: ['orders', 'tracking', 'public', orderNumber],
    queryFn: () => ordersService.getPublicTracking(orderNumber!),
    enabled: !!orderNumber,
  });
}

// ================================
// CUSTOMER HOOKS
// ================================

export function useMyOrders(params: OrderQueryParams = {}) {
  return useQuery({
    queryKey: ['orders', 'my-orders', params],
    queryFn: () => ordersService.getMyOrders(params),
  });
}

export function useMyOrder(id: string | null) {
  return useQuery({
    queryKey: ['orders', 'my-orders', id],
    queryFn: () => ordersService.getMyOrder(id!),
    enabled: !!id,
  });
}

export function useMyOrderTracking(id: string | null) {
  return useQuery({
    queryKey: ['orders', 'my-orders', id, 'tracking'],
    queryFn: () => ordersService.getMyOrderTracking(id!),
    enabled: !!id,
  });
}

// ================================
// ADMIN HOOKS
// ================================

export function useOrders(params: OrderQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['orders', 'admin', params],
    queryFn: () => ordersService.findAll(params),
    enabled,
  });
}

export function useOrder(id: string | null) {
  return useQuery({
    queryKey: ['orders', 'admin', id],
    queryFn: () => ordersService.findById(id!),
    enabled: !!id,
  });
}

export function useOrderTracking(id: string | null) {
  return useQuery({
    queryKey: ['orders', 'admin', id, 'tracking'],
    queryFn: () => ordersService.getTracking(id!),
    enabled: !!id,
  });
}

export function useOrderPayments(id: string | null) {
  return useQuery({
    queryKey: ['orders', 'admin', id, 'payments'],
    queryFn: () => ordersService.getPayments(id!),
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOrderStatusDto }) =>
      ordersService.updateStatus(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin', id] });
    },
  });
}

export function useUpdateShipping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateShippingDto }) =>
      ordersService.updateShipping(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin', id] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CancelOrderDto }) =>
      ordersService.cancel(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'admin', id] });
    },
  });
}
