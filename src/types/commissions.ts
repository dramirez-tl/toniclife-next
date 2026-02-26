// types/commissions.ts - Tipos para sistema de comisiones MLM
// Aligned with backend DTO: toniclife-api/src/modules/mlm/dto/commission.dto.ts

export type CommissionType = 'mlm' | 'cedea_bonus' | 'auto_bonus' | 'adjustment';

export type CommissionStatus = 'calculated' | 'approved' | 'paid' | 'cancelled';

export type TaxRegime =
  | 'SIN_IMPUESTO'
  | 'FIC'
  | 'RESICO'
  | 'MORAL'
  | 'FRONTERIZA'
  | 'ASIMILADOS';

export interface Commission {
  id: string;
  customerId: string;
  customerName: string;
  periodId: string;
  periodCode: string;
  commissionType: CommissionType;

  // Montos
  subtotalEarnings: string;
  autoBonus?: string;

  // Impuestos (Mexico)
  taxRegime?: string;
  isrAmount?: string;
  ivaAmount?: string;
  ivaWithholding?: string;
  resicoAmount?: string;

  // Total
  totalAmount: string;
  currencyCode: string;

  // Estado
  status: CommissionStatus;
  approvedAt?: string;

  // Metadata
  createdAt: string;
}

export interface CommissionSummary {
  mlmCommissionsMxn: string;
  cedeaBonusesMxn: string;
  autoBonusesMxn: string;
  adjustmentsMxn: string;
  totalSubtotalMxn: string;
  totalRetentions: string;
  totalNetMxn: string;
  transactionCount: number;
  personalSales?: string;
  networkSalesVolume?: string;
}

export interface CommissionPercentage {
  id: string;
  levelNumber: number;
  name: string;
  basePercentage: string;
  upgradedPercentage?: string;
  qualifiersRequired?: number;
  isActive: boolean;
}

export interface GenerationCommission {
  id: string;
  generationNumber: number;
  percentage: string;
  isActive: boolean;
}

export interface MlmRank {
  id: string;
  code: string;
  name: string;
  rankNumber: number;
  pointsPersonalRequired: number;
  pointsGroupRequired: number;
  qualifiersFirstLevel: number;
  levelMax?: number;
  generationMax?: number;
  autoBonusMxn?: string;
  autoBonusUsd?: string;
}

export interface CommissionStructure {
  levels: CommissionPercentage[];
  generations: GenerationCommission[];
  ranks: MlmRank[];
  userLevelMax?: number;
  userGenerationMax?: number;
  userQualifiedCount?: number;
  userRankName?: string;
  userRankNumber?: number;
}

// Response types
export interface CommissionsListResponse {
  data: Commission[];
  summary: CommissionSummary;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Filters
export interface CommissionFilters {
  periodId?: string;
  commissionType?: CommissionType;
  status?: CommissionStatus;
  search?: string;
  page?: number;
  limit?: number;
}

// Calculate/Approve DTOs
export interface CalculateCommissionsDto {
  periodId: string;
  customerId?: string;
  recalculate?: boolean;
}

export interface ApproveCommissionsDto {
  commissionIds: string[];
}

export interface MarkAsPaidDto {
  commissionIds: string[];
  paymentReference?: string;
}

// Tax calculation types (kept for local UI calculations)
export interface TaxCalculation {
  regime: TaxRegime;
  grossAmount: number;
  ivaRate: number;
  ivaAmount: number;
  ivaRetentionRate: number;
  ivaRetention: number;
  resicoRate: number;
  resicoAmount: number;
  netAmount: number;
}

// Chart data (kept for frontend visualization)
export interface CommissionChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }[];
}

export interface MonthlyCommissionTrend {
  month: string;
  year: number;
  mlm: number;
  cedea: number;
  autoBonus: number;
  adjustment: number;
  total: number;
}
