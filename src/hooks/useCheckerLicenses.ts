// useCheckerLicenses.ts - Licencias de los checadores de asistencia (Admin › Sistemas › Checadores).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkerLicensesService } from '@/services/checkerLicenses.service';
import type { CreatePosLicenseDto, RevokePosLicenseDto, UpdatePosLicenseDto } from '@/types/posLicense';

export const checkerLicenseKeys = {
  all: ['checker-licenses'] as const,
  list: () => [...checkerLicenseKeys.all, 'list'] as const,
};

/** Lista de licencias de checador. Se refresca sola cada minuto: "visto por última vez" cambia con cada latido. */
export const useCheckerLicenses = () =>
  useQuery({
    queryKey: checkerLicenseKeys.list(),
    queryFn: () => checkerLicensesService.getAll(),
    refetchInterval: 60_000,
  });

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: checkerLicenseKeys.all });
};

export const useCreateCheckerLicense = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (dto: CreatePosLicenseDto) => checkerLicensesService.create(dto),
    onSuccess: invalidate,
  });
};

export const useUpdateCheckerLicense = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePosLicenseDto }) => checkerLicensesService.update(id, dto),
    onSuccess: invalidate,
  });
};

export const useRevokeCheckerLicense = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: RevokePosLicenseDto }) => checkerLicensesService.revoke(id, dto),
    onSuccess: invalidate,
  });
};

export const useUnbindCheckerLicense = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => checkerLicensesService.unbind(id),
    onSuccess: invalidate,
  });
};
