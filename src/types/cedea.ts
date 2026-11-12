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

/**
 * Piezas que salieron gratis por una promoción de temporada (la 3.ª de un 3x2, la
 * 6.ª de un "compra 5 y llévate 1", un regalo por compra), por producto.
 */
export interface CedeaSeasonalFreeProduct {
  code: string;
  name: string;
  promotionCode: string;
  promotionName: string;
  /** Piezas gratis en ventas de caja completadas */
  pieces: number;
  /** Piezas gratis en pedidos en línea pagados asignados a la sucursal */
  onlinePieces: number;
  /** Valor de lo regalado en caja, a precio de venta */
  value: number;
}

export interface CedeaDailyRow {
  /** Día local de la sucursal (YYYY-MM-DD) */
  date: string;
  salesCount: number;
  gross: number;
  tax: number;
  net: number;
  promoPieces: number;
  /** Piezas gratis por promociones de temporada en ventas de caja */
  seasonalFreePieces?: number;
}

/** Contrato CEDEA vigente de la sucursal (Tesorería › CEDEAS). */
export interface CedeaContract {
  id: string;
  customerId: string;
  /** Número de distribuidor del dueño: el "ID" que lleva el CEDEA */
  customerNumber: string | null;
  customerName: string;
  /** 0.05 = 5 %; null = sin capturar (se usa 5 %) */
  commissionRate: number | null;
  /** commission_tax_regimes.code (FIC, RESICO, MORAL, FRONTERIZA, ASIMILADOS, SIN_IMPUESTO) */
  taxRegimeCode: string | null;
  taxRegimeName: string | null;
  contractNumber: string | null;
  notes: string | null;
}

/** Factura estimada del bono con el régimen del contrato (mismas tasas que las comisiones). */
export interface CedeaInvoice {
  /** MIXTO en totales con regímenes distintos */
  regimeCode: string;
  regimeName: string;
  /** Bono = ventas netas × porcentaje: subtotal de la factura */
  subtotal: number;
  iva: number;
  ivaWithholding: number;
  isr: number;
  resico: number;
  /** subtotal + iva − retenciones */
  total: number;
  formula: string;
}

export interface UpsertCedeaContractInput {
  customerNumber: string;
  /** Fracción: 0.05 = 5 % */
  commissionRate: number;
  taxRegimeCode?: string;
  contractNumber?: string;
  notes?: string;
}

export interface CedeaBranchEarnings {
  branchId: string;
  code: string;
  name: string;
  currencyCode: string;
  isCedea: boolean;
  /** false = sucursal inactiva (se lista porque tuvo ventas en el periodo) */
  isActive: boolean;
  salesCount: number;
  /** Ventas POS con IVA */
  gross: number;
  tax: number;
  /** gross − tax: base de la ganancia */
  net: number;
  onlineOrdersCount: number;
  onlineOrdersTotal: number;
  onlineOrdersTax: number;
  /** Pedidos en línea sin IVA (no entran en la base; se muestran aparte) */
  onlineOrdersNet: number;
  /** 0.05 = 5 % */
  commissionRate: number;
  rateSource: 'contract' | 'default';
  estimatedEarnings: number;
  /** Contrato vigente; null si Tesorería no lo ha capturado */
  contract: CedeaContract | null;
  /** Factura estimada; null sin contrato o sin régimen */
  invoice: CedeaInvoice | null;
  promoPieces: number;
  promoByProduct: CedeaPromoProduct[];
  legacyZeroLines: number;
  /** Piezas gratis por promociones de temporada en ventas de caja */
  seasonalFreePieces?: number;
  /** Piezas gratis por promociones de temporada en pedidos en línea de la sucursal */
  seasonalFreeOnlinePieces?: number;
  /** Lo que regaló cada promoción de temporada, por producto */
  seasonalFreeByProduct?: CedeaSeasonalFreeProduct[];
  daily: CedeaDailyRow[];
}

export interface CedeaCurrencyTotal {
  currencyCode: string;
  branches: number;
  salesCount: number;
  gross: number;
  tax: number;
  net: number;
  /** Pedidos en línea sin IVA de estas sucursales (aparte de net) */
  onlineOrdersNet: number;
  estimatedEarnings: number;
  /** Suma de las facturas estimadas de las sucursales con régimen; null si ninguna */
  invoice: CedeaInvoice | null;
  branchesWithoutRegime: number;
  promoPieces: number;
  /** Piezas gratis por promociones de temporada (caja + pedidos en línea) */
  seasonalFreePieces?: number;
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
  /** commission_periods.id (selector de Tesorería) */
  periodId?: string;
  branchId?: string;
}
