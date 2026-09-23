import { describe, expect, it } from 'vitest';
import type { LegacySyncRun } from '@/types/legacySync';
import {
  criterionShortLabel,
  dayOf,
  exitCodeLabel,
  failingCriteria,
  formatDuration,
  hhmm,
  hhmmUtc,
  holdAgeText,
  nextWindowLabel,
  normalizeParity,
  normalizeSteps,
  normalizeVerdict,
  parityFigures,
  paritySummary,
  runStateText,
  signalLabel,
  statusPhrase,
  stepLabel,
  whatsappChip,
  PARITY_LEGEND,
  PARITY_ORDER,
} from './format';

/** Corrida del ejemplo §4.5 del contrato (21:05 CDMX = 03:05 UTC del día siguiente). */
const RUN: LegacySyncRun = {
  id: 'r1',
  runKey: 'auto-2026-09-23T03:05Z',
  mode: 'auto',
  runner: 'pc-sistemas',
  status: 'ok',
  exitCode: 0,
  reason: null,
  attempts: 1,
  periodNumbers: [73],
  startedAt: '2026-09-23T03:05:03.000Z',
  startedAtCdmx: '2026-09-22 21:05:03',
  readyAt: '2026-09-23T03:06:10.000Z',
  readyAtCdmx: '2026-09-22 21:06:10',
  finishedAt: '2026-09-23T03:12:41.000Z',
  finishedAtCdmx: '2026-09-22 21:12:41',
  durationMs: 458_000,
  waitedMs: 67_000,
  legacyGeneration: '519dd5d6',
  legacyWatermarkCdmx: '2026-09-22 20:18:44',
  legacyCopyDay: '2026-09-22',
  holdsPending: 6,
  duplicatesNew: 0,
  warnings: ['copia_vieja'],
  error: null,
  steps: {
    nuevos: { inserted: 0, held: 2, ms: 21000 },
    inscripcion: { updated: 1, ms: 5000 },
    'ventas-pos': {
      migrated: 312,
      skipped: { ya_existe: 17337, gemelo_nativo_v2: 12816, cuarentena: 41, cliente_no_cargado: 3 },
      failed: 0,
      ms: 76000,
    },
    'ventas-online': { migrated: 101, ms: 44000 },
    puntos: { migrated: 9928, ms: 23000 },
    rangos: { migrated: 1685, ms: 3000 },
  },
  parity: { A: 'ambar', C: 'ok', D: 'ok', D2: 'ok', E: 'ok', G: 'ambar', H: 'ok', I: 'ok', J: 'rojo', T: 793 },
};

describe('formatDuration', () => {
  it('cubre segundos, minutos y horas', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(-5)).toBe('—');
    expect(formatDuration(400)).toBe('<1 s');
    expect(formatDuration(45_000)).toBe('45 s');
    expect(formatDuration(458_000)).toBe('7 m 38 s');
    expect(formatDuration(3_720_000)).toBe('1 h 02 m');
  });
});

describe('horas', () => {
  it('recorta HH:mm de la hora CDMX y calcula la UTC del ISO', () => {
    expect(hhmm('2026-09-22 21:05:03')).toBe('21:05');
    expect(hhmm('2026-09-22 21:05')).toBe('21:05');
    expect(hhmm(null)).toBeNull();
    expect(hhmm('basura')).toBeNull();
    expect(dayOf('2026-09-22 21:05:03')).toBe('2026-09-22');
    expect(hhmmUtc('2026-09-23T03:05:03.000Z')).toBe('03:05');
    expect(hhmmUtc('no-es-fecha')).toBeNull();
  });

  it('nextWindowLabel: hoy, mañana o con fecha', () => {
    expect(nextWindowLabel('2026-09-22 23:05', '2026-09-22 21:30:00')).toBe('23:05');
    expect(nextWindowLabel('2026-09-23 01:05', '2026-09-22 23:30:00')).toBe('mañana 01:05');
    expect(nextWindowLabel('2026-09-25 01:05', '2026-09-22 23:30:00')).toBe('2026-09-25 01:05');
    expect(nextWindowLabel(null, '2026-09-22 23:30:00')).toBe('—');
  });
});

describe('statusPhrase', () => {
  it('arma la frase del contrato §5.5', () => {
    const phrase = statusPhrase({
      lastRun: RUN,
      nextExpectedCdmx: '2026-09-22 23:05',
      nowCdmx: '2026-09-22 21:40:00',
    });
    expect(phrase).toBe(
      'Última corrida 21:05 CDMX (03:05 UTC) · ok en 7 m 38 s · copia del legacy hasta 20:18 · próxima 23:05',
    );
  });

  it('antepone la fecha cuando la corrida no es de hoy y maneja sin corridas', () => {
    expect(
      statusPhrase({
        lastRun: { ...RUN, status: 'skipped', reason: 'legacy_no_listo', durationMs: 41_000 },
        nextExpectedCdmx: '2026-09-23 01:05',
        nowCdmx: '2026-09-23 00:10:00',
      }),
    ).toBe(
      'Última corrida 2026-09-22 21:05 CDMX (03:05 UTC) · omitida (legacy_no_listo) en 41 s · copia del legacy hasta 20:18 · próxima 01:05',
    );
    expect(
      statusPhrase({ lastRun: null, nextExpectedCdmx: '2026-09-22 23:05', nowCdmx: '2026-09-22 21:40:00' }),
    ).toBe('Sin corridas registradas · próxima 23:05');
  });

  it('runStateText: en curso y sin duración', () => {
    expect(runStateText({ status: 'running', durationMs: null, reason: null })).toBe('en curso');
    expect(runStateText({ status: 'error', durationMs: null, reason: 'crashed' })).toBe('error (crashed)');
  });
});

describe('exitCodeLabel', () => {
  it('etiqueta los códigos V14 y los desconocidos', () => {
    expect(exitCodeLabel(0)).toBe('0 · ok / noop');
    expect(exitCodeLabel(9)).toContain('paridad ROJA');
    expect(exitCodeLabel(124)).toContain('timeout');
    expect(exitCodeLabel(77)).toBe('77 · desconocido');
    expect(exitCodeLabel(null)).toBe('sin código');
  });
});

describe('paridad', () => {
  it('normaliza veredictos planos, con detalle y sinónimos', () => {
    expect(normalizeVerdict('ok')).toBe('verde');
    expect(normalizeVerdict('verde')).toBe('verde');
    expect(normalizeVerdict('ambar')).toBe('ambar');
    expect(normalizeVerdict('rojo')).toBe('rojo');
    expect(normalizeVerdict('na')).toBe('na');
    expect(normalizeVerdict({ verdict: 'rojo', missing: 3 })).toBe('rojo');
    expect(normalizeVerdict(undefined)).toBe('sin_dato');
    expect(normalizeVerdict(42)).toBe('sin_dato');
  });

  it('lee la forma plana del JSON §4.5 (T como conteo)', () => {
    const chips = normalizeParity(RUN.parity);
    const by = Object.fromEntries(chips.map((c) => [c.key, c]));
    expect(chips.map((c) => c.key)).toEqual([...PARITY_ORDER]);
    expect(by.A.verdict).toBe('ambar');
    expect(by.C.verdict).toBe('verde');
    expect(by.J.verdict).toBe('rojo');
    expect(by.J.gating).toBe(false);
    expect(by.D2.gating).toBe(true);
    expect(by.T.verdict).toBe('na');
    expect(by.T.figures).toBe('conteo 793');
    expect(by.B.verdict).toBe('sin_dato');
    expect(by.B.figures).toBeNull();
    expect(paritySummary(chips)).toBe('rojo 1 · ámbar 2 · verde 6');
  });

  it('lee la forma con detalle que guarda el runner (parity.js) y arma cifras', () => {
    const detail = {
      A: { verdict: 'ambar', pairsOkPct: 91.2, pairsOk: 1203, pairs: 1319, totalL: 1000, totalV: 1009.5, totalDiffPct: 0.95 },
      C: { verdict: 'verde', nL: 101, nV: 101 },
      D: { verdict: 'verde', legacy: 316, v2: 316, same: 316, missing: 0, excluded: 0, dateDiff: 0 },
      D2: { verdict: 'verde', pares: 29, prevPares: 29, duplicatesNew: 0, kitAmbos: 25 },
      E: { verdict: 'rojo', rowsL: 9928, rowsV: 9916, matched: 9862, mismatched: 54, mismatchedPct: 0.54, missing: 12, excluded: 0, sumL: 1, sumV: 2, sumDelta: 0 },
      G: { verdict: 'verde', sinCliente: 0, sinItemsConDetalle: 0, sinItems: 0, pendingVencidas: 0, sinItemsHistorico: 34 },
      H: { verdict: 'verde', sinNodo: 0, sponsorColgando: 0 },
      I: { verdict: 'verde', generationStart: '519dd5d6abcd', generationEnd: '519dd5d6abcd' },
      J: { verdict: 'rojo', cohort: '2026-09-16..2026-09-22', cohortL: 200, cohortV: 197, holdsWithKit: 3, repetidos: 25, failedRepetidos: 0 },
      K: { verdict: 'na', nL: 1851, totalL: 0, v2ByStatus: { pending: 3 } },
      T: { verdict: 'na', copies: 793, prevCopies: 790, delta: 3 },
      F: { error: 'timeout', verdict: 'na' },
      B: { skipped: 'sin copy_day', verdict: 'na' },
      byPeriod: { 73: {} },
    };
    const by = Object.fromEntries(normalizeParity(detail).map((c) => [c.key, c]));
    expect(by.A.figures).toBe('pares ok 91.2 % (1,203/1,319) · total L 1,000 vs V 1,009.5 (+0.95 %)');
    expect(by.C.figures).toBe('online L 101 vs V 101');
    expect(by.D2.figures).toBe('pares por teléfono 29 (previo 29, nuevos 0; con kit ambos 25)');
    expect(by.E.verdict).toBe('rojo');
    expect(by.E.figures).toContain('faltan 12');
    expect(by.I.figures).toBe('huella 519dd5d6 → 519dd5d6');
    expect(by.J.figures).toContain('teléfonos repetidos 25');
    expect(by.T.figures).toBe('copias M- 793 (previo 790, delta +3)');
    expect(by.F.figures).toBe('ERROR timeout');
    expect(by.B.figures).toBe('no evaluada (sin copy_day)');
    expect(Object.keys(by)).not.toContain('byPeriod');
  });

  it('toda letra de la matriz tiene leyenda en español', () => {
    for (const k of PARITY_ORDER) {
      expect(PARITY_LEGEND[k]?.title).toBeTruthy();
      expect(PARITY_LEGEND[k]?.description).toBeTruthy();
    }
    expect(parityFigures('Z', 'verde')).toBeNull();
  });
});

describe('normalizeSteps', () => {
  it('convierte los pasos §4.5 en filas ordenadas con omitidos por motivo', () => {
    const rows = normalizeSteps(RUN.steps);
    expect(rows.map((r) => r.name)).toEqual([
      'nuevos',
      'inscripcion',
      'ventas-pos',
      'ventas-online',
      'puntos',
      'rangos',
    ]);
    const pos = rows.find((r) => r.name === 'ventas-pos');
    expect(pos?.inserted).toBe(312);
    expect(pos?.skippedTotal).toBe(17337 + 12816 + 41 + 3);
    expect(pos?.skippedBy[0]).toEqual(['ya_existe', 17337]);
    expect(pos?.failed).toBe(0);
    expect(pos?.ms).toBe(76000);
    const nuevos = rows.find((r) => r.name === 'nuevos');
    expect(nuevos?.inserted).toBe(0);
    expect(nuevos?.skippedBy).toEqual([['retenido', 2]]);
    expect(nuevos?.skippedTotal).toBe(2);
    const insc = rows.find((r) => r.name === 'inscripcion');
    expect(insc?.inserted).toBe(1);
    expect(insc?.failed).toBeNull();
    expect(stepLabel('ventas-pos')).toBe('Ventas POS');
    expect(stepLabel('otro')).toBe('otro');
  });

  it('lee los pasos especiales del runner (guarda, plan, crashed, fase omitida)', () => {
    const rows = normalizeSteps({
      'legacy-listo': { attempts: 3, ready: true, status: 'ready', readyAtCdmx: '2026-09-22 21:06:10', ms: 67000 },
      periodos: { copyDay: '2026-09-22', plan: ['73 SEPTIEMBRE 2026-08-26..2026-09-25 -> legacy 74'] },
      puntos: { migrated: 0, skipped: {}, skippedTotal: 0, failed: 0, ms: 12, crashed: true, crashReason: 'corte_invalido', error: 'copyThrough NULL', byPeriod: {} },
      redes: { migrated: 0, skipped: {}, skippedTotal: 0, failed: 0, ms: 0, byPeriod: { 73: { skippedPhase: 'periodo_abierto' } } },
      verificacion: { periodsMeasured: [73], ms: 40000 },
    });
    expect(rows.map((r) => r.name)).toEqual(['legacy-listo', 'periodos', 'puntos', 'redes', 'verificacion']);
    expect(rows[0].note).toBe('lista en 3 intento(s) · 21:06 CDMX · ready');
    expect(rows[0].ms).toBe(67000);
    expect(rows[1].note).toContain('73 SEPTIEMBRE');
    expect(rows[1].note).toContain('copy_day 2026-09-22');
    expect(rows[2].crashed).toBe(true);
    expect(rows[2].note).toBe('tronó (corte_invalido): copyThrough NULL');
    expect(rows[3].note).toBe('periodo 73: fase omitida (periodo_abierto)');
    expect(rows[4].note).toBe('periodos medidos 73');
    expect(normalizeSteps(null)).toEqual([]);
  });
});

describe('retenciones', () => {
  it('etiqueta señales y antigüedad', () => {
    expect(signalLabel('PHONE')).toBe('teléfono');
    expect(signalLabel('NAME_DOB')).toBe('nombre + fecha de nacimiento');
    expect(signalLabel('OTRA')).toBe('otra');
    expect(holdAgeText(0.4)).toBe('hace menos de 1 h');
    expect(holdAgeText(5.7)).toBe('hace 5 h');
    expect(holdAgeText(52)).toBe('hace 2 d 4 h');
    expect(holdAgeText(72)).toBe('hace 3 d');
    expect(holdAgeText(null)).toBe('—');
  });
});

describe('WhatsApp listo', () => {
  const ready = {
    ready: false,
    score: '5/7',
    criterios: [
      { criterio: 'c1', ok: true, detalle: 'd1' },
      { criterio: 'c2', ok: false, detalle: 'd2' },
      { criterio: 'c3', ok: true, detalle: 'd3' },
      { criterio: 'c4', ok: false, detalle: 'd4' },
      { criterio: 'c5', ok: true, detalle: 'd5' },
      { criterio: 'c6', ok: true, detalle: 'd6' },
      { criterio: 'c7', ok: true, detalle: 'd7' },
    ],
  };

  it('chip rojo con n/7, verde cuando todo pasa y gris sin datos', () => {
    expect(whatsappChip(ready)).toEqual({ label: 'WhatsApp listo 5/7', tone: 'rojo' });
    expect(
      whatsappChip({ ...ready, ready: true, score: '7/7', criterios: ready.criterios.map((c) => ({ ...c, ok: true })) }),
    ).toEqual({ label: 'WhatsApp listo 7/7', tone: 'verde' });
    expect(whatsappChip(null)).toEqual({ label: 'WhatsApp listo: sin datos', tone: 'sin_dato' });
    expect(whatsappChip({ ...ready, score: '' }).label).toBe('WhatsApp listo 5/7');
  });

  it('lista los criterios que fallan y etiqueta corta por índice', () => {
    expect(failingCriteria(ready).map((c) => c.criterio)).toEqual(['c2', 'c4']);
    expect(failingCriteria(undefined)).toEqual([]);
    expect(criterionShortLabel(0, 'x')).toContain('09:05');
    expect(criterionShortLabel(6, 'x')).toContain('WHATSAPP_ENABLED');
    expect(criterionShortLabel(9, 'respaldo')).toBe('respaldo');
  });
});
