// useOrders.ts - React Query hooks for Orders API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '@/services/orders.service';
import type {
  Order,
  OrderQueryParams,
  TrackingInfo,
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

/** Opciones de consulta que la confirmación post-pago necesita (polling mientras el webhook confirma). */
export interface MyOrderQueryOptions<T> {
  enabled?: boolean;
  refetchInterval?:
    | number
    | false
    | ((query: { state: { data?: T; dataUpdateCount: number } }) => number | false);
  retry?: number | boolean;
}

/** Clave de React Query del detalle de un pedido del cliente (la usa la confirmación para leer su estado). */
export const myOrderQueryKey = (id: string | null) => ['orders', 'my-orders', id] as const;

export function useMyOrder(id: string | null, options: MyOrderQueryOptions<Order> = {}) {
  return useQuery({
    queryKey: myOrderQueryKey(id),
    queryFn: () => ordersService.getMyOrder(id!),
    enabled: !!id && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
    retry: options.retry,
  });
}

export function useMyOrderTracking(id: string | null, options: MyOrderQueryOptions<TrackingInfo> = {}) {
  return useQuery({
    queryKey: ['orders', 'my-orders', id, 'tracking'],
    queryFn: () => ordersService.getMyOrderTracking(id!),
    enabled: !!id && (options.enabled ?? true),
    refetchInterval: options.refetchInterval,
    retry: options.retry,
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

export function useOrderStats(params: OrderQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: ['orders', 'admin', 'stats', params],
    queryFn: () => ordersService.getStats(params),
    enabled,
  });
}

export function useExportOrders() {
  return useMutation({
    mutationFn: (params: OrderQueryParams = {}) => ordersService.exportCsv(params),
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
