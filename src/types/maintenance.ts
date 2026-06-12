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
  special?: 'users' | 'reset';
  /** false = re-ejecutable, no participa en la validación secuencial */
  gating: boolean;
  tables: MaintenanceTableStat[];
  totalRows: number;
  isEmpty: boolean;
  canRun: boolean;
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
