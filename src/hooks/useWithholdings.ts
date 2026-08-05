// useWithholdings.ts — hooks React Query de retenciones de Tesorería.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  withholdingsService,
  type CreateWithholdingRequest,
  type UpdateWithholdingRequest,
} from '@/services/withholdings.service';

export const withholdingKeys = {
  all: ['withholdings'] as const,
  lists: () => [...withholdingKeys.all, 'list'] as const,
  list: (params?: { customerId?: string; status?: string }) =>
    [...withholdingKeys.lists(), params ?? {}] as const,
  applications: (id: string) =>
    [...withholdingKeys.all, 'applications', id] as const,
  preview: (periodId: string) =>
    [...withholdingKeys.all, 'preview', periodId] as const,
};

export const useWithholdings = (params?: {
  customerId?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: withholdingKeys.list(params),
    queryFn: () => withholdingsService.list(params),
    staleTime: 60 * 1000,
  });
};

export const useWithholdingApplications = (id: string, enabled = true) => {
  return useQuery({
    queryKey: withholdingKeys.applications(id),
    queryFn: () => withholdingsService.getApplications(id),
    staleTime: 60 * 1000,
    enabled: enabled && !!id,
  });
};

export const useWithholdingPreview = (periodId: string, enabled = true) => {
  return useQuery({
    queryKey: withholdingKeys.preview(periodId),
    queryFn: () => withholdingsService.preview(periodId),
    staleTime: 30 * 1000,
    enabled: enabled && !!periodId,
  });
};

export const useCreateWithholding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateWithholdingRequest) =>
      withholdingsService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: withholdingKeys.all });
    },
  });
};

export const useUpdateWithholding = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateWithholdingRequest }) =>
      withholdingsService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: withholdingKeys.all });
    },
  });
};
