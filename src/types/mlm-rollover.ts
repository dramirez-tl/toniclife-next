export interface RolloverStatus {
  periodId: string;
  totalProcessed: number;
  totalRolledOver: number;
  status: string;
  processedAt?: string;
}

export interface RolloverStats {
  periodId: string;
  totalEligible: number;
  totalRolledOver: number;
  averageRolloverAmount: number;
}

export interface RolloverHistory {
  id: string;
  customerId: string;
  periodId: string;
  originalSponsorId: string;
  newSponsorId: string;
  reason: string;
  createdAt: string;
}

export interface EffectiveSponsor {
  customerId: string;
  effectiveSponsorId: string;
  sponsorName: string;
  isRolledOver: boolean;
}
