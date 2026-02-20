// types/mlm-ranks.ts - Types for MLM Ranks
// Aligned with backend DTO: toniclife-api/src/modules/mlm/dto/rank.dto.ts

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
  rollOverLimit?: string;
  autoBonusMxn?: string;
  autoBonusUsd?: string;
  isActive: boolean;
  createdAt: string;
}

export interface RankQualification {
  customerId: string;
  customerName: string;
  periodId: string;
  periodCode: string;
  currentRank?: MlmRank;
  achievedRank?: MlmRank;
  personalPoints: number;
  groupPoints: number;
  businessPointsMxn: string;
  qualifiedFirstLevel: number;
  totalDirectDownlines: number;
  isQualified: boolean;
  nextRankProgress?: {
    nextRank: MlmRank;
    personalPointsProgress: number;
    qualifiedProgress: number;
    personalPointsNeeded: number;
    qualifiedNeeded: number;
  };
}

export interface RankSummary {
  totalQualified: number;
  totalNotQualified: number;
  byRank: {
    rankId: string;
    rankName: string;
    count: number;
  }[];
}

export interface CreateRankDto {
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

export interface UpdateRankDto {
  name?: string;
  pointsPersonalRequired?: number;
  pointsGroupRequired?: number;
  qualifiersFirstLevel?: number;
  levelMax?: number;
  generationMax?: number;
  autoBonusMxn?: string;
  autoBonusUsd?: string;
  isActive?: boolean;
}
