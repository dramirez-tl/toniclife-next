// useViaticos.ts - Hooks de React Query del módulo de viáticos.
// Misma convención que useSupplies.ts: key factory + queries + mutations que
// invalidan. Los toasts se disparan desde el componente.

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { viaticosService } from '@/services/viaticos.service';
import type {
  ApproveViaticoDto,
  CancelViaticoDto,
  CreateViaticoDto,
  RejectViaticoDto,
  SubmitViaticoProofDto,
  UpdateViaticoDto,
  Viatico,
  ViaticoFileKind,
  ViaticoQueryParams,
} from '@/types/viaticos';

export const viaticoKeys = {
  all: ['viaticos'] as const,
  lists: () => [...viaticoKeys.all, 'list'] as const,
  list: (params: ViaticoQueryParams) => [...viaticoKeys.lists(), params] as const,
  details: () => [...viaticoKeys.all, 'detail'] as const,
  detail: (id: string) => [...viaticoKeys.details(), id] as const,
  summary: () => [...viaticoKeys.all, 'summary'] as const,
  concepts: () => [...viaticoKeys.all, 'concepts'] as const,
};

export function useViaticos(params: ViaticoQueryParams = {}) {
  return useQuery({
    queryKey: viaticoKeys.list(params),
    queryFn: () => viaticosService.list(params),
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useViatico(id: string | undefined) {
  return useQuery({
    queryKey: viaticoKeys.detail(id ?? ''),
    queryFn: () => viaticosService.getById(id as string),
    enabled: !!id,
    staleTime: 15 * 1000,
  });
}

export function useViaticoSummary() {
  return useQuery({
    queryKey: viaticoKeys.summary(),
    queryFn: () => viaticosService.getSummary(),
    staleTime: 30 * 1000,
  });
}

/** Catálogo de conceptos (cambia solo con un deploy del API). */
export function useViaticoConcepts() {
  return useQuery({
    queryKey: viaticoKeys.concepts(),
    queryFn: () => viaticosService.getConcepts(),
    staleTime: 10 * 60 * 1000,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: viaticoKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: viaticoKeys.summary() });
    if (id) void queryClient.invalidateQueries({ queryKey: viaticoKeys.detail(id) });
  };
}

export function useCreateViatico() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (dto: CreateViaticoDto) => viaticosService.create(dto),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateViatico() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateViaticoDto }) =>
      viaticosService.update(id, dto),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useCancelViatico() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: CancelViaticoDto }) =>
      viaticosService.cancel(id, dto),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useApproveViatico() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: ApproveViaticoDto }) =>
      viaticosService.approve(id, dto),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

export function useRejectViatico() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RejectViaticoDto }) =>
      viaticosService.reject(id, dto),
    onSuccess: (_, { id }) => invalidate(id),
  });
}

// ---- Comprobación (mig 158) ----
// Las mutaciones regresan la solicitud completa: se escribe directo en el
// caché del detalle (la pantalla abierta se actualiza sin otro GET) y se
// refrescan listados y resumen.

function useApplyDetail() {
  const queryClient = useQueryClient();
  return (data: Viatico) => {
    queryClient.setQueryData(viaticoKeys.detail(data.id), data);
    void queryClient.invalidateQueries({ queryKey: viaticoKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: viaticoKeys.summary() });
  };
}

export function useUploadViaticoFiles() {
  const apply = useApplyDetail();
  return useMutation({
    mutationFn: ({ id, kind, files }: { id: string; kind: ViaticoFileKind; files: File[] }) =>
      viaticosService.uploadFiles(id, kind, files),
    onSuccess: apply,
  });
}

export function useDeleteViaticoFile() {
  const apply = useApplyDetail();
  return useMutation({
    mutationFn: ({ id, fileId }: { id: string; fileId: string }) => viaticosService.deleteFile(id, fileId),
    onSuccess: apply,
  });
}

export function useSubmitViaticoProof() {
  const apply = useApplyDetail();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SubmitViaticoProofDto }) => viaticosService.submitProof(id, dto),
    onSuccess: apply,
  });
}

export function useVerifyViaticoProof() {
  const apply = useApplyDetail();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => viaticosService.verifyProof(id, notes),
    onSuccess: apply,
  });
}

export function useReturnViaticoProof() {
  const apply = useApplyDetail();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => viaticosService.returnProof(id, reason),
    onSuccess: apply,
  });
}
