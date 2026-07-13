// useCoupons.ts - React Query hooks del admin de cupones
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  couponsService,
  type CouponInput,
  type CouponsQuery,
} from '@/services/coupons.service';

export const couponKeys = {
  all: ['coupons'] as const,
  lists: () => [...couponKeys.all, 'list'] as const,
  list: (query: CouponsQuery) => [...couponKeys.lists(), query] as const,
  stats: () => [...couponKeys.all, 'stats'] as const,
};

export const useCoupons = (query: CouponsQuery = {}) =>
  useQuery({
    queryKey: couponKeys.list(query),
    queryFn: () => couponsService.list(query),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useCouponsStats = () =>
  useQuery({
    queryKey: couponKeys.stats(),
    queryFn: () => couponsService.stats(),
    staleTime: 30 * 1000,
  });

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CouponInput) => couponsService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponKeys.all }),
  });
};

export const useUpdateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CouponInput }) =>
      couponsService.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponKeys.all }),
  });
};

export const useDeleteCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => couponsService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: couponKeys.all }),
  });
};
