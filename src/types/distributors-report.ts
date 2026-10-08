// types/distributors-report.ts - Reporte de distribuidores de Comercial
// (/admin/comercial/distribuidores). Wire EXACTO de GET /reports/distributors,
// /reports/distributors/overview y /reports/distributors/export. Espejo de
// toniclife-api src/modules/mlm/dto/distributors-report.dto.ts.

import type { NetworkActivity, NetworkOverviewPeriod } from '@/types/network';

export type ReportActivityFilter = 'active' | 'none' | 'qualified' | 'toQualify' | 'atRisk';
export type ReportStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type ReportSort = 'points' | 'sales' | 'groupPoints' | 'rank' | 'joinDate' | 'name' | 'number';

/** Alcance común al resumen y a la lista: periodo, país, sucursal de alta y estado de la cuenta. */
export interface DistributorsScopeQuery {
  periodId?: string;
  countryCode?: string;
  branchId?: string;
  status?: ReportStatus;
}

export interface DistributorsReportQuery extends DistributorsScopeQuery {
  search?: string;
  activity?: ReportActivityFilter;
  rankNumber?: number;
  joinedPeriodId?: string;
  sortBy?: ReportSort;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DistributorsOverviewTotals {
  /** Distribuidores en el alcance (todos los estados). */
  total: number;
  /** Con cuenta activa. */
  accountActive: number;
  /** Inscritos (fecha de alta) dentro del periodo. */
  newThisPeriod: number;
  /** Puntos personales > 0. */
  active: number;
  /** ≥ 3,300 puntos personales. */
  qualified: number;
  toQualify: number;
  atRisk: number;
  pointsPersonal: number;
  salesMxn: number;
  salesUsd: number;
}

export interface DistributorsOverviewRank {
  rankNumber: number;
  rankName: string;
  count: number;
}

export interface DistributorsOverviewCountry {
  countryCode: string | null;
  total: number;
  active: number;
  qualified: number;
  salesMxn: number;
  salesUsd: number;
}

export interface DistributorsOverview {
  period: NetworkOverviewPeriod;
  previousPeriod: { id: string; name: string } | null;
  totals: DistributorsOverviewTotals;
  byRank: DistributorsOverviewRank[];
  byCountry: DistributorsOverviewCountry[];
}

export interface DistributorRow {
  id: string;
  customerNumber: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  countryCode: string | null;
  branchName: string | null;
  branchCode: string | null;
  /** YYYY-MM-DD o null. */
  registrationDate: string | null;
  sponsorCode: string | null;
  sponsorName: string | null;
  rankName: string | null;
  rankNumber: number | null;
  personalPoints: number;
  groupPoints: number;
  salesMxn: number;
  salesUsd: number;
  isQualified: boolean;
  activity: NetworkActivity;
  atRisk: boolean;
  toQualify: boolean;
  isNew: boolean;
}

export interface DistributorsReport {
  data: DistributorRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  period: { id: string; name: string };
}
