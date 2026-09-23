import { describe, expect, it } from 'vitest';
import type { NetworkExportJob } from '@/types/network';
import {
  EXPORT_HISTORY_MAX,
  EXPORT_JOB_TTL_MS,
  EXPORT_MAX_POLL_FAILURES,
  EXPORT_POLL_TRACKED_MAX,
  EXPORT_STORAGE_HISTORY_KEY,
  EXPORT_STORAGE_JOB_KEY,
  claimAutoDownload,
  claimDownload,
  claimNotified,
  clearDownloaded,
  clearNotified,
  clearStoredJob,
  createExportPollTracker,
  describeJob,
  exportPanelView,
  downloadedOnce,
  exportDoneKey,
  exportSeenKey,
  historyItemFromJob,
  isJobActive,
  markDownloaded,
  phaseOf,
  pollIntervalFor,
  pushHistory,
  readHistory,
  readStoredJob,
  reconnectDecision,
  writeHistory,
  writeStoredJob,
  type ExportHistoryItem,
  type StorageLike,
} from './export-job';

const NOW = Date.parse('2026-09-22T18:00:00.000Z');

const job = (over: Partial<NetworkExportJob> = {}): NetworkExportJob => ({
  jobId: 'job-1',
  status: 'running',
  percent: 0,
  processed: 0,
  total: 0,
  filename: 'descendencia-red-5621-SEPTIEMBRE-2026.csv',
  phase: 'queued',
  startedAt: new Date(NOW - 5_000).toISOString(),
  pollAfterMs: 2000,
  ...over,
});

const fakeStorage = (): StorageLike & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
};

describe('phaseOf', () => {
  it('usa phase del API y cae a status/percent con un API viejo', () => {
    expect(phaseOf(job({ phase: 'writing' }))).toBe('writing');
    expect(phaseOf({ status: 'running', percent: 0 })).toBe('counting');
    expect(phaseOf({ status: 'running', percent: 40 })).toBe('writing');
    expect(phaseOf({ status: 'done', percent: 100 })).toBe('done');
    expect(phaseOf({ status: 'error', percent: 0 })).toBe('error');
    expect(phaseOf({ status: 'running', percent: 0, phase: 'raro' as never })).toBe('counting');
    expect(phaseOf(null)).toBe('queued');
    expect(isJobActive(job({ phase: 'finalizing' }))).toBe(true);
    expect(isJobActive(job({ status: 'error', phase: 'cancelled' }))).toBe(false);
    expect(isJobActive(null)).toBe(false);
  });
});

describe('describeJob: fase → clave y valores', () => {
  it('queued: posición, barra indeterminada, cancelable', () => {
    const d = describeJob(job({ queuePosition: 3 }), NOW);
    expect(d).toMatchObject({
      phase: 'queued',
      labelKey: 'exportPanel.phase.queued',
      values: { position: 3 },
      percent: null,
      indeterminate: true,
      canCancel: true,
      terminal: false,
      elapsedMs: 5_000,
    });
    expect(describeJob(job({ queuePosition: undefined }), NOW).values.position).toBe(1);
  });

  it('counting y traversing (eta en segundos, mínimo 1)', () => {
    expect(describeJob(job({ phase: 'counting' }), NOW).labelKey).toBe('exportPanel.phase.counting');
    const t = describeJob(job({ phase: 'traversing', total: 80603, etaMs: 4330, heavy: true }), NOW);
    expect(t.labelKey).toBe('exportPanel.phase.traversing');
    expect(t.values).toEqual({ total: 80603, eta: 5 });
    expect(t.indeterminate).toBe(true);
    expect(describeJob(job({ phase: 'traversing', total: 10, etaMs: 0 }), NOW).values.eta).toBe(1);
  });

  it('writing: barra determinada 0..99 aunque el API mande más', () => {
    const w = describeJob(job({ phase: 'writing', processed: 42000, total: 80603, percent: 52 }), NOW);
    expect(w.labelKey).toBe('exportPanel.phase.writing');
    expect(w.values).toEqual({ processed: 42000, total: 80603, percent: 52 });
    expect(w.percent).toBe(52);
    expect(w.indeterminate).toBe(false);
    expect(w.canCancel).toBe(true);
    expect(describeJob(job({ phase: 'writing', percent: 100 }), NOW).percent).toBe(99);
    expect(describeJob(job({ phase: 'writing', percent: 99.9 }), NOW).percent).toBe(99);
    expect(describeJob(job({ phase: 'writing', percent: -1 }), NOW).percent).toBe(0);
  });

  it('finalizing y done', () => {
    const f = describeJob(job({ phase: 'finalizing', percent: 99 }), NOW);
    expect(f.labelKey).toBe('exportPanel.phase.finalizing');
    expect(f.indeterminate).toBe(true);
    const done = describeJob(
      job({
        status: 'done',
        phase: 'done',
        percent: 100,
        total: 80603,
        processed: 80603,
        elapsedMs: 4200,
        finishedAt: new Date(NOW).toISOString(),
        expiresAt: new Date(NOW + EXPORT_JOB_TTL_MS).toISOString(),
      }),
      NOW,
    );
    expect(done).toMatchObject({
      labelKey: 'exportPanel.phase.done',
      values: { filename: 'descendencia-red-5621-SEPTIEMBRE-2026.csv', total: 80603 },
      percent: 100,
      indeterminate: false,
      canCancel: false,
      terminal: true,
      elapsedMs: 4200,
      expiresAt: new Date(NOW + EXPORT_JOB_TTL_MS).toISOString(),
    });
  });

  it('error, tooLarge y cancelled (info, no error)', () => {
    const e = describeJob(job({ status: 'error', phase: 'error', error: 'tiempo agotado' }), NOW);
    expect(e.labelKey).toBe('exportPanel.phase.error');
    expect(e.values).toEqual({ error: 'tiempo agotado' });
    expect(e.canCancel).toBe(false);
    expect(
      describeJob(job({ status: 'error', phase: 'error', errorCode: 'NET_EXPORT_TOO_LARGE' }), NOW).labelKey,
    ).toBe('exportPanel.tooLarge');
    const c = describeJob(job({ status: 'error', phase: 'cancelled', error: 'Cancelada por el usuario' }), NOW);
    expect(c.labelKey).toBe('exportPanel.phase.cancelled');
    expect(c.terminal).toBe(true);
  });

  it('API viejo sin phase: running con % ⇒ writing; elapsed por startedAt/finishedAt', () => {
    const legacy = { jobId: 'j', status: 'running' as const, percent: 30, processed: 3, total: 10, filename: 'x.csv' };
    const d = describeJob(legacy, NOW);
    expect(d.phase).toBe('writing');
    expect(d.percent).toBe(30);
    expect(d.elapsedMs).toBeNull();
    const withDates = describeJob(
      job({
        status: 'done',
        phase: 'done',
        elapsedMs: undefined,
        startedAt: new Date(NOW - 9_000).toISOString(),
        finishedAt: new Date(NOW - 2_000).toISOString(),
      }),
      NOW,
    );
    expect(withDates.elapsedMs).toBe(7_000);
  });
});

describe('pollIntervalFor', () => {
  it('pollAfterMs del servidor, 3000 tras 60 s, false al terminar', () => {
    expect(pollIntervalFor(undefined, 0)).toBe(2000);
    expect(pollIntervalFor(job({ pollAfterMs: 2000 }), 0)).toBe(2000);
    expect(pollIntervalFor(job({ phase: 'writing', pollAfterMs: 1000 }), 30_000)).toBe(1000);
    expect(pollIntervalFor(job({ phase: 'writing', pollAfterMs: 1000 }), 60_000)).toBe(3000);
    expect(pollIntervalFor(undefined, 61_000)).toBe(3000);
    expect(pollIntervalFor(job({ status: 'done', phase: 'done', pollAfterMs: 0 }), 5_000)).toBe(false);
    expect(pollIntervalFor(job({ status: 'error', phase: 'cancelled', pollAfterMs: 0 }), 90_000)).toBe(false);
    // Sin pollAfterMs (API viejo): 2000 en espera, 1000 en curso.
    expect(pollIntervalFor(job({ pollAfterMs: undefined }), 0)).toBe(2000);
    expect(pollIntervalFor(job({ phase: 'traversing', pollAfterMs: undefined }), 0)).toBe(1000);
  });
});

describe('exportPanelView: el aviso "sin conexión" manda aunque haya último estado', () => {
  it('inalcanzable ⇒ unreachable con o sin job en caché; si no, job o spinner', () => {
    // Job en writing 40 % y el API deja de responder: la tarjeta NO se congela en la fase.
    expect(exportPanelView(job({ phase: 'writing', percent: 40 }), true)).toBe('unreachable');
    expect(exportPanelView(undefined, true)).toBe('unreachable');
    expect(exportPanelView(null, true)).toBe('unreachable');
    expect(exportPanelView(job({ phase: 'writing', percent: 40 }), false)).toBe('job');
    expect(exportPanelView(job({ status: 'done', phase: 'done', percent: 100 }), false)).toBe('job');
    expect(exportPanelView(undefined, false)).toBe('loading');
  });
});

describe('createExportPollTracker: un solo conteo para tarjeta y vigía', () => {
  it('8 fallos seguidos ⇒ inalcanzable, contados entre TODOS los observadores; un OK reinicia', () => {
    const tracker = createExportPollTracker();
    const changes: boolean[] = [];
    const unsubscribe = tracker.subscribe(() => changes.push(tracker.isUnreachable('j1')));
    // La tarjeta y el vigía alternan disparos del mismo queryFn: el umbral no se reparte.
    for (let i = 1; i < EXPORT_MAX_POLL_FAILURES; i += 1) {
      expect(tracker.failure('j1', NOW + i)).toBe(false);
      expect(tracker.isUnreachable('j1')).toBe(false);
    }
    expect(tracker.get('j1').failures).toBe(EXPORT_MAX_POLL_FAILURES - 1);
    expect(tracker.failure('j1', NOW + 8)).toBe(true);
    expect(tracker.isUnreachable('j1')).toBe(true);
    expect(changes).toEqual([true]);
    // Más fallos ya no "avisan" otra vez.
    expect(tracker.failure('j1')).toBe(false);
    expect(changes).toEqual([true]);
    // Reintento manual: fallos y reloj en cero, deja de estar inalcanzable y avisa.
    tracker.resume('j1', NOW + 50_000);
    expect(tracker.isUnreachable('j1')).toBe(false);
    expect(tracker.get('j1')).toMatchObject({ failures: 0, since: NOW + 50_000, unreachable: false });
    expect(changes).toEqual([true, false]);
    // Un OK a mitad de camino reinicia el conteo.
    tracker.failure('j1');
    tracker.failure('j1');
    tracker.success('j1');
    expect(tracker.get('j1').failures).toBe(0);
    unsubscribe();
    for (let i = 0; i < EXPORT_MAX_POLL_FAILURES; i += 1) tracker.failure('j1');
    expect(tracker.isUnreachable('j1')).toBe(true);
    expect(changes).toEqual([true, false]);
  });

  it('cada job lleva su cuenta y su reloj; sin job nunca es inalcanzable', () => {
    const tracker = createExportPollTracker(2);
    expect(tracker.get('a', NOW).since).toBe(NOW);
    expect(tracker.get('a', NOW + 999).since).toBe(NOW);
    tracker.failure('a');
    tracker.failure('a');
    expect(tracker.isUnreachable('a')).toBe(true);
    expect(tracker.isUnreachable('b')).toBe(false);
    expect(tracker.isUnreachable(null)).toBe(false);
    expect(tracker.isUnreachable(undefined)).toBe(false);
    expect(tracker.isUnreachable('')).toBe(false);
    // resume de un job que no estaba inalcanzable no avisa.
    const changes: string[] = [];
    tracker.subscribe(() => changes.push('x'));
    tracker.resume('b');
    expect(changes).toEqual([]);
  });

  it('olvida los jobs más viejos al pasar el tope', () => {
    const tracker = createExportPollTracker(1);
    tracker.failure('j0');
    expect(tracker.isUnreachable('j0')).toBe(true);
    for (let i = 1; i <= EXPORT_POLL_TRACKED_MAX; i += 1) tracker.get(`j${i}`);
    expect(tracker.isUnreachable('j0')).toBe(false);
    expect(tracker.get('j0').failures).toBe(0);
  });
});

describe('reconnectDecision', () => {
  const stored = { jobId: 'job-1', startedAt: new Date(NOW - 60_000).toISOString() };

  it('job guardado en curso ⇒ reconnect; listo sin descargar ⇒ offerDownload; ya descargado ⇒ none', () => {
    const running = job({ phase: 'writing', percent: 10 });
    expect(reconnectDecision({ jobs: [running], stored, now: NOW })).toEqual({
      kind: 'reconnect',
      jobId: 'job-1',
      job: running,
    });
    const done = job({ status: 'done', phase: 'done', percent: 100 });
    expect(reconnectDecision({ jobs: [done], stored, now: NOW })).toEqual({
      kind: 'offerDownload',
      jobId: 'job-1',
      job: done,
    });
    expect(reconnectDecision({ jobs: [done], stored, now: NOW, isDownloaded: () => true })).toEqual({ kind: 'none' });
    // Con error o cancelado se reconecta para mostrar el estado.
    const failed = job({ status: 'error', phase: 'error', error: 'x' });
    expect(reconnectDecision({ jobs: [failed], stored, now: NOW }).kind).toBe('reconnect');
  });

  it('no está en la lista: expired si startedAt rebasó el TTL, si no interrupted', () => {
    expect(reconnectDecision({ jobs: [], stored, now: NOW })).toEqual({ kind: 'interrupted', jobId: 'job-1' });
    const old = { jobId: 'job-1', startedAt: new Date(NOW - EXPORT_JOB_TTL_MS - 1).toISOString() };
    expect(reconnectDecision({ jobs: [], stored: old, now: NOW })).toEqual({ kind: 'expired', jobId: 'job-1' });
    const edge = { jobId: 'job-1', startedAt: new Date(NOW - EXPORT_JOB_TTL_MS).toISOString() };
    expect(reconnectDecision({ jobs: [job({ jobId: 'otro' })], stored: edge, now: NOW }).kind).toBe('interrupted');
    // Formato viejo (sin startedAt) no puede saber: interrupted.
    expect(reconnectDecision({ jobs: [], stored: { jobId: 'job-1', startedAt: null }, now: NOW }).kind).toBe(
      'interrupted',
    );
  });

  it('la lista falló (null) ⇒ reconecta al guardado y deja decidir al sondeo', () => {
    expect(reconnectDecision({ jobs: null, stored, now: NOW })).toEqual({ kind: 'reconnect', jobId: 'job-1', job: null });
    expect(reconnectDecision({ jobs: null, stored: null, now: NOW })).toEqual({ kind: 'none' });
  });

  it('sin nada guardado: primer job en curso, si no el primero listo sin descargar, si no none', () => {
    const done = job({ jobId: 'd', status: 'done', phase: 'done', percent: 100 });
    const running = job({ jobId: 'r', phase: 'counting' });
    expect(reconnectDecision({ jobs: [done, running], stored: null, now: NOW })).toEqual({
      kind: 'reconnect',
      jobId: 'r',
      job: running,
    });
    expect(reconnectDecision({ jobs: [done], stored: null, now: NOW })).toEqual({
      kind: 'offerDownload',
      jobId: 'd',
      job: done,
    });
    expect(reconnectDecision({ jobs: [done], stored: null, now: NOW, isDownloaded: (id) => id === 'd' })).toEqual({
      kind: 'none',
    });
    expect(reconnectDecision({ jobs: [], stored: null, now: NOW })).toEqual({ kind: 'none' });
    const cancelled = job({ jobId: 'c', status: 'error', phase: 'cancelled' });
    expect(reconnectDecision({ jobs: [cancelled], stored: null, now: NOW })).toEqual({ kind: 'none' });
  });
});

describe('historial', () => {
  const item = (jobId: string, finishedAt = new Date(NOW).toISOString()): ExportHistoryItem => ({
    jobId,
    filename: `f-${jobId}.csv`,
    rows: 10,
    finishedAt,
  });

  it('pushHistory: al frente, sin duplicar por jobId, máx. 5', () => {
    let list: ExportHistoryItem[] = [];
    for (let i = 1; i <= 7; i += 1) list = pushHistory(list, item(`j${i}`));
    expect(list).toHaveLength(EXPORT_HISTORY_MAX);
    expect(list.map((h) => h.jobId)).toEqual(['j7', 'j6', 'j5', 'j4', 'j3']);
    const again = pushHistory(list, { ...item('j4'), rows: 99 });
    expect(again).toHaveLength(EXPORT_HISTORY_MAX);
    expect(again[0]).toMatchObject({ jobId: 'j4', rows: 99 });
    expect(again.filter((h) => h.jobId === 'j4')).toHaveLength(1);
  });

  it('historyItemFromJob solo con done', () => {
    expect(historyItemFromJob(job({ phase: 'writing' }), NOW)).toBeNull();
    expect(
      historyItemFromJob(
        job({
          status: 'done',
          phase: 'done',
          percent: 100,
          total: 36,
          sizeBytes: 4096,
          periodId: 'p',
          periodName: 'SEPTIEMBRE 2026',
          finishedAt: '2026-09-22T17:59:00.000Z',
        }),
        NOW,
      ),
    ).toEqual({
      jobId: 'job-1',
      filename: 'descendencia-red-5621-SEPTIEMBRE-2026.csv',
      rows: 36,
      bytes: 4096,
      periodId: 'p',
      periodName: 'SEPTIEMBRE 2026',
      finishedAt: '2026-09-22T17:59:00.000Z',
    });
    // Sin finishedAt usa `now`.
    expect(historyItemFromJob(job({ status: 'done', phase: 'done', percent: 100 }), NOW)?.finishedAt).toBe(
      new Date(NOW).toISOString(),
    );
  });

  it('readHistory/writeHistory toleran basura y recortan', () => {
    const s = fakeStorage();
    expect(readHistory(s)).toEqual([]);
    s.setItem(EXPORT_STORAGE_HISTORY_KEY, '{no es json');
    expect(readHistory(s)).toEqual([]);
    s.setItem(EXPORT_STORAGE_HISTORY_KEY, JSON.stringify([{ jobId: 1 }, item('ok'), 'x', null]));
    expect(readHistory(s).map((h) => h.jobId)).toEqual(['ok']);
    writeHistory(Array.from({ length: 8 }, (_, i) => item(`w${i}`)), s);
    expect(readHistory(s)).toHaveLength(EXPORT_HISTORY_MAX);
    expect(readHistory(null)).toEqual([]);
  });
});

describe('job guardado y bandera de descarga única', () => {
  it('lee el formato viejo (jobId a secas) y el nuevo (JSON)', () => {
    const s = fakeStorage();
    expect(readStoredJob(s)).toBeNull();
    s.setItem(EXPORT_STORAGE_JOB_KEY, 'abc-123');
    expect(readStoredJob(s)).toEqual({ jobId: 'abc-123', startedAt: null });
    writeStoredJob({ jobId: 'j1', startedAt: '2026-09-22T18:00:00.000Z', periodName: 'SEPTIEMBRE 2026' }, s);
    expect(readStoredJob(s)).toEqual({
      jobId: 'j1',
      startedAt: '2026-09-22T18:00:00.000Z',
      periodId: null,
      periodName: 'SEPTIEMBRE 2026',
    });
    s.setItem(EXPORT_STORAGE_JOB_KEY, '{"sinJobId":true}');
    expect(readStoredJob(s)).toBeNull();
    s.setItem(EXPORT_STORAGE_JOB_KEY, '{rota');
    expect(readStoredJob(s)).toBeNull();
    clearStoredJob(s);
    expect(s.map.has(EXPORT_STORAGE_JOB_KEY)).toBe(false);
    expect(readStoredJob(null)).toBeNull();
  });

  it('claimDownload es verdadero solo la primera vez por job', () => {
    const s = fakeStorage();
    expect(downloadedOnce('j1', s)).toBe(false);
    expect(claimDownload('j1', s)).toBe(true);
    expect(claimDownload('j1', s)).toBe(false);
    expect(downloadedOnce('j1', s)).toBe(true);
    expect(s.map.get(exportDoneKey('j1'))).toBe('1');
    expect(claimDownload('j2', s)).toBe(true);
    markDownloaded('j3', s);
    expect(downloadedOnce('j3', s)).toBe(true);
    clearDownloaded('j1', s);
    expect(downloadedOnce('j1', s)).toBe(false);
    // Sin storage: no explota y no "recuerda".
    expect(claimDownload('j9', null)).toBe(true);
    expect(claimDownload('j9', null)).toBe(true);
  });

  it('claimAutoDownload: un job ofrecido al montar (offerDownload) NUNCA se descarga solo ni se marca', () => {
    const s = fakeStorage();
    const offered = new Set<string>();
    // El distribuidor cierra el navegador con el Excel en curso y vuelve 5 min después:
    // export-jobs lo trae listo ⇒ offerDownload ⇒ se ofrece con botón, sin descarga automática.
    const done = job({ status: 'done', phase: 'done', percent: 100 });
    const decision = reconnectDecision({ jobs: [done], stored: null, now: NOW, isDownloaded: (id) => downloadedOnce(id, s) });
    expect(decision.kind).toBe('offerDownload');
    if (decision.kind === 'offerDownload') offered.add(decision.jobId);
    expect(claimAutoDownload('job-1', offered, s)).toBe(false);
    // Sigue "sin descargar": el botón downloadReady se mantiene y otra pestaña también lo ofrece.
    expect(downloadedOnce('job-1', s)).toBe(false);
    expect(reconnectDecision({ jobs: [done], stored: null, now: NOW, isDownloaded: (id) => downloadedOnce(id, s) }).kind).toBe(
      'offerDownload',
    );
    // Aunque el sondeo devuelva el job otra vez (foco, reanudar), tampoco baja.
    expect(claimAutoDownload('job-1', offered, s)).toBe(false);
    // Un job que TERMINA mientras se navega sí baja una sola vez.
    expect(claimAutoDownload('job-2', offered, s)).toBe(true);
    expect(claimAutoDownload('job-2', offered, s)).toBe(false);
    expect(downloadedOnce('job-2', s)).toBe(true);
    // Sin storage: no explota.
    expect(claimAutoDownload('job-3', offered, null)).toBe(true);
    expect(claimAutoDownload('job-1', offered, null)).toBe(false);
  });

  it('claimNotified avisa UNA vez por job (independiente de la descarga)', () => {
    const s = fakeStorage();
    expect(claimNotified('j1', s)).toBe(true);
    expect(claimNotified('j1', s)).toBe(false);
    expect(s.getItem(exportSeenKey('j1'))).toBe('1');
    // Otro job no se ve afectado; la bandera de descarga es otra clave.
    expect(claimNotified('j2', s)).toBe(true);
    expect(downloadedOnce('j1', s)).toBe(false);
    expect(exportSeenKey('j1')).not.toBe(exportDoneKey('j1'));
    clearNotified('j1', s);
    expect(claimNotified('j1', s)).toBe(true);
    // Sin storage: no explota y no "recuerda".
    expect(claimNotified('j9', null)).toBe(true);
    expect(claimNotified('j9', null)).toBe(true);
  });

  it('un storage que lanza (modo privado) no rompe', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(readStoredJob(broken)).toBeNull();
    expect(readHistory(broken)).toEqual([]);
    expect(downloadedOnce('x', broken)).toBe(false);
    expect(() => writeStoredJob({ jobId: 'x', startedAt: null }, broken)).not.toThrow();
    expect(() => writeHistory([], broken)).not.toThrow();
    expect(() => clearStoredJob(broken)).not.toThrow();
    expect(() => markDownloaded('x', broken)).not.toThrow();
  });
});
