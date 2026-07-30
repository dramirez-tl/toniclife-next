// useAssets.ts - Hooks de React Query del módulo de Activos de TI.
// Convención del repo: key factory + query hooks + mutations que invalidan.
// Los toasts se disparan desde el componente, no aquí.

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { assetsService } from '@/services/assets.service';
import type {
  AssetCategoryQueryParams,
  AssetLocationQueryParams,
  AssetPurchaseQueryParams,
  AssetLabelQueryParams,
  AssetQueryParams,
  AssignAssetDto,
  BulkReturnDto,
  CreateAssetCategoryDto,
  CreateAssetDto,
  CreateAssetLocationDto,
  CreateAssetPurchaseDto,
  CreateLabelBatchDto,
  CreateMaintenanceDto,
  PurchaseFileKind,
  RetireAssetDto,
  ReturnAssetDto,
  TransferAssetDto,
  UpdateAssetCategoryDto,
  UpdateAssetDto,
  UpdateAssetLocationDto,
  UpdateAssetPurchaseDto,
  UpdateMaintenanceDto,
} from '@/types/asset';

// ================================
// KEY FACTORIES
// ================================

export const assetKeys = {
  all: ['it-assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (params: AssetQueryParams) => [...assetKeys.lists(), params] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
  stats: () => [...assetKeys.all, 'stats'] as const,
  byTag: (tag: string) => [...assetKeys.all, 'by-tag', tag] as const,
  byUser: (userId: string) => [...assetKeys.all, 'by-user', userId] as const,
};

export const assetCategoryKeys = {
  all: ['it-asset-categories'] as const,
  list: (params: AssetCategoryQueryParams) => [...assetCategoryKeys.all, 'list', params] as const,
  detail: (id: string) => [...assetCategoryKeys.all, 'detail', id] as const,
};

export const assetLocationKeys = {
  all: ['it-asset-locations'] as const,
  list: (params: AssetLocationQueryParams) => [...assetLocationKeys.all, 'list', params] as const,
};

export const assetLabelKeys = {
  all: ['it-asset-labels'] as const,
  lists: () => [...assetLabelKeys.all, 'list'] as const,
  list: (params: AssetLabelQueryParams) => [...assetLabelKeys.lists(), params] as const,
  stats: () => [...assetLabelKeys.all, 'stats'] as const,
  batches: () => [...assetLabelKeys.all, 'batches'] as const,
  batch: (id: string) => [...assetLabelKeys.all, 'batch', id] as const,
};

export const assetPurchaseKeys = {
  all: ['it-asset-purchases'] as const,
  lists: () => [...assetPurchaseKeys.all, 'list'] as const,
  list: (params: AssetPurchaseQueryParams) => [...assetPurchaseKeys.lists(), params] as const,
  detail: (id: string) => [...assetPurchaseKeys.all, 'detail', id] as const,
};

// ================================
// ACTIVOS
// ================================

export function useAssets(params: AssetQueryParams = {}) {
  return useQuery({
    queryKey: assetKeys.list(params),
    queryFn: () => assetsService.getAssets(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetKeys.detail(id ?? ''),
    queryFn: () => assetsService.getAssetById(id as string),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useAssetStats() {
  return useQuery({
    queryKey: assetKeys.stats(),
    queryFn: () => assetsService.getStats(),
    staleTime: 60 * 1000,
  });
}

export function useAssetsByUser(userId: string | undefined) {
  return useQuery({
    queryKey: assetKeys.byUser(userId ?? ''),
    queryFn: () => assetsService.getAssetsByUser(userId as string),
    enabled: !!userId,
  });
}

/** Invalida listas + estadísticas (y opcionalmente el detalle de un activo). */
function useInvalidateAssets() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: assetKeys.stats() });
    if (id) void queryClient.invalidateQueries({ queryKey: assetKeys.detail(id) });
  };
}

export function useCreateAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (dto: CreateAssetDto) => assetsService.createAsset(dto),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssetDto }) =>
      assetsService.updateAsset(id, dto),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useRetireAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RetireAssetDto }) =>
      assetsService.retireAsset(id, dto),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useRestoreAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (id: string) => assetsService.restoreAsset(id),
    onSuccess: (_data, id) => invalidate(id),
  });
}

// ================================
// ASIGNACIONES
// ================================

export function useAssignAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AssignAssetDto }) =>
      assetsService.assignAsset(id, dto),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useReturnAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ReturnAssetDto }) =>
      assetsService.returnAsset(id, dto),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useTransferAsset() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TransferAssetDto }) =>
      assetsService.transferAsset(id, dto),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useBulkReturn() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (dto: BulkReturnDto) => assetsService.bulkReturn(dto),
    onSuccess: (_data, dto) => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: assetKeys.details() });
      if (dto.userId) {
        void queryClient.invalidateQueries({ queryKey: assetKeys.byUser(dto.userId) });
      }
    },
  });
}

// ================================
// DOCUMENTOS Y MANTENIMIENTO
// ================================

export function useUploadAssetDocument() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({
      assetId,
      file,
      documentType,
      description,
      isPrimary,
    }: {
      assetId: string;
      file: File;
      documentType?: string;
      description?: string;
      isPrimary?: boolean;
    }) =>
      assetsService.uploadAssetDocument(assetId, file, documentType, description, isPrimary),
    onSuccess: (_data, { assetId }) => invalidate(assetId),
  });
}

export function useDeleteAssetDocument() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({ assetId, documentId }: { assetId: string; documentId: string }) =>
      assetsService.deleteAssetDocument(assetId, documentId),
    onSuccess: (_data, { assetId }) => invalidate(assetId),
  });
}

export function useAddMaintenance() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({ assetId, dto }: { assetId: string; dto: CreateMaintenanceDto }) =>
      assetsService.addMaintenance(assetId, dto),
    onSuccess: (_data, { assetId }) => invalidate(assetId),
  });
}

export function useUpdateMaintenance() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({
      assetId,
      maintenanceId,
      dto,
    }: {
      assetId: string;
      maintenanceId: string;
      dto: UpdateMaintenanceDto;
    }) => assetsService.updateMaintenance(assetId, maintenanceId, dto),
    onSuccess: (_data, { assetId }) => invalidate(assetId),
  });
}

export function useDeleteMaintenance() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: ({ assetId, maintenanceId }: { assetId: string; maintenanceId: string }) =>
      assetsService.deleteMaintenance(assetId, maintenanceId),
    onSuccess: (_data, { assetId }) => invalidate(assetId),
  });
}

// ================================
// IMPORTACIÓN MASIVA
// ================================

export function usePreviewAssetImport() {
  return useMutation({
    mutationFn: (file: File) => assetsService.previewImport(file),
  });
}

export function useCommitAssetImport() {
  const invalidate = useInvalidateAssets();
  return useMutation({
    mutationFn: (token: string) => assetsService.commitImport(token),
    onSuccess: () => invalidate(),
  });
}

// ================================
// CATEGORÍAS
// ================================

export function useAssetCategories(params: AssetCategoryQueryParams = {}) {
  return useQuery({
    queryKey: assetCategoryKeys.list(params),
    queryFn: () => assetsService.getCategories(params),
    staleTime: 5 * 60 * 1000, // el catálogo casi no cambia
  });
}

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: assetCategoryKeys.all });
    void queryClient.invalidateQueries({ queryKey: assetKeys.all });
  };
}

export function useCreateAssetCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (dto: CreateAssetCategoryDto) => assetsService.createCategory(dto),
    onSuccess: invalidate,
  });
}

export function useUpdateAssetCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssetCategoryDto }) =>
      assetsService.updateCategory(id, dto),
    onSuccess: invalidate,
  });
}

export function useDeleteAssetCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (id: string) => assetsService.deleteCategory(id),
    onSuccess: invalidate,
  });
}

// ================================
// UBICACIONES
// ================================

export function useAssetLocations(params: AssetLocationQueryParams = {}) {
  return useQuery({
    queryKey: assetLocationKeys.list(params),
    queryFn: () => assetsService.getLocations(params),
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateLocations() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: assetLocationKeys.all });
    void queryClient.invalidateQueries({ queryKey: assetKeys.all });
  };
}

export function useCreateAssetLocation() {
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: (dto: CreateAssetLocationDto) => assetsService.createLocation(dto),
    onSuccess: invalidate,
  });
}

export function useUpdateAssetLocation() {
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssetLocationDto }) =>
      assetsService.updateLocation(id, dto),
    onSuccess: invalidate,
  });
}

export function useDeleteAssetLocation() {
  const invalidate = useInvalidateLocations();
  return useMutation({
    mutationFn: (id: string) => assetsService.deleteLocation(id),
    onSuccess: invalidate,
  });
}

// ================================
// FACTURAS DE COMPRA
// ================================

export function useAssetPurchases(params: AssetPurchaseQueryParams = {}) {
  return useQuery({
    queryKey: assetPurchaseKeys.list(params),
    queryFn: () => assetsService.getPurchases(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
}

export function useAssetPurchase(id: string | undefined) {
  return useQuery({
    queryKey: assetPurchaseKeys.detail(id ?? ''),
    queryFn: () => assetsService.getPurchaseById(id as string),
    enabled: !!id,
  });
}

function useInvalidatePurchases() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: assetPurchaseKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: assetKeys.stats() });
    if (id) void queryClient.invalidateQueries({ queryKey: assetPurchaseKeys.detail(id) });
  };
}

export function useCreateAssetPurchase() {
  const invalidate = useInvalidatePurchases();
  return useMutation({
    mutationFn: (dto: CreateAssetPurchaseDto) => assetsService.createPurchase(dto),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateAssetPurchase() {
  const invalidate = useInvalidatePurchases();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAssetPurchaseDto }) =>
      assetsService.updatePurchase(id, dto),
    onSuccess: (_data, { id }) => invalidate(id),
  });
}

export function useDeleteAssetPurchase() {
  const invalidate = useInvalidatePurchases();
  return useMutation({
    mutationFn: (id: string) => assetsService.deletePurchase(id),
    onSuccess: () => invalidate(),
  });
}

export function useUploadPurchaseFile() {
  const invalidate = useInvalidatePurchases();
  return useMutation({
    mutationFn: ({
      purchaseId,
      file,
      fileKind,
    }: {
      purchaseId: string;
      file: File;
      fileKind?: PurchaseFileKind;
    }) => assetsService.uploadPurchaseFile(purchaseId, file, fileKind),
    onSuccess: (_data, { purchaseId }) => invalidate(purchaseId),
  });
}

export function useDeletePurchaseFile() {
  const invalidate = useInvalidatePurchases();
  return useMutation({
    mutationFn: ({ purchaseId, fileId }: { purchaseId: string; fileId: string }) =>
      assetsService.deletePurchaseFile(purchaseId, fileId),
    onSuccess: (_data, { purchaseId }) => invalidate(purchaseId),
  });
}

export function useLinkAssetsToPurchase() {
  const invalidate = useInvalidatePurchases();
  return useMutation({
    mutationFn: ({ purchaseId, assetIds }: { purchaseId: string; assetIds: string[] }) =>
      assetsService.linkAssetsToPurchase(purchaseId, assetIds),
    onSuccess: (_data, { purchaseId }) => invalidate(purchaseId),
  });
}

export function useUnlinkAssetFromPurchase() {
  const invalidate = useInvalidatePurchases();
  return useMutation({
    mutationFn: ({ purchaseId, assetId }: { purchaseId: string; assetId: string }) =>
      assetsService.unlinkAssetFromPurchase(purchaseId, assetId),
    onSuccess: (_data, { purchaseId }) => invalidate(purchaseId),
  });
}

// ================================
// ETIQUETAS (inventario propio)
// ================================

export function useAssetLabels(params: AssetLabelQueryParams = {}) {
  return useQuery({
    queryKey: assetLabelKeys.list(params),
    queryFn: () => assetsService.getLabels(params),
    placeholderData: keepPreviousData,
  });
}

export function useAssetLabelStats() {
  return useQuery({
    queryKey: assetLabelKeys.stats(),
    queryFn: () => assetsService.getLabelStats(),
  });
}

export function useAssetLabelBatches() {
  return useQuery({
    queryKey: assetLabelKeys.batches(),
    queryFn: () => assetsService.getLabelBatches(),
  });
}

export function useAssetLabelBatch(id: string | undefined) {
  return useQuery({
    queryKey: assetLabelKeys.batch(id ?? ''),
    queryFn: () => assetsService.getLabelBatch(id as string),
    enabled: !!id,
  });
}

function useInvalidateLabels() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: assetLabelKeys.all });
    void queryClient.invalidateQueries({ queryKey: assetKeys.all });
  };
}

export function useCreateLabelBatch() {
  const invalidate = useInvalidateLabels();
  return useMutation({
    mutationFn: (dto: CreateLabelBatchDto) => assetsService.createLabelBatch(dto),
    onSuccess: invalidate,
  });
}

export function useMarkBatchPrinted() {
  const invalidate = useInvalidateLabels();
  return useMutation({
    mutationFn: (id: string) => assetsService.markBatchPrinted(id),
    onSuccess: invalidate,
  });
}

export function useVoidLabel() {
  const invalidate = useInvalidateLabels();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      assetsService.voidLabel(id, reason),
    onSuccess: invalidate,
  });
}

export function useRestoreLabel() {
  const invalidate = useInvalidateLabels();
  return useMutation({
    mutationFn: (id: string) => assetsService.restoreLabel(id),
    onSuccess: invalidate,
  });
}

/** Pega una etiqueta ya impresa a un equipo existente. */
export function useLinkLabel() {
  const invalidate = useInvalidateLabels();
  return useMutation({
    mutationFn: ({ assetId, code }: { assetId: string; code: string }) =>
      assetsService.linkLabel(assetId, code),
    onSuccess: invalidate,
  });
}

export function useUnlinkLabel() {
  const invalidate = useInvalidateLabels();
  return useMutation({
    mutationFn: ({
      assetId,
      voidLabel,
      reason,
    }: {
      assetId: string;
      voidLabel?: boolean;
      reason?: string;
    }) => assetsService.unlinkLabel(assetId, { void: voidLabel, reason }),
    onSuccess: invalidate,
  });
}
