// assets.service.ts - Cliente del módulo de Activos de TI.
// Rutas del API: /it-assets, /it-asset-categories, /it-asset-locations,
// /it-asset-purchases.

import api from '@/lib/axios';
import type {
  Asset,
  AssetCategory,
  AssetCategoryQueryParams,
  AssetDetail,
  AssetDocument,
  AssetImportPreview,
  AssetImportResult,
  AssetLabel,
  AssetListResponse,
  AssetLocation,
  AssetLocationQueryParams,
  AssetMaintenance,
  AssetPurchase,
  AssetPurchaseDetail,
  AssetPurchaseFile,
  AssetPurchaseLinkedAsset,
  AssetPurchaseListResponse,
  AssetPurchaseQueryParams,
  AssetQueryParams,
  AssetStats,
  AssignAssetDto,
  BulkReturnDto,
  CreateAssetCategoryDto,
  CreateAssetDto,
  CreateAssetLocationDto,
  CreateAssetPurchaseDto,
  CreateMaintenanceDto,
  DeleteResult,
  PurchaseFileKind,
  RetireAssetDto,
  ReturnAssetDto,
  SignedFileUrl,
  TransferAssetDto,
  UpdateAssetCategoryDto,
  UpdateAssetDto,
  UpdateAssetLocationDto,
  UpdateAssetPurchaseDto,
  UpdateMaintenanceDto,
  UserAssignedAsset,
} from '@/types/asset';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };

class AssetsService {
  // ================================
  // ACTIVOS
  // ================================

  async getAssets(params?: AssetQueryParams): Promise<AssetListResponse> {
    const { data } = await api.get<AssetListResponse>('/it-assets', { params });
    return data;
  }

  async getAssetById(id: string): Promise<AssetDetail> {
    const { data } = await api.get<AssetDetail>(`/it-assets/${id}`);
    return data;
  }

  /** Búsqueda por código escaneado (etiqueta, serie, etiqueta previa o del fabricante). */
  async getAssetByTag(tag: string): Promise<AssetDetail> {
    const { data } = await api.get<AssetDetail>(`/it-assets/by-tag/${encodeURIComponent(tag)}`);
    return data;
  }

  async getStats(): Promise<AssetStats> {
    const { data } = await api.get<AssetStats>('/it-assets/stats');
    return data;
  }

  async createAsset(dto: CreateAssetDto): Promise<AssetDetail> {
    const { data } = await api.post<AssetDetail>('/it-assets', dto);
    return data;
  }

  async updateAsset(id: string, dto: UpdateAssetDto): Promise<AssetDetail> {
    const { data } = await api.patch<AssetDetail>(`/it-assets/${id}`, dto);
    return data;
  }

  /** Baja lógica con motivo (el API la expone como DELETE con cuerpo). */
  async retireAsset(id: string, dto: RetireAssetDto): Promise<AssetDetail> {
    const { data } = await api.delete<AssetDetail>(`/it-assets/${id}`, { data: dto });
    return data;
  }

  async restoreAsset(id: string): Promise<AssetDetail> {
    const { data } = await api.post<AssetDetail>(`/it-assets/${id}/restore`);
    return data;
  }

  // ================================
  // ASIGNACIONES
  // ================================

  async assignAsset(id: string, dto: AssignAssetDto): Promise<AssetDetail> {
    const { data } = await api.post<AssetDetail>(`/it-assets/${id}/assign`, dto);
    return data;
  }

  async returnAsset(id: string, dto: ReturnAssetDto): Promise<AssetDetail> {
    const { data } = await api.post<AssetDetail>(`/it-assets/${id}/return`, dto);
    return data;
  }

  async transferAsset(id: string, dto: TransferAssetDto): Promise<AssetDetail> {
    const { data } = await api.post<AssetDetail>(`/it-assets/${id}/transfer`, dto);
    return data;
  }

  async bulkReturn(dto: BulkReturnDto): Promise<{ returned: number; message: string }> {
    const { data } = await api.post<{ returned: number; message: string }>(
      '/it-assets/assignments/bulk-return',
      dto,
    );
    return data;
  }

  /** Qué tiene asignado hoy un colaborador (útil en bajas de personal). */
  async getAssetsByUser(userId: string): Promise<UserAssignedAsset[]> {
    const { data } = await api.get<UserAssignedAsset[]>(`/it-assets/by-user/${userId}`);
    return data;
  }

  // ================================
  // DOCUMENTOS DEL ACTIVO
  // ================================

  async uploadAssetDocument(
    assetId: string,
    file: File,
    documentType = 'photo',
    description?: string,
    isPrimary?: boolean,
  ): Promise<AssetDocument[]> {
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    if (description) form.append('description', description);
    if (isPrimary) form.append('isPrimary', 'true');
    const { data } = await api.post<AssetDocument[]>(
      `/it-assets/${assetId}/documents`,
      form,
      MULTIPART,
    );
    return data;
  }

  async getAssetDocumentUrl(assetId: string, documentId: string): Promise<SignedFileUrl> {
    const { data } = await api.get<SignedFileUrl>(
      `/it-assets/${assetId}/documents/${documentId}/download`,
    );
    return data;
  }

  async deleteAssetDocument(assetId: string, documentId: string): Promise<void> {
    await api.delete(`/it-assets/${assetId}/documents/${documentId}`);
  }

  // ================================
  // MANTENIMIENTO E INCIDENCIAS
  // ================================

  async getMaintenance(assetId: string): Promise<AssetMaintenance[]> {
    const { data } = await api.get<AssetMaintenance[]>(`/it-assets/${assetId}/maintenance`);
    return data;
  }

  async addMaintenance(assetId: string, dto: CreateMaintenanceDto): Promise<AssetMaintenance[]> {
    const { data } = await api.post<AssetMaintenance[]>(
      `/it-assets/${assetId}/maintenance`,
      dto,
    );
    return data;
  }

  async updateMaintenance(
    assetId: string,
    maintenanceId: string,
    dto: UpdateMaintenanceDto,
  ): Promise<AssetMaintenance[]> {
    const { data } = await api.patch<AssetMaintenance[]>(
      `/it-assets/${assetId}/maintenance/${maintenanceId}`,
      dto,
    );
    return data;
  }

  async deleteMaintenance(assetId: string, maintenanceId: string): Promise<void> {
    await api.delete(`/it-assets/${assetId}/maintenance/${maintenanceId}`);
  }

  // ================================
  // ETIQUETAS
  // ================================

  async getPendingLabels(limit = 200): Promise<AssetLabel[]> {
    const { data } = await api.get<AssetLabel[]>('/it-assets/pending-labels', {
      params: { limit },
    });
    return data;
  }

  async markLabelsPrinted(assetIds: string[]): Promise<{ updated: number }> {
    const { data } = await api.post<{ updated: number }>('/it-assets/labels/printed', {
      assetIds,
    });
    return data;
  }

  // ================================
  // IMPORTACIÓN MASIVA
  // ================================

  getImportTemplateUrl(): string {
    return '/it-assets/import/template';
  }

  async downloadImportTemplate(): Promise<Blob> {
    const { data } = await api.get<Blob>('/it-assets/import/template', {
      responseType: 'blob',
    });
    return data;
  }

  async previewImport(file: File): Promise<AssetImportPreview> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<AssetImportPreview>(
      '/it-assets/import/preview',
      form,
      MULTIPART,
    );
    return data;
  }

  async commitImport(token: string): Promise<AssetImportResult> {
    const { data } = await api.post<AssetImportResult>('/it-assets/import/commit', { token });
    return data;
  }

  // ================================
  // CATEGORÍAS
  // ================================

  async getCategories(params?: AssetCategoryQueryParams): Promise<AssetCategory[]> {
    const { data } = await api.get<AssetCategory[]>('/it-asset-categories', { params });
    return data;
  }

  async getCategoryById(id: string): Promise<AssetCategory> {
    const { data } = await api.get<AssetCategory>(`/it-asset-categories/${id}`);
    return data;
  }

  async createCategory(dto: CreateAssetCategoryDto): Promise<AssetCategory> {
    const { data } = await api.post<AssetCategory>('/it-asset-categories', dto);
    return data;
  }

  async updateCategory(id: string, dto: UpdateAssetCategoryDto): Promise<AssetCategory> {
    const { data } = await api.patch<AssetCategory>(`/it-asset-categories/${id}`, dto);
    return data;
  }

  async deleteCategory(id: string): Promise<DeleteResult> {
    const { data } = await api.delete<DeleteResult>(`/it-asset-categories/${id}`);
    return data;
  }

  // ================================
  // UBICACIONES
  // ================================

  async getLocations(params?: AssetLocationQueryParams): Promise<AssetLocation[]> {
    const { data } = await api.get<AssetLocation[]>('/it-asset-locations', { params });
    return data;
  }

  async createLocation(dto: CreateAssetLocationDto): Promise<AssetLocation> {
    const { data } = await api.post<AssetLocation>('/it-asset-locations', dto);
    return data;
  }

  async updateLocation(id: string, dto: UpdateAssetLocationDto): Promise<AssetLocation> {
    const { data } = await api.patch<AssetLocation>(`/it-asset-locations/${id}`, dto);
    return data;
  }

  async deleteLocation(id: string): Promise<DeleteResult> {
    const { data } = await api.delete<DeleteResult>(`/it-asset-locations/${id}`);
    return data;
  }

  // ================================
  // FACTURAS DE COMPRA
  // ================================

  async getPurchases(params?: AssetPurchaseQueryParams): Promise<AssetPurchaseListResponse> {
    const { data } = await api.get<AssetPurchaseListResponse>('/it-asset-purchases', { params });
    return data;
  }

  async getPurchaseById(id: string): Promise<AssetPurchaseDetail> {
    const { data } = await api.get<AssetPurchaseDetail>(`/it-asset-purchases/${id}`);
    return data;
  }

  async createPurchase(dto: CreateAssetPurchaseDto): Promise<AssetPurchaseDetail> {
    const { data } = await api.post<AssetPurchaseDetail>('/it-asset-purchases', dto);
    return data;
  }

  async updatePurchase(id: string, dto: UpdateAssetPurchaseDto): Promise<AssetPurchaseDetail> {
    const { data } = await api.patch<AssetPurchaseDetail>(`/it-asset-purchases/${id}`, dto);
    return data;
  }

  async deletePurchase(id: string): Promise<DeleteResult> {
    const { data } = await api.delete<DeleteResult>(`/it-asset-purchases/${id}`);
    return data;
  }

  async uploadPurchaseFile(
    purchaseId: string,
    file: File,
    fileKind?: PurchaseFileKind,
  ): Promise<AssetPurchaseFile[]> {
    const form = new FormData();
    form.append('file', file);
    if (fileKind) form.append('fileKind', fileKind);
    const { data } = await api.post<AssetPurchaseFile[]>(
      `/it-asset-purchases/${purchaseId}/files`,
      form,
      MULTIPART,
    );
    return data;
  }

  async getPurchaseFileUrl(purchaseId: string, fileId: string): Promise<SignedFileUrl> {
    const { data } = await api.get<SignedFileUrl>(
      `/it-asset-purchases/${purchaseId}/files/${fileId}/download`,
    );
    return data;
  }

  async deletePurchaseFile(purchaseId: string, fileId: string): Promise<void> {
    await api.delete(`/it-asset-purchases/${purchaseId}/files/${fileId}`);
  }

  async getPurchaseAssets(purchaseId: string): Promise<AssetPurchaseLinkedAsset[]> {
    const { data } = await api.get<AssetPurchaseLinkedAsset[]>(
      `/it-asset-purchases/${purchaseId}/assets`,
    );
    return data;
  }

  /** Enlaza equipos ya existentes a la factura (así no se sube el PDF N veces). */
  async linkAssetsToPurchase(
    purchaseId: string,
    assetIds: string[],
  ): Promise<{ linked: number; message: string }> {
    const { data } = await api.post<{ linked: number; message: string }>(
      `/it-asset-purchases/${purchaseId}/assets`,
      { assetIds },
    );
    return data;
  }

  async unlinkAssetFromPurchase(purchaseId: string, assetId: string): Promise<void> {
    await api.delete(`/it-asset-purchases/${purchaseId}/assets/${assetId}`);
  }
}

export const assetsService = new AssetsService();
export default assetsService;

/** Abre en otra pestaña un archivo privado usando su signed URL. */
export async function openSignedFile(promise: Promise<SignedFileUrl>): Promise<void> {
  const { url } = await promise;
  window.open(url, '_blank', 'noopener,noreferrer');
}
