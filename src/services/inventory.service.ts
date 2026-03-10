// inventory.service.ts - Service for Inventory API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario

import api from '@/lib/api';
import {
  MovementStatus,
  AdjustmentStatus,
  AdjustmentType,
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
} from '@/types/inventory';

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
    if (query.adjustmentType) params.append('adjustmentType', query.adjustmentType);
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

  getAdjustmentStatusLabel(status: AdjustmentStatus): string {
    const labels: Record<AdjustmentStatus, string> = {
      [AdjustmentStatus.DRAFT]: 'Borrador',
      [AdjustmentStatus.PENDING_APPROVAL]: 'Pendiente de Aprobación',
      [AdjustmentStatus.APPROVED]: 'Aprobado',
      [AdjustmentStatus.APPLIED]: 'Aplicado',
      [AdjustmentStatus.REJECTED]: 'Rechazado',
      [AdjustmentStatus.CANCELLED]: 'Cancelado',
    };
    return labels[status] || status;
  }

  getAdjustmentStatusColor(status: AdjustmentStatus): string {
    const colors: Record<AdjustmentStatus, string> = {
      [AdjustmentStatus.DRAFT]: 'default',
      [AdjustmentStatus.PENDING_APPROVAL]: 'warning',
      [AdjustmentStatus.APPROVED]: 'info',
      [AdjustmentStatus.APPLIED]: 'success',
      [AdjustmentStatus.REJECTED]: 'error',
      [AdjustmentStatus.CANCELLED]: 'error',
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

  formatDateTime(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
