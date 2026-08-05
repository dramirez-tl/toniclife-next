// types/distributor.ts - Tipos para Centro de Negocio del distribuidor

import { RankType } from './network';

export type DistributorStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface DistributorProfile {
  id: string;
  code: string;
  referralCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  rank: RankType;
  rankLabel: string;
  status: DistributorStatus;
  sponsorId?: string;
  sponsorName?: string;
  sponsorCode?: string;
  joinDate: string;
  personalLink: string;
  qrCodeUrl?: string;
}

export interface PeriodPoints {
  periodId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;

  // Puntos personales
  personalPoints: number;
  personalPointsRequired: number;
  isPersonalQualified: boolean;

  // Puntos de negocio
  businessPointsMxn: number;
  businessPointsUsd: number;

  // Puntos de grupo (red)
  groupPoints: number;

  // Roll-over del periodo anterior
  rolloverPoints: number;

  // Totales
  totalPoints: number;
}

export interface RankProgress {
  currentRank: RankType;
  currentRankLabel: string;
  nextRank: RankType | null;
  nextRankLabel: string | null;
  progressPercentage: number;

  requirements: RankRequirement[];
  allRequirementsMet: boolean;
}

export interface RankRequirement {
  id: string;
  name: string;
  description: string;
  currentValue: number;
  requiredValue: number;
  isMet: boolean;
  percentComplete: number;
  unit: string;
}

export interface NetworkSummary {
  totalDistributors: number;
  inactiveDistributors: number;
  totalNetwork: number;
  activeDistributors: number;
  directDistributors: number;
  qualifiedDistributors: number;
  maxDepth: number;

  // Nuevos del periodo
  newThisPeriod: number;
  activatedThisPeriod: number;

  // Por nivel
  byLevel: { level: number; count: number; active: number }[];
}

export interface SalesSummary {
  periodId: string;
  personalSales: number;
  teamSales: number;
  totalSales: number;
  orderCount?: number;

  // Comparación con periodo anterior
  personalSalesChange: number;
  teamSalesChange: number;
  totalSalesChange: number;

  // Desglose
  byCategory: { category: string; amount: number }[];
  topProducts: { productId: string; productName: string; quantity: number; amount: number }[];
}

export interface CommissionsSummary {
  periodId: string;
  totalGross: number;
  totalNet: number;
  totalPaid: number;
  totalPending: number;

  // Por tipo
  networkCommissions: number;
  generationCommissions: number;
  rankBonuses: number;
  personalCommissions: number;

  // Comparación
  changeFromLastPeriod: number;

  /** Moneda REAL de los montos (el API convierte a la moneda del distribuidor
   *  cuando hay tasa del periodo; 'MXN' si no pudo convertir). */
  currencyCode?: string;
}

export interface RecentActivity {
  id: string;
  type: 'sale' | 'recruit' | 'commission' | 'rank_change' | 'qualification';
  title: string;
  description: string;
  amount?: number;
  personName?: string;
  personId?: string;
  timestamp: string;
  relativeTime: string;
}

export interface TopPerformer {
  id: string;
  name: string;
  code: string;
  rank: RankType;
  level: number;
  sales: number;
  newRecruits: number;
  avatarUrl?: string;
}

export interface DistributorDashboard {
  profile: DistributorProfile;
  points: PeriodPoints;
  rankProgress: RankProgress;
  networkSummary: NetworkSummary;
  salesSummary: SalesSummary;
  commissionsSummary: CommissionsSummary;
  recentActivity: RecentActivity[];
  topPerformers: TopPerformer[];
}

// Quick stats para cards principales
export interface DashboardStats {
  monthlyCommission: number;
  monthlyCommissionChange: number;
  totalSales: number;
  totalSalesChange: number;
  activeDownline: number;
  totalDownline: number;
  rankProgress: number;
  currentRank: string;
  nextRank: string;
  daysUntilPeriodEnd: number;
  qualificationStatus: 'qualified' | 'at_risk' | 'not_qualified';
}

// Tipos para respuestas de API
export interface DashboardResponse {
  dashboard: DistributorDashboard;
  stats: DashboardStats;
  lastUpdated: string;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

// Goals/Metas
export interface Goal {
  id: string;
  type: 'sales' | 'recruits' | 'rank' | 'points' | 'custom';
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string;
  status: 'in_progress' | 'completed' | 'failed' | 'upcoming';
  createdAt: string;
}
