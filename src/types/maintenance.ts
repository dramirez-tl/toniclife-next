// maintenance.ts - Tipos del módulo de mantenimiento del sistema
// (limpieza por bloques + carga masiva). Solo super_admin.

export interface MaintenanceTableStat {
  name: string;
  rows: number;
  isEmpty: boolean;
}

export interface CleanupBlockStatus {
  id: number;
  key: string;
  label: string;
  description: string;
  special?: 'users' | 'customers' | 'branches' | 'states' | 'reset';
  /** false = re-ejecutable, no participa en la validación secuencial */
  gating: boolean;
  tables: MaintenanceTableStat[];
  totalRows: number;
  isEmpty: boolean;
  canRun: boolean;
  /**
   * Solo bloque "Clientes": tablas que aún referencian customers (FK) y por eso
   * mantienen el botón inactivo. Vacío/undefined = se puede correr.
   */
  blockedBy?: string[];
}

export interface LoadProgress {
  /** Etapa actual del importador (ej. "Insertando clientes"). */
  stage: string;
  processed: number;
  total: number;
  percent: number;
}

export interface LoadPhaseStatus {
  phase: string;
  key: string;
  label: string;
  description: string;
  status: 'ready' | 'planned';
  tables: MaintenanceTableStat[];
  totalRows: number;
}

export interface MaintenanceOverview {
  superuser: { email: string; exists: boolean };
  cleanup: CleanupBlockStatus[];
  load: LoadPhaseStatus[];
}

export interface CleanupResult {
  blockId: number;
  key: string;
  label: string;
  clearedTables: string[];
  deletedUsers?: number;
  deletedWorkers?: number;
  deletedCustomers?: number;
  deletedBranches?: number;
  durationMs: number;
}

export interface ImportResult {
  phase: string;
  key: string;
  totalRows: number;
  inserted: number;
  skipped: number;
  extra?: Record<string, number>;
}

/** Conteo de ventas de un periodo (previsualización del reset). */
export interface PeriodSalesPreview {
  periodId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  orders: number;
  ordersTotal: number;
  posSales: number;
  posSalesTotal: number;
  totalSales: number;
  totalAmount: number;
}

/** Resultado del reset de ventas de un periodo. */
export interface PeriodSalesResetResult {
  periodId: string;
  periodName: string;
  startDate: string;
  endDate: string;
  deletedOrders: number;
  deletedPosSales: number;
  durationMs: number;
}
