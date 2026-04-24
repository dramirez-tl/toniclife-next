import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { materialsService } from '@/services/materials.service';
import type {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialQueryParams,
} from '@/types/material';

const keys = {
  all: ['materials'] as const,
  list: (params?: MaterialQueryParams) => ['materials', 'list', params] as const,
  detail: (id: string) => ['materials', id] as const,
  published: (params?: MaterialQueryParams) =>
    ['materials', 'published', params] as const,
};

export function useMaterials(params?: MaterialQueryParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => materialsService.getAll(params),
  });
}

export function useMaterial(id: string, enabled = true) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => materialsService.getById(id),
    enabled: !!id && enabled,
  });
}

export function usePublishedMaterials(params?: MaterialQueryParams) {
  return useQuery({
    queryKey: keys.published(params),
    queryFn: () => materialsService.getPublished(params),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateMaterialDto) => materialsService.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMaterialDto }) =>
      materialsService.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => materialsService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUploadMaterialFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      file,
      onProgress,
    }: {
      id: string;
      file: File;
      onProgress?: (percent: number) => void;
    }) => materialsService.uploadFile(id, file, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUploadMaterialThumbnail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      materialsService.uploadThumbnail(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}
