import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sharedCartService,
  type CreateSharedCartInput,
  type SharedCartCheckoutInput,
} from '@/services/sharedCart.service';

export const sharedCartKeys = {
  all: ['shared-carts'] as const,
  list: () => [...sharedCartKeys.all, 'list'] as const,
  byToken: (token: string) => [...sharedCartKeys.all, 'token', token] as const,
};

/** Lista de carritos compartidos del distribuidor. */
export function useSharedCarts() {
  return useQuery({
    queryKey: sharedCartKeys.list(),
    queryFn: () => sharedCartService.list(),
    staleTime: 30 * 1000,
  });
}

/** Crea un carrito compartido. */
export function useCreateSharedCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSharedCartInput) => sharedCartService.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sharedCartKeys.list() });
    },
  });
}

/** Cancela un carrito compartido. */
export function useCancelSharedCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => sharedCartService.cancel(token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sharedCartKeys.list() });
    },
  });
}

/** Vista pública del carrito (cliente). */
export function useSharedCartByToken(token: string) {
  return useQuery({
    queryKey: sharedCartKeys.byToken(token),
    queryFn: () => sharedCartService.getByToken(token),
    enabled: !!token,
    staleTime: 0,
    retry: false,
  });
}

/** Checkout público del carrito (cliente). */
export function useSharedCartCheckout(token: string) {
  return useMutation({
    mutationFn: (dto: SharedCartCheckoutInput) =>
      sharedCartService.checkout(token, dto),
  });
}
