// inventory.ts - TypeScript types for Inventory API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario

// ================================
// ENUMS
// ================================

export enum MovementType {
  ENTRY = 'entry',
  EXIT = 'exit',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
  PRODUCTION = 'production',
  LOSS = 'loss',
}

export enum MovementReason {
  // Entry reasons
  PURCHASE = 'purchase',
  RETURN_FROM_CUSTOMER = 'return_from_customer',
  TRANSFER_IN = 'transfer_in',
  INITIAL_STOCK = 'initial_stock',
  PRODUCTION = 'production',
  FOUND = 'found',
  // Exit reasons
  SALE = 'sale',
  RETURN_TO_SUPPLIER = 'return_to_supplier',
  TRANSFER_OUT = 'transfer_out',
  LOSS = 'loss',
  EXPIRATION = 'expiration',
  DAMAGE = 'damage',
  ADJUSTMENT = 'adjustment',
}

export enum MovementCategory {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
  INTERNAL = 'internal',
  ADJUSTMENT = 'adjustment',
}

export enum MovementStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  APPLIED = 'applied',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum LotStatus {
  AVAILABLE = 'available',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
  BLOCKED = 'blocked',
}

export enum TransferStatus {
  PENDING = 'pending',
  IN_TRANSIT = 'in_transit',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
  PARTIAL = 'partial',
}

export enum AdjustmentType {
  COUNT = 'count',
  CORRECTION = 'correction',
  DAMAGE = 'damage',
  EXPIRATION = 'expiration',
  LOSS = 'loss',
  FOUND = 'found',
}

export enum AdjustmentStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  APPLIED = 'applied',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

// ================================
// STOCK TYPES
// ================================

export interface ProductStockDto {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  branchId: string;
  branchName: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityInTransit: number;
  quantityAvailable: number;
  isLowStock: boolean;
  lastCountDate?: string;
  lastCountQuantity?: number;
  lastMovementAt?: string;
  locationId?: string;
  isActive: boolean;
}

export interface BranchInfo {
  id: string;
  name: string;
  code: string;
}

export interface BranchStockResponseDto {
  data: ProductStockDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  branch: BranchInfo;
}

export interface BranchStockQueryDto {
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'productName' | 'quantityOnHand' | 'quantityAvailable' | 'lastMovementAt';
  sortOrder?: 'asc' | 'desc';
}

// ================================
// LOT TYPES
// ================================

export interface LotDto {
  id: string;
  productId: string;
  productName?: string;
  branchId: string;
  branchName?: string;
  lotNumber: string;
  expirationDate: string;
  manufactureDate?: string;
  initialQuantity: number;
  quantity: number;
  status: LotStatus;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateLotDto {
  productId: string;
  branchId: string;
  lotNumber: string;
  expirationDate: string;
  manufactureDate?: string;
  initialQuantity: number;
  notes?: string;
}

export interface LotQueryDto {
  branchId?: string;
  status?: LotStatus;
  expiringInDays?: number;
  page?: number;
  limit?: number;
}

export interface LotsResponseDto {
  data: LotDto[];
  total: number;
}

// ================================
// KARDEX TYPES
// ================================

export interface KardexEntryDto {
  id: string;
  movementId: string;
  movementNumber: string;
  movementType: MovementType;
  movementCategory: MovementCategory;
  reason: string;
  quantity: number;
  lotId?: string;
  unitId?: string;
  locationId?: string;
  referenceType?: string;
  referenceNumber?: string;
  unitCost?: string;
  totalCost?: string;
  quantityBefore: number;
  quantityAfter: number;
  notes?: string;
  status: MovementStatus;
  requestedBy?: { id: string; name: string };
  createdAt: string;
}

export interface KardexResponseDto {
  product: {
    id: string;
    code: string;
    name: string;
  };
  movements: KardexEntryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface KardexQueryDto {
  branchId?: string;
  movementType?: MovementType;
  movementCategory?: MovementCategory;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ================================
// TRANSFER TYPES
// ================================

export interface TransferItemDto {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  requestedQuantity: number;
  shippedQuantity?: number;
  receivedQuantity?: number;
  lotId?: string;
  lotNumber?: string;
  unitCost?: string;
  notes?: string;
}

export interface TransferDto {
  id: string;
  transferNumber: string;
  sourceBranch: BranchInfo;
  destinationBranch: BranchInfo;
  status: TransferStatus;
  totalItems: number;
  totalQuantity: number;
  totalValue?: string;
  currency?: { id: string; code: string };
  items: TransferItemDto[];
  requestedBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string };
  shippedBy?: { id: string; name: string };
  receivedBy?: { id: string; name: string };
  requestedAt: string;
  approvedAt?: string;
  shippedAt?: string;
  receivedAt?: string;
  cancelledAt?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedArrival?: string;
  notes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferListResponseDto {
  data: TransferDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransferQueryDto {
  sourceBranchId?: string;
  destinationBranchId?: string;
  status?: TransferStatus;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateTransferItemDto {
  productId: string;
  requestedQuantity: number;
  lotId?: string;
  notes?: string;
}

export interface CreateTransferDto {
  sourceBranchId: string;
  destinationBranchId: string;
  items: CreateTransferItemDto[];
  currencyId?: string;
  notes?: string;
}

export interface ApproveTransferDto {
  notes?: string;
}

export interface ShipTransferItemDto {
  id: string;
  shippedQuantity: number;
  lotId?: string;
  lotNumber?: string;
}

export interface ShipTransferDto {
  trackingNumber?: string;
  carrier?: string;
  estimatedArrival?: string;
  items?: ShipTransferItemDto[];
}

export interface ReceiveTransferItemDto {
  id: string;
  receivedQuantity: number;
  notes?: string;
}

export interface ReceiveTransferDto {
  items: ReceiveTransferItemDto[];
  notes?: string;
}

export interface CancelTransferDto {
  reason: string;
}

// ================================
// ADJUSTMENT TYPES
// ================================

export interface AdjustmentItemDto {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
  lotId?: string;
  lotNumber?: string;
  unitCost?: string;
  valueDifference?: string;
  notes?: string;
}

export interface AdjustmentDto {
  id: string;
  adjustmentNumber: string;
  branch: BranchInfo;
  adjustmentType: AdjustmentType;
  status: AdjustmentStatus;
  totalItems: number;
  totalDifference: number;
  totalValueDifference?: string;
  items: AdjustmentItemDto[];
  reason: string;
  notes?: string;
  rejectionReason?: string;
  createdBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string };
  appliedBy?: { id: string; name: string };
  approvedAt?: string;
  appliedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdjustmentListResponseDto {
  data: AdjustmentDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdjustmentQueryDto {
  branchId?: string;
  status?: AdjustmentStatus;
  adjustmentType?: AdjustmentType;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateAdjustmentItemDto {
  productId: string;
  systemQuantity?: number;
  countedQuantity: number;
  lotId?: string;
  lotNumber?: string;
  notes?: string;
}

export interface CreateAdjustmentDto {
  branchId: string;
  adjustmentType: AdjustmentType;
  reason: string;
  items: CreateAdjustmentItemDto[];
  notes?: string;
  submitForApproval?: boolean;
}

export interface UpdateAdjustmentDto {
  reason?: string;
  notes?: string;
}

export interface SubmitAdjustmentDto {
  notes?: string;
}

export interface ApproveAdjustmentDto {
  notes?: string;
}

export interface RejectAdjustmentDto {
  reason: string;
}

export interface ApplyAdjustmentDto {
  notes?: string;
}

// ================================
// UI HELPER TYPES
// ================================

export interface InventoryFilters {
  branchId?: string;
  search?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export interface InventorySortConfig {
  field: string;
  order: 'asc' | 'desc';
}

export interface InventoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
