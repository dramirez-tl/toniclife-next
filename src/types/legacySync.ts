// legacySync.ts - Tipos del panel "Sincronización legacy" (/admin/sistema?tab=sync).
// Espejo de toniclife-api/src/modules/maintenance/legacy-sync/legacy-sync.dto.ts
// (GET status / runs / runs/:id / holds, PATCH holds/:id, PUT settings). Las
// fechas vienen en ISO UTC y, cuando aplica, con su equivalente CDMX
// ('YYYY-MM-DD HH:mm:ss'; CDMX = UTC-6 fijo). Sin PII: solo números de cliente.

export type LegacySyncRunStatus =
  | 'running'
  | 'ok'
  | 'warn'
  | 'noop'
  | 'skipped'
  | 'error'
  | 'invalid'
  | 'timeout';

export type LegacySyncRunMode = 'auto' | 'manual' | 'dry-run';

export type LegacySyncSemaphore = 'verde' | 'ambar' | 'rojo' | 'sin_datos';

export type LegacySyncHoldStatus =
  | 'pending'
  | 'renumbered'
  | 'merged'
  | 'released'
  | 'dismissed';

/** Decisiones humanas posibles sobre una retención pendiente. */
export type LegacySyncHoldDecision = Exclude<LegacySyncHoldStatus, 'pending'>;

export interface LegacySyncRun {
  id: string;
  runKey: string;
  mode: LegacySyncRunMode;
  runner: string;
  status: LegacySyncRunStatus;
  exitCode: number | null;
  reason: string | null;
  attempts: number;
  periodNumbers: number[];
  startedAt: string;
  startedAtCdmx: string;
  readyAt: string | null;
  readyAtCdmx: string | null;
  finishedAt: string | null;
  finishedAtCdmx: string | null;
  durationMs: number | null;
  waitedMs: number | null;
  legacyGeneration: string | null;
  /** Marca de agua de la copia legacy, hora CDMX 'YYYY-MM-DD HH:mm:ss'. */
  legacyWatermarkCdmx: string | null;
  legacyCopyDay: string | null;
  holdsPending: number;
  duplicatesNew: number;
  warnings: string[];
  error: string | null;
  /** Por paso: migrated / skipped{motivo} / failed / ms (forma del runner). */
  steps: Record<string, unknown> | null;
  /** Matriz A..K, D2, T: veredicto plano ('verde') o detalle ({ verdict, ...cifras }). */
  parity: Record<string, unknown> | null;
}

export interface LegacySyncRunDetail extends LegacySyncRun {
  /** Conteos por tabla de la copia legacy (solo en el detalle). */
  legacySnapshot: Record<string, unknown> | null;
}

export interface LegacySyncHold {
  id: string;
  legacyCustomerNumber: string;
  nativeCustomerId: string | null;
  nativeCustomerNumber: string | null;
  /** null si el nativo ya no existe. */
  nativeStatus: string | null;
  nativeHasKit: boolean | null;
  signals: string[];
  strength: 'fuerte' | 'debil';
  status: LegacySyncHoldStatus;
  firstSeenRunId: string | null;
  firstSeenAt: string;
  firstSeenAtCdmx: string;
  lastSeenAt: string;
  lastSeenAtCdmx: string;
  /** Horas desde first_seen_at. */
  ageHours: number;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
}

export interface LegacySyncWhatsappCriterion {
  criterio: string;
  ok: boolean;
  detalle: string;
}

export interface LegacySyncWhatsappReady {
  ready: boolean;
  /** 'n/7' */
  score: string;
  criterios: LegacySyncWhatsappCriterion[];
}

export interface LegacySyncStatus {
  /** false = mig 150 sin aplicar (todo lo demás sale vacío / sin_datos). */
  migrationApplied: boolean;
  nowUtc: string;
  nowCdmx: string;
  autoEnabled: boolean;
  semaforo: LegacySyncSemaphore;
  semaforoMotivo: string;
  lastRun: LegacySyncRun | null;
  lastOkRun: LegacySyncRun | null;
  lastDryRun: LegacySyncRun | null;
  okStreak: number;
  /** 'YYYY-MM-DD HH:05' CDMX (siguiente hora impar). */
  nextExpectedCdmx: string;
  nextExpectedUtc: string;
  /** true mientras el legacy recrea su copia (hora par :00-:35 CDMX). */
  legacyWindowNow: boolean;
  holdsPending: number;
  holdsPendingWithKit: number;
  whatsappReady: LegacySyncWhatsappReady;
  watchdog: { enabled: boolean; env: string };
}

export interface LegacySyncRuns {
  migrationApplied: boolean;
  limit: number;
  runs: LegacySyncRun[];
}

export interface LegacySyncHolds {
  migrationApplied: boolean;
  status: LegacySyncHoldStatus | 'all';
  counts: Record<LegacySyncHoldStatus, number>;
  holds: LegacySyncHold[];
  /** SQL de renumeración de las pendientes (null si no hay pares renumerables). */
  renumberSql: string | null;
}

export interface LegacySyncSettings {
  autoEnabled: boolean;
  updatedAt: string | null;
}

export interface DecideLegacySyncHoldInput {
  status: LegacySyncHoldDecision;
  note?: string;
}

/** Cuerpo uniforme de error del módulo ({ statusCode, code, message, details? }). */
export type LegacySyncErrorCode =
  | 'SYNC_MIGRATION_PENDING'
  | 'SYNC_RUN_NOT_FOUND'
  | 'SYNC_HOLD_NOT_FOUND'
  | 'SYNC_HOLD_NOT_PENDING'
  | 'SYNC_INVALID_STATUS';
