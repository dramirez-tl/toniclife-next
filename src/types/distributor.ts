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

  // Puntos de grupo (red): suma CRUDA de las líneas (cps.points_group)
  groupPoints: number;

  /** Puntos de grupo CON tope: lo que realmente cuenta para el rango
   *  (cps.points_group_roll_over cuando > 0; si no, points_group). */
  groupCounted: number;
  /** Lo que se pasó del tope y NO cuenta: max(0, groupPoints - groupCounted). */
  groupRolledOver: number;

  // LEGACY: cps.points_group_roll_over tal cual (la home ya no lo usa)
  rolloverPoints: number;

  // LEGACY: suma doble-contada (compatibilidad; la home ya no lo usa)
  totalPoints: number;
}

export interface NetworkSummary {
  /** Miembros activos (network_members.is_active) del subárbol. */
  totalDistributors: number;
  inactiveDistributors: number;
  totalNetwork: number;
  /** Miembros del subárbol con puntos personales > 0 en el periodo resuelto. */
  activeDistributors: number;
  directDistributors: number;
  /** Miembros del subárbol con puntos personales >= 3300 en el periodo. */
  qualifiedDistributors: number;
  maxDepth: number;

  // Nuevos del periodo
  newThisPeriod: number;
  activatedThisPeriod: number;

  // Por nivel
  byLevel: { level: number; count: number; active: number }[];
}

/** Bloque de ventas del agregado /dashboard. Solo lo lee /distribuidor/ventas. */
export interface SalesSummary {
  personalSales: number;
  teamSales: number;
  totalSales: number;
  orderCount?: number;
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

  /** Neto después de retenciones (totalNet - companyWithholdings). */
  netAfterWithholdings?: number;

  /** Moneda REAL de los montos (el API convierte a la moneda del distribuidor
   *  cuando hay tasa del periodo; 'MXN' si no pudo convertir). */
  currencyCode?: string;
}

/** Top de la red en el agregado /dashboard. Solo lo lee /distribuidor/ventas
 *  (id, name, sales); el detalle por integrante es opcional. */
export interface TopPerformer {
  id: string;
  name: string;
  sales: number;
  code?: string;
  rank?: RankType;
  level?: number;
  newRecruits?: number;
  avatarUrl?: string;
}

export interface DistributorDashboard {
  profile: DistributorProfile;
  points: PeriodPoints;
  networkSummary: NetworkSummary;
  commissionsSummary: CommissionsSummary;
  /** Solo lo lee /distribuidor/ventas. */
  salesSummary?: SalesSummary;
  /** Solo lo lee /distribuidor/ventas. */
  topPerformers?: TopPerformer[];
}

/** Resumen de comisiones del periodo ANTERIOR al resuelto (lo cobrado en el
 *  último cierre). Montos como string decimal, en la moneda de currencyCode. */
export interface PreviousPeriodCommissions {
  periodId: string;
  periodName: string;
  totalNet: string;
  companyWithholdings: string;
  netAfterWithholdings: string;
  currencyCode: string;
}

// Tipos para respuestas de API (GET /distributor/dashboard?periodId=)
export interface DashboardResponse {
  dashboard: DistributorDashboard;
  /** null cuando no existe periodo anterior. */
  previousPeriodCommissions: PreviousPeriodCommissions | null;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
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
