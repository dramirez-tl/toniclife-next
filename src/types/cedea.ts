// cedea.ts - "Mi CEDEA" (API GET /reports/cedea/earnings, mig 180, 31-oct-2026).
// Ventas, IVA, ventas netas, ganancia estimada y promociones entregadas de las
// CEDEAS por periodo de comisiones, por sucursal y por día local.

export interface CedeaPeriod {
  periodNumber: number;
  name: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  isClosed: boolean;
}

export interface CedeaPromoProduct {
  code: string;
  name: string;
  pieces: number;
}

export interface CedeaDailyRow {
  /** Día local de la sucursal (YYYY-MM-DD) */
  date: string;
  salesCount: number;
  gross: number;
  tax: number;
  net: number;
  promoPieces: number;
}

export interface CedeaBranchEarnings {
  branchId: string;
  code: string;
  name: string;
  currencyCode: string;
  isCedea: boolean;
  salesCount: number;
  /** Ventas POS con IVA */
  gross: number;
  tax: number;
  /** gross − tax: base de la ganancia */
  net: number;
  onlineOrdersCount: number;
  onlineOrdersTotal: number;
  /** 0.05 = 5 % */
  commissionRate: number;
  rateSource: 'contract' | 'default';
  estimatedEarnings: number;
  promoPieces: number;
  promoByProduct: CedeaPromoProduct[];
  legacyZeroLines: number;
  daily: CedeaDailyRow[];
}

export interface CedeaCurrencyTotal {
  currencyCode: string;
  branches: number;
  salesCount: number;
  gross: number;
  tax: number;
  net: number;
  estimatedEarnings: number;
  promoPieces: number;
}

export interface CedeaEarningsResponse {
  period: CedeaPeriod;
  periods: CedeaPeriod[];
  scoped: boolean;
  branches: CedeaBranchEarnings[];
  totals: CedeaCurrencyTotal[];
  rule: string;
  generatedAt: string;
}

export interface CedeaEarningsQuery {
  periodNumber?: number;
  branchId?: string;
}
