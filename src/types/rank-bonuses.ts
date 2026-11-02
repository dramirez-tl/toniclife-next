// rank-bonuses.ts - Tesorería › Bonos de rango (API GET /reports/rank-bonuses,
// 2-nov-2026): Bono Auto mensual por rango (Platino en adelante) del periodo de
// comisiones, con IVA y retenciones según el régimen de cada distribuidor.

import type { CedeaInvoice, CedeaPeriod } from './cedea';

export interface RankBonusRow {
  customerId: string;
  customerNumber: string | null;
  customerName: string;
  countryCode: string | null;
  /** MXN (México/Frontera) o USD (Estados Unidos y otros países) */
  currencyCode: string;
  currencyNote: string | null;
  rankCode: string;
  rankName: string;
  rankNumber: number;
  /** Régimen fiscal de comisiones del distribuidor */
  taxRegimeCode: string | null;
  pointsPersonal: number;
  pointsGroup: number;
  isQualified: boolean;
  /** Importe del bono del catálogo de rangos (subtotal) */
  subtotal: number;
  /** IVA y retenciones; null sin régimen */
  invoice: CedeaInvoice | null;
  warning: string | null;
}

export interface RankBonusRankTotal {
  rankCode: string;
  rankName: string;
  rows: number;
  subtotal: number;
}

export interface RankBonusCurrencyTotal {
  currencyCode: string;
  rows: number;
  subtotal: number;
  iva: number;
  ivaWithholding: number;
  isr: number;
  resico: number;
  /** Suma de total a pagar de las filas con régimen */
  total: number;
  withoutRegime: number;
  byRank: RankBonusRankTotal[];
}

export interface RankBonusesResponse {
  period: CedeaPeriod;
  periods: CedeaPeriod[];
  rows: RankBonusRow[];
  totals: RankBonusCurrencyTotal[];
  rule: string;
  generatedAt: string;
}

export interface RankBonusesQuery {
  periodNumber?: number;
  /** commission_periods.id (selector de Tesorería) */
  periodId?: string;
}
