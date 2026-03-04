// useStates.ts - React Query hooks for States API

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statesService } from '@/services/states.service';
import type { State, StateQueryParams, CreateStateDto, UpdateStateDto } from '@/types/state';

export const stateKeys = {
  all: ['states'] as const,
  lists: () => [...stateKeys.all, 'list'] as const,
  list: (params?: StateQueryParams) => [...stateKeys.lists(), params] as const,
  detail: (id: string) => [...stateKeys.all, 'detail', id] as const,
};

export function useStates(params?: StateQueryParams) {
  return useQuery({
    queryKey: stateKeys.list(params),
    queryFn: () => statesService.getStates(params),
    staleTime: 10 * 60 * 1000,
  });
}

export function useState(id: string) {
  return useQuery({
    queryKey: stateKeys.detail(id),
    queryFn: () => statesService.getStateById(id),
    enabled: !!id,
  });
}

interface MutationOptions<TData = unknown> {
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export function useCreateState(options?: MutationOptions<State>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateStateDto) => statesService.createState(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: stateKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
}

export function useUpdateState(options?: MutationOptions<State>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateStateDto }) =>
      statesService.updateState(id, dto),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: stateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: stateKeys.detail(id) });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
}

export function useDeleteState(options?: MutationOptions<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => statesService.deleteState(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: stateKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => options?.onError?.(error),
  });
}
