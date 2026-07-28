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
}

export interface PilotRecentSale {
  id: string;
  saleNumber: string;
  branchCode: string;
  branchName: string;
  total: number;
  status: 'completed' | 'pending' | 'cancelled' | string;
  createdAt: string;
  customerName: string | null;
  itemsCount: number;
}

export interface PilotLiveResponse {
  serverTime: string;
  branches: PilotBranchLive[];
  recentSales: PilotRecentSale[];
}
