// export-job.ts — Lógica PURA del indicador de "Descarga de tu red" (contrato
// /distribuidor/red §3.2, §5.6 y §6.3): describir un job por fase (clave i18n
// + valores + barra), decidir cómo reconectar al montar, historial de
// descargas recientes (máx. 5) y bandera de "descarga automática una sola vez
// por job" (varias pestañas sondean, solo una descarga). Sin React ni fetch;
// el storage se inyecta (localStorage en el navegador, un Map en pruebas).
//
// Claves de localStorage:
// - tl_red_export_job          → JSON { jobId, startedAt, periodId?, periodName? }
//                                (antes era el jobId a secas: se sigue leyendo).
// - tl_red_export_history      → JSON ExportHistoryItem[] (máx. 5, más reciente primero).
// - tl_red_export_done_<jobId> → '1' cuando ya se descargó ese job.
// - tl_red_export_seen_<jobId> → '1' cuando ya se AVISÓ (toast) que terminó
//                                (listo, con error o cancelado): una vez por job
//                                aunque varias pestañas sondeen o se recargue.

import type { NetworkExportJob, NetworkExportPhase } from '@/types/network';

/** Igual que JOB_TTL_MS del API: el archivo vive 10 min después de terminar. */
export const EXPORT_JOB_TTL_MS = 10 * 60 * 1000;
export const EXPORT_HISTORY_MAX = 5;
/** Sondeo por defecto cuando aún no se conoce el job. */
export const EXPORT_POLL_DEFAULT_MS = 2000;
/** Pasados 60 s sondeando, se baja el ritmo a 3 s. */
export const EXPORT_POLL_SLOW_AFTER_MS = 60_000;
export const EXPORT_POLL_SLOW_MS = 3000;
/** Fallos de red consecutivos antes de declarar "inalcanzable" (política del admin). */
export const EXPORT_MAX_POLL_FAILURES = 8;

export const EXPORT_STORAGE_JOB_KEY = 'tl_red_export_job';
export const EXPORT_STORAGE_HISTORY_KEY = 'tl_red_export_history';
export const exportDoneKey = (jobId: string): string => `tl_red_export_done_${jobId}`;
export const exportSeenKey = (jobId: string): string => `tl_red_export_seen_${jobId}`;

export const TERMINAL_PHASES: ReadonlySet<NetworkExportPhase> = new Set<NetworkExportPhase>([
  'done',
  'error',
  'cancelled',
]);

const PHASES: ReadonlySet<NetworkExportPhase> = new Set<NetworkExportPhase>([
  'queued',
  'counting',
  'traversing',
  'writing',
  'finalizing',
  'done',
  'error',
  'cancelled',
]);

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StoredExportJob {
  jobId: string;
  /** ISO del arranque (null si se guardó con el formato viejo: solo el jobId). */
  startedAt: string | null;
  periodId?: string | null;
  periodName?: string | null;
}

export interface ExportHistoryItem {
  jobId: string;
  filename: string;
  rows: number;
  bytes?: number | null;
  periodId?: string | null;
  periodName?: string | null;
  /** ISO */
  finishedAt: string;
}

export interface JobDescription {
  phase: NetworkExportPhase;
  /** Clave i18n relativa a `distributor.network` (exportPanel.phase.* o exportPanel.tooLarge). */
  labelKey: string;
  /** Valores para `t(labelKey, values)`; los números van crudos (la UI los formatea por idioma). */
  values: Record<string, string | number>;
  /** 0..99 en writing, 100 en done, null cuando no hay avance medible. */
  percent: number | null;
  /** Barra indeterminada (queued, counting, traversing, finalizing). */
  indeterminate: boolean;
  /** Cancelar mientras está en espera o en curso. */
  canCancel: boolean;
  terminal: boolean;
  elapsedMs: number | null;
  expiresAt: string | null;
}

export type ReconnectDecision =
  | { kind: 'reconnect'; jobId: string; job: NetworkExportJob | null }
  | { kind: 'offerDownload'; jobId: string; job: NetworkExportJob }
  | { kind: 'interrupted'; jobId: string }
  | { kind: 'expired'; jobId: string }
  | { kind: 'none' };

/** Fase efectiva: la del API o, con un API viejo (sin `phase`), derivada de status/percent. */
export function phaseOf(job: Pick<NetworkExportJob, 'status' | 'percent' | 'phase'> | null | undefined): NetworkExportPhase {
  if (!job) return 'queued';
  if (job.phase && PHASES.has(job.phase)) return job.phase;
  if (job.status === 'done') return 'done';
  if (job.status === 'error') return 'error';
  return job.percent > 0 ? 'writing' : 'counting';
}

export function isTerminalPhase(phase: NetworkExportPhase): boolean {
  return TERMINAL_PHASES.has(phase);
}

export function isJobActive(job: Pick<NetworkExportJob, 'status' | 'percent' | 'phase'> | null | undefined): boolean {
  return Boolean(job) && !isTerminalPhase(phaseOf(job));
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const parseIso = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
};

export function describeJob(job: NetworkExportJob, now: number = Date.now()): JobDescription {
  const phase = phaseOf(job);
  const terminal = isTerminalPhase(phase);
  const started = parseIso(job.startedAt);
  const finished = parseIso(job.finishedAt);
  const elapsedMs =
    typeof job.elapsedMs === 'number'
      ? Math.max(0, job.elapsedMs)
      : started !== null
        ? Math.max(0, (finished ?? now) - started)
        : null;
  const base = {
    phase,
    terminal,
    canCancel: !terminal,
    elapsedMs,
    expiresAt: job.expiresAt ?? null,
  };
  const total = Math.max(0, job.total ?? 0);

  switch (phase) {
    case 'queued':
      return {
        ...base,
        labelKey: 'exportPanel.phase.queued',
        values: { position: Math.max(1, job.queuePosition ?? 1) },
        percent: null,
        indeterminate: true,
      };
    case 'counting':
      return { ...base, labelKey: 'exportPanel.phase.counting', values: {}, percent: null, indeterminate: true };
    case 'traversing':
      return {
        ...base,
        labelKey: 'exportPanel.phase.traversing',
        values: { total, eta: Math.max(1, Math.ceil((job.etaMs ?? 0) / 1000)) },
        percent: null,
        indeterminate: true,
      };
    case 'writing': {
      const percent = clamp(Math.floor(job.percent ?? 0), 0, 99);
      return {
        ...base,
        labelKey: 'exportPanel.phase.writing',
        values: { processed: Math.max(0, job.processed ?? 0), total, percent },
        percent,
        indeterminate: false,
      };
    }
    case 'finalizing':
      return { ...base, labelKey: 'exportPanel.phase.finalizing', values: {}, percent: 99, indeterminate: true };
    case 'done':
      return {
        ...base,
        labelKey: 'exportPanel.phase.done',
        values: { filename: job.filename ?? '', total },
        percent: 100,
        indeterminate: false,
      };
    case 'cancelled':
      return { ...base, labelKey: 'exportPanel.phase.cancelled', values: {}, percent: null, indeterminate: false };
    case 'error':
    default:
      return {
        ...base,
        phase: 'error',
        labelKey: job.errorCode === 'NET_EXPORT_TOO_LARGE' ? 'exportPanel.tooLarge' : 'exportPanel.phase.error',
        values: { error: job.error ?? '' },
        percent: null,
        indeterminate: false,
      };
  }
}

export type ExportPanelView = 'unreachable' | 'job' | 'loading';

/**
 * Qué pinta la tarjeta bajo el job guardado. El aviso "sin conexión" + Reintentar
 * manda AUNQUE haya un último estado en caché (React Query conserva `data` al
 * fallar, así que `job` casi siempre existe tras 8 fallos): la última fase se
 * muestra debajo, en gris. Sin aviso: el job, o el spinner mientras llega.
 */
export function exportPanelView(job: NetworkExportJob | null | undefined, unreachable: boolean): ExportPanelView {
  if (unreachable) return 'unreachable';
  return job ? 'job' : 'loading';
}

/**
 * Intervalo de sondeo (ms) o false para detenerse: `pollAfterMs` del servidor
 * (2000 en espera, 1000 en curso), 3000 tras 60 s sondeando, nada al terminar.
 */
export function pollIntervalFor(job: NetworkExportJob | null | undefined, pollingForMs: number): number | false {
  if (job && isTerminalPhase(phaseOf(job))) return false;
  if (pollingForMs >= EXPORT_POLL_SLOW_AFTER_MS) return EXPORT_POLL_SLOW_MS;
  if (!job) return EXPORT_POLL_DEFAULT_MS;
  if (typeof job.pollAfterMs === 'number' && job.pollAfterMs > 0) return job.pollAfterMs;
  return phaseOf(job) === 'queued' ? EXPORT_POLL_DEFAULT_MS : 1000;
}

// ---------------------------------------------------------------------------
// Sondeo compartido (§6.3, V12: "un solo sondeo")
// ---------------------------------------------------------------------------

/** Estado del sondeo de un job: fallos seguidos, reloj y bandera "inalcanzable". */
export interface ExportPollState {
  jobId: string;
  /** Fallos de red consecutivos (un 404 no cuenta; una respuesta OK los pone en cero). */
  failures: number;
  /** ms (Date.now) desde que se sonda este job: gobierna el ritmo lento tras 60 s. */
  since: number;
  /** 8 fallos seguidos: el sondeo se detiene hasta `resume()` (reintento manual). */
  unreachable: boolean;
}

/** Jobs que se recuerdan a la vez (los más viejos se olvidan). */
export const EXPORT_POLL_TRACKED_MAX = 10;

/**
 * Rastreador ÚNICO por pestaña: la tarjeta y el vigía observan la misma query,
 * pero cada observador de React Query dispara su propio `queryFn`; si cada uno
 * contara sus fallos, el umbral de 8 se repartiría entre los dos y uno podría
 * declararse inalcanzable mientras el otro sigue sondeando. Aquí el conteo, el
 * reloj y la bandera son por job y compartidos; `subscribe` avisa cuando cambia
 * la bandera (para useSyncExternalStore).
 */
export interface ExportPollTracker {
  /** Estado del job (lo crea con reloj = `now` si es nuevo). */
  get(jobId: string, now?: number): ExportPollState;
  /** Respuesta OK: fallos en cero. */
  success(jobId: string, now?: number): void;
  /** Fallo de red (no 404): true si con este fallo el job pasó a inalcanzable. */
  failure(jobId: string, now?: number): boolean;
  isUnreachable(jobId: string | null | undefined): boolean;
  /** Reintento manual: fallos y reloj en cero y deja de estar inalcanzable. */
  resume(jobId: string, now?: number): void;
  subscribe(listener: () => void): () => void;
}

export function createExportPollTracker(maxFailures: number = EXPORT_MAX_POLL_FAILURES): ExportPollTracker {
  const states = new Map<string, ExportPollState>();
  const listeners = new Set<() => void>();
  const emit = (): void => {
    for (const listener of listeners) listener();
  };
  const get = (jobId: string, now: number = Date.now()): ExportPollState => {
    let state = states.get(jobId);
    if (!state) {
      state = { jobId, failures: 0, since: now, unreachable: false };
      states.set(jobId, state);
      while (states.size > EXPORT_POLL_TRACKED_MAX) {
        const oldest = states.keys().next().value;
        if (oldest === undefined) break;
        states.delete(oldest);
      }
    }
    return state;
  };
  return {
    get,
    success(jobId, now) {
      get(jobId, now).failures = 0;
    },
    failure(jobId, now) {
      const state = get(jobId, now);
      state.failures += 1;
      if (state.unreachable || state.failures < maxFailures) return false;
      state.unreachable = true;
      emit();
      return true;
    },
    isUnreachable(jobId) {
      return Boolean(jobId) && (states.get(jobId as string)?.unreachable ?? false);
    },
    resume(jobId, now = Date.now()) {
      const state = get(jobId, now);
      const wasUnreachable = state.unreachable;
      state.failures = 0;
      state.since = now;
      state.unreachable = false;
      if (wasUnreachable) emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Qué hacer al montar con lo que hay guardado y lo que responde
 * GET network/export-jobs (`jobs` = null si la lista falló):
 * - el job guardado sigue vivo ⇒ reconnect (en curso / con error) u
 *   offerDownload (listo y aún no descargado; ya descargado ⇒ none);
 * - no está en la lista ⇒ expired si `startedAt` rebasó el TTL, si no interrupted;
 * - sin nada guardado ⇒ el primer job vivo de la lista (en curso o listo sin descargar).
 */
export function reconnectDecision(input: {
  jobs: NetworkExportJob[] | null;
  stored: StoredExportJob | null;
  now?: number;
  isDownloaded?: (jobId: string) => boolean;
}): ReconnectDecision {
  const { jobs, stored } = input;
  const now = input.now ?? Date.now();
  const isDownloaded = input.isDownloaded ?? (() => false);

  const decideFound = (job: NetworkExportJob): ReconnectDecision => {
    const phase = phaseOf(job);
    if (!isTerminalPhase(phase)) return { kind: 'reconnect', jobId: job.jobId, job };
    if (phase === 'done') {
      return isDownloaded(job.jobId) ? { kind: 'none' } : { kind: 'offerDownload', jobId: job.jobId, job };
    }
    return { kind: 'reconnect', jobId: job.jobId, job };
  };

  if (stored) {
    if (jobs === null) return { kind: 'reconnect', jobId: stored.jobId, job: null };
    const found = jobs.find((j) => j.jobId === stored.jobId);
    if (found) return decideFound(found);
    const started = parseIso(stored.startedAt);
    if (started !== null && now - started > EXPORT_JOB_TTL_MS) return { kind: 'expired', jobId: stored.jobId };
    return { kind: 'interrupted', jobId: stored.jobId };
  }

  if (!jobs || !jobs.length) return { kind: 'none' };
  const active = jobs.find((j) => isJobActive(j));
  if (active) return { kind: 'reconnect', jobId: active.jobId, job: active };
  const ready = jobs.find((j) => phaseOf(j) === 'done' && !isDownloaded(j.jobId));
  if (ready) return { kind: 'offerDownload', jobId: ready.jobId, job: ready };
  return { kind: 'none' };
}

// ---------------------------------------------------------------------------
// Historial (máx. 5)
// ---------------------------------------------------------------------------

/** Agrega al frente, sin duplicar jobId, y recorta a EXPORT_HISTORY_MAX. */
export function pushHistory(list: ExportHistoryItem[], item: ExportHistoryItem): ExportHistoryItem[] {
  return [item, ...list.filter((h) => h.jobId !== item.jobId)].slice(0, EXPORT_HISTORY_MAX);
}

/** Entrada de historial a partir de un job terminado (null si no está `done`). */
export function historyItemFromJob(job: NetworkExportJob, now: number = Date.now()): ExportHistoryItem | null {
  if (phaseOf(job) !== 'done') return null;
  return {
    jobId: job.jobId,
    filename: job.filename,
    rows: Math.max(0, job.total ?? 0),
    bytes: typeof job.sizeBytes === 'number' ? job.sizeBytes : null,
    periodId: job.periodId ?? null,
    periodName: job.periodName ?? null,
    finishedAt: job.finishedAt ?? new Date(now).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Storage (tolerante: sin localStorage o con basura no pasa nada)
// ---------------------------------------------------------------------------

function defaultStorage(): StorageLike | null {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
    return ls && typeof ls.getItem === 'function' ? ls : null;
  } catch {
    return null;
  }
}

const readJson = (storage: StorageLike | null, key: string): unknown => {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
};

const writeJson = (storage: StorageLike | null, key: string, value: unknown): void => {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // sin storage disponible (modo privado, cuota): no pasa nada
  }
};

const remove = (storage: StorageLike | null, key: string): void => {
  try {
    storage?.removeItem(key);
  } catch {
    // ídem
  }
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function readStoredJob(storage: StorageLike | null = defaultStorage()): StoredExportJob | null {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(EXPORT_STORAGE_JOB_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  if (!raw.startsWith('{')) {
    // Formato anterior: el jobId a secas.
    return raw.trim() ? { jobId: raw.trim(), startedAt: null } : null;
  }
  const parsed = readJson(storage, EXPORT_STORAGE_JOB_KEY);
  if (!isRecord(parsed) || typeof parsed.jobId !== 'string' || !parsed.jobId) return null;
  return {
    jobId: parsed.jobId,
    startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : null,
    periodId: typeof parsed.periodId === 'string' ? parsed.periodId : null,
    periodName: typeof parsed.periodName === 'string' ? parsed.periodName : null,
  };
}

export function writeStoredJob(job: StoredExportJob, storage: StorageLike | null = defaultStorage()): void {
  writeJson(storage, EXPORT_STORAGE_JOB_KEY, job);
}

export function clearStoredJob(storage: StorageLike | null = defaultStorage()): void {
  remove(storage, EXPORT_STORAGE_JOB_KEY);
}

export function readHistory(storage: StorageLike | null = defaultStorage()): ExportHistoryItem[] {
  const parsed = readJson(storage, EXPORT_STORAGE_HISTORY_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (h): h is Record<string, unknown> =>
        isRecord(h) && typeof h.jobId === 'string' && typeof h.filename === 'string' && typeof h.finishedAt === 'string',
    )
    .map((h) => ({
      jobId: h.jobId as string,
      filename: h.filename as string,
      rows: typeof h.rows === 'number' ? h.rows : 0,
      bytes: typeof h.bytes === 'number' ? h.bytes : null,
      periodId: typeof h.periodId === 'string' ? h.periodId : null,
      periodName: typeof h.periodName === 'string' ? h.periodName : null,
      finishedAt: h.finishedAt as string,
    }))
    .slice(0, EXPORT_HISTORY_MAX);
}

export function writeHistory(list: ExportHistoryItem[], storage: StorageLike | null = defaultStorage()): void {
  writeJson(storage, EXPORT_STORAGE_HISTORY_KEY, list.slice(0, EXPORT_HISTORY_MAX));
}

/** ¿Ya se descargó este job alguna vez (en este navegador)? */
export function downloadedOnce(jobId: string, storage: StorageLike | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(exportDoneKey(jobId)) === '1';
  } catch {
    return false;
  }
}

export function markDownloaded(jobId: string, storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(exportDoneKey(jobId), '1');
  } catch {
    // sin storage: se descargará de nuevo si se vuelve a montar, nada grave
  }
}

/** Reclama la descarga automática: true solo la PRIMERA vez por job (y la marca). */
export function claimDownload(jobId: string, storage: StorageLike | null = defaultStorage()): boolean {
  if (downloadedOnce(jobId, storage)) return false;
  markDownloaded(jobId, storage);
  return true;
}

export function clearDownloaded(jobId: string, storage: StorageLike | null = defaultStorage()): void {
  remove(storage, exportDoneKey(jobId));
}

/**
 * Reclama el AVISO de fin de job (toast "listo" / error / cancelada): true solo
 * la primera vez por job en este navegador (y lo marca). Sin storage siempre
 * true (se avisa en cada montaje; nada grave).
 */
export function claimNotified(jobId: string, storage: StorageLike | null = defaultStorage()): boolean {
  try {
    if (storage?.getItem(exportSeenKey(jobId)) === '1') return false;
    storage?.setItem(exportSeenKey(jobId), '1');
  } catch {
    // sin storage: se avisa de nuevo si se vuelve a montar
  }
  return true;
}

export function clearNotified(jobId: string, storage: StorageLike | null = defaultStorage()): void {
  remove(storage, exportSeenKey(jobId));
}
