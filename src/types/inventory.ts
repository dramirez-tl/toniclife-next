// inventory.ts - TypeScript types for Inventory API
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario

// ================================
// ENUMS
// ================================

/**
 * Tipo de movimiento. Los 8 primeros son los valores REALES de BD
 * (CHECK inventory_movements_movement_type_check) y son los únicos que el
 * API acepta para FILTRAR (kardex/listados/export). Los alias del bloque
 * final solo sirven para CREAR movimientos genéricos (el API los normaliza
 * a entry/exit); nunca se guardan tal cual, así que no filtran nada.
 */
export enum MovementType {
  ENTRY = 'entry',
  EXIT = 'exit',
  TRANSFER_OUT = 'transfer_out',
  TRANSFER_IN = 'transfer_in',
  ADJUSTMENT_POSITIVE = 'adjustment_positive',
  ADJUSTMENT_NEGATIVE = 'adjustment_negative',
  INITIAL_LOAD = 'initial_load',
  PHYSICAL_COUNT = 'physical_count',
  // --- Alias de creación (NO existen en BD; no filtran) ---
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

/**
 * Categoría del movimiento — espeja el CHECK
 * inventory_movements_movement_category_check y el enum del API.
 * (Antes decía inbound/outbound/internal, valores que nunca existieron en BD.)
 */
export enum MovementCategory {
  PURCHASE = 'purchase',
  PRODUCTION = 'production',
  RETURN_FROM_CUSTOMER = 'return_from_customer',
  RETURN_TO_SUPPLIER = 'return_to_supplier',
  SALE = 'sale',
  SAMPLE = 'sample',
  DONATION = 'donation',
  DAMAGE = 'damage',
  EXPIRATION = 'expiration',
  THEFT = 'theft',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  INITIAL = 'initial',
  COUNT = 'count',
}

export enum MovementStatus {
  DRAFT = 'draft',
  PENDING = 'pending_approval',
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

// TransferStatus removed — use MovementStatus instead (matches backend)

export enum AdjustmentType {
  COUNT = 'count',
  CORRECTION = 'correction',
  DAMAGE = 'damage',
  EXPIRATION = 'expiration',
  LOSS = 'loss',
  FOUND = 'found',
}

// Tipo de conteo de inventario — coincide con CountType del backend (CreateCountDto)
export enum CountType {
  FULL = 'full',
  PARTIAL = 'partial',
  SPOT_CHECK = 'spot_check',
  CYCLE = 'cycle',
}

// Estados de un conteo de inventario (ajuste). Superset: incluye los estados
// reales del backend (CountStatus) + algunos legacy aún referenciados en UI.
export enum AdjustmentStatus {
  DRAFT = 'draft',
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  PENDING_APPROVAL = 'pending_approval',
  PENDING_REVIEW = 'pending_review',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
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
  productType?: string;
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
  // Per-branch overrides (null = using product default)
  minStockAlertOverride?: number | null;
  maxStockLevelOverride?: number | null;
  reorderPointOverride?: number | null;
  reorderQuantityOverride?: number | null;
  // Effective values (COALESCE of override and product default)
  minStockAlertEffective?: number;
  maxStockLevelEffective?: number;
  reorderPointEffective?: number;
  reorderQuantityEffective?: number;
}

export interface UpdateStockSettingsDto {
  minStockAlert?: number | null;
  maxStockLevel?: number | null;
  reorderPoint?: number | null;
  reorderQuantity?: number | null;
  isActive?: boolean;
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
  code?: string;
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
  branchId?: string;
  branchName?: string;
  destinationBranchId?: string;
  destinationBranchName?: string;
  lotId?: string;
  lotNumber?: string;
  lotExpirationDate?: string;
  unitId?: string;
  locationId?: string;
  /** 'count' | 'transfer' | 'sale' | ... (reference_type en BD) */
  referenceType?: string;
  /** ID del documento referido (count id, etc.). Hoy el kardex NO lo devuelve; se usa si llega. */
  referenceId?: string;
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
// TRANSFER TYPES (aligned to backend inventory_movements)
// ================================

export interface TransferItemDto {
  id: string;
  /** Cantidad realmente recibida (solo traspasos aplicados; recepcion parcial). */
  quantityReceived?: number;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitId?: string;
  unitCost?: string;
  totalCost?: string;
  quantityBefore: number;
  quantityAfter: number;
  lotId?: string;
  lotNumber?: string;
  expirationDate?: string;
  notes?: string;
}

export interface TransferDiscrepancyDto {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  discrepancyType: 'missing' | 'damaged' | 'excess' | 'wrong_product' | string;
  quantityExpected: number;
  quantityActual: number;
  status: 'reported' | 'investigating' | 'resolved' | 'written_off' | string;
  notes?: string;
  createdAt: string;
}

/** Recepcion parcial: cantidad recibida por linea (las omitidas se reciben completas). */
export interface ReceiveTransferItem {
  detailId: string;
  quantityReceived: number;
  discrepancyType?: 'missing' | 'damaged' | 'excess' | 'wrong_product';
  notes?: string;
}

export interface ApplyTransferPayload {
  items?: ReceiveTransferItem[];
  notes?: string;
}

export interface TransferDto {
  id: string;
  discrepancies?: TransferDiscrepancyDto[];
  movementNumber: string;
  branch: BranchInfo;           // source branch
  destinationBranch: BranchInfo;
  status: MovementStatus;
  totalItems: number;
  totalQuantity: number;
  totalCost?: string;
  items: TransferItemDto[];
  reason: string;
  notes?: string;
  requestedBy?: { id: string; name: string };
  requestedAt?: string;
  approvedBy?: { id: string; name: string };
  approvedAt?: string;
  appliedBy?: { id: string; name: string };
  appliedAt?: string;
  rejectedBy?: { id: string; name: string };
  rejectedAt?: string;
  rejectionReason?: string;
  relatedMovementId?: string;
  supportingDocumentUrl?: string;
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
  status?: MovementStatus;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LotEntryDto {
  lotId?: string;
  lotNumber?: string;
  expirationDate?: string;
  quantity: number;
}

export interface CreateTransferItemDto {
  productId: string;
  quantity: number;
  lots?: LotEntryDto[];
  unitId?: string;
  notes?: string;
}

export interface CreateTransferDto {
  sourceBranchId: string;
  destinationBranchId: string;
  items: CreateTransferItemDto[];
  reason: string;
  notes?: string;
}

export interface ApproveTransferDto {
  notes?: string;
}

export interface RejectTransferDto {
  reason: string;
}

export interface CancelTransferDto {
  reason: string;
}

// ================================
// ADJUSTMENT TYPES
// ================================

// Espeja CountDetailDto del backend (GET /inventory/counts/:id).
export interface AdjustmentItemDto {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  lotId?: string;
  lotNumber?: string;
  systemQuantity: number;
  countedQuantity: number;
  /** contado - sistema */
  discrepancy?: number;
  discrepancyCost?: string;
  discrepancyReason?: string;
  adjustmentApproved?: boolean;
  notes?: string;
}

// Espeja CountDto del backend (GET /inventory/counts). Se mantiene el nombre
// "AdjustmentDto" (la UI sigue llamándose "Ajustes"), pero los campos son los
// reales de un conteo de inventario v2.
export interface AdjustmentDto {
  id: string;
  countNumber: string;
  branch: BranchInfo;
  countType: CountType;
  status: AdjustmentStatus;
  plannedDate?: string;
  startedAt?: string;
  completedAt?: string;
  totalProductsCounted: number;
  totalDiscrepancies: number;
  totalDiscrepancyValue?: string;
  items: AdjustmentItemDto[];
  notes?: string;
  countedBy?: { id: string; name: string };
  reviewedBy?: { id: string; name: string };
  approvedBy?: { id: string; name: string };
  approvedAt?: string;
  locationId?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
  /** El backend de conteos no expone motivo de rechazo; opcional por compat. */
  rejectionReason?: string;
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
  /** Tipo de conteo (full/partial/spot_check/cycle). */
  countType?: CountType;
  fromDate?: string;
  toDate?: string;
  /** Búsqueda por número de conteo (CNT-…). */
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Renglón de un conteo nuevo. NO lleva systemQuantity: desde 04-sep-2026 la
 * existencia del sistema la lee SIEMPRE el servidor al guardar (el API la
 * ignora si se manda).
 */
export interface CreateAdjustmentItemDto {
  productId: string;
  countedQuantity: number;
  lotId?: string;
  lotNumber?: string;
  notes?: string;
}

export interface CreateAdjustmentDto {
  branchId: string;
  countType: CountType;
  items: CreateAdjustmentItemDto[];
  notes?: string;
  plannedDate?: string;
  locationId?: string;
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
// MOVEMENT TYPES (Entradas/Salidas)
// ================================

export interface MovementItemDto {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost?: string;
  totalCost?: string;
  quantityBefore: number;
  quantityAfter: number;
  lotId?: string;
  lotNumber?: string;
  expirationDate?: string;
  notes?: string;
}

export interface MovementDto {
  id: string;
  movementNumber: string;
  movementType: MovementType;
  movementCategory: MovementCategory;
  reason: string;
  referenceNumber?: string;
  branchId: string;
  branchName: string;
  status: MovementStatus;
  totalItems: number;
  totalQuantity: number;
  totalCost?: string;
  notes?: string;
  requestedBy?: { id: string; name: string };
  createdAt: string;
  /** Auditoría del workflow (solo el detalle GET /inventory/movements/:id los trae). */
  approvedBy?: { id: string; name: string };
  approvedAt?: string;
  appliedAt?: string;
  rejectedBy?: { id: string; name: string };
  rejectedAt?: string;
  rejectionReason?: string;
  items: MovementItemDto[];
}

export interface MovementListResponseDto {
  data: MovementDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MovementQueryDto {
  branchId?: string;
  movementType?: MovementType;
  movementCategory?: MovementCategory;
  /** Excluye una categoría (ej. SALE: oculta las salidas automáticas de ventas POS). */
  excludeCategory?: MovementCategory;
  status?: MovementStatus;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateMovementItemDto {
  productId: string;
  quantity: number;
  lots?: LotEntryDto[];
  unitCost?: number;
  notes?: string;
}

export interface CreateMovementDto {
  branchId: string;
  movementType: MovementType;
  reason: MovementReason;
  notes?: string;
  referenceNumber?: string;
  items: CreateMovementItemDto[];
}

export interface ProductLotDto {
  id: string;
  lotNumber: string;
  expirationDate: string;
  manufactureDate?: string;
  quantity: number;
  status: LotStatus;
}

// LotEntry: estado local en formularios (no el payload de API)
export interface LotEntry {
  lotId?: string;          // UUID si se seleccionó lote existente
  lotNumber: string;       // número de lote (requerido para mostrar/editar)
  expirationDate: string;  // ISO date (requerido)
  quantity: number;
  availableQuantity?: number; // solo para exit/transfer: qty disponible en DB
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

// ================================
// STATS DTOs (agregados)
// ================================

export interface InventoryStats {
  total: number;
  byStatus: Record<string, number>;
}

export interface BranchStockStats {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  totalAvailable: number;
}

// ================================
// CATÁLOGO POS POR SUCURSAL
// Espejo de toniclife-api/src/modules/inventory/dto/branch-catalog.dto.ts.
// El POS de una sucursal SOLO muestra los productos con fila en stock_levels
// para esa sucursal; estos tipos describen la cobertura y la habilitación
// (siempre con existencia 0).
// ================================

export const BRANCH_CATALOG_ENABLE_MODES = ['eligible', 'copy_from_branch', 'products'] as const;
export type BranchCatalogEnableMode = (typeof BRANCH_CATALOG_ENABLE_MODES)[number];

/** Por qué un producto NO se habilita en la sucursal (prioridad en ese orden). */
export type BranchCatalogSkipReason =
  | 'unknown'
  | 'inactive'
  | 'not_pos'
  | 'service'
  | 'dynamic_kit'
  | 'no_price_for_country';

/** Tope de ids por petición en modo `products` (BRANCH_CATALOG_MAX_PRODUCT_IDS del API). */
export const BRANCH_CATALOG_MAX_PRODUCT_IDS = 500;

export interface BranchCatalogCoverageRow {
  branchId: string;
  code: string;
  name: string;
  /** countries.code de la sucursal; null si no tiene país (elegibles 0). */
  countryCode: string | null;
  isPosEnabled: boolean;
  isWarehouse: boolean;
  /** ISO 8601 */
  createdAt: string;
  /** Productos elegibles para el país de la sucursal. */
  eligibleCount: number;
  /** Elegibles con fila en stock_levels (activa o inactiva). */
  presentCount: number;
  /** eligibleCount - presentCount */
  missingCount: number;
  /** Elegibles con fila activa y existencia > 0. */
  withStockCount: number;
}

export interface BranchCatalogCoverageResponse {
  data: BranchCatalogCoverageRow[];
  /** ISO 8601 del cálculo (el API lo cachea 60 s). */
  generatedAt: string;
}

export interface EnableBranchCatalogDto {
  mode: BranchCatalogEnableMode;
  /** Obligatorio en copy_from_branch; distinta de la sucursal destino. */
  sourceBranchId?: string;
  /** Obligatorio en products; 1..500 ids únicos. */
  productIds?: string[];
  /** true (por defecto) = solo vista previa. SOLO `false` escribe. */
  dryRun?: boolean;
}

export interface BranchCatalogSkippedSample {
  productId: string;
  /** null cuando la razón es unknown. */
  code: string | null;
  name: string | null;
  reason: BranchCatalogSkipReason;
}

export interface BranchCatalogSkipped {
  total: number;
  /** Solo las razones presentes. */
  byReason: Partial<Record<BranchCatalogSkipReason, number>>;
  /** Hasta 20 productos omitidos. */
  sample: BranchCatalogSkippedSample[];
}

export interface BranchCatalogEnableBranch {
  id: string;
  code: string;
  name: string;
  countryCode: string | null;
  isPosEnabled: boolean;
  isWarehouse: boolean;
  isActive: boolean;
}

export interface BranchCatalogEnableResult {
  branch: BranchCatalogEnableBranch;
  mode: BranchCatalogEnableMode;
  sourceBranchId: string | null;
  dryRun: boolean;
  /** Ids pedidos (deduplicados) en modo products; null en los demás. */
  requested: number | null;
  /** Candidatos que cumplen la regla = alreadyPresent + toCreate. */
  eligible: number;
  /** Elegibles que ya tenían fila (activa o inactiva; no se recrean). */
  alreadyPresent: number;
  /** De los ya presentes, cuántas filas están inactivas. */
  inactiveRows: number;
  /** Elegibles sin fila: las que se crearían / se crearon. */
  toCreate: number;
  /** Filas creadas (siempre 0 en vista previa). */
  created: number;
  skipped: BranchCatalogSkipped;
  /** Hoy solo 'warehouse' (la sucursal es almacén; la operación sigue). */
  warnings: string[];
}
