// viaticos.ts - Tipos del módulo de viáticos (API /viaticos, mig 156; por día,
// mig 157; comprobación, mig 158).

/**
 * pending → approved (por comprobar) → proof_submitted ("Comprobada") →
 * verified ("Validada"). Si Contabilidad regresa la comprobación, vuelve a
 * approved con el motivo.
 */
export type ViaticoStatus = 'pending' | 'approved' | 'proof_submitted' | 'verified' | 'rejected' | 'cancelled';

export type ViaticoFileKind = 'receipt' | 'refund';

export interface ViaticoFile {
  id: string;
  kind: ViaticoFileKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ViaticoFileUrl {
  url: string;
  fileName: string;
  mimeType: string;
}

export type ViaticoCategory = 'lodging' | 'transport' | 'meals' | 'fuel' | 'other';

export type ViaticoVehicleType = 'propio' | 'asignado';

export interface ViaticoConcept {
  code: string;
  label: string;
  category: ViaticoCategory;
  /** false = ya no se ofrece para capturar (solo histórico). */
  active: boolean;
}

export interface ViaticoConceptCatalog {
  categories: { code: ViaticoCategory; label: string }[];
  concepts: ViaticoConcept[];
  /** La BD ya admite el detalle por día (mig 157). */
  dailyItemsEnabled: boolean;
  /** La BD ya admite la comprobación (mig 158). Opcional: API anterior. */
  proofEnabled?: boolean;
}

/** Monto de un concepto en un día. */
export interface ViaticoItem {
  conceptCode: string;
  conceptLabel: string;
  category: ViaticoCategory;
  /** YYYY-MM-DD */
  date: string;
  amount: number;
}

export interface ViaticoItemInput {
  conceptCode: string;
  date: string;
  amount: number;
}

export const VIATICO_STATUS_LABELS: Record<ViaticoStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada · por comprobar',
  proof_submitted: 'Comprobada',
  verified: 'Validada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

export const VIATICO_STATUS_VARIANTS: Record<
  ViaticoStatus,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
> = {
  pending: 'warning',
  approved: 'success',
  proof_submitted: 'default',
  verified: 'secondary',
  rejected: 'destructive',
  cancelled: 'outline',
};

export interface Viatico {
  id: string;
  folio: string;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string | null;
  /** Miniatura de la foto del expediente de RRHH (URL firmada); null/ausente = iniciales. */
  requesterAvatarUrl?: string | null;
  departmentId: string | null;
  departmentName: string | null;
  branchId: string | null;
  branchName: string | null;
  /** "" si no tiene destino. */
  destination: string;
  purpose: string;
  tripStart: string;
  tripEnd: string;
  transportAmount: number;
  lodgingAmount: number;
  mealsAmount: number;
  /** Combustible y vehículo (mig 157; 0 en solicitudes anteriores). */
  fuelAmount?: number;
  otherAmount: number;
  otherDescription: string | null;
  vehicleType?: ViaticoVehicleType | null;
  odometerKm?: number | null;
  fuelEfficiencyKmL?: number | null;
  tankCapacityL?: number | null;
  /** Detalle por concepto y día: solo en GET /viaticos/:id. */
  items?: ViaticoItem[];
  /** Comprobación (mig 158). */
  proofTotal?: number | null;
  /** Autorizado − comprobado: + sobró (se devuelve), − gastó de más. */
  proofBalance?: number | null;
  proofNotes?: string | null;
  proofSubmittedAt?: string | null;
  proofReviewedByName?: string | null;
  proofReviewedAt?: string | null;
  /** Comentario al validar, o motivo por el que Contabilidad la regresó. */
  proofReviewNotes?: string | null;
  /** Comprobantes y ficha de devolución: solo en GET /viaticos/:id. */
  files?: ViaticoFile[];
  requestedAmount: number;
  currencyCode: string;
  status: ViaticoStatus;
  approvedAmount: number | null;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNotes: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /** El usuario autenticado es el solicitante. */
  isMine: boolean;
}

export interface ViaticoListResponse {
  data: Viatico[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ViaticoSummary {
  pendingAll: number;
  minePending: number;
  mineApproved: number;
  mineRejected: number;
  /** Mis aprobadas que falta comprobar. */
  mineToProve?: number;
  /** Comprobaciones por validar (quien aprueba/consulta). */
  proofToReview?: number;
  canSeeAll: boolean;
  canApprove: boolean;
  canRequest: boolean;
}

export interface ViaticoQueryParams {
  status?: ViaticoStatus;
  mine?: boolean;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CreateViaticoDto {
  destination?: string;
  purpose: string;
  tripStart: string;
  tripEnd: string;
  /** Detalle por día (mig 157): si viene, el total sale de aquí. */
  items?: ViaticoItemInput[];
  vehicleType?: ViaticoVehicleType | null;
  odometerKm?: number | null;
  fuelEfficiencyKmL?: number | null;
  tankCapacityL?: number | null;
  transportAmount?: number;
  lodgingAmount?: number;
  mealsAmount?: number;
  otherAmount?: number;
  otherDescription?: string;
  branchId?: string;
  notes?: string;
}

export type UpdateViaticoDto = Partial<CreateViaticoDto>;

export interface ApproveViaticoDto {
  approvedAmount?: number;
  notes?: string;
}

export interface RejectViaticoDto {
  reason: string;
}

export interface CancelViaticoDto {
  reason?: string;
}

export interface SubmitViaticoProofDto {
  proofTotal: number;
  notes?: string;
}
