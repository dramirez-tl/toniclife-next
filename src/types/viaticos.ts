// viaticos.ts - Tipos del módulo de viáticos (API /viaticos, mig 156).

export type ViaticoStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const VIATICO_STATUS_LABELS: Record<ViaticoStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

export const VIATICO_STATUS_VARIANTS: Record<
  ViaticoStatus,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'outline',
};

export interface Viatico {
  id: string;
  folio: string;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string | null;
  departmentId: string | null;
  departmentName: string | null;
  branchId: string | null;
  branchName: string | null;
  destination: string;
  purpose: string;
  tripStart: string;
  tripEnd: string;
  transportAmount: number;
  lodgingAmount: number;
  mealsAmount: number;
  otherAmount: number;
  otherDescription: string | null;
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
  destination: string;
  purpose: string;
  tripStart: string;
  tripEnd: string;
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
