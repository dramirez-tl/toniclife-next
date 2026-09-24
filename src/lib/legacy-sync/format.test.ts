import { describe, expect, it } from 'vitest';
import type { LegacySyncRun } from '@/types/legacySync';
import {
  apiFailReasonLabel,
  criterionShortLabel,
  dayOf,
  displayedRun,
  inductionAutoGate,
  isForbiddenError,
  needsSetup,
  setupSteps,
  statusPollInterval,
  exitCodeLabel,
  failingCriteria,
  formatDuration,
  hhmm,
  hhmmUtc,
  holdAgeText,
  HOLD_DECISION_UI,
  HOLD_DECISIONS,
  legacySyncErrorInfo,
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
  syncCodeLabel,
  syncCodeText,
  whatsappChip,
  PARITY_LEGEND,
  PARITY_ORDER,
  SYNC_CODE_LABELS,
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
    const [nuevosDry] = normalizeSteps({
      nuevos: { inserted: 0, skipped: 0, wouldInsert: 31, held: 2, rejected: 1, ms: 900 },
    });
    expect(nuevosDry.inserted).toBe(0);
    expect(nuevosDry.note).toBe('dry-run: habría insertado 31 · rechazados por el API 1');
    expect(nuevosDry.softFailed).toBe(false);
  });

  it('paso logins: creados/enviados/elegibles y omitidos del API y del legacy', () => {
    const [logins] = normalizeSteps({
      logins: {
        candidates: 9,
        eligible: 3,
        max: 500,
        overCap: 0,
        sent: 3,
        created: 2,
        legacyIdAssigned: 2,
        skipped: { ya_tiene_login: 1 },
        wouldCreate: null,
        counts: { candidatos: 9, no_en_legacy: 0, sin_tusers_legacy: 4, sin_password_legacy: 2, varios_tusers_legacy: 0, password_invalida: 0, elegibles: 3 },
        ms: 900,
      },
    });
    expect(logins.name).toBe('logins');
    expect(stepLabel('logins')).toBe('Logins faltantes');
    expect(logins.inserted).toBe(2);
    expect(logins.skippedBy).toEqual([
      ['sin_tusers_legacy', 4],
      ['sin_password_legacy', 2],
      ['ya_tiene_login', 1],
    ]);
    expect(logins.skippedTotal).toBe(7);
    expect(logins.failed).toBeNull();
    expect(logins.softFailed).toBe(false);
    expect(logins.note).toBe('creados 2 · enviados 3 · elegibles 3 de 9 candidatos · legacy_id asignados 2');

    // Hoy (23-sep): 9 candidatos, 0 elegibles, no se llama al API.
    const [none] = normalizeSteps({
      logins: { candidates: 9, eligible: 0, overCap: 0, sent: 0, created: 0, legacyIdAssigned: 0, skipped: {}, wouldCreate: null, counts: { candidatos: 9, sin_tusers_legacy: 4, sin_password_legacy: 5, elegibles: 0 }, ms: 400 },
    });
    expect(none.inserted).toBe(0);
    expect(none.skippedTotal).toBe(9);
    expect(none.note).toBe('creados 0 · enviados 0 · elegibles 0 de 9 candidatos');

    // Ensayo con elegibles y tope excedido: wouldCreate en vez de creados/enviados.
    const [dry] = normalizeSteps({
      logins: { candidates: 700, eligible: 600, overCap: 100, sent: 0, created: 0, legacyIdAssigned: 0, skipped: {}, wouldCreate: 500, counts: { candidatos: 700, password_invalida: 100, elegibles: 600 }, ms: 1200 },
    });
    expect(dry.note).toBe('dry-run: habría creado 500 · elegibles 600 de 700 candidatos · 100 sobre el tope (entran en las siguientes ventanas)');
    expect(dry.skippedBy).toEqual([['password_invalida', 100]]);
  });

  it('paso logins: apagado, endpoint sin desplegar, fallo del API y de BD', () => {
    const rows = normalizeSteps({
      logins: { failed: true, failReason: 'logins_endpoint_no_disponible', endpointMissing: true, error: 'El API desplegado aún no tiene…', ms: 300 },
    });
    expect(rows[0].note).toBe('el API desplegado aún no tiene la fase clientes-logins: no se creó ningún login');
    expect(rows[0].failed).toBeNull();
    expect(rows[0].softFailed).toBe(true);
    expect(rows[0].crashed).toBe(false);

    const [api] = normalizeSteps({
      logins: { failed: true, failReason: 'login_error', apiFailed: true, error: 'POST /auth/login 401', ms: 200 },
    });
    expect(api.note).toBe('Fallo del API: no se pudo iniciar sesión en el API — POST /auth/login 401');
    expect(api.softFailed).toBe(true);

    const [db] = normalizeSteps({ logins: { failed: true, failReason: null, error: 'timeout de la consulta', ms: 10 } });
    expect(db.note).toBe('falló: timeout de la consulta (no se creó ningún login)');

    const [off] = normalizeSteps({ logins: { disabled: true, ms: 0 } });
    expect(off.note).toBe('apagado (SYNC_LOGINS=0)');
    expect(off.softFailed).toBe(false);
  });

  it('nuevos/inscripcion con apiFailed: "Fallo del API: <motivo legible>"', () => {
    const rows = normalizeSteps({
      nuevos: { apiFailed: true, failReason: 'api_inalcanzable', error: 'fetch failed', ms: 5000 },
      inscripcion: { apiFailed: true, failReason: 'job_timeout', error: 'sin terminar', desde: '2026-09-20', lotes: 2, ms: 9000 },
      logins: { candidates: 0, eligible: 0, sent: 0, created: 0, ms: 5 },
    });
    expect(rows.map((r) => r.name)).toEqual(['nuevos', 'inscripcion', 'logins']);
    expect(rows[0].note).toBe('Fallo del API: API inalcanzable (red, DNS o reintentos agotados) — fetch failed');
    expect(rows[0].softFailed).toBe(true);
    expect(rows[0].crashed).toBe(false);
    expect(rows[1].note).toBe(
      'Fallo del API: la carga no terminó a tiempo — sin terminar · desde 2026-09-20 · lotes aplicados antes del fallo 2',
    );
    // Código desconocido o ausente.
    const [odd] = normalizeSteps({ nuevos: { apiFailed: true, failReason: 'otro_codigo', ms: 1 } });
    expect(odd.note).toBe('Fallo del API: otro_codigo');
    expect(apiFailReasonLabel(null)).toBe('motivo desconocido');
    expect(apiFailReasonLabel('job_error')).toBe('la carga terminó en error en el API');
  });

  it('nuevos con PATCH de tipo de precio fallido y dobles con retenidos ya en v2', () => {
    const rows = normalizeSteps({
      dobles: { pairs: 4, held: 4, heldSales: 2, heldInV2: 2, ms: 300 },
      nuevos: { inserted: 3, skipped: 0, held: 4, rejected: 0, priceTypeFailed: 2, priceTypeFailCode: 'patch_error', ms: 800 },
    });
    expect(rows[0].note).toBe('pares 4 · retenidos 4 (ventas omitidas de 2; 2 ya con ficha en v2)');
    expect(rows[1].note).toBe('tipo de precio sin actualizar 2 (el API rechazó la actualización (PATCH))');
    const [dobles] = normalizeSteps({ dobles: { pairs: 4, held: 4, heldSales: 4, heldInV2: 0 } });
    expect(dobles.note).toBe('pares 4 · retenidos 4 (ventas omitidas de 4)');
  });

  it('los avisos de un paso salen con su etiqueta', () => {
    const [pos] = normalizeSteps({
      'ventas-pos': { migrated: 1, warnings: ['sucursal_sin_fila:404', 'otro_aviso'], ms: 1 },
    });
    expect(pos.note).toBe('avisos: Sucursal 404 sin fila en v2, otro_aviso');
  });
});

describe('syncCodeLabel (avisos y motivos del runner)', () => {
  it('etiqueta en español cada código nuevo de la ronda del 23-sep', () => {
    const codes = [
      'nuevos_api_fallo',
      'nuevos_rechazados',
      'inscripcion_api_fallo',
      'precio_no_actualizado',
      'logins_api_fallo',
      'logins_fallo',
      'logins_endpoint_no_disponible',
      'logins_tope_excedido',
      'retenidos_en_v2_no_medido',
      'retenido_con_ficha_y_nativo_activo',
      'pedidos_online_omitidos',
    ];
    for (const c of codes) {
      expect(SYNC_CODE_LABELS[c]).toBeTruthy();
      expect(syncCodeLabel(c)).not.toBe(c);
      expect(syncCodeLabel(c)).not.toContain('_');
    }
    expect(syncCodeLabel('nuevos_api_fallo')).toBe('Clientes nuevos: el API no respondió');
    expect(syncCodeLabel('logins_tope_excedido')).toBe('Logins faltantes: tope por corrida excedido');
  });

  it('prefijos parametrizados, detalle entre corchetes y códigos desconocidos', () => {
    expect(syncCodeLabel('sucursal_sin_fila:404')).toBe('Sucursal 404 sin fila en v2');
    expect(syncCodeLabel('sucursal_sin_fila:office-12')).toBe('Oficina legacy 12 sin clave de sucursal');
    expect(syncCodeLabel('retenido_con_ficha_y_nativo_activo:1787562')).toBe(
      'Retenido 1787562: ya tiene ficha en v2 y su nativo sigue activo',
    );
    expect(syncCodeLabel('nuevos_rechazados[3]')).toBe('Clientes nuevos: el API rechazó altas [3]');
    // Sin parámetro o con prefijo desconocido: tal cual.
    expect(syncCodeLabel('sucursal_sin_fila:')).toBe('sucursal_sin_fila:');
    expect(syncCodeLabel('otro:1')).toBe('otro:1');
    expect(syncCodeLabel('legacy_no_listo')).toBe('legacy_no_listo');
    expect(syncCodeText('logins_fallo')).toBe('Logins faltantes: falló la lectura de candidatos (logins_fallo)');
    expect(syncCodeText('paridad_roja')).toBe('paridad_roja');
  });

  it('runStateText usa la etiqueta del motivo', () => {
    expect(runStateText({ status: 'warn', durationMs: 256_000, reason: 'nuevos_api_fallo' })).toBe(
      'warn (Clientes nuevos: el API no respondió) en 4 m 16 s',
    );
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

  // El migrador (auto/record.js readReleasedPairs) trata 'dismissed' igual que
  // 'released': deja de retener el par y la siguiente ventana INSERTA la ficha
  // legacy. 'merged' (y 'renumbered') se retienen SIEMPRE (migrador f8ede00: readKeptHolds).
  it('los textos de decisión dicen lo que hace el runner', () => {
    const dismissed = HOLD_DECISION_UI.dismissed.description;
    expect(dismissed).toContain('igual que Liberar');
    expect(dismissed).toContain('INSERTA la ficha legacy');
    expect(dismissed).not.toMatch(/NO se insertar/i);
    expect(HOLD_DECISION_UI.dismissed.destructive).toBe(true);
    expect(HOLD_DECISION_UI.released.description).toContain('insertará la ficha legacy');

    const merged = HOLD_DECISION_UI.merged.description;
    expect(merged).toContain('NUNCA insertará esa ficha legacy');
    expect(merged).toContain('45 días');
    expect(merged).not.toContain('deja de bloquear');

    expect(HOLD_DECISIONS).toEqual(['renumbered', 'merged', 'released', 'dismissed']);
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

describe('legacySyncErrorInfo', () => {
  it('distingue 403, 503 (migración 150), sin respuesta y mensaje del backend', () => {
    expect(legacySyncErrorInfo({ response: { status: 403, data: {} } }, 'f').message).toContain('super_admin');
    const pending = legacySyncErrorInfo(
      { response: { status: 503, data: { code: 'SYNC_MIGRATION_PENDING', message: 'Falta la 150' } } },
      'f',
    );
    expect(pending).toEqual({ status: 503, code: 'SYNC_MIGRATION_PENDING', message: 'Falta la 150' });
    // 503 sin código del módulo: puede ser el API caído, no solo la 150.
    const bare503 = legacySyncErrorInfo({ response: { status: 503, data: {} } }, 'f');
    expect(bare503.code).toBeNull();
    expect(bare503.message).toContain('503');
    expect(bare503.message).toContain('migración 150');
    expect(legacySyncErrorInfo({ message: 'Network Error' }, 'No se pudo cargar')).toEqual({
      status: null,
      code: null,
      message: 'No se pudo cargar (sin respuesta del API).',
    });
    expect(
      legacySyncErrorInfo({ response: { status: 409, data: { code: 'SYNC_HOLD_NOT_PENDING', message: ['Ya decidida'] } } }, 'f'),
    ).toEqual({ status: 409, code: 'SYNC_HOLD_NOT_PENDING', message: 'Ya decidida' });
    expect(legacySyncErrorInfo(null, 'respaldo').message).toBe('respaldo (sin respuesta del API).');
  });
});

describe('ensayo dry-run y puesta en marcha', () => {
  const DRY: LegacySyncRun = { ...RUN, id: 'd1', mode: 'dry-run', runKey: 'auto-2026-09-23T15:05Z', startedAt: '2026-09-23T15:05:02.000Z', startedAtCdmx: '2026-09-23 09:05:02', legacyWatermarkCdmx: '2026-09-23 08:18:44' };
  const base = {
    migrationApplied: true,
    autoEnabled: false,
    lastRun: null,
    lastOkRun: null,
    lastDryRun: null,
    watchdog: { enabled: false, env: 'LEGACY_SYNC_WATCHDOG' },
  };

  it('la frase usa el último ensayo cuando no hay corridas reales', () => {
    expect(
      statusPhrase({ lastRun: null, lastDryRun: DRY, nextExpectedCdmx: '2026-09-23 11:05', nowCdmx: '2026-09-23 09:40:00' }),
    ).toBe(
      'Sin corridas reales · último ensayo (dry-run) 09:05 CDMX (15:05 UTC) · ok en 7 m 38 s · copia del legacy hasta 08:18 · próxima 11:05',
    );
    // Con corrida real manda la real aunque haya ensayo.
    expect(
      statusPhrase({ lastRun: RUN, lastDryRun: DRY, nextExpectedCdmx: '2026-09-22 23:05', nowCdmx: '2026-09-22 21:40:00' }),
    ).toMatch(/^Última corrida 21:05 CDMX/);
  });

  it('displayedRun: real primero, luego el ensayo, si no nada', () => {
    expect(displayedRun({ lastRun: RUN, lastDryRun: DRY })).toEqual({ run: RUN, isDryRun: false });
    expect(displayedRun({ lastRun: null, lastDryRun: DRY })).toEqual({ run: DRY, isDryRun: true });
    expect(displayedRun({ lastRun: null })).toBeNull();
  });

  it('setupSteps: sin la 150 todo pendiente; marca lo que ya se ve en el estado', () => {
    const none = setupSteps({ ...base, migrationApplied: false });
    expect(none.map((s) => s.key)).toEqual(['mig150', 'tarea', 'ensayo', 'encendido', 'vigilancia', 'primera_ok']);
    expect(none.every((s) => !s.done)).toBe(true);
    expect(needsSetup(none)).toBe(true);
    expect(none[0].how).toContain('150_legacy_sync_runs.sql');

    const rehearsing = setupSteps({ ...base, lastDryRun: DRY }, Array.from({ length: 5 }, () => ({ mode: 'dry-run' as const })));
    expect(rehearsing.find((s) => s.key === 'tarea')?.done).toBe(true);
    expect(rehearsing.find((s) => s.key === 'ensayo')?.done).toBe(false);
    expect(rehearsing.find((s) => s.key === 'ensayo')?.how).toContain('5/12');

    const rehearsed = setupSteps({ ...base, lastDryRun: DRY }, Array.from({ length: 14 }, () => ({ mode: 'dry-run' as const })));
    expect(rehearsed.find((s) => s.key === 'ensayo')?.done).toBe(true);
    expect(rehearsed.find((s) => s.key === 'ensayo')?.how).toContain('12/12');

    const live = setupSteps({
      ...base,
      autoEnabled: true,
      lastRun: RUN,
      lastOkRun: RUN,
      watchdog: { enabled: true, env: 'LEGACY_SYNC_WATCHDOG' },
    });
    expect(live.every((s) => s.done)).toBe(true);
    expect(needsSetup(live)).toBe(false);
  });
});

describe('403 y polling', () => {
  it('deja de consultar tras un 403 y sigue cada 60 s con otros errores', () => {
    const forbidden = { response: { status: 403, data: {} } };
    expect(isForbiddenError(forbidden)).toBe(true);
    expect(isForbiddenError({ response: { status: 500, data: {} } })).toBe(false);
    expect(isForbiddenError(null)).toBe(false);
    expect(statusPollInterval(forbidden, 60_000)).toBe(false);
    expect(statusPollInterval({ message: 'Network Error' }, 60_000)).toBe(60_000);
    expect(statusPollInterval(null, 60_000)).toBe(60_000);
  });
});

describe('inductionAutoGate (bloqueo suave de Envíos automáticos)', () => {
  const criterios = Array.from({ length: 7 }, (_, i) => ({ criterio: `c${i + 1}`, ok: true, detalle: `d${i + 1}` }));

  it('7/7 enciende sin confirmar', () => {
    const g = inductionAutoGate({ ready: { ready: true, score: '7/7', criterios } });
    expect(g.state).toBe('listo');
    expect(g.needsConfirm).toBe(false);
    expect(g.chip).toEqual({ label: 'WhatsApp listo 7/7', tone: 'verde' });
    expect(g.failing).toEqual([]);
  });

  it('no listo: pide confirmación con los criterios en rojo', () => {
    const mixed = criterios.map((c, i) => (i === 0 || i === 3 ? { ...c, ok: false } : c));
    const g = inductionAutoGate({ ready: { ready: false, score: '5/7', criterios: mixed } });
    expect(g.state).toBe('no_listo');
    expect(g.needsConfirm).toBe(true);
    expect(g.chip).toEqual({ label: 'WhatsApp listo 5/7', tone: 'rojo' });
    expect(g.failing.map((c) => c.criterio)).toEqual(['c1', 'c4']);
  });

  it('sin acceso, error o consultando: desconocido y también confirma', () => {
    const forbidden = inductionAutoGate({ ready: undefined, error: { response: { status: 403, data: {} } } });
    expect(forbidden.state).toBe('desconocido');
    expect(forbidden.needsConfirm).toBe(true);
    expect(forbidden.chip.label).toBe('WhatsApp listo: sin acceso');
    expect(forbidden.reason).toContain('Sistemas');

    const down = inductionAutoGate({ ready: undefined, error: { message: 'Network Error' } });
    expect(down.chip.label).toBe('WhatsApp listo: sin datos');
    expect(down.reason).toContain('sin respuesta del API');

    const loading = inductionAutoGate({ ready: undefined, loading: true });
    expect(loading.chip.label).toContain('consultando');
    expect(loading.needsConfirm).toBe(true);

    expect(inductionAutoGate({ ready: null }).chip).toEqual({ label: 'WhatsApp listo: sin datos', tone: 'sin_dato' });
  });
});
