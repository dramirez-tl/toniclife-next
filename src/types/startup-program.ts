// startup-program.ts - TypeScript types for Startup Program (Programa de Arranque) module

export type ProgramStatus = 'draft' | 'active' | 'paused' | 'ended';

export interface MultilevelBonusRule {
  level: number;
  amount: number;
  description?: string;
}

export interface RetentionRule {
  minRepurchases: number;
  rewardType: 'physical' | 'cash' | 'physical_and_cash';
  rewardName?: string;
  bonusAmount: number;
}

export interface ProgramConfig {
  id: string;
  code: string;
  name: string;
  description?: string;
  countryCode: string;
  currencyCode: string;
  status: ProgramStatus;
  startDate: string;
  endDate?: string | null;
  qualifyingKitProductId?: string | null;
  qualifyingKitMinPrice?: string;
  directBonusAmount: string;
  fifthBonusEveryN: number;
  fifthBonusAmount: string;
  multilevelBonusRules: MultilevelBonusRule[];
  multilevelMinPersonalPoints?: string;
  multilevelMinQualifiedDirects?: number;
  retentionEvaluationMonths: number;
  retentionRules: RetentionRule[];
  alertAtRecruits?: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgramQueryParams {
  countryCode?: string;
  status?: ProgramStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProgramListResponse {
  data: ProgramConfig[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProgramDto {
  code: string;
  name: string;
  description?: string;
  countryCode: string;
  currencyCode: string;
  startDate: string;
  endDate?: string;
  qualifyingKitProductId?: string;
  qualifyingKitMinPrice?: number;
  directBonusAmount: number;
  fifthBonusEveryN?: number;
  fifthBonusAmount?: number;
  multilevelBonusRules?: MultilevelBonusRule[];
  multilevelMinPersonalPoints?: number;
  multilevelMinQualifiedDirects?: number;
  retentionEvaluationMonths?: number;
  retentionRules?: RetentionRule[];
  alertAtRecruits?: number[];
}

export interface UpdateProgramDto {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string | null;
  qualifyingKitProductId?: string | null;
  qualifyingKitMinPrice?: number;
  directBonusAmount?: number;
  fifthBonusEveryN?: number;
  fifthBonusAmount?: number;
  multilevelBonusRules?: MultilevelBonusRule[];
  multilevelMinPersonalPoints?: number;
  multilevelMinQualifiedDirects?: number;
  retentionEvaluationMonths?: number;
  retentionRules?: RetentionRule[];
  alertAtRecruits?: number[];
}

export interface ChangeStatusDto {
  status: ProgramStatus;
}

// ─── Bonus Types (Phase 2) ──────────────────────────────────────────────────

export type BonusTriggerType =
  | 'direct_recruitment'
  | 'fifth_study'
  | 'multilevel_l1'
  | 'multilevel_l2'
  | 'multilevel_l3'
  | 'retention';

export type BonusStatus = 'calculated' | 'approved' | 'paid' | 'cancelled';

export type PhysicalRewardStatus = 'pending' | 'shipped' | 'delivered' | null;

export interface BonusTransaction {
  id: string;
  programId: string;
  periodId: string;
  beneficiaryCustomerId: string;
  beneficiaryName: string;
  sourceCustomerId: string;
  sourceName: string;
  triggerType: BonusTriggerType;
  status: BonusStatus;
  grossAmount: string;
  isr: string;
  iva: string;
  ivaWithholding: string;
  resico: string;
  netAmount: string;
  physicalRewardName?: string | null;
  physicalRewardStatus?: PhysicalRewardStatus;
  orderId?: string | null;
  approvedAt?: string | null;
  approvedByUserId?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface BonusListResponse {
  data: BonusTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BonusSummary {
  totalGross: number;
  totalNet: number;
  totalIsr: number;
  totalIva: number;
  totalTransactions: number;
  byTriggerType: Record<string, { count: number; gross: number; net: number }>;
  byStatus: Record<string, number>;
}

export interface BonusQueryParams {
  triggerType?: BonusTriggerType;
  status?: BonusStatus;
  periodId?: string;
  page?: number;
  limit?: number;
}

export interface MilestoneInfo {
  recruitsNeeded: number;
  recruitsRemaining: number;
  bonusAmount: string;
}

export interface ProgramProgress {
  programId: string;
  programName: string;
  programCode: string;
  customerId: string;
  totalRecruits: number;
  totalBonusesGross: string;
  totalBonusesNet: string;
  bonusesByType: Record<string, { count: number; gross: number; net: number }>;
  nextMilestone?: MilestoneInfo | null;
  milestones: MilestoneInfo[];
}

export interface RecruitItem {
  customerId: string;
  customerName: string;
  customerCode: string;
  enrollmentDate: string;
  hasKitOrder: boolean;
  kitOrderAmount?: string | null;
  bonusGenerated: boolean;
  bonusAmount?: string | null;
}

export interface RecruitsListResponse {
  data: RecruitItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecruitsQueryParams {
  page?: number;
  limit?: number;
}
