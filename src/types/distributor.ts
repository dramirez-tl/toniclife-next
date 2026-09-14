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

  /** Retención de convenios de Tesorería aplicada en el periodo (mig 115). */
  companyWithholdings?: number;

  /** true si companyWithholdings incluye retención proyectada al cierre
   *  (aún sin cobrar por Tesorería). */
  companyWithholdingsProjected?: boolean;

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

// ===== Camino de rango (GET /distributor/rank-roadmap) =====
// Vista "videojuego" del avance hacia el siguiente rango: qué le falta al
// distribuidor en cada requisito (misión), sus líneas directas (patas) y
// cuánto aporta cada una. Solo lectura; los números ya vienen redondeados.

export interface RankRoadmapRequirement {
  /** Valor exigido por mlm_ranks. */
  required: number;
  /** Valor actual del distribuidor. */
  current: number;
  /** max(0, required - current). */
  gap: number;
  /** current >= required. */
  met: boolean;
  /** 0..100 entero (100 cuando required <= 0). */
  percent: number;
}

export interface RankRoadmapRankStep {
  id: string;
  code: string;
  name: string;
  rankNumber: number;
  /** Tope por línea que se obtiene al TENER este rango (mlm_ranks.roll_over_limit). */
  rollOverLimit: number;
  /** Tope usado para evaluar el requisito de grupo de ESTE rango = tope del rango
   *  previo en la escalera (para el rango base, el propio). */
  capApplied: number;
  levelMax: number | null;
  generationMax: number | null;
  autoBonusMxn: string | null;
  autoBonusUsd: string | null;
  /** rankNumber <= rango actual. */
  isAchieved: boolean;
  /** rankNumber === rango actual. */
  isCurrent: boolean;
  /** rankNumber === rango actual + 1. */
  isNext: boolean;
  personal: RankRoadmapRequirement;
  qualifiers: RankRoadmapRequirement;
  group: RankRoadmapRequirement;
  /** Requisitos cumplidos (0..3). */
  metCount: number;
  /** rankNumber <= rango proyectado con los números de hoy. */
  isReachableNow: boolean;
  /** Para rangos por encima del actual: primer rango intermedio no cumplido. */
  blockedByRankNumber: number | null;
  /** Cuánto pueden aportar aún las líneas existentes antes de topar. */
  groupHeadroom: number;
  /** Líneas nuevas aproximadas necesarias si el headroom no alcanza. */
  newLegsNeeded: number;
}

export interface RankRoadmapLeg {
  memberId: string;
  customerId: string;
  customerNumber: string;
  name: string;
  rankName: string | null;
  status: string;
  /** Puntos personales del frontal en el periodo (0 si no tiene fila). */
  personalPoints: number;
  /** personalPoints >= qualificationThreshold. */
  isQualified: boolean;
  /** max(0, threshold - personalPoints). */
  pointsToQualify: number;
  /** Volumen de toda la pata (frontal + descendientes). */
  legVolume: number;
  /** min(legVolume, tope del rango actual). */
  counted: number;
  /** max(0, legVolume - counted). */
  rolledOver: number;
  atCap: boolean;
  /** Cuánto le falta a la pata para topar (0 sin tope). */
  headroom: number;
  memberCount: number;
  activeCount: number;
}

export interface RankRoadmapRankRef {
  id: string;
  code: string;
  name: string;
  rankNumber: number;
}

export interface RankRoadmapResponse {
  period: {
    id: string;
    name: string;
    isClosed: boolean;
    startDate: string;
    endDate: string;
    daysRemaining: number;
  };
  /** Umbral de calificación personal (3300). */
  qualificationThreshold: number;
  personalPoints: number;
  isQualified: boolean;
  pointsToQualify: number;
  currentRank: RankRoadmapRankRef & { rollOverLimit: number };
  /** false cuando customer_period_stats.rank_id era null y se cayó al rango base. */
  rankResolvedFromPeriod: boolean;
  /** Rango que el motor asignaría HOY con los números actuales (null si ninguno). */
  projectedRank: RankRoadmapRankRef | null;
  directCount: number;
  qualifiedFirstLevel: number;
  groupVolumeRaw: number;
  groupCounted: number;
  groupRolledOver: number;
  /** Ordenadas: (1) sin calificar con puntos por pointsToQualify ASC,
   *  (2) calificadas por puntos DESC, (3) sin puntos por legVolume DESC. */
  legs: RankRoadmapLeg[];
  /** Top 5 del grupo (1). */
  closestToQualify: RankRoadmapLeg[];
  /** Escalera completa ascendente por rankNumber. */
  ranks: RankRoadmapRankStep[];
  /** Paso con isNext; null en el rango máximo. */
  nextRank: RankRoadmapRankStep | null;
}
