// supply.ts - Tipos de los INSUMOS de TI (consumibles del departamento de Sistemas).
//
// Un insumo se controla POR CANTIDAD (pilas, cables, tóner), no pieza por pieza
// como un activo. Cada movimiento (entrada, consumo, desecho, ajuste) queda en
// una bitácora inmutable y el API mantiene los contadores.
//
// NO confundir con el inventario de producto de venta (src/types/inventory.ts).

import type { BadgeVariant } from './asset';

// ================================
// ENUMS Y ETIQUETAS
// ================================

export const MOVEMENT_TYPES = ['entrada', 'consumo', 'desecho', 'ajuste'] as const;
export type SupplyMovementType = (typeof MOVEMENT_TYPES)[number];

export const MOVEMENT_TYPE_LABELS: Record<SupplyMovementType, string> = {
  entrada: 'Entrada',
  consumo: 'Consumo',
  desecho: 'Desecho',
  ajuste: 'Ajuste',
};

export const MOVEMENT_TYPE_VARIANTS: Record<SupplyMovementType, BadgeVariant> = {
  entrada: 'success',
  consumo: 'info',
  desecho: 'destructive',
  ajuste: 'warning',
};

/** Motivos válidos para un desecho. */
export const DISCARD_REASONS = ['agotado', 'danado', 'caducado', 'perdido', 'otro'] as const;
export type DiscardReason = (typeof DISCARD_REASONS)[number];

export const DISCARD_REASON_LABELS: Record<DiscardReason, string> = {
  agotado: 'Agotado',
  danado: 'Dañado',
  caducado: 'Caducado',
  perdido: 'Perdido',
  otro: 'Otro',
};

/** Motivos válidos para un ajuste. */
export const ADJUST_REASONS = ['conteo', 'correccion', 'otro'] as const;
export type AdjustReason = (typeof ADJUST_REASONS)[number];

export const ADJUST_REASON_LABELS: Record<AdjustReason, string> = {
  conteo: 'Conteo físico',
  correccion: 'Corrección',
  otro: 'Otro',
};

export type SupplyMovementReason = DiscardReason | AdjustReason;

/** Todos los motivos juntos, para pintar la bitácora sin importar el tipo. */
export const MOVEMENT_REASON_LABELS: Record<SupplyMovementReason, string> = {
  ...DISCARD_REASON_LABELS,
  ...ADJUST_REASON_LABELS,
};

/** Estado derivado de la existencia: lo calcula el API a partir de stock y mínimo. */
export const STOCK_STATES = ['ok', 'low', 'out'] as const;
export type StockState = (typeof STOCK_STATES)[number];

export const STOCK_STATE_LABELS: Record<StockState, string> = {
  ok: 'OK',
  low: 'Bajo mínimo',
  out: 'Agotado',
};

export const STOCK_STATE_VARIANTS: Record<StockState, BadgeVariant> = {
  ok: 'success',
  low: 'warning',
  out: 'destructive',
};

/** Unidades sugeridas en el alta; el campo acepta cualquier texto. */
export const SUPPLY_UNIT_SUGGESTIONS = [
  'pieza',
  'caja',
  'paquete',
  'rollo',
  'metro',
  'litro',
  'kit',
] as const;

// ================================
// INSUMOS
// ================================

export interface Supply {
  id: string;
  /** Código de la etiqueta pegada en el estante o caja. null = sin etiqueta. */
  supplyTag: string | null;
  labelId: string | null;
  categoryId: string;
  categoryName: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  partNumber: string | null;
  sku: string | null;
  unit: string;
  stockQty: number;
  consumedQty: number;
  discardedQty: number;
  minStock: number;
  stockState: StockState;
  branchId: string | null;
  branchName: string | null;
  locationId: string | null;
  locationName: string | null;
  lastUnitCost: number | null;
  currencyCode: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface SupplyLabelInfo {
  code: string;
  batchNumber: string | null;
  printedCount: number;
}

export interface SupplyMovement {
  id: string;
  movementType: SupplyMovementType;
  /** entrada/consumo/desecho: magnitud (> 0). ajuste: delta con signo. */
  quantity: number;
  stockAfter: number;
  unitCost: number | null;
  purchaseId: string | null;
  purchaseInvoiceNumber: string | null;
  /** En qué equipo se usó o instaló. */
  assetId: string | null;
  assetTag: string | null;
  assetName: string | null;
  /** A quién se entregó / quién lo usó. */
  userId: string | null;
  userName: string | null;
  branchId: string | null;
  branchName: string | null;
  locationId: string | null;
  locationName: string | null;
  reason: SupplyMovementReason | null;
  notes: string | null;
  movedAt: string;
  createdByName: string | null;
  createdAt: string;
}

export interface SupplyDetail extends Supply {
  description: string | null;
  notes: string | null;
  label: SupplyLabelInfo | null;
  /** Los últimos 100 movimientos, del más reciente al más viejo. */
  movements: SupplyMovement[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplyDto {
  name: string;
  categoryId: string;
  brand?: string | null;
  model?: string | null;
  partNumber?: string | null;
  sku?: string | null;
  description?: string | null;
  unit?: string | null;
  minStock?: number | null;
  branchId?: string | null;
  locationId?: string | null;
  notes?: string | null;
  /** Código de una etiqueta ya impresa que se pega en el estante. */
  labelCode?: string | null;
  /** Si es > 0 el API registra la primera 'entrada' en la misma transacción. */
  initialStock?: number | null;
  initialUnitCost?: number | null;
  purchaseId?: string | null;
}

export type UpdateSupplyDto = Partial<
  Omit<CreateSupplyDto, 'labelCode' | 'initialStock' | 'initialUnitCost' | 'purchaseId'>
> & { isActive?: boolean };

export interface CreateSupplyMovementDto {
  movementType: SupplyMovementType;
  /** entrada/consumo/desecho: > 0. ajuste: delta con signo (o usa countedQty). */
  quantity?: number;
  /** Solo ajuste: lo que se contó físicamente; el API calcula el delta. */
  countedQty?: number;
  unitCost?: number | null;
  purchaseId?: string | null;
  assetId?: string | null;
  userId?: string | null;
  branchId?: string | null;
  locationId?: string | null;
  reason?: SupplyMovementReason | null;
  notes?: string | null;
  movedAt?: string | null;
}

export interface SupplyQueryParams {
  search?: string;
  categoryId?: string;
  branchId?: string;
  stock?: 'all' | 'low' | 'out';
  isActive?: 'true' | 'false' | 'all';
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'stock' | 'category' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface SupplyListResponse {
  data: Supply[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupplyMovementQueryParams {
  type?: SupplyMovementType;
  page?: number;
  limit?: number;
}

export interface SupplyMovementListResponse {
  data: SupplyMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** "Este mes" = mes CALENDARIO (America/Mexico_City); aquí no aplica el periodo 26→25. */
export interface SupplyStats {
  supplies: number;
  activeSupplies: number;
  stockUnits: number;
  lowStock: number;
  outOfStock: number;
  consumedThisMonth: number;
  discardedThisMonth: number;
  consumedTotal: number;
  discardedTotal: number;
}
