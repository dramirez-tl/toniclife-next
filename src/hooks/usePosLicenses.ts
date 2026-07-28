// usePosLicenses.ts - React Query hooks para licencias POS

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { posLicensesService } from '@/services/posLicenses.service';
import type {
  PosLicenseStatus,
  CreatePosLicenseDto,
  UpdatePosLicenseDto,
  RevokePosLicenseDto,
} from '@/types/posLicense';

export const posLicensesKeys = {
  all: ['pos-licenses'] as const,
  lists: () => [...posLicensesKeys.all, 'list'] as const,
  list: (status?: PosLicenseStatus) => [...posLicensesKeys.lists(), status ?? 'any'] as const,
  byBranch: (branchId: string) => [...posLicensesKeys.all, 'by-branch', branchId] as const,
  detail: (id: string) => [...posLicensesKeys.all, 'detail', id] as const,
};

export const usePosLicenses = (status?: PosLicenseStatus) =>
  useQuery({
    queryKey: posLicensesKeys.list(status),
    queryFn: () => posLicensesService.getAll(status),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const usePosLicensesByBranch = (branchId: string | undefined) =>
  useQuery({
    queryKey: posLicensesKeys.byBranch(branchId ?? ''),
    queryFn: () => posLicensesService.getByBranch(branchId!),
    enabled: !!branchId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useCreatePosLicense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatePosLicenseDto) => posLicensesService.create(dto),
    onSuccess: (license) => {
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.all });
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.byBranch(license.branchId) });
    },
  });
};

export const useUpdatePosLicense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePosLicenseDto }) =>
      posLicensesService.update(id, dto),
    onSuccess: (license) => {
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.all });
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.byBranch(license.branchId) });
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.detail(license.id) });
    },
  });
};

export const useRevokePosLicense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: RevokePosLicenseDto }) =>
      posLicensesService.revoke(id, dto),
    onSuccess: (license) => {
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.all });
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.byBranch(license.branchId) });
    },
  });
};

export const useUnbindPosLicense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => posLicensesService.unbind(id),
    onSuccess: (license) => {
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.all });
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.byBranch(license.branchId) });
    },
  });
};

export const useSetPosLicenseRelease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, released }: { id: string; released: boolean }) =>
      posLicensesService.setRelease(id, released),
    onSuccess: (license) => {
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.all });
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.byBranch(license.branchId) });
    },
  });
};

export const useSetPosLicenseInvoicing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      posLicensesService.setInvoicing(id, enabled),
    onSuccess: (license) => {
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.all });
      queryClient.invalidateQueries({ queryKey: posLicensesKeys.byBranch(license.branchId) });
    },
  });
};
