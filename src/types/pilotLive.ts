// Types del monitor EN VIVO de la prueba piloto (GET /pos/pilot-live).
// Ref: toniclife-api/src/modules/pos/sales.service.ts (getPilotLive).

export interface PilotBranchLive {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  currencyCode: string | null;
  /** Ventas COMPLETADAS de hoy (día CDMX, solo nativas POS v2). */
  salesCount: number;
  salesTotal: number;
  pendingCount: number;
  cancelledCount: number;
  lastSaleAt: string | null;
  /** Terminales POS con licencia activa en la sucursal. */
  terminalsActive?: number;
  /** Versiones instaladas (distintas), ej. "2.0.4" o "2.0.3, 2.0.4". */
  terminalVersions?: string | null;
  /** Último latido de cualquier terminal de la sucursal. */
  terminalsLastSeen?: string | null;
}

export interface PilotRecentSale {
  id: string;
  saleNumber: string;
  branchCode: string;
  branchName: string;
  total: number;
  /** Moneda de la sucursal de la venta (MXN, USD, ...). */
  currencyCode?: string | null;
  status: 'completed' | 'pending' | 'cancelled' | string;
  createdAt: string;
  customerName: string | null;
  itemsCount: number;
}

export interface PilotLiveResponse {
  /** Día efectivo consultado (YYYY-MM-DD, corte CDMX). */
  date: string;
  serverTime: string;
  /** Tasas X→MXN del periodo que contiene el día (mig 091). MXN = 1. */
  exchangeRates?: Record<string, number>;
  branches: PilotBranchLive[];
  recentSales: PilotRecentSale[];
}
