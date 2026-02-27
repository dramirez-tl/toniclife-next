// useUsers.ts - React Query hooks for Users API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Usuarios

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '@/services/users.service';
import type { UserQueryParams, CreateUserDto, UpdateUserDto } from '@/types/user';

// ================================
// QUERY HOOKS
// ================================

/**
 * Hook to fetch users list with pagination and filters
 */
export function useUsers(params: UserQueryParams = {}) {
  return useQuery({
    queryKey: ['users', 'list', params],
    queryFn: () => usersService.findAll(params),
  });
}

/**
 * Hook to fetch a single user by ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: () => usersService.findById(id),
    enabled: !!id,
  });
}

// ================================
// MUTATION HOOKS
// ================================

/**
 * Hook to create a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateUserDto) => usersService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to update an existing user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateUserDto }) =>
      usersService.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'detail', id] });
    },
  });
}

/**
 * Hook to deactivate a user (soft delete)
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to activate a user
 */
export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to permanently delete a user
 */
export function useHardDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook to reset email verification for a user
 */
export function useResetEmailVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.resetEmailVerification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ================================
// STATS HOOKS
// ================================

/**
 * Hook to fetch email verification statistics
 */
export function useEmailVerificationStats() {
  return useQuery({
    queryKey: ['users', 'stats', 'email-verification'],
    queryFn: () => usersService.getEmailVerificationStats(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch verified users list (paginated)
 */
export function useVerifiedUsers(params: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['users', 'stats', 'verified-users', params],
    queryFn: () => usersService.getVerifiedUsers(params),
    staleTime: 5 * 60 * 1000,
  });
}
