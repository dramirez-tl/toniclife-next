// inventory.service.ts - Service for Inventory API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario

import api from '@/lib/api';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel } from '@/lib/timezone-utils';
import {
  MovementStatus,
  AdjustmentStatus,
  AdjustmentType,
  CountType,
  MovementType,
  LotStatus,
} from '@/types/inventory';
import type {
  BranchStockResponseDto,
  BranchStockQueryDto,
  ProductStockDto,
  KardexResponseDto,
  KardexQueryDto,
  TransferDto,
  TransferListResponseDto,
  TransferQueryDto,
  CreateTransferDto,
  ApproveTransferDto,
  CancelTransferDto,
  RejectTransferDto,
  AdjustmentDto,
  AdjustmentListResponseDto,
  AdjustmentQueryDto,
  CreateAdjustmentDto,
  UpdateAdjustmentDto,
  SubmitAdjustmentDto,
  ApproveAdjustmentDto,
  RejectAdjustmentDto,
  ApplyAdjustmentDto,
  UpdateStockSettingsDto,
  MovementDto,
  MovementListResponseDto,
  MovementQueryDto,
  CreateMovementDto,
  ProductLotDto,
  InventoryStats,
  BranchStockStats,
} from '@/types/inventory';

/** Triggers a browser download for a CSV blob. */
function downloadCsv(data: BlobPart, filename: string): void {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

class InventoryService {
  // ================================
  // STOCK METHODS
  // ================================

  async getBranchStock(
    branchId: string,
    query: BranchStockQueryDto = {}
  ): Promise<BranchStockResponseDto> {
    const params = new URLSearchParams();

    if (query.search) params.append('search', query.search);
    if (query.code) params.append('code', query.code);
    if (query.categoryId) params.append('categoryId', query.categoryId);
    if (query.lowStock !== undefined) params.append('lowStock', String(query.lowStock));
    if (query.outOfStock !== undefined) params.append('outOfStock', String(query.outOfStock));
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);

    const response = await api.get<BranchStockResponseDto>(
      `/inventory/branches/${branchId}?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Trae TODO el stock de una sucursal (todas las páginas), para iniciar un
   * conteo físico completo. Pagina en bloques hasta reunir todos los productos.
   */
  async getAllBranchStock(branchId: string): Promise<ProductStockDto[]> {
    const pageSize = 100;
    const rows: ProductStockDto[] = [];
    let page = 1;
    let total = 0;
    do {
      const res = await this.getBranchStock(branchId, {
        page,
        limit: pageSize,
        sortBy: 'productName',
        sortOrder: 'asc',
      });
      total = res.total;
      if (!res.data.length) break;
      rows.push(...res.data);
      page += 1;
    } while (rows.length < total && page <= 1000);
    return rows;
  }

  async getProductStock(productId: string): Promise<ProductStockDto[]> {
    const response = await api.get<ProductStockDto[]>(
      `/inventory/products/${productId}/stock`
    );
    return response.data;
  }

  async updateStockSettings(
    branchId: string,
    productId: string,
    dto: UpdateStockSettingsDto,
  ): Promise<ProductStockDto> {
    const response = await api.patch<ProductStockDto>(
      `/inventory/stock/${branchId}/${productId}/settings`,
      dto,
    );
    return response.data;
  }

  // ================================
  // LOTS METHODS
  // ================================

  async getLots(
    productId: string,
    branchId: string,
    status: LotStatus = LotStatus.AVAILABLE,
  ): Promise<ProductLotDto[]> {
    const params = new URLSearchParams({
      productId,
      branchId,
      status,
    });
    const response = await api.get<ProductLotDto[]>(`/inventory/lots?${params.toString()}`);
    return response.data;
  }

  // ================================
  // KARDEX METHODS
  // ================================

  async getKardex(productId: string, query: KardexQueryDto = {}): Promise<KardexResponseDto> {
    const params = new URLSearchParams();

    if (query.branchId) params.append('branchId', query.branchId);
    if (query.movementType) params.append('movementType', query.movementType);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await api.get<KardexResponseDto>(
      `/inventory/kardex/${productId}?${params.toString()}`
    );
    return response.data;
  }

  // ================================
  // TRANSFER METHODS
  // ================================

  async createTransfer(data: CreateTransferDto): Promise<TransferDto> {
    const response = await api.post<TransferDto>('/inventory/transfers', data);
    return response.data;
  }

  async getTransfers(query: TransferQueryDto = {}): Promise<TransferListResponseDto> {
    const params = new URLSearchParams();

    if (query.sourceBranchId) params.append('sourceBranchId', query.sourceBranchId);
    if (query.destinationBranchId) params.append('destinationBranchId', query.destinationBranchId);
    if (query.status) params.append('status', query.status);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.search) params.append('search', query.search);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await api.get<TransferListResponseDto>(
      `/inventory/transfers?${params.toString()}`
    );
    return response.data;
  }

  async getTransfer(id: string): Promise<TransferDto> {
    const response = await api.get<TransferDto>(`/inventory/transfers/${id}`);
    return response.data;
  }

  async approveTransfer(id: string, data: ApproveTransferDto = {}): Promise<TransferDto> {
    const response = await api.patch<TransferDto>(
      `/inventory/transfers/${id}/approve`,
      data
    );
    return response.data;
  }

  async cancelTransfer(id: string, data: CancelTransferDto): Promise<TransferDto> {
    const response = await api.patch<TransferDto>(
      `/inventory/transfers/${id}/cancel`,
      data
    );
    return response.data;
  }

  // ================================
  // ADJUSTMENT METHODS
  // ================================

  async createAdjustment(data: CreateAdjustmentDto): Promise<AdjustmentDto> {
    const response = await api.post<AdjustmentDto>('/inventory/counts', data);
    return response.data;
  }

  async getAdjustments(query: AdjustmentQueryDto = {}): Promise<AdjustmentListResponseDto> {
    const params = new URLSearchParams();

    if (query.branchId) params.append('branchId', query.branchId);
    if (query.status) params.append('status', query.status);
    if (query.countType) params.append('countType', query.countType);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await api.get<AdjustmentListResponseDto>(
      `/inventory/counts?${params.toString()}`
    );
    return response.data;
  }

  async getAdjustment(id: string): Promise<AdjustmentDto> {
    const response = await api.get<AdjustmentDto>(`/inventory/counts/${id}`);
    return response.data;
  }

  async getBranchPosLock(branchId: string): Promise<{ locked: boolean; message: string | null }> {
    const response = await api.get<{ locked: boolean; message: string | null }>(
      `/inventory/counts/branch-lock/${branchId}`,
    );
    return response.data;
  }

  async lockBranchPos(branchId: string): Promise<{ locked: boolean; message: string | null }> {
    const response = await api.post<{ locked: boolean; message: string | null }>(
      `/inventory/counts/branch-lock/${branchId}`,
    );
    return response.data;
  }

  async unlockBranchPos(branchId: string): Promise<{ locked: boolean; message: string | null }> {
    const response = await api.delete<{ locked: boolean; message: string | null }>(
      `/inventory/counts/branch-lock/${branchId}`,
    );
    return response.data;
  }

  async forceUnlockBranchPos(
    branchId: string,
  ): Promise<{ locked: boolean; message: string | null; cancelledCounts: number }> {
    const response = await api.post<{
      locked: boolean;
      message: string | null;
      cancelledCounts: number;
    }>(`/inventory/counts/branch-lock/${branchId}/force-unlock`);
    return response.data;
  }

  async updateAdjustment(id: string, data: UpdateAdjustmentDto): Promise<AdjustmentDto> {
    const response = await api.patch<AdjustmentDto>(`/inventory/counts/${id}`, data);
    return response.data;
  }

  async submitAdjustment(id: string, data: SubmitAdjustmentDto = {}): Promise<AdjustmentDto> {
    const response = await api.patch<AdjustmentDto>(
      `/inventory/counts/${id}/submit`,
      data
    );
    return response.data;
  }

  async approveAdjustment(id: string, data: ApproveAdjustmentDto = {}): Promise<AdjustmentDto> {
    const response = await api.patch<AdjustmentDto>(
      `/inventory/counts/${id}/approve`,
      data
    );
    return response.data;
  }

  async rejectAdjustment(id: string, data: RejectAdjustmentDto): Promise<AdjustmentDto> {
    const response = await api.patch<AdjustmentDto>(
      `/inventory/counts/${id}/reject`,
      data
    );
    return response.data;
  }

  async applyAdjustment(id: string, data: ApplyAdjustmentDto = {}): Promise<AdjustmentDto> {
    const response = await api.post<AdjustmentDto>(
      `/inventory/counts/${id}/apply`,
      data
    );
    return response.data;
  }

  async cancelAdjustment(id: string): Promise<void> {
    await api.delete(`/inventory/counts/${id}`);
  }

  // ================================
  // INVENTORY SUMMARY
  // ================================

  async getInventorySummary(): Promise<any> {
    const response = await api.get('/inventory');
    return response.data;
  }

  // ================================
  // STATS & EXPORT
  // ================================

  async getBranchStockStats(
    branchId: string,
    query: BranchStockQueryDto = {},
  ): Promise<BranchStockStats> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.code) params.append('code', query.code);
    if (query.categoryId) params.append('categoryId', query.categoryId);
    const response = await api.get<BranchStockStats>(
      `/inventory/branches/${branchId}/stats?${params.toString()}`,
    );
    return response.data;
  }

  async exportBranchStock(
    branchId: string,
    query: BranchStockQueryDto = {},
    filename = `inventario-${new Date().toISOString().slice(0, 10)}.csv`,
  ): Promise<void> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.code) params.append('code', query.code);
    if (query.categoryId) params.append('categoryId', query.categoryId);
    if (query.lowStock !== undefined) params.append('lowStock', String(query.lowStock));
    if (query.outOfStock !== undefined) params.append('outOfStock', String(query.outOfStock));
    const response = await api.get(
      `/inventory/branches/${branchId}/export?${params.toString()}`,
      { responseType: 'blob' },
    );
    downloadCsv(response.data, filename);
  }

  async getMovementStats(query: MovementQueryDto = {}): Promise<InventoryStats> {
    const params = new URLSearchParams();
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.movementType) params.append('movementType', query.movementType);
    if (query.movementCategory) params.append('movementCategory', query.movementCategory);
    if (query.search) params.append('search', query.search);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    const response = await api.get<InventoryStats>(
      `/inventory/movements/stats?${params.toString()}`,
    );
    return response.data;
  }

  async exportMovements(
    query: MovementQueryDto = {},
    filename?: string,
  ): Promise<void> {
    const params = new URLSearchParams();
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.movementType) params.append('movementType', query.movementType);
    if (query.movementCategory) params.append('movementCategory', query.movementCategory);
    if (query.status) params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    const response = await api.get(
      `/inventory/movements/export?${params.toString()}`,
      { responseType: 'blob' },
    );
    const kind = query.movementType === MovementType.EXIT ? 'salidas' : 'entradas';
    downloadCsv(
      response.data,
      filename || `${kind}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  async getTransferStats(query: TransferQueryDto = {}): Promise<InventoryStats> {
    const params = new URLSearchParams();
    if (query.sourceBranchId) params.append('sourceBranchId', query.sourceBranchId);
    if (query.destinationBranchId) params.append('destinationBranchId', query.destinationBranchId);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.search) params.append('search', query.search);
    const response = await api.get<InventoryStats>(
      `/inventory/transfers/stats?${params.toString()}`,
    );
    return response.data;
  }

  async exportTransfers(query: TransferQueryDto = {}): Promise<void> {
    const params = new URLSearchParams();
    if (query.sourceBranchId) params.append('sourceBranchId', query.sourceBranchId);
    if (query.destinationBranchId) params.append('destinationBranchId', query.destinationBranchId);
    if (query.status) params.append('status', query.status);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.search) params.append('search', query.search);
    const response = await api.get(
      `/inventory/transfers/export?${params.toString()}`,
      { responseType: 'blob' },
    );
    downloadCsv(response.data, `traspasos-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async getAdjustmentStats(query: AdjustmentQueryDto = {}): Promise<InventoryStats> {
    const params = new URLSearchParams();
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.countType) params.append('countType', query.countType);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    const response = await api.get<InventoryStats>(
      `/inventory/counts/stats?${params.toString()}`,
    );
    return response.data;
  }

  async exportAdjustments(query: AdjustmentQueryDto = {}): Promise<void> {
    const params = new URLSearchParams();
    if (query.branchId) params.append('branchId', query.branchId);
    if (query.status) params.append('status', query.status);
    if (query.countType) params.append('countType', query.countType);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    const response = await api.get(
      `/inventory/counts/export?${params.toString()}`,
      { responseType: 'blob' },
    );
    downloadCsv(response.data, `ajustes-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  // ================================
  // TRANSFER ADDITIONAL METHODS
  // ================================

  async rejectTransfer(id: string, dto: { reason: string }): Promise<TransferDto> {
    const response = await api.patch<TransferDto>(
      `/inventory/transfers/${id}/reject`,
      dto
    );
    return response.data;
  }

  async applyTransfer(id: string): Promise<TransferDto> {
    const response = await api.post<TransferDto>(
      `/inventory/transfers/${id}/apply`
    );
    return response.data;
  }

  // ================================
  // MOVEMENT METHODS (Entradas/Salidas)
  // ================================

  async createMovement(data: CreateMovementDto): Promise<MovementDto> {
    const response = await api.post<MovementDto>('/inventory/movements', data);
    return response.data;
  }

  async getMovements(query: MovementQueryDto = {}): Promise<MovementListResponseDto> {
    const params = new URLSearchParams();

    if (query.branchId) params.append('branchId', query.branchId);
    if (query.movementType) params.append('movementType', query.movementType);
    if (query.movementCategory) params.append('movementCategory', query.movementCategory);
    if (query.status) params.append('status', query.status);
    if (query.search) params.append('search', query.search);
    if (query.fromDate) params.append('fromDate', query.fromDate);
    if (query.toDate) params.append('toDate', query.toDate);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const response = await api.get<MovementListResponseDto>(
      `/inventory/movements?${params.toString()}`
    );
    return response.data;
  }

  async getMovement(id: string): Promise<MovementDto> {
    const response = await api.get<MovementDto>(`/inventory/movements/${id}`);
    return response.data;
  }

  async approveMovement(id: string, notes?: string): Promise<MovementDto> {
    const response = await api.patch<MovementDto>(
      `/inventory/movements/${id}/approve`,
      notes ? { notes } : {}
    );
    return response.data;
  }

  async rejectMovement(id: string, reason: string): Promise<MovementDto> {
    const response = await api.patch<MovementDto>(
      `/inventory/movements/${id}/reject`,
      { reason }
    );
    return response.data;
  }

  getMovementReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      purchase: 'Compra a proveedor',
      return_from_customer: 'Devolución de cliente',
      transfer_in: 'Recepción de traspaso',
      initial_stock: 'Stock inicial',
      production: 'Producción',
      found: 'Producto encontrado',
      sale: 'Venta',
      return_to_supplier: 'Devolución a proveedor',
      transfer_out: 'Envío de traspaso',
      loss: 'Pérdida',
      expiration: 'Caducidad',
      damage: 'Daño/Merma',
      adjustment: 'Ajuste',
    };
    return labels[reason] || reason;
  }

  // ================================
  // UTILITIES
  // ================================

  formatCurrency(amount: number | string): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  }

  getTransferStatusLabel(status: MovementStatus | string): string {
    const labels: Record<string, string> = {
      [MovementStatus.DRAFT]: 'Borrador',
      [MovementStatus.PENDING]: 'Pendiente',
      [MovementStatus.APPROVED]: 'En Tránsito',
      [MovementStatus.APPLIED]: 'Aplicado',
      [MovementStatus.REJECTED]: 'Rechazado',
      [MovementStatus.CANCELLED]: 'Cancelado',
    };
    return labels[status] || status;
  }

  getTransferStatusColor(status: MovementStatus | string): string {
    const colors: Record<string, string> = {
      [MovementStatus.DRAFT]: 'default',
      [MovementStatus.PENDING]: 'warning',
      [MovementStatus.APPROVED]: 'info',
      [MovementStatus.APPLIED]: 'success',
      [MovementStatus.REJECTED]: 'error',
      [MovementStatus.CANCELLED]: 'error',
    };
    return colors[status] || 'default';
  }

  getAdjustmentStatusLabel(status: AdjustmentStatus | string): string {
    // Incluye estados de ajustes (legacy) y de conteos de inventario v2.0.
    const labels: Record<string, string> = {
      draft: 'Borrador',
      planned: 'Planificado',
      in_progress: 'En Progreso',
      pending_approval: 'Pendiente de Aprobación',
      pending_review: 'Pendiente de Revisión',
      completed: 'Completado',
      reviewed: 'Revisado',
      approved: 'Aprobado',
      applied: 'Aplicado',
      rejected: 'Rechazado',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  }

  getAdjustmentStatusColor(status: AdjustmentStatus | string): string {
    const colors: Record<string, string> = {
      draft: 'default',
      planned: 'default',
      in_progress: 'info',
      pending_approval: 'warning',
      pending_review: 'warning',
      completed: 'info',
      reviewed: 'info',
      approved: 'info',
      applied: 'success',
      rejected: 'error',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  }

  getAdjustmentTypeLabel(type: AdjustmentType): string {
    const labels: Record<AdjustmentType, string> = {
      [AdjustmentType.COUNT]: 'Conteo Físico',
      [AdjustmentType.CORRECTION]: 'Corrección',
      [AdjustmentType.DAMAGE]: 'Daño/Merma',
      [AdjustmentType.EXPIRATION]: 'Caducidad',
      [AdjustmentType.LOSS]: 'Pérdida',
      [AdjustmentType.FOUND]: 'Encontrado',
    };
    return labels[type] || type;
  }

  getCountTypeLabel(type: CountType): string {
    const labels: Record<CountType, string> = {
      [CountType.FULL]: 'Completo',
      [CountType.PARTIAL]: 'Parcial',
      [CountType.SPOT_CHECK]: 'Punto de control',
      [CountType.CYCLE]: 'Cíclico',
    };
    return labels[type] || type;
  }

  getMovementTypeLabel(type: MovementType): string {
    const labels: Record<MovementType, string> = {
      [MovementType.ENTRY]: 'Entrada',
      [MovementType.EXIT]: 'Salida',
      [MovementType.TRANSFER]: 'Traspaso',
      [MovementType.ADJUSTMENT]: 'Ajuste',
      [MovementType.RETURN]: 'Devolución',
      [MovementType.PRODUCTION]: 'Producción',
      [MovementType.LOSS]: 'Pérdida',
    };
    return labels[type] || type;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatDateTime(date: string | undefined, timezone: string = DEFAULT_TIMEZONE): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    });
  }

  /** Returns "HH:mm · MX Noroeste" label for a given timezone. */
  tzLabel(timezone: string = DEFAULT_TIMEZONE): string {
    return getTimezoneShortLabel(timezone);
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
