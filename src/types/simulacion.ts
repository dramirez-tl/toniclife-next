/**
 * Shapes de simulación de rango. Espejan los DTOs del backend
 * `toniclife-api/src/modules/simulations/dto/*`.
 */

export type RankCode =
  | 'distribuidor'
  | 'bronce'
  | 'plata'
  | 'oro'
  | 'platino'
  | 'diamante'
  | 'doble_diamante'
  | 'triple_diamante'
  | 'diamante_sirius'
  | 'diamante_azul';

export interface RankRule {
  code: RankCode;
  name: string;
  rankNumber: number;
  pointsPersonalRequired: number;
  qualifiersFirstLevel: number;
  pointsGroupRequired: number;
  levelMax: number;
  generationMax: number;
  rollOverLimit: number;
  autoBonusMxn: number;
  autoBonusUsd: number;
}

export interface RankProjectionRequest {
  legacyId: number;
  targetRankCode: RankCode;
  periodId?: string;
}

export interface DistributorIdentity {
  customerId: string;
  legacyId: number;
  fullName: string;
  status: string;
  branchName?: string;
}

export interface CurrentSituation {
  currentRank?: RankRule;
  personalPoints: number;
  directDownlinesCount: number;
  qualifiedFirstLevelCount: number;
  totalNetworkVolume: number;
  currentMonthlyCommission: number;
}

export interface LegStructure {
  headCustomerId: string;
  headLegacyId: number;
  headFullName: string;
  headRankName?: string;
  totalVolume: number;
  cappedVolume: number;
  percentOfTotal: number;
}

export interface RequirementRow {
  label: string;
  required: string;
  current: string;
  meets: boolean;
  gap: string;
}

export interface CommissionLine {
  concept: string;
  calculation: string;
  amount: number;
}

export interface Scenario {
  rank: RankRule;
  assumptions: string[];
  commissionBreakdown: CommissionLine[];
  totalEstimated: number;
  notes: string[];
}

export interface RankComparisonRow {
  rankCode: RankCode;
  rankName: string;
  ml1: number;
  ml2: number;
  ml3: number;
  generations: number;
  total: number;
  isTarget: boolean;
}

export interface PotentialLeader {
  customerId: string;
  legacyId: number;
  fullName: string;
  relativeDepth: number;
  personalPoints: number;
  qualifiedFirstLevelCount: number;
  rollOverCapped: number;
  potentialRankCode: RankCode;
  potentialRankName: string;
}

export interface CommissionHistoryRow {
  periodCode: string;
  periodName: string;
  totalCommission: number;
  recordsCount: number;
  rankName?: string;
}

export interface SimulationSummary {
  monthlyGap: number;
  headline: string;
  problems: string[];
  opportunities: string[];
}

export interface RankProjectionResponse {
  distributor: DistributorIdentity;
  periodCode: string;
  periodName: string;
  currentSituation: CurrentSituation;
  legs: LegStructure[];
  targetRank: RankRule;
  requirements: RequirementRow[];
  scenario: Scenario;
  rankComparison: RankComparisonRow[];
  potentialLeaders: PotentialLeader[];
  commissionHistory: CommissionHistoryRow[];
  summary: SimulationSummary;
}
