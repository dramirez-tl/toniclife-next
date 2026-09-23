// legacy-sync/format.ts - Lógica PURA del panel "Sincronización legacy"
// (contrato de sincronización §5.5, §6, §7): semáforo, frase de estado,
// siguiente ventana, chips de paridad A..K/D2/T con leyenda, tabla de pasos,
// retenciones y criterios "WhatsApp listo". Sin React ni fetch: todo se
// prueba con vitest (format.test.ts).
//
// Reloj: el API ya manda las horas CDMX como texto 'YYYY-MM-DD HH:mm:ss'
// (CDMX = UTC-6 fijo) y las UTC en ISO; aquí solo se recortan/etiquetan.
// Nunca se usa new Date() para decidir un borde de negocio.

import type {
  LegacySyncHoldDecision,
  LegacySyncHoldStatus,
  LegacySyncRun,
  LegacySyncRunStatus,
  LegacySyncSemaphore,
  LegacySyncStatus,
  LegacySyncWhatsappCriterion,
  LegacySyncWhatsappReady,
} from '@/types/legacySync';

// ── Semáforo ──

export interface SemaphoreUi {
  label: string;
  /** Punto de color (círculo). */
  dotClass: string;
  /** Caja del encabezado. */
  boxClass: string;
}

export const SEMAFORO_UI: Record<LegacySyncSemaphore, SemaphoreUi> = {
  verde: {
    label: 'Sincronizada',
    dotClass: 'bg-green-500',
    boxClass: 'border-green-200 bg-green-50 text-green-900',
  },
  ambar: {
    label: 'Con avisos',
    dotClass: 'bg-amber-500',
    boxClass: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  rojo: {
    label: 'Con fallas',
    dotClass: 'bg-red-500',
    boxClass: 'border-red-200 bg-red-50 text-red-900',
  },
  sin_datos: {
    label: 'Sin datos',
    dotClass: 'bg-gray-400',
    boxClass: 'border-gray-200 bg-gray-50 text-gray-700',
  },
};

// ── Estados de corrida y códigos de salida (V14) ──

export const RUN_STATUS_UI: Record<
  LegacySyncRunStatus,
  { label: string; className: string }
> = {
  running: {
    label: 'en curso',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  ok: { label: 'ok', className: 'border-green-200 bg-green-50 text-green-700' },
  warn: {
    label: 'warn',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  noop: {
    label: 'noop',
    className: 'border-gray-200 bg-gray-50 text-gray-600',
  },
  skipped: {
    label: 'omitida',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  error: { label: 'error', className: 'border-red-200 bg-red-50 text-red-700' },
  invalid: {
    label: 'inválida',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  timeout: {
    label: 'timeout',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
};

export const RUN_STATUS_HELP: Record<LegacySyncRunStatus, string> = {
  running: 'La corrida sigue en marcha (o quedó sin cerrar).',
  ok: 'Escribió y la matriz de verificación quedó en verde.',
  warn: 'Escribió con filas fallidas o paridad en ámbar.',
  noop: 'Sin novedades o interruptor apagado: no escribió nada.',
  skipped:
    'La copia del legacy no estaba lista (o era tarde): no escribió nada.',
  error: 'Una fase tronó; lo escrito es idempotente y la siguiente ventana lo corrige.',
  invalid: 'La copia del legacy cambió durante la corrida.',
  timeout: 'El vigilante (watchdog) la abortó a los 50 min.',
};

/** Códigos de salida del migrador --auto (contrato V14). */
export const EXIT_CODE_LABELS: Record<number, string> = {
  0: 'ok / noop',
  1: 'warn: filas fallidas o paridad ámbar',
  2: 'error fatal',
  3: 'error: una fase tronó (crashed)',
  4: 'omitida: legacy no listo, tarde o conteo bajo',
  5: 'lock ocupado (otra instancia corriendo)',
  6: 'inválida: la huella del legacy cambió',
  8: 'base de datos inalcanzable',
  9: 'paridad ROJA (datos escritos, revisar)',
  124: 'timeout del vigilante',
};

export function exitCodeLabel(code: number | null | undefined): string {
  if (code === null || code === undefined) return 'sin código';
  const known = EXIT_CODE_LABELS[code];
  return known ? `${code} · ${known}` : `${code} · desconocido`;
}

// ── Tiempo ──

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** '7 m 38 s', '45 s', '1 h 02 m', '<1 s' o '—'. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  if (ms < 1000) return '<1 s';
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} s`;
  const totalMin = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (totalMin < 60) return `${totalMin} m ${pad2(sec)} s`;
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  return `${h} h ${pad2(min)} m`;
}

/** 'YYYY-MM-DD HH:mm[:ss]' → 'HH:mm' (null si no tiene la forma). */
export function hhmm(cdmxText: string | null | undefined): string | null {
  if (!cdmxText) return null;
  const m = /^\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2})/.exec(cdmxText);
  return m ? m[1] : null;
}

/** 'YYYY-MM-DD HH:mm[:ss]' → 'YYYY-MM-DD' (null si no tiene la forma). */
export function dayOf(cdmxText: string | null | undefined): string | null {
  if (!cdmxText) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(cdmxText);
  return m ? m[1] : null;
}

/** ISO UTC → 'HH:mm' en UTC (null si no parsea). */
export function hhmmUtc(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

/** Suma días a 'YYYY-MM-DD' (aritmética UTC, sin zona horaria). */
function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Etiqueta de la siguiente ventana (hora impar :05 CDMX) relativa a hoy CDMX:
 * '23:05' si es hoy, 'mañana 01:05' si es el día siguiente, si no la fecha.
 */
export function nextWindowLabel(
  nextExpectedCdmx: string | null | undefined,
  nowCdmx: string | null | undefined,
): string {
  const time = hhmm(nextExpectedCdmx);
  const day = dayOf(nextExpectedCdmx);
  if (!time || !day) return '—';
  const today = dayOf(nowCdmx);
  if (!today || day === today) return time;
  if (day === addDaysYmd(today, 1)) return `mañana ${time}`;
  return `${day} ${time}`;
}

/** 'ok en 7 m 38 s', 'omitida (legacy_no_listo) en 41 s', 'en curso'. */
export function runStateText(
  run: Pick<LegacySyncRun, 'status' | 'durationMs' | 'reason'>,
): string {
  if (run.status === 'running') return 'en curso';
  const label = RUN_STATUS_UI[run.status]?.label ?? run.status;
  const reason = run.reason ? ` (${run.reason})` : '';
  const dur = run.durationMs === null ? '' : ` en ${formatDuration(run.durationMs)}`;
  return `${label}${reason}${dur}`;
}

/** Partes "<prefijo> HH:MM CDMX (HH:MM UTC) · estado · copia del legacy hasta HH:MM". */
function runPhraseParts(
  run: LegacySyncRun,
  prefix: string,
  nowCdmx: string | null | undefined,
): string[] {
  const startDay = dayOf(run.startedAtCdmx);
  const today = dayOf(nowCdmx);
  const when =
    startDay && today && startDay !== today
      ? `${startDay} ${hhmm(run.startedAtCdmx) ?? '?'}`
      : (hhmm(run.startedAtCdmx) ?? '?');
  const utc = hhmmUtc(run.startedAt);
  const parts = [
    `${prefix} ${when} CDMX${utc ? ` (${utc} UTC)` : ''}`,
    runStateText(run),
  ];
  const wm = hhmm(run.legacyWatermarkCdmx);
  if (wm) {
    const wmDay = dayOf(run.legacyWatermarkCdmx);
    parts.push(
      `copia del legacy hasta ${wmDay && startDay && wmDay !== startDay ? `${wmDay} ` : ''}${wm}`,
    );
  }
  return parts;
}

/**
 * Frase del encabezado (§5.5): "Última corrida 21:05 CDMX (03:05 UTC) · ok en
 * 7 m 38 s · copia del legacy hasta 20:18 · próxima 23:05". Si la corrida no
 * es de hoy CDMX se antepone su fecha. Sin corridas reales pero con ensayo
 * (dry-run, que no cuenta para el semáforo): "Sin corridas reales · último
 * ensayo (dry-run) …". Sin nada: "Sin corridas registradas · próxima HH:05".
 */
export function statusPhrase(
  s: Pick<LegacySyncStatus, 'lastRun' | 'nextExpectedCdmx' | 'nowCdmx'> &
    Partial<Pick<LegacySyncStatus, 'lastDryRun'>>,
): string {
  const next = `próxima ${nextWindowLabel(s.nextExpectedCdmx, s.nowCdmx)}`;
  if (s.lastRun) {
    return [...runPhraseParts(s.lastRun, 'Última corrida', s.nowCdmx), next].join(' · ');
  }
  if (s.lastDryRun) {
    return [
      'Sin corridas reales',
      ...runPhraseParts(s.lastDryRun, 'último ensayo (dry-run)', s.nowCdmx),
      next,
    ].join(' · ');
  }
  return `Sin corridas registradas · ${next}`;
}

/**
 * Corrida que se muestra en "Pasos" y "Matriz": la última real; si todavía no
 * hay (ensayo de 24 h en dry-run), el último ensayo, marcado como tal.
 */
export function displayedRun(
  s: Pick<LegacySyncStatus, 'lastRun'> & Partial<Pick<LegacySyncStatus, 'lastDryRun'>>,
): { run: LegacySyncRun; isDryRun: boolean } | null {
  if (s.lastRun) return { run: s.lastRun, isDryRun: s.lastRun.mode === 'dry-run' };
  if (s.lastDryRun) return { run: s.lastDryRun, isDryRun: true };
  return null;
}

// ── Estado "sin datos": pasos que faltan (§8 pasos 4-7) ──

export interface SetupStep {
  key: 'mig150' | 'tarea' | 'ensayo' | 'encendido' | 'vigilancia' | 'primera_ok';
  label: string;
  /** Cómo se hace (DBeaver, PowerShell, Railway, este panel). */
  how: string;
  done: boolean;
}

/** Ventanas del ensayo (b) del contrato §7: 24 h = 12 horas impares. */
export const DRY_RUN_WINDOWS_REQUIRED = 12;

/**
 * Lista de puesta en marcha que el panel muestra mientras no hay datos (mig
 * 150 sin aplicar, sin corridas o sin la primera corrida real ok). Todo se
 * deduce del estado y de las últimas corridas: nada se adivina con el reloj.
 */
export function setupSteps(
  s: Pick<
    LegacySyncStatus,
    'migrationApplied' | 'autoEnabled' | 'lastRun' | 'lastOkRun' | 'watchdog'
  > &
    Partial<Pick<LegacySyncStatus, 'lastDryRun'>>,
  runs: ReadonlyArray<Pick<LegacySyncRun, 'mode'>> = [],
): SetupStep[] {
  const anyRun = !!s.lastRun || !!s.lastDryRun || runs.length > 0;
  const dryRuns = runs.filter((r) => r.mode === 'dry-run').length;
  const realRun = !!s.lastRun && s.lastRun.mode !== 'dry-run';
  return [
    {
      key: 'mig150',
      label: 'Aplicar la migración 150 (bitácora legacy_sync_runs / legacy_sync_holds e interruptor)',
      how: 'DBeaver: toniclife-api/sql/migrations/150_legacy_sync_runs.sql como script completo (Alt+X) y COMMIT.',
      done: s.migrationApplied,
    },
    {
      key: 'tarea',
      label: 'Registrar la tarea programada de ensayo en la PC de Sistemas',
      how: 'PowerShell elevado en toniclife-migration-sales-mlm: .\\scripts\\register-scheduled-task.ps1 -DryRun (horas impares HH:05).',
      done: s.migrationApplied && anyRun,
    },
    {
      key: 'ensayo',
      label: `Ensayo de 24 h en dry-run (${DRY_RUN_WINDOWS_REQUIRED} ventanas; ≥ 11 listas antes de HH:15 y 0 inválidas)`,
      how: `Revisar las corridas "dry-run" de abajo: van ${Math.min(dryRuns, DRY_RUN_WINDOWS_REQUIRED)}/${DRY_RUN_WINDOWS_REQUIRED} en las últimas 24.`,
      done: realRun || dryRuns >= DRY_RUN_WINDOWS_REQUIRED,
    },
    {
      key: 'encendido',
      label: 'GO: registrar la tarea en modo real y encender «Sincronización automática»',
      how: '.\\scripts\\register-scheduled-task.ps1 -Force y el interruptor de este panel, antes de una hora impar laboral, con Sistemas mirando.',
      done: s.autoEnabled,
    },
    {
      key: 'vigilancia',
      label: 'Encender la vigilancia (alertas a Sistemas)',
      how: 'Railway, solo staging: variable LEGACY_SYNC_WATCHDOG=true en toniclife-api.',
      done: s.watchdog?.enabled === true,
    },
    {
      key: 'primera_ok',
      label: 'Primera corrida real en ok',
      how: 'La registra el runner sola; compárala con verify-sync-*.js la primera vez.',
      done: !!s.lastOkRun,
    },
  ];
}

/** true mientras falte algo de la puesta en marcha (el panel muestra la lista). */
export function needsSetup(steps: SetupStep[]): boolean {
  return steps.some((st) => !st.done);
}

// ── Paridad (§7) ──

export type ParityVerdict = 'verde' | 'ambar' | 'rojo' | 'na' | 'sin_dato';

export const PARITY_ORDER = [
  'A',
  'B',
  'C',
  'D',
  'D2',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'T',
] as const;

/** Letras cuyo rojo gatea la corrida (exit 9). J solo condiciona WhatsApp. */
export const PARITY_GATING: ReadonlySet<string> = new Set([
  'C',
  'D',
  'D2',
  'E',
  'G',
  'H',
  'I',
]);

export const PARITY_LEGEND: Record<string, { title: string; description: string }> = {
  A: {
    title: 'Ventas POS por sucursal-día',
    description:
      'Tickets y totales por sucursal y día hasta el día anterior a la copia: ≥ 85 % de pares dentro de ±0.5 % (MXN) / ±2.5 % (USD) y total del periodo ±1 %. Ámbar tolerado (copias históricas).',
  },
  B: {
    title: 'Ventas del día de la copia',
    description: 'Informativo: la copia es intradía y hay cuarentena de 180 min.',
  },
  C: {
    title: 'Ventas online',
    description: 'Pedidos ECOMMERCE del legacy vs orders con legacy_id en v2 (iguales).',
  },
  D: {
    title: 'Altas por día (14 días)',
    description:
      'Cada alta legacy de los últimos 14 días tiene ficha en v2, salvo las retenidas por doble identidad.',
  },
  D2: {
    title: 'Pares nativo↔legacy por teléfono',
    description:
      'Nativos (≥ 2000000) con el mismo teléfono que una alta legacy reciente: no deben aumentar respecto de la corrida anterior.',
  },
  E: {
    title: 'Puntos por distribuidor',
    description:
      'Puntos personales del periodo por cliente, medidos contra la misma copia que usó la corrida (±0.01 por cliente, sumas iguales).',
  },
  F: {
    title: 'Rangos',
    description: 'Informativo: % de coincidencia del rango (diverge por el estimador).',
  },
  G: {
    title: 'Integridad de las M- de esta corrida',
    description:
      'Ventas legacy (M-) sin cliente, sin partidas teniendo detalle en el legacy, en sucursal de respaldo o pending vencidas: todo debe ser 0.',
  },
  H: {
    title: 'Red',
    description: 'Distribuidores activos sin nodo en la red y patrocinadores colgando: 0 y 0.',
  },
  I: {
    title: 'Estabilidad de la copia',
    description: 'La huella del legacy al terminar es la misma que al inicio; si no, la corrida es inválida.',
  },
  J: {
    title: 'WhatsApp listo',
    description:
      'Cohorte v2 ≥ cohorte legacy − retenciones, teléfonos repetidos = 0 y fallos 131026 repetidos sin exclusión = 0. Solo condiciona los envíos automáticos.',
  },
  K: {
    title: 'Comisiones',
    description: 'Informativo: cabeceras del legacy vs cálculos en v2 (nunca se sincronizan en automático).',
  },
  T: {
    title: 'Copias M-',
    description:
      'Ventas legacy duplicadas de una nativa (gemelas) detectadas: conteo y delta contra la corrida anterior (alerta si crece > 20).',
  },
};

export const PARITY_VERDICT_UI: Record<ParityVerdict, { label: string; className: string }> = {
  verde: { label: 'verde', className: 'border-green-300 bg-green-100 text-green-800' },
  ambar: { label: 'ámbar', className: 'border-amber-300 bg-amber-100 text-amber-800' },
  rojo: { label: 'rojo', className: 'border-red-300 bg-red-100 text-red-800' },
  na: { label: 'informativa', className: 'border-gray-300 bg-gray-100 text-gray-600' },
  sin_dato: { label: 'sin dato', className: 'border-dashed border-gray-300 bg-white text-gray-400' },
};

export interface ParityChip {
  key: string;
  title: string;
  verdict: ParityVerdict;
  gating: boolean;
  /** Cifras resumidas (sin PII) para el tooltip; null si no hay detalle. */
  figures: string | null;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const fmtNum = (v: unknown): string => {
  const n = num(v);
  return n === null ? '?' : new Intl.NumberFormat('es-MX').format(n);
};

const signed = (v: unknown): string => {
  const n = num(v);
  if (n === null) return '?';
  return `${n > 0 ? '+' : ''}${n}`;
};

/** 'ok'/'verde' → verde; 'ambar'/'amber' → ámbar; 'rojo'/'red' → rojo; 'na' → informativa. */
export function normalizeVerdict(v: unknown): ParityVerdict {
  const raw = isRecord(v) ? v.verdict : v;
  if (typeof raw !== 'string') return 'sin_dato';
  switch (raw.toLowerCase()) {
    case 'ok':
    case 'verde':
    case 'green':
      return 'verde';
    case 'ambar':
    case 'ámbar':
    case 'amber':
      return 'ambar';
    case 'rojo':
    case 'red':
      return 'rojo';
    case 'na':
    case 'n/a':
      return 'na';
    default:
      return 'sin_dato';
  }
}

/** Cifras de una fila con detalle (espejo de formatVerdicts del migrador). */
export function parityFigures(key: string, row: unknown): string | null {
  if (!isRecord(row)) {
    return typeof row === 'number' ? `conteo ${fmtNum(row)}` : null;
  }
  if (typeof row.error === 'string') return `ERROR ${row.error}`;
  if (typeof row.skipped === 'string') return `no evaluada (${row.skipped})`;
  const r = row;
  switch (key) {
    case 'A':
      return `pares ok ${r.pairsOkPct ?? '?'} % (${fmtNum(r.pairsOk)}/${fmtNum(r.pairs)}) · total L ${fmtNum(r.totalL)} vs V ${fmtNum(r.totalV)} (${signed(r.totalDiffPct)} %)`;
    case 'B':
      return `día ${r.day ?? '?'}: docs L ${fmtNum(r.docsL)} vs V ${fmtNum(r.docsV)} · total ${fmtNum(r.totalL)} vs ${fmtNum(r.totalV)}`;
    case 'C':
      return `online L ${fmtNum(r.nL)} vs V ${fmtNum(r.nV)}`;
    case 'D':
      return `altas L ${fmtNum(r.legacy)} / V ${fmtNum(r.v2)}: iguales ${fmtNum(r.same)}, faltan ${fmtNum(r.missing)}, excluidas ${fmtNum(r.excluded)}, fecha distinta ${fmtNum(r.dateDiff)}`;
    case 'D2':
      return `pares por teléfono ${fmtNum(r.pares)} (previo ${fmtNum(r.prevPares)}, nuevos ${fmtNum(r.duplicatesNew)}; con kit ambos ${fmtNum(r.kitAmbos)})`;
    case 'E':
      return `filas L ${fmtNum(r.rowsL)} / V ${fmtNum(r.rowsV)}: iguales ${fmtNum(r.matched)}, distintas ${fmtNum(r.mismatched)} (${r.mismatchedPct ?? '?'} %), faltan ${fmtNum(r.missing)}, excluidas ${fmtNum(r.excluded)} · suma L ${fmtNum(r.sumL)} V ${fmtNum(r.sumV)} delta_post ${fmtNum(r.sumDelta)}`;
    case 'F':
      return `rangos iguales ${fmtNum(r.same)}/${fmtNum(r.rowsL)} (${r.samePct ?? '?'} %)`;
    case 'G':
      return `M- sin cliente ${fmtNum(r.sinCliente)}, sin partidas con detalle ${fmtNum(r.sinItemsConDetalle)} (sin partidas ${fmtNum(r.sinItems)}), pending vencidas ${fmtNum(r.pendingVencidas)} · histórico sin partidas ${fmtNum(r.sinItemsHistorico)}`;
    case 'H':
      return `sin nodo ${fmtNum(r.sinNodo)}, patrocinador colgando ${fmtNum(r.sponsorColgando)}`;
    case 'I': {
      const a = typeof r.generationStart === 'string' ? r.generationStart.slice(0, 8) : 'null';
      const b = typeof r.generationEnd === 'string' ? r.generationEnd.slice(0, 8) : 'null';
      return `huella ${a} → ${b}`;
    }
    case 'J':
      return `cohorte ${r.cohort ?? '?'}: L ${fmtNum(r.cohortL)} vs V ${fmtNum(r.cohortV)} (retenciones con kit ${fmtNum(r.holdsWithKit)}) · teléfonos repetidos ${fmtNum(r.repetidos)} · 131026 repetidos ${fmtNum(r.failedRepetidos)}`;
    case 'K':
      return `comisiones L ${fmtNum(r.nL)} ($${fmtNum(r.totalL)}) · v2 ${JSON.stringify(r.v2ByStatus ?? {})}`;
    case 'T':
      return `copias M- ${r.copies === null || r.copies === undefined ? 'n/a' : fmtNum(r.copies)}${
        r.prevCopies !== null && r.prevCopies !== undefined
          ? ` (previo ${fmtNum(r.prevCopies)}, delta ${signed(r.delta)})`
          : ''
      }`;
    default: {
      const entries = Object.entries(r).filter(
        ([k, v]) => k !== 'verdict' && (typeof v === 'number' || typeof v === 'string'),
      );
      return entries.length
        ? entries.map(([k, v]) => `${k} ${String(v)}`).join(' · ')
        : null;
    }
  }
}

/**
 * Chips A..K, D2, T a partir de `parity` de la corrida. Acepta la forma plana
 * (§4.5: { A: 'ambar' }), la del detalle ({ A: { verdict, ...cifras } }) y
 * conteos sueltos (T: 793). Las letras ausentes salen como 'sin_dato'.
 */
export function normalizeParity(
  parity: Record<string, unknown> | null | undefined,
): ParityChip[] {
  const src = isRecord(parity) ? parity : {};
  const extras = Object.keys(src).filter(
    (k) => k !== 'byPeriod' && !(PARITY_ORDER as readonly string[]).includes(k),
  );
  return [...PARITY_ORDER, ...extras.sort()].map((key) => {
    const row = src[key];
    const verdict =
      row === undefined
        ? 'sin_dato'
        : typeof row === 'number'
          ? 'na'
          : normalizeVerdict(row);
    return {
      key,
      title: PARITY_LEGEND[key]?.title ?? key,
      verdict,
      gating: PARITY_GATING.has(key),
      figures: parityFigures(key, row),
    };
  });
}

/** Resumen "verde n · ámbar n · rojo n" de los chips con dato. */
export function paritySummary(chips: ParityChip[]): string {
  const count = (v: ParityVerdict) => chips.filter((c) => c.verdict === v).length;
  const parts: string[] = [];
  if (count('rojo')) parts.push(`rojo ${count('rojo')}`);
  if (count('ambar')) parts.push(`ámbar ${count('ambar')}`);
  if (count('verde')) parts.push(`verde ${count('verde')}`);
  return parts.length ? parts.join(' · ') : 'sin matriz';
}

// ── Pasos ──

export interface StepRow {
  name: string;
  /** Filas insertadas/migradas/actualizadas (null si el paso no inserta). */
  inserted: number | null;
  skippedTotal: number | null;
  /** [motivo, n] ordenado de mayor a menor. */
  skippedBy: Array<[string, number]>;
  failed: number | null;
  ms: number | null;
  crashed: boolean;
  /** Texto libre del paso (plan de periodos, intentos de la guarda, avisos…). */
  note: string | null;
}

export const STEP_ORDER = [
  'legacy-listo',
  'periodos',
  'dobles',
  'nuevos',
  'inscripcion',
  'ventas-pos',
  'ventas-online',
  'puntos',
  'rangos',
  'primer-nivel',
  'redes',
  'verificacion',
] as const;

export const STEP_LABELS: Record<string, string> = {
  'legacy-listo': 'Guarda "legacy listo"',
  periodos: 'Plan de periodos',
  dobles: 'Dobles identidades',
  nuevos: 'Clientes nuevos',
  inscripcion: 'Inscripción (fecha/kit)',
  'ventas-pos': 'Ventas POS',
  'ventas-online': 'Ventas online',
  puntos: 'Puntos',
  rangos: 'Rangos',
  'primer-nivel': 'Primer nivel',
  redes: 'Redes',
  verificacion: 'Verificación (matriz)',
};

export function stepLabel(name: string): string {
  return STEP_LABELS[name] ?? name;
}

function stepNote(name: string, r: Record<string, unknown>): string | null {
  const notes: string[] = [];
  if (r.crashed === true) {
    notes.push(
      `tronó${typeof r.crashReason === 'string' ? ` (${r.crashReason})` : ''}${typeof r.error === 'string' ? `: ${r.error}` : ''}`,
    );
  }
  if (name === 'legacy-listo') {
    const attempts = num(r.attempts);
    const ready = r.ready === true;
    notes.push(
      `${ready ? 'lista' : 'no lista'}${attempts !== null ? ` en ${attempts} intento(s)` : ''}${
        typeof r.readyAtCdmx === 'string' ? ` · ${hhmm(r.readyAtCdmx) ?? r.readyAtCdmx} CDMX` : ''
      }${typeof r.status === 'string' ? ` · ${r.status}` : ''}`,
    );
    if (Array.isArray(r.reasons) && r.reasons.length) {
      notes.push(r.reasons.map(String).join(', '));
    }
  }
  if (name === 'periodos') {
    if (Array.isArray(r.plan) && r.plan.length) notes.push(r.plan.map(String).join(' | '));
    else if (Array.isArray(r.plan)) notes.push('sin periodos en el plan');
    if (typeof r.copyDay === 'string') notes.push(`copy_day ${r.copyDay}`);
  }
  if (name === 'dobles') {
    const pairs = num(r.pairs);
    const held = num(r.held);
    if (pairs !== null || held !== null) {
      notes.push(`pares ${pairs ?? '?'} · retenidos ${held ?? '?'}`);
    }
  }
  if (name === 'inscripcion') {
    const nf = num(r.notFound);
    if (typeof r.desde === 'string') notes.push(`desde ${r.desde}`);
    if (nf !== null && nf > 0) notes.push(`no encontrados ${nf}`);
  }
  if (name === 'verificacion' && Array.isArray(r.periodsMeasured)) {
    notes.push(
      r.periodsMeasured.length
        ? `periodos medidos ${r.periodsMeasured.map(String).join(', ')}`
        : 'sin periodos medidos',
    );
  }
  if (isRecord(r.byPeriod)) {
    for (const [p, v] of Object.entries(r.byPeriod)) {
      if (isRecord(v) && typeof v.skippedPhase === 'string') {
        notes.push(`periodo ${p}: fase omitida (${v.skippedPhase})`);
      }
    }
  }
  if (Array.isArray(r.warnings) && r.warnings.length) {
    notes.push(`avisos: ${r.warnings.map(String).join(', ')}`);
  }
  return notes.length ? notes.join(' · ') : null;
}

/** Filas de la tabla de pasos (insertados / omitidos por motivo / fallidos / ms). */
export function normalizeSteps(
  steps: Record<string, unknown> | null | undefined,
): StepRow[] {
  const src = isRecord(steps) ? steps : {};
  const order = STEP_ORDER as readonly string[];
  const names = Object.keys(src).sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return names.map((name) => {
    const raw = src[name];
    const r = isRecord(raw) ? raw : {};
    const inserted = num(r.migrated) ?? num(r.inserted) ?? num(r.updated);
    const skippedBy: Array<[string, number]> = [];
    if (isRecord(r.skipped)) {
      for (const [k, v] of Object.entries(r.skipped)) {
        const n = num(v);
        if (n !== null) skippedBy.push([k, n]);
      }
    } else if (isRecord(r.skippedBy)) {
      for (const [k, v] of Object.entries(r.skippedBy)) {
        const n = num(v);
        if (n !== null) skippedBy.push([k, n]);
      }
    }
    const held = num(r.held);
    if (held !== null && held > 0) skippedBy.push(['retenido', held]);
    skippedBy.sort((a, b) => b[1] - a[1]);
    const skippedTotal =
      num(r.skippedTotal) ??
      (typeof r.skipped === 'number' ? r.skipped : null) ??
      (skippedBy.length ? skippedBy.reduce((s, [, n]) => s + n, 0) : null);
    return {
      name,
      inserted,
      skippedTotal,
      skippedBy,
      failed: num(r.failed),
      ms: num(r.ms),
      crashed: r.crashed === true,
      note: stepNote(name, r),
    };
  });
}

// ── Retenciones (dobles identidades) ──

export const HOLD_SIGNAL_LABELS: Record<string, string> = {
  PHONE: 'teléfono',
  CURP: 'CURP',
  NAME_DOB: 'nombre + fecha de nacimiento',
  EMAIL: 'correo',
  RFC: 'RFC',
};

export function signalLabel(signal: string): string {
  return HOLD_SIGNAL_LABELS[signal] ?? signal.toLowerCase();
}

export const HOLD_STATUS_LABELS: Record<LegacySyncHoldStatus, string> = {
  pending: 'pendiente',
  renumbered: 'renumerado',
  merged: 'fusionado',
  released: 'liberado',
  dismissed: 'descartado',
};

export interface HoldDecisionUi {
  label: string;
  title: string;
  description: string;
  destructive: boolean;
}

export const HOLD_DECISION_UI: Record<LegacySyncHoldDecision, HoldDecisionUi> = {
  renumbered: {
    label: 'Renumerado',
    title: 'Marcar como renumerado',
    description:
      'Ya se ejecutó el SQL de renumeración en DBeaver: el nativo tomó el número legacy. La retención deja de bloquear y la siguiente ventana ya no intentará insertar la ficha legacy.',
    destructive: false,
  },
  merged: {
    label: 'Fusionado',
    title: 'Marcar como fusionado',
    description:
      'Las dos fichas se fusionaron a mano (ventas, puntos y red movidos a una sola). La retención deja de bloquear.',
    destructive: false,
  },
  released: {
    label: 'Liberar',
    title: 'Liberar la retención',
    description:
      'Se revisó y SON dos personas distintas: la siguiente ventana de sincronización insertará la ficha legacy como cliente nuevo.',
    destructive: false,
  },
  dismissed: {
    label: 'Descartar',
    title: 'Descartar la retención',
    description:
      'No se hará nada con este par: la ficha legacy NO se insertará y el nativo queda como está. Úsalo solo si el alta legacy es basura o ya no aplica.',
    destructive: true,
  },
};

export const HOLD_DECISIONS: readonly LegacySyncHoldDecision[] = [
  'renumbered',
  'merged',
  'released',
  'dismissed',
];

/** 'hace menos de 1 h', 'hace 5 h', 'hace 2 d 4 h'. */
export function holdAgeText(ageHours: number | null | undefined): string {
  if (ageHours === null || ageHours === undefined || !Number.isFinite(ageHours)) {
    return '—';
  }
  if (ageHours < 1) return 'hace menos de 1 h';
  const h = Math.floor(ageHours);
  if (h < 48) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? `hace ${d} d ${rest} h` : `hace ${d} d`;
}

// ── WhatsApp listo (§6) ──

/** Etiquetas cortas de los 7 criterios, en el orden en que el API los manda. */
export const WHATSAPP_CRITERIA_SHORT: readonly string[] = [
  'Sincronización encendida y sana (3 ok seguidas + la de 09:05)',
  'Paridad D, D2, E, G, H en verde (3 corridas)',
  'Retenciones pendientes con kit = 0',
  'Teléfonos repetidos en la cohorte = 0',
  'Política de fallos repetidos (131026 ×2 / 131049)',
  'Números de prueba excluidos y kit cobrado (D10)',
  'WHATSAPP_ENABLED en un solo entorno',
];

export function criterionShortLabel(index: number, fallback: string): string {
  return WHATSAPP_CRITERIA_SHORT[index] ?? fallback;
}

export interface WhatsappChip {
  label: string;
  tone: 'verde' | 'rojo' | 'sin_dato';
}

/** Chip "WhatsApp listo n/7" (verde si todo pasa, rojo si falta algo, gris sin datos). */
export function whatsappChip(
  ready: LegacySyncWhatsappReady | null | undefined,
): WhatsappChip {
  if (!ready || !Array.isArray(ready.criterios)) {
    return { label: 'WhatsApp listo: sin datos', tone: 'sin_dato' };
  }
  const score = ready.score || `${ready.criterios.filter((c) => c.ok).length}/${ready.criterios.length}`;
  return ready.ready
    ? { label: `WhatsApp listo ${score}`, tone: 'verde' }
    : { label: `WhatsApp listo ${score}`, tone: 'rojo' };
}

export function failingCriteria(
  ready: LegacySyncWhatsappReady | null | undefined,
): LegacySyncWhatsappCriterion[] {
  if (!ready || !Array.isArray(ready.criterios)) return [];
  return ready.criterios.filter((c) => !c.ok);
}

// ── Errores del API ({ statusCode, code, message, details? }) ──

export interface LegacySyncErrorInfo {
  status: number | null;
  code: string | null;
  message: string;
}

/**
 * Lee el cuerpo uniforme de error del módulo (axios: err.response.data) y
 * traduce los casos que el panel distingue: 403 (rol sin acceso), 503
 * SYNC_MIGRATION_PENDING (falta la migración 150) y sin respuesta (API caído).
 */
export function legacySyncErrorInfo(
  err: unknown,
  fallback: string,
): LegacySyncErrorInfo {
  const e = err as {
    response?: {
      status?: number;
      data?: { code?: unknown; message?: unknown };
    };
    message?: unknown;
  } | null;
  const status = typeof e?.response?.status === 'number' ? e.response.status : null;
  const code = typeof e?.response?.data?.code === 'string' ? e.response.data.code : null;
  const raw = e?.response?.data?.message;
  const backendMsg = Array.isArray(raw)
    ? String(raw[0] ?? '')
    : typeof raw === 'string'
      ? raw
      : '';
  if (status === 403) {
    return {
      status,
      code,
      message:
        'Tu rol no puede consultar la sincronización legacy (solo super_admin y Sistemas).',
    };
  }
  if (code === 'SYNC_MIGRATION_PENDING') {
    return {
      status,
      code,
      message:
        backendMsg ||
        'Falta aplicar la migración 150 (sql/migrations/150_legacy_sync_runs.sql): la bitácora no existe todavía.',
    };
  }
  if (status === 503) {
    // 503 sin código del módulo: puede ser el API caído/reiniciando (Railway)
    // y no necesariamente la migración; se dicen las dos cosas.
    return {
      status,
      code,
      message:
        backendMsg ||
        'El API respondió 503 (no disponible). Si persiste, revisa que la migración 150 esté aplicada.',
    };
  }
  if (status === null && !backendMsg) {
    return {
      status,
      code,
      message: `${fallback} (sin respuesta del API).`,
    };
  }
  return { status, code, message: backendMsg || fallback };
}

/** true si el error es un 403 (rol sin acceso): no tiene caso seguir consultando. */
export function isForbiddenError(err: unknown): boolean {
  return legacySyncErrorInfo(err, '').status === 403;
}

/**
 * Intervalo de polling del estado: 60 s, salvo que la última respuesta haya
 * sido 403 (el rol no puede leer el panel; p. ej. Comercial en la pestaña de
 * Inducción), en cuyo caso se deja de consultar.
 */
export function statusPollInterval(lastError: unknown, pollMs: number): number | false {
  return isForbiddenError(lastError) ? false : pollMs;
}

// ── Inducción: bloqueo suave de "Envíos automáticos" (§6, V12) ──

export interface InductionAutoGate {
  /** listo = 7/7; no_listo = falta algún criterio; desconocido = no se pudo consultar. */
  state: 'listo' | 'no_listo' | 'desconocido';
  chip: WhatsappChip;
  /** Encender "Envíos automáticos" pide confirmación explícita. */
  needsConfirm: boolean;
  failing: LegacySyncWhatsappCriterion[];
  /** Por qué no se sabe (solo en 'desconocido'). */
  reason: string | null;
}

/**
 * Qué muestra el interruptor "Envíos automáticos" de la pestaña Taller según
 * `whatsappReady` del estado de la sincronización. Nunca bloquea en duro:
 * si no está listo (o no se puede saber) pide confirmación mostrando los
 * criterios en rojo; si está 7/7 enciende directo.
 */
export function inductionAutoGate(input: {
  ready: LegacySyncWhatsappReady | null | undefined;
  error?: unknown;
  loading?: boolean;
}): InductionAutoGate {
  if (input.ready && Array.isArray(input.ready.criterios)) {
    const chip = whatsappChip(input.ready);
    return input.ready.ready
      ? { state: 'listo', chip, needsConfirm: false, failing: [], reason: null }
      : {
          state: 'no_listo',
          chip,
          needsConfirm: true,
          failing: failingCriteria(input.ready),
          reason: null,
        };
  }
  if (input.loading) {
    return {
      state: 'desconocido',
      chip: { label: 'WhatsApp listo: consultando…', tone: 'sin_dato' },
      needsConfirm: true,
      failing: [],
      reason: 'Todavía se está consultando el estado de la sincronización legacy.',
    };
  }
  if (input.error !== undefined && input.error !== null) {
    const forbidden = isForbiddenError(input.error);
    return {
      state: 'desconocido',
      chip: {
        label: forbidden ? 'WhatsApp listo: sin acceso' : 'WhatsApp listo: sin datos',
        tone: 'sin_dato',
      },
      needsConfirm: true,
      failing: [],
      reason: forbidden
        ? 'Tu rol no puede consultar la sincronización legacy (solo super_admin y Sistemas): confirma con Sistemas que está 7/7 antes de encender.'
        : legacySyncErrorInfo(input.error, 'No se pudo consultar el estado de la sincronización legacy').message,
    };
  }
  return {
    state: 'desconocido',
    chip: whatsappChip(null),
    needsConfirm: true,
    failing: [],
    reason: 'Sin datos del estado de la sincronización legacy.',
  };
}
