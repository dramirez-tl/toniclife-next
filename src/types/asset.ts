// asset.ts - Tipos del módulo de Activos de TI (departamento de Sistemas).
//
// NO confundir con el inventario de producto de venta (src/types/inventory.ts):
// son dominios distintos.

// ================================
// ENUMS Y ETIQUETAS
// ================================

export const ASSET_STATUSES = [
  'available',
  'reserved',
  'assigned',
  'on_loan',
  'in_repair',
  'in_warranty',
  'in_transit',
  'lost',
  'stolen',
  'retired',
  'sold',
  'donated',
] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_CONDITIONS = ['new', 'good', 'fair', 'poor', 'broken'] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

/** Los códigos viven en inglés en la BD; aquí se traducen para la UI. */
export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  available: 'Disponible',
  reserved: 'Apartado',
  assigned: 'Asignado',
  on_loan: 'En préstamo',
  in_repair: 'En reparación',
  in_warranty: 'En garantía',
  in_transit: 'En tránsito',
  lost: 'Extraviado',
  stolen: 'Robado',
  retired: 'Dado de baja',
  sold: 'Vendido',
  donated: 'Donado',
};

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  new: 'Nuevo',
  good: 'Bueno',
  fair: 'Regular',
  poor: 'Malo',
  broken: 'Descompuesto',
};

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'info'
  | 'warning';

export const ASSET_STATUS_VARIANTS: Record<AssetStatus, BadgeVariant> = {
  available: 'success',
  reserved: 'info',
  assigned: 'default',
  on_loan: 'info',
  in_repair: 'warning',
  in_warranty: 'warning',
  in_transit: 'info',
  lost: 'destructive',
  stolen: 'destructive',
  retired: 'secondary',
  sold: 'secondary',
  donated: 'secondary',
};

export const ASSET_CONDITION_VARIANTS: Record<AssetCondition, BadgeVariant> = {
  new: 'success',
  good: 'success',
  fair: 'warning',
  poor: 'warning',
  broken: 'destructive',
};

export const ASSIGNMENT_TYPES = ['user', 'branch', 'department', 'location'] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  user: 'Colaborador',
  branch: 'Sucursal',
  department: 'Departamento',
  location: 'Ubicación',
};

export const MAINTENANCE_TYPES = [
  'preventive',
  'corrective',
  'upgrade',
  'inspection',
  'incident',
  'warranty_claim',
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventivo',
  corrective: 'Correctivo',
  upgrade: 'Mejora / Upgrade',
  inspection: 'Revisión',
  incident: 'Incidencia',
  warranty_claim: 'Garantía / RMA',
};

export const MAINTENANCE_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Programado',
  in_progress: 'En proceso',
  completed: 'Terminado',
  cancelled: 'Cancelado',
};

export const ASSET_DOCUMENT_TYPES = [
  'photo',
  'warranty',
  'manual',
  'handover',
  'disposal',
  'theft_report',
  'invoice',
  'other',
] as const;
export type AssetDocumentType = (typeof ASSET_DOCUMENT_TYPES)[number];

export const ASSET_DOCUMENT_TYPE_LABELS: Record<AssetDocumentType, string> = {
  photo: 'Foto',
  warranty: 'Garantía',
  manual: 'Manual',
  handover: 'Carta responsiva',
  disposal: 'Acta de baja',
  theft_report: 'Acta de robo',
  invoice: 'Factura',
  other: 'Otro',
};

export const PURCHASE_FILE_KINDS = [
  'invoice_pdf',
  'invoice_xml',
  'invoice_image',
  'quote',
  'other',
] as const;
export type PurchaseFileKind = (typeof PURCHASE_FILE_KINDS)[number];

export const PURCHASE_FILE_KIND_LABELS: Record<PurchaseFileKind, string> = {
  invoice_pdf: 'Factura (PDF)',
  invoice_xml: 'CFDI (XML)',
  invoice_image: 'Factura (imagen)',
  quote: 'Cotización',
  other: 'Otro',
};

// ================================
// PLANTILLA DE ESPECIFICACIONES
// ================================

export type SpecFieldType = 'text' | 'number' | 'select' | 'boolean' | 'date';

/** Definición de un campo técnico. El formulario de alta se genera de aquí. */
export interface SpecFieldDef {
  key: string;
  label: string;
  type: SpecFieldType;
  options?: string[];
  unit?: string;
  required?: boolean;
  order?: number;
}

export type SpecValues = Record<string, unknown>;

// ================================
// CATEGORÍAS
// ================================

export interface AssetCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  specTemplate: SpecFieldDef[];
  defaultUsefulLifeMonths: number | null;
  requiresSerial: boolean;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetCategoryDto {
  code: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  specTemplate?: SpecFieldDef[];
  defaultUsefulLifeMonths?: number | null;
  requiresSerial?: boolean;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateAssetCategoryDto = Partial<CreateAssetCategoryDto>;

export interface AssetCategoryQueryParams {
  includeInactive?: string;
  leafOnly?: string;
  search?: string;
}

// ================================
// UBICACIONES
// ================================

export interface AssetLocation {
  id: string;
  /** null = no pertenece a ninguna sucursal (corporativo u otro sitio). */
  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;
  /** true = está fuera de sucursal. */
  isOffsite: boolean;
  /** "Corporativo Irapuato" o el nombre de la sucursal. */
  siteName: string;
  parentId: string | null;
  parentName: string | null;
  code: string | null;
  name: string;
  fullName: string;
  description: string | null;
  isActive: boolean;
  assetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssetLocationDto {
  /** Vacío/null = sitio que NO es sucursal (ej. Corporativo Irapuato). */
  branchId?: string | null;
  name: string;
  code?: string | null;
  parentId?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export type UpdateAssetLocationDto = Partial<CreateAssetLocationDto>;

export interface AssetLocationQueryParams {
  branchId?: string;
  /** 'true' = solo las que no pertenecen a una sucursal. */
  withoutBranch?: string;
  includeInactive?: string;
  search?: string;
}

// ================================
// FACTURAS DE COMPRA
// ================================

export interface AssetPurchaseFile {
  id: string;
  fileKind: PurchaseFileKind;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  createdAt: string;
}

export interface AssetPurchaseLinkedAsset {
  id: string;
  assetTag: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  categoryName: string;
  purchaseCost: number | null;
  status: AssetStatus;
}

export interface AssetPurchase {
  id: string;
  supplierName: string | null;
  supplierRfc: string | null;
  supplierId: string | null;
  invoiceNumber: string | null;
  invoiceUuid: string | null;
  invoiceDate: string | null;
  currencyCode: string | null;
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  companyEntityId: string | null;
  notes: string | null;
  isActive: boolean;
  assetCount: number;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetPurchaseDetail extends AssetPurchase {
  files: AssetPurchaseFile[];
  assets: AssetPurchaseLinkedAsset[];
}

export interface CreateAssetPurchaseDto {
  supplierName?: string | null;
  supplierRfc?: string | null;
  invoiceNumber?: string | null;
  invoiceUuid?: string | null;
  invoiceDate?: string | null;
  currencyCode?: string | null;
  subtotal?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  companyEntityId?: string | null;
  notes?: string | null;
}

export type UpdateAssetPurchaseDto = Partial<CreateAssetPurchaseDto>;

export interface AssetPurchaseQueryParams {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  includeInactive?: string;
  page?: number;
  limit?: number;
}

export interface AssetPurchaseListResponse {
  data: AssetPurchase[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ================================
// ACTIVOS
// ================================

export interface Asset {
  id: string;
  assetTag: string;
  legacyTag: string | null;
  manufacturerTag: string | null;
  serialNumber: string | null;
  partNumber: string | null;
  categoryId: string;
  categoryName: string | null;
  categoryCode: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  specifications: SpecValues;
  status: AssetStatus;
  condition: AssetCondition;
  purchaseId: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  currencyCode: string | null;
  usefulLifeMonths: number | null;
  monthsInUse: number | null;
  /** % de vida útil que le queda. null = sin fecha de compra o sin vida útil definida. */
  lifeRemainingPct: number | null;
  warrantyUntil: string | null;
  warrantyProvider: string | null;
  currentAssignmentId: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  locationId: string | null;
  locationName: string | null;
  labelPrintedAt: string | null;
  labelPrintedCount: number;
  parentAssetId: string | null;
  parentAssetTag: string | null;
  notes: string | null;
  retiredAt: string | null;
  retirementReason: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetAssignment {
  id: string;
  assignmentType: AssignmentType;
  assignedUserId: string | null;
  assignedBranchId: string | null;
  assignedDepartmentId: string | null;
  assignedLocationId: string | null;
  assignedToName: string;
  assignedAt: string;
  returnedAt: string | null;
  isOpen: boolean;
  assignedByName: string | null;
  conditionOut: AssetCondition | null;
  conditionIn: AssetCondition | null;
  notes: string | null;
  hasDocument: boolean;
  documentName: string | null;
}

export interface AssetDocument {
  id: string;
  documentType: AssetDocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  description: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface AssetMaintenance {
  id: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  description: string;
  scheduledFor: string | null;
  performedAt: string | null;
  performedByUserId: string | null;
  performedByName: string | null;
  providerName: string | null;
  cost: number | null;
  currencyCode: string | null;
  nextDueDate: string | null;
  createdAt: string;
}

export interface AssetChild {
  id: string;
  assetTag: string;
  name: string;
  status: AssetStatus;
}

export interface AssetDetail extends Asset {
  specTemplate: SpecFieldDef[];
  categoryRequiresSerial: boolean;
  assignments: AssetAssignment[];
  currentAssignment: AssetAssignment | null;
  documents: AssetDocument[];
  maintenance: AssetMaintenance[];
  children: AssetChild[];
}

export interface CreateAssetDto {
  assetTag?: string | null;
  legacyTag?: string | null;
  manufacturerTag?: string | null;
  categoryId: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  partNumber?: string | null;
  specifications?: SpecValues;
  status?: AssetStatus;
  condition?: AssetCondition;
  purchaseId?: string | null;
  purchaseDate?: string | null;
  purchaseCost?: number | null;
  currencyCode?: string | null;
  usefulLifeMonths?: number | null;
  warrantyUntil?: string | null;
  warrantyProvider?: string | null;
  branchId?: string | null;
  locationId?: string | null;
  departmentId?: string | null;
  parentAssetId?: string | null;
  notes?: string | null;
}

export type UpdateAssetDto = Partial<CreateAssetDto> & { isActive?: boolean };

// No hay alta de "N equipos idénticos": cada activo es UNA pieza con UNA
// etiqueta. Para dar de alta muchos iguales se usa la carga masiva CSV.

export interface RetireAssetDto {
  status: 'retired' | 'lost' | 'stolen' | 'sold' | 'donated' | 'scrapped';
  reason: string;
  retiredAt?: string | null;
}

export interface AssetQueryParams {
  search?: string;
  categoryId?: string;
  status?: string;
  condition?: string;
  branchId?: string;
  locationId?: string;
  departmentId?: string;
  assignedUserId?: string;
  purchaseId?: string;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  hasInvoice?: string;
  lifeBelowPct?: number;
  warrantyExpiringDays?: number;
  pendingLabel?: string;
  includeInactive?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  limit?: number;
}

export interface AssetListResponse {
  data: Asset[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssetStats {
  total: number;
  available: number;
  assigned: number;
  inRepair: number;
  retired: number;
  pendingLabel: number;
  withoutInvoice: number;
  lifeCritical: number;
  warrantyExpiringSoon: number;
  totalCost: number;
  byCategory: { categoryId: string; categoryName: string; total: number }[];
  byBranch: { branchId: string | null; branchName: string; total: number }[];
  byStatus: { status: AssetStatus; total: number }[];
}

// ================================
// ASIGNACIONES
// ================================

export interface AssignAssetDto {
  assignmentType: AssignmentType;
  assignedUserId?: string | null;
  assignedBranchId?: string | null;
  assignedDepartmentId?: string | null;
  assignedLocationId?: string | null;
  locationId?: string | null;
  assignedAt?: string | null;
  conditionOut?: AssetCondition | null;
  status?: 'assigned' | 'on_loan' | 'in_transit';
  includeChildren?: string;
  notes?: string | null;
}

export interface ReturnAssetDto {
  returnedAt?: string | null;
  conditionIn?: AssetCondition | null;
  status?: 'available' | 'in_repair' | 'reserved' | 'retired';
  branchId?: string | null;
  locationId?: string | null;
  notes?: string | null;
}

export type TransferAssetDto = AssignAssetDto & { conditionIn?: AssetCondition | null };

export interface BulkReturnDto {
  userId?: string;
  assetIds?: string[];
  conditionIn?: AssetCondition | null;
  status?: 'available' | 'in_repair' | 'reserved';
  notes?: string | null;
}

export interface UserAssignedAsset {
  id: string;
  assetTag: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  categoryName: string;
  assignedAt: string;
  condition: AssetCondition;
}

// ================================
// MANTENIMIENTO
// ================================

export interface CreateMaintenanceDto {
  maintenanceType?: MaintenanceType;
  status?: MaintenanceStatus;
  description: string;
  scheduledFor?: string | null;
  performedAt?: string | null;
  performedByUserId?: string | null;
  providerName?: string | null;
  cost?: number | null;
  currencyCode?: string | null;
  nextDueDate?: string | null;
  setAssetStatus?: 'in_repair' | 'in_warranty' | 'available' | 'assigned';
}

export type UpdateMaintenanceDto = Partial<CreateMaintenanceDto>;

// ================================
// ETIQUETAS
// ================================

export interface AssetLabel {
  assetId: string;
  barcodeValue: string;
  symbology: string;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  categoryName: string;
  branchName: string | null;
  locationName: string | null;
}

// ================================
// IMPORTACIÓN MASIVA
// ================================

export interface AssetImportPreview {
  valid: boolean;
  token: string | null;
  totalRows: number;
  validRows: number;
  errors: string[];
  errorCount: number;
  warnings: string[];
  sample: {
    line: number;
    name: string;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
    status: string;
  }[];
  message: string;
}

export interface AssetImportResult {
  imported: number;
  assets: { id: string; assetTag: string; line: number }[];
  firstTag: string | null;
  lastTag: string | null;
  message: string;
}

// ================================
// RESPUESTAS GENÉRICAS
// ================================

export interface DeleteResult {
  deleted: boolean;
  deactivated: boolean;
  message: string;
}

export interface SignedFileUrl {
  url: string;
  fileName: string;
  expires?: string;
}
