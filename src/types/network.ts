// types/network.ts - Tipos para visualización de red MLM

export type RankType =
  | 'distribuidor'
  | 'bronce'
  | 'plata'
  | 'oro'
  | 'platino'
  | 'diamante'
  | 'doble_diamante'
  | 'triple_diamante'
  | 'sirius'
  | 'azul';

export interface NetworkStats {
  customerId: string;
  networkCount: number;
  directCount: number;
  maxDepth: number;
  totalBusinessPoints: string;
  personalSales: number;
  teamSales: number;
  currentCommission: number;
  historicCommission: number;
}

export interface NetworkMemberDetail {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  rank: RankType;
  rankLabel: string;
  sponsorId?: string;
  sponsorName?: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'suspended';
  avatarUrl?: string;
  stats: NetworkStats;
}

// Tipos para vista de lista de downlines (GET network/downlines; lo usa el
// buscador de colocación de MemberEnrollmentPanel)
export interface DownlineItem {
  id: string;
  customerNumber?: string;
  fullName: string;
  email: string;
  phone?: string;
  level: number;
  rankName?: string;
  sponsorName?: string;
  sponsorCode?: string;
  personalPoints?: number;
  status: string;
  createdAt: string;
}

export interface DownlineListResponse {
  data: DownlineItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DownlineQuery {
  search?: string;
  level?: number;
  status?: 'active' | 'inactive' | 'suspended';
  qualified?: boolean;
  rankNumber?: number;
  joinedPeriodId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'createdAt' | 'level';
  sortOrder?: 'asc' | 'desc';
}

// Volumen de grupo por LÍNEA DIRECTA (frontal + su pata) con tope/rollover.
export interface DirectLineVolume {
  memberId: string;
  customerId: string;
  customerNumber: string;
  name: string;
  rankName?: string | null;
  status: string;
  /** Volumen de grupo de la línea = puntos de toda la pata en el periodo. */
  legVolume: number;
  /** Cuánto cuenta hacia tu grupo = min(legVolume, tope). */
  counted: number;
  /** Excedente que "rolla"/no cuenta = max(0, legVolume - tope). */
  rolledOver: number;
  /** TRUE si la línea alcanzó/superó el tope. */
  atCap: boolean;
  memberCount: number;
  activeCount: number;
  /** Puntos personales del FRONTAL en el periodo (opcional; lo expone rank-roadmap). */
  headPersonalPoints?: number;
  /** TRUE si el frontal alcanza el umbral de calificación (3300). */
  headIsQualified?: boolean;
  /** Puntos que le faltan al frontal para calificar. */
  headPointsToQualify?: number;
}

export interface DirectLinesVolumeResponse {
  periodId: string;
  periodName: string;
  isClosed: boolean;
  /** Tope de roll-over por línea (mlm_ranks.roll_over_limit). 0 = sin tope. */
  rollOverLimit: number;
  hasCap: boolean;
  viewerRankName?: string | null;
  totalGroupVolume: number;
  totalCounted: number;
  totalRolledOver: number;
  lineCount: number;
  /** Ordenadas por volumen ascendente (más débil primero). */
  lines: DirectLineVolume[];
}

// ---------------------------------------------------------------------------
// "Mi red" para redes grandes (contrato /distribuidor/red §4.2): wire EXACTO de
// GET /distributor/network/overview | children | members y del export v2.
// Espejo de toniclife-api src/modules/mlm/dto/network-explorer.dto.ts y
// src/modules/distributor/network-export.service.ts (ExportJobStatusDto).
// ---------------------------------------------------------------------------

/** Actividad del periodo: puntos personales ≥ 3,300 · > 0 · 0/sin fila. */
export type NetworkActivity = 'qualified' | 'active' | 'none';

export interface NetworkOverviewPeriod {
  id: string;
  name: string;
  /** YYYY-MM-DD (26 del mes anterior) */
  startDate: string;
  /** YYYY-MM-DD (25 del mes que lo nombra) */
  endDate: string;
  isClosed: boolean;
  isCurrent: boolean;
  /** end_date - CURRENT_DATE calculado en el servidor (solo el actual); null si no. */
  daysLeft: number | null;
}

export interface NetworkOverviewTotals {
  total: number;
  direct: number;
  active: number;
  qualified: number;
  toQualify: number;
  atRisk: number;
  newThisPeriod: number;
  maxLevel: number;
}

export interface NetworkOverviewLevel {
  level: number;
  count: number;
  active: number;
  qualified: number;
}

/** GET /distributor/network/overview?periodId= */
export interface NetworkOverview {
  period: NetworkOverviewPeriod;
  /** El periodo más reciente con end_date < start_date del elegido, o null. */
  previousPeriod: { id: string; name: string } | null;
  totals: NetworkOverviewTotals;
  /** 1..maxLevel, sin huecos. */
  byLevel: NetworkOverviewLevel[];
  /** network_stats.last_refreshed (ISO) o null. */
  statsAsOf: string | null;
}

/** Fila del explorador por líneas (hijo directo de un nodo). */
export interface NetworkChild {
  memberId: string;
  parentMemberId: string;
  customerId: string;
  customerNumber: string | null;
  fullName: string;
  countryCode: string | null;
  /** customers.status (active | inactive | suspended…); no indica si compró. */
  status: string;
  /** Rango DEL PERIODO (customer_period_stats.rank_id). */
  rankName: string | null;
  rankNumber: number | null;
  personalPoints: number;
  groupPoints: number;
  isQualified: boolean;
  activity: NetworkActivity;
  atRisk: boolean;
  toQualify: boolean;
  /** enrollment_date dentro del periodo elegido (26→25). */
  isNew: boolean;
  /** YYYY-MM-DD o null. */
  joinDate: string | null;
  /** network_members.children_count (vivo). */
  childrenCount: number;
  /** network_stats.network_count (matview diaria) o null. */
  subtreeCount: number | null;
  /** Nivel relativo a mí. */
  level: number;
}

export interface NetworkBreadcrumbItem {
  memberId: string;
  fullName: string;
  level: number;
}

/** GET /distributor/network/children */
export interface NetworkChildren {
  parent: { memberId: string; customerId: string; fullName: string; level: number };
  /** De mi nodo (excluido) hasta parent (incluido). */
  breadcrumb: NetworkBreadcrumbItem[];
  data: NetworkChild[];
  total: number;
  page: number;
  limit: number;
  /** Solo con parents=: hijos por memberId del padre (≤ 50 cada uno). */
  byParent?: Record<string, NetworkChild[]>;
  statsAsOf: string | null;
}

export interface NetworkChildrenQuery {
  /** 'me' (por defecto) o memberId de un socio de mi red. */
  parent?: string;
  /** Varios padres a la vez (≤ 50 memberIds); excluyente con parent. */
  parents?: string[];
  periodId?: string;
  page?: number;
  /** ≤ 100 (50 por defecto). */
  limit?: number;
}

export type NetworkMemberStatus = 'active' | 'inactive' | 'suspended';
export type NetworkActivityFilter = 'active' | 'none' | 'qualified' | 'toQualify' | 'atRisk';
export type NetworkMembersSort = 'level' | 'points' | 'joinDate' | 'name';

/** Query de GET /distributor/network/members (DTO QueryNetworkMembersDto). */
export interface NetworkMembersQuery {
  /** ≤ 80 caracteres; el servidor ignora menos de 2. */
  search?: string;
  /** Nivel relativo exacto 1..15. */
  level?: number;
  /** true = más de 15 niveles por debajo de mí. */
  levelDeeper?: boolean;
  status?: NetworkMemberStatus;
  activity?: NetworkActivityFilter;
  /** Rango del periodo 1..10 (1 = sin rango superior). */
  rankNumber?: number;
  /** Nuevos en ese periodo (commission_periods.id). */
  joinedPeriodId?: string;
  /** memberId de un socio de mi red: acota a su línea (el nivel sigue relativo a mí). */
  under?: string;
  sortBy?: NetworkMembersSort;
  /** Aplica a sortBy=level. */
  sortOrder?: 'asc' | 'desc';
  page?: number;
  /** ≤ 100 (20 por defecto). */
  limit?: number;
  periodId?: string;
}

export interface NetworkMemberRow {
  /** customers.id */
  id: string;
  memberId: string;
  parentMemberId: string | null;
  customerNumber: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  /** Relativo a mí (aunque la lista esté acotada con `under`). */
  level: number;
  countryCode: string | null;
  status: string;
  /** customers.created_at (ISO) */
  createdAt: string;
  rankName: string | null;
  rankNumber: number | null;
  sponsorName: string | null;
  sponsorCode: string | null;
  personalPoints: number;
  isQualified: boolean;
  activity: NetworkActivity;
  atRisk: boolean;
  toQualify: boolean;
}

/** GET /distributor/network/members */
export interface NetworkMembers {
  data: NetworkMemberRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** El socio de `under` (null = toda mi red). */
  under: { memberId: string; fullName: string; level: number } | null;
  period: { id: string; name: string };
}

/** SIN cambio (compat con el admin): queued|counting|…|finalizing = running. */
export type NetworkExportStatus = 'running' | 'done' | 'error';
export type NetworkExportPhase =
  | 'queued'
  | 'counting'
  | 'traversing'
  | 'writing'
  | 'finalizing'
  | 'done'
  | 'error'
  | 'cancelled';

/**
 * Estado de un job de exportación de la red (ExportJobStatusDto del API).
 * Lo devuelven GET network/export-job/:jobId, GET network/export-jobs y
 * DELETE network/export-job/:jobId (status 'error' + phase 'cancelled').
 */
export interface NetworkExportJob {
  jobId: string;
  status: NetworkExportStatus;
  /** 0 en queued|counting|traversing; ≤ 99 en writing; 100 solo en done. */
  percent: number;
  processed: number;
  total: number;
  filename: string;
  error?: string;
  /** Código NET_* cuando el error tiene uno (hoy solo NET_EXPORT_TOO_LARGE). */
  errorCode?: string;
  /** Ausente en un API anterior al export v2 (se deriva de status/percent). */
  phase?: NetworkExportPhase;
  /** Solo queued (1 = siguiente). */
  queuePosition?: number;
  /** total > 20,000 (conocido desde counting). */
  heavy?: boolean;
  /** traversing: estimación en ms. */
  etaMs?: number;
  elapsedMs?: number;
  sizeBytes?: number;
  periodId?: string;
  periodName?: string;
  /** ISO */
  startedAt?: string;
  finishedAt?: string;
  expiresAt?: string;
  /** 2000 queued · 1000 running · 0 terminal. */
  pollAfterMs?: number;
}

/** Respuesta de POST /distributor/network/export. */
export interface NetworkExportStart {
  jobId: string;
  /** Se devolvió un archivo ya generado (< 10 min) del mismo periodo. */
  reused?: true;
  phase: NetworkExportPhase;
  queuePosition?: number;
}
