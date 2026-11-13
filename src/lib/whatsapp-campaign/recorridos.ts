// recorridos.ts - Lógica PURA de la pestaña Recorridos (Comercial → WhatsApp).
// Sin React ni DOM: se prueba con vitest (recorridos.test.ts).
//
//  - Adaptadores tolerantes de los endpoints /whatsapp/journeys (llave ausente
//    = null / [] / default; forma rara = se ignora; nunca rompen la página).
//  - gateRecorrido(): qué muestra el interruptor de cada recorrido (bloqueado
//    con motivo, confirmación al encender, avisos).
//  - olaDeCorrida(): la última corrida como `CampaignOla` para reutilizar
//    OlaCard, respetando el invariante de tramos (intentos = recibidos +
//    sin_whatsapp + tope_meta + experimento_meta + otros_fallos + pendientes).
//  - Etiquetas en español de categorías, estados, fuentes y motivos de omisión.
//
// Contabilidad de una corrida (RunCounts del API): `failed` = fallos REALES de
// Meta; 'sin WhatsApp' (131026) y 'network' NO están en `failed`, van en
// `byError`; `skipped` incluye también 'fallido', 'sin_whatsapp' y 'detenido'.
//
// Las horas (`*Cdmx`) llegan ya formateadas por el API: aquí no se calcula
// ninguna fecha de negocio.

import type { CampaignOla } from '@/types/whatsappCampaign';
import type { ChannelStatus, ChannelTemplate } from '@/types/whatsappChannel';
import {
  JOURNEY_CODES,
  type JourneyCategory,
  type JourneyCode,
  type JourneyCosts,
  type JourneyItem,
  type JourneyLastRun,
  type JourneyMonitorRecipient,
  type JourneyPatchInput,
  type JourneyPreview,
  type JourneyPreviewSample,
  type JourneyPromoInfo,
  type JourneyPromoSummary,
  type JourneyRun,
  type JourneyRunCounts,
  type JourneyRunResult,
  type JourneysOverview,
  type JourneysPeriod,
  type JourneysSettings,
  type JourneysSettingsInput,
  type JourneyTemplateInfo,
  type JourneyTestResult,
} from '@/types/whatsappJourneys';
import type { BadgeTone } from './format';
import { isNum, n, pct } from './numeros';

// ── Utilería ───────────────────────────────────────────────────────────────

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => !!v && typeof v === 'object' && !Array.isArray(v);
const obj = (v: unknown): Loose => (isObj(v) ? v : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null => (isNum(v) ? v : null);
const numOr = (v: unknown, def: number): number => (isNum(v) ? v : def);
const bool = (v: unknown, def = false): boolean => (typeof v === 'boolean' ? v : def);
const strList = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === 'string');

/** {motivo: n} con solo valores numéricos ≥ 0 (lo demás se descarta). */
function conteos(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(obj(v))) {
    if (isNum(val) && val >= 0) out[k] = val;
  }
  return out;
}

const sumaConteos = (c: Record<string, number>): number => Object.values(c).reduce((a, b) => a + b, 0);

// ── Códigos y categorías ───────────────────────────────────────────────────

export const JOURNEY_CODE_RE = /^J(1[0-2]|[1-9])$/;

export const isJourneyCode = (v: unknown): v is JourneyCode =>
  typeof v === 'string' && (JOURNEY_CODES as readonly string[]).includes(v);

/** 'J10' → 10 (para ordenar); 999 si no es un código. */
export const ordenCodigo = (code: string): number => {
  const m = JOURNEY_CODE_RE.exec(code);
  return m ? Number(code.slice(1)) : 999;
};

export const CATEGORIA_LABELS: Record<JourneyCategory, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidad',
};

export const isJourneyCategory = (v: unknown): v is JourneyCategory =>
  v === 'MARKETING' || v === 'UTILITY';

export const etiquetaCategoria = (c: string | null | undefined): string =>
  (c && isJourneyCategory(c) ? CATEGORIA_LABELS[c] : c) || '—';

/** Marketing = ámbar (lleva consentimiento y topes); Utilidad = azul (aviso de cuenta). */
export const toneCategoriaRecorrido = (c: string | null | undefined): BadgeTone =>
  c === 'MARKETING' ? 'warning' : c === 'UTILITY' ? 'info' : 'outline';

// ── Etiquetas ──────────────────────────────────────────────────────────────

export const RUN_STATUS_LABELS: Record<string, string> = {
  running: 'En curso',
  done: 'Terminada',
  failed: 'Falló',
  stopped: 'Detenida (muchos fallos)',
  // POST /:code/run responde 200 con status 'skipped' cuando no corrió (ver MOTIVO_CORRIDA_LABELS).
  skipped: 'No corrió',
};

export const etiquetaEstadoCorrida = (s: string | null | undefined): string =>
  (s && RUN_STATUS_LABELS[s]) || s || '—';

export const toneEstadoCorrida = (s: string | null | undefined): BadgeTone =>
  s === 'done' ? 'success' : s === 'running' ? 'warning' : s === 'failed' || s === 'stopped' ? 'destructive' : 'outline';

export const RUN_SOURCE_LABELS: Record<string, string> = {
  cron: 'Automática',
  manual: 'Manual',
  event: 'Por evento',
};

export const etiquetaFuente = (s: string | null | undefined): string =>
  (s && RUN_SOURCE_LABELS[s]) || s || '—';

/**
 * Motivos (`reason` de POST /:code/run) por los que una corrida NO corrió
 * (`ran: false`, status 'skipped') o se detuvo (status 'stopped'). Los
 * bloqueos duros de una corrida manual llegan como 409 con su propio mensaje.
 */
export const MOTIVO_CORRIDA_LABELS: Record<string, string> = {
  sin_candidatos: 'No había a quién enviarle (nadie cumple el segmento hoy)',
  presupuesto_tick: 'Se agotó el presupuesto de esta corrida (tope diario o por hora)',
  fallos_mayores_30pct: 'Se detuvo: más del 30 % de los intentos fallaron en Meta',
  apagado: 'El recorrido o el interruptor maestro están apagados',
  en_curso: 'Ya hay una corrida de este recorrido en curso',
  migracion_pendiente: 'Falta la migración 185',
  whatsapp_deshabilitado: 'WhatsApp Cloud API está deshabilitado en el servidor',
  fuera_de_horario: 'Fuera de la ventana de envío (hora local de la sucursal)',
  domingo: 'Las plantillas de Marketing no se envían en domingo',
  marketing_paused: 'Marketing en pausa por la salud del canal',
  tope_diario: 'Se alcanzó el tope diario del recorrido',
  tope_hora: 'Se alcanzó el tope global de envíos por hora',
  ya_corrida: 'Esta corrida ya se completó hoy; no queda nada pendiente',
  sin_periodo: 'No hay periodo vigente en la tabla de periodos',
  sin_periodo_anterior: 'No existe el periodo anterior',
  periodo_anterior_abierto: 'El periodo anterior aún no está cerrado',
  sin_promocion: 'Hoy no empieza ninguna promoción en Productos › Temporadas y no hay una capturada con fecha',
  promocion_sin_empezar: 'La promoción de hoy todavía no empieza: no se anuncia antes de su hora',
  plantilla_no_valida: 'La plantilla o el arte de la promoción no son válidos para este envío',
};

/** Etiqueta del motivo de la corrida; un motivo desconocido se muestra legible; null sin motivo. */
export const etiquetaMotivoCorrida = (id: string | null | undefined): string | null =>
  id ? (MOTIVO_CORRIDA_LABELS[id] ?? id.replace(/_/g, ' ')) : null;

/** Motivos de omisión del motor, en el orden fijo de la SPEC §5. */
export const MOTIVO_LABELS: Record<string, string> = {
  opt_out: 'Pidió baja total',
  sin_telefono: 'Sin teléfono',
  sucursal_pruebas: 'Sucursal de pruebas',
  telefono_repetido: 'Teléfono compartido (no es el titular)',
  pais_us: 'EE. UU.: solo avisos de cuenta',
  sin_opt_in: 'Sin consentimiento de promociones',
  marketing_opt_out: 'Pidió solo avisos de cuenta',
  unreachable: 'Sin WhatsApp',
  capped: 'Tope de promociones de Meta vigente',
  tope_semanal: 'Ya recibió 2 promociones en 7 días',
  tope_periodo: 'Ya recibió 4 promociones en el periodo',
  gap_48h: 'Menos de 48 h desde la última promoción',
  sin_lectura_60d: '3 promociones sin leer: 60 días sin promociones',
  utilidad_diaria: 'Ya recibió un aviso hoy',
  control: 'Grupo de control (no recibe)',
  una_por_temporada: 'Ya recibió su promoción de esta temporada',
  otro_dia: 'Le toca otro día de la temporada',
  rampa: 'Fuera de la rampa',
  ya_enviado: 'Ya se le había enviado',
  limite: 'Tope de la corrida (diario o por hora)',
  duplicado: 'Duplicado (candado del canal)',
  fallido: 'Falló en Meta',
  // Contados en `skipped` por el motor aunque no son omisiones por candado.
  sin_whatsapp: 'Sin WhatsApp (131026)',
  detenido: 'Sin intentar (la corrida se detuvo)',
  // Candados del canal (errorCode de sendTemplate usado como motivo).
  candado: 'Candado del canal',
  marketing_capped: 'Tope de promociones de Meta vigente (canal)',
  marketing_paused: 'Marketing en pausa (canal)',
  marketing_no_opt_in: 'Sin consentimiento de promociones (canal)',
};

/**
 * Motivos que el motor cuenta dentro de `skipped` pero que NO son omisiones
 * por candado: fallos reales, sin WhatsApp (131026) y los que quedaron sin
 * intentar cuando la corrida se detuvo. Se restan para "omitidos".
 */
export const MOTIVOS_NO_OMITIDOS = ['fallido', 'sin_whatsapp', 'detenido'] as const;

/**
 * Omitidos netos de una corrida = total − fallido − sin_whatsapp − detenido.
 * `total` es el `skipped` numérico del API; sin él se suma el mapa de motivos.
 */
export function omitidosNetos(byReason: Record<string, number> | null | undefined, total?: number | null): number {
  const map = byReason ?? {};
  const t = isNum(total) ? total : sumaConteos(map);
  const resta = MOTIVOS_NO_OMITIDOS.reduce((a, k) => a + (map[k] ?? 0), 0);
  return Math.max(0, t - resta);
}

/** Etiqueta en español del motivo; un motivo desconocido se muestra legible. */
export const etiquetaMotivo = (id: string | null | undefined): string =>
  (id && MOTIVO_LABELS[id]) || (id ? id.replace(/_/g, ' ') : '—');

export interface MotivoConteo {
  id: string;
  etiqueta: string;
  n: number;
}

/** Motivos con conteo > 0, de mayor a menor (empate: orden alfabético). */
export function motivosOrdenados(byReason: Record<string, number> | null | undefined): MotivoConteo[] {
  return Object.entries(byReason ?? {})
    .filter(([, v]) => isNum(v) && v > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, v]) => ({ id, etiqueta: etiquetaMotivo(id), n: v }));
}

const TEMPLATE_STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Aprobada',
  PENDING: 'En revisión',
  REJECTED: 'Rechazada',
  PAUSED: 'Pausada',
  DISABLED: 'Inhabilitada',
};

const QUALITY_LABELS: Record<string, string> = {
  GREEN: 'calidad alta',
  YELLOW: 'calidad media',
  RED: 'calidad baja',
};

export interface EstadoPlantilla {
  texto: string;
  variant: BadgeTone;
  aprobada: boolean;
}

/**
 * Estado de la plantilla en Meta para la tarjeta ('Aprobada · calidad alta');
 * sin plantilla, 'No existe en Meta'.
 */
export function estadoPlantilla(t: JourneyTemplateInfo | ChannelTemplate | null | undefined): EstadoPlantilla {
  if (!t) return { texto: 'No existe en Meta', variant: 'destructive', aprobada: false };
  const status = (t.status || '').toUpperCase();
  const aprobada = status === 'APPROVED';
  const calidad = QUALITY_LABELS[(t.quality || '').toUpperCase()];
  const texto = `${TEMPLATE_STATUS_LABELS[status] ?? t.status ?? '—'}${calidad ? ` · ${calidad}` : ''}`;
  const variant: BadgeTone = aprobada
    ? (t.quality || '').toUpperCase() === 'RED'
      ? 'warning'
      : 'success'
    : status === 'PENDING'
      ? 'warning'
      : 'destructive';
  return { texto, variant, aprobada };
}

/** Plantilla del recorrido en la salud del canal (respaldo si el API no la manda en el item). */
export function plantillaDeCanal(
  canal: Pick<ChannelStatus, 'templates'> | null | undefined,
  name: string | null | undefined,
): ChannelTemplate | null {
  if (!name || !canal?.templates?.items) return null;
  return canal.templates.items.find((t) => t.name === name) ?? null;
}

// ── Adaptadores ────────────────────────────────────────────────────────────

const RUN_STATUSES = ['running', 'done', 'failed', 'stopped'];

export function adaptarPeriodo(raw: unknown): JourneysPeriod | null {
  if (!isObj(raw)) return null;
  const number = num(raw.number) ?? num(raw.numero) ?? num(raw.periodNumber);
  if (number == null) return null;
  return {
    number,
    name: str(raw.name) ?? str(raw.nombre) ?? '',
    startDate: str(raw.startDate) ?? str(raw.inicio) ?? '',
    endDate: str(raw.endDate) ?? str(raw.fin) ?? '',
    isClosed: bool(raw.isClosed) || bool(raw.cerrado),
  };
}

export function adaptarPlantilla(raw: unknown): JourneyTemplateInfo | null {
  if (!isObj(raw)) return null;
  const name = str(raw.name);
  if (!name) return null;
  return {
    name,
    status: str(raw.status) ?? '',
    category: str(raw.category) ?? '',
    language: str(raw.language) ?? '',
    quality: str(raw.quality) ?? '',
  };
}

export function adaptarLastRun(raw: unknown): JourneyLastRun | null {
  if (!isObj(raw)) return null;
  const byReason = conteos(raw.byReason ?? raw.skipped);
  return {
    startedCdmx: str(raw.startedCdmx),
    finishedCdmx: str(raw.finishedCdmx),
    status: str(raw.status) ?? 'done',
    sent: numOr(raw.sent, 0),
    failed: numOr(raw.failed, 0),
    skipped: isNum(raw.skipped) ? raw.skipped : sumaConteos(byReason),
    byReason,
    byError: conteos(raw.byError),
    delivered: num(raw.delivered),
    read: num(raw.read),
  };
}

function adaptarPromoResumen(raw: unknown): JourneyPromoSummary | null {
  if (!isObj(raw)) return null;
  const date = str(raw.date);
  const title = str(raw.title);
  if (!date || !title) return null;
  return {
    date,
    seasonName: str(raw.seasonName) ?? '',
    title,
    text: str(raw.text) ?? '',
    validity: str(raw.validity) ?? '',
    imageUrl: str(raw.imageUrl) || null,
    promoCodes: strList(raw.promoCodes),
  };
}

/** Bloque `promo` de J8 (qué anuncia HOY); null en los demás recorridos o con un API anterior. */
export function adaptarPromo(raw: unknown): JourneyPromoInfo | null {
  if (!isObj(raw)) return null;
  return {
    source: raw.source === 'manual' ? 'manual' : 'temporadas',
    frequency: raw.frequency === 'diaria' ? 'diaria' : raw.frequency === 'alterna' ? 'alterna' : 'una',
    sundays: bool(raw.sundays, true),
    today: adaptarPromoResumen(raw.today),
    notice: str(raw.notice) || null,
  };
}

/** Un recorrido del API → JourneyItem; null si no trae un código J1–J12. */
export function adaptarJourneyItem(raw: unknown): JourneyItem | null {
  if (!isObj(raw)) return null;
  const code = str(raw.code) ?? str(raw.codigo);
  if (!code || !JOURNEY_CODE_RE.test(code)) return null;
  const template = adaptarPlantilla(raw.template);
  const category = raw.category;
  const controlPct = num(raw.controlPct) ?? num(raw.control_pct) ?? 0;
  return {
    code,
    name: str(raw.name) ?? str(raw.nombre) ?? code,
    category: isJourneyCategory(category) ? category : 'UTILITY',
    template,
    templateName: str(raw.templateName) ?? template?.name ?? null,
    enabled: bool(raw.enabled),
    sendTime: str(raw.sendTime) ?? '10:00',
    scheduleText: str(raw.scheduleText) ?? '',
    nextRunCdmx: str(raw.nextRunCdmx),
    lastRun: adaptarLastRun(raw.lastRun),
    audienceEstimate: num(raw.audienceEstimate),
    controlPct: Math.max(0, Math.min(0.99, controlPct)),
    dailyCap: numOr(raw.dailyCap, 2000),
    rampPct: numOr(raw.rampPct, 100),
    rampBranchIds: strList(raw.rampBranchIds),
    params: obj(raw.params),
    campaignKey: str(raw.campaignKey),
    blockReason: str(raw.blockReason) || null,
    promo: adaptarPromo(raw.promo),
  };
}

export function adaptarMonitores(raw: unknown): JourneyMonitorRecipient[] {
  return arr(raw)
    .filter(isObj)
    .map((m) => {
      const customerNumber = str(m.customerNumber)?.trim();
      return {
        name: str(m.name) ?? '',
        phone: str(m.phone) ?? '',
        ...(customerNumber ? { customerNumber } : {}),
      };
    })
    .slice(0, MAX_MONITORES);
}

export function adaptarCostos(raw: unknown): JourneyCosts {
  const c = obj(raw);
  return {
    marketingUsdMx: num(c.marketingUsdMx),
    utilityUsdMx: num(c.utilityUsdMx),
    utilityUsdUs: num(c.utilityUsdUs),
    marketingUsdUs: num(c.marketingUsdUs),
  };
}

/** Configuración global; sin datos arranca todo apagado (como el API). */
export function adaptarSettings(raw: unknown): JourneysSettings {
  const s = obj(raw);
  return {
    enabled: bool(s.enabled),
    quietStart: str(s.quietStart) ?? '09:00',
    quietEnd: str(s.quietEnd) ?? '20:00',
    hourlyCap: numOr(s.hourlyCap, 5000),
    attributionDays: numOr(s.attributionDays, 7),
    monitorRecipients: adaptarMonitores(s.monitorRecipients),
    costs: adaptarCostos(s.costs),
    fxUsdMxnFallback: num(s.fxUsdMxnFallback),
  };
}

/** GET /whatsapp/journeys → JourneysOverview (recorridos ordenados J1…J12). */
export function adaptarRecorridos(raw: unknown): JourneysOverview {
  const d = obj(raw);
  const journeys = arr(d.journeys)
    .map(adaptarJourneyItem)
    .filter((x): x is JourneyItem => !!x)
    .sort((a, b) => ordenCodigo(a.code) - ordenCodigo(b.code));
  return {
    period: adaptarPeriodo(d.period),
    settings: adaptarSettings(d.settings),
    migrationPending: bool(d.migrationPending),
    marketingPaused: bool(d.marketingPaused),
    // Un API viejo no manda estas banderas: se asume que todo está habilitado
    // para no pintar alertas falsas.
    whatsappEnabled: bool(d.whatsappEnabled, true),
    cronEnabled: bool(d.cronEnabled, true),
    optInCount: num(d.optInCount),
    journeys,
  };
}

function adaptarMuestra(raw: unknown): JourneyPreviewSample | null {
  if (!isObj(raw)) return null;
  return {
    customerNumber: str(raw.customerNumber) ?? (isNum(raw.customerNumber) ? String(raw.customerNumber) : ''),
    firstName: str(raw.firstName) ?? '',
    branch: str(raw.branch) ?? '',
    points: num(raw.points),
    reason: str(raw.reason) || null,
  };
}

export function adaptarPreview(raw: unknown): JourneyPreview {
  const p = obj(raw);
  return {
    period: adaptarPeriodo(p.period),
    eligible: numOr(p.eligible, 0),
    byReason: conteos(p.byReason),
    wouldSend: numOr(p.wouldSend, 0),
    control: numOr(p.control, 0),
    audience: num(p.audience),
    sample: arr(p.sample)
      .map(adaptarMuestra)
      .filter((x): x is JourneyPreviewSample => !!x)
      .slice(0, 20),
  };
}

export function adaptarCounts(raw: unknown): JourneyRunCounts {
  const c = obj(raw);
  return {
    eligible: num(c.eligible),
    control: num(c.control),
    sent: num(c.sent),
    failed: num(c.failed),
    skipped: conteos(c.skipped),
    byError: conteos(c.byError),
    // El API manda las copias a monitores como {sent, failed, skipped}: se cuentan las enviadas.
    monitors: num(c.monitors) ?? num(obj(c.monitors).sent),
  };
}

export function adaptarRun(raw: unknown): JourneyRun | null {
  if (!isObj(raw)) return null;
  const code = str(raw.code) ?? str(raw.journeyCode) ?? str(raw.journey_code);
  const id = str(raw.id) ?? str(raw.runId) ?? str(raw.runKey) ?? str(raw.run_key);
  if (!code || !id) return null;
  const status = str(raw.status) ?? '';
  return {
    id,
    code,
    runKey: str(raw.runKey) ?? str(raw.run_key),
    periodNumber: num(raw.periodNumber) ?? num(raw.period_number),
    source: str(raw.source) ?? 'cron',
    status: RUN_STATUSES.includes(status) ? status : status || 'done',
    startedCdmx: str(raw.startedCdmx),
    finishedCdmx: str(raw.finishedCdmx),
    counts: adaptarCounts(raw.counts),
    error: str(raw.error),
  };
}

/** Lista de corridas (acepta un arreglo o {data|runs|items: []}). */
export function adaptarRuns(raw: unknown): JourneyRun[] {
  const d = obj(raw);
  const lista = Array.isArray(raw) ? raw : arr(d.data ?? d.runs ?? d.items);
  return lista.map(adaptarRun).filter((x): x is JourneyRun => !!x);
}

/**
 * POST /:code/run → JourneyRunResult. Acepta la corrida ({id|runId|runKey,
 * status, counts, error}) o {status, counts, error, message}; el `reason` del
 * API (sin_candidatos, presupuesto_tick, fallos_mayores_30pct…) se traduce a
 * `message` cuando no viene un mensaje.
 */
export function adaptarRunResult(raw: unknown): JourneyRunResult {
  const r = obj(raw);
  const run = adaptarRun(raw);
  return {
    status: run?.status ?? str(r.status),
    counts: isObj(r.counts) ? adaptarCounts(r.counts) : null,
    error: str(r.error),
    message: str(r.message) ?? etiquetaMotivoCorrida(str(r.reason)),
  };
}

export function adaptarTestResult(raw: unknown): JourneyTestResult {
  const r = obj(raw);
  return {
    success: bool(r.success),
    wamid: str(r.wamid),
    errorCode: str(r.errorCode),
    error: str(r.error),
    messages: strList(r.messages),
  };
}

// ── Interruptor: bloqueo, confirmación y avisos ────────────────────────────

/**
 * Bloqueos INFORMATIVOS del API (no impiden encender):
 *  - 'Sin consentimientos registrados (0 opt-in)': solo aviso para Marketing
 *    (J12 Preferencias es justamente el que recolecta el consentimiento).
 *  - 'Marketing en pausa': la pausa es temporal (salud del canal); el recorrido
 *    se puede dejar encendido y sale solo cuando se reanude.
 */
export const BLOQUEO_INFORMATIVO_RE = /sin consentimientos|0 opt-in|marketing en pausa/i;
export const PAUSA_MARKETING_RE = /marketing en pausa/i;

export const esBloqueoInformativo = (motivo: string | null | undefined): boolean =>
  !!motivo && BLOQUEO_INFORMATIVO_RE.test(motivo);

export const esPausaMarketing = (motivo: string | null | undefined): boolean =>
  !!motivo && PAUSA_MARKETING_RE.test(motivo);

export const AVISO_MAESTRO_APAGADO =
  'El interruptor maestro está apagado: este recorrido no mandará nada (ni en automático ni con "Correr ahora") hasta encenderlo en Configuración.';
export const AVISO_MARKETING_PAUSA =
  'Marketing está en pausa en la salud del canal: las promociones no salen hasta reanudarlo (el recorrido puede quedar encendido).';
export const AVISO_SIN_OPT_IN =
  'Hay 0 consentimientos de promociones registrados: la audiencia de este recorrido es cero hasta que corra J12 Preferencias o se capture el consentimiento.';

export const PERMISO_RECORRIDOS = 'whatsapp:manage';

export interface GateRecorridoInput {
  item: Pick<JourneyItem, 'code' | 'name' | 'category' | 'enabled' | 'blockReason' | 'template'>;
  /** hasAnyPermission(permisos, ['whatsapp:manage']). */
  canManage: boolean;
  masterEnabled: boolean;
  marketingPaused: boolean;
  optInCount: number | null;
  migrationPending: boolean;
}

export interface GateRecorrido {
  /** false = el interruptor va deshabilitado con `motivo`. */
  puede: boolean;
  motivo: string | null;
  /** Encender pide confirmación (manda WhatsApp reales). Apagar nunca. */
  needsConfirm: boolean;
  /** Avisos para el diálogo de confirmación (no bloquean). */
  avisos: string[];
}

/**
 * Qué muestra el interruptor de un recorrido. Nunca inventa reglas de negocio:
 * los bloqueos duros vienen del API en `blockReason` (migración, plantilla,
 * categoría); aquí se suman el permiso del usuario y los avisos (maestro
 * apagado, 0 opt-in, Marketing en pausa). Orden: la migración pendiente
 * explica el estado a TODOS los roles (va antes que el permiso).
 */
export function gateRecorrido(input: GateRecorridoInput): GateRecorrido {
  const { item } = input;
  const avisos: string[] = [];
  if (input.migrationPending) {
    return {
      puede: false,
      motivo: 'Falta la migración 185: los recorridos se ven apagados y no se pueden encender todavía.',
      needsConfirm: false,
      avisos,
    };
  }
  if (!input.canManage) {
    return {
      puede: false,
      motivo: `Tu rol no puede encender ni pausar recorridos (permiso ${PERMISO_RECORRIDOS}).`,
      needsConfirm: false,
      avisos,
    };
  }
  const bloqueo = item.blockReason && !esBloqueoInformativo(item.blockReason) ? item.blockReason : null;
  if (bloqueo && !item.enabled) {
    return { puede: false, motivo: bloqueo, needsConfirm: false, avisos };
  }
  if (bloqueo && item.enabled) {
    // Encendido con un bloqueo nuevo (p. ej. Meta pausó la plantilla): se
    // deja apagar, y el motivo se muestra como aviso.
    avisos.push(bloqueo);
  }
  if (!input.masterEnabled) avisos.push(AVISO_MAESTRO_APAGADO);
  const pausa = esPausaMarketing(item.blockReason) || (item.category === 'MARKETING' && input.marketingPaused);
  if (pausa) avisos.push(AVISO_MARKETING_PAUSA);
  if (item.category === 'MARKETING' && (input.optInCount === 0 || /sin consentimientos|0 opt-in/i.test(item.blockReason ?? ''))) {
    avisos.push(AVISO_SIN_OPT_IN);
  }
  return { puede: true, motivo: null, needsConfirm: true, avisos };
}

/** Hay que sondear la lista mientras algún recorrido esté encendido. */
export const algunoEncendido = (journeys: readonly Pick<JourneyItem, 'enabled'>[] | null | undefined): boolean =>
  (journeys ?? []).some((j) => j.enabled);

// ── Última corrida como ola (OlaCard) ──────────────────────────────────────

/** Códigos de Meta que la barra de la ola separa del resto de los fallos. */
export const ERROR_SIN_WHATSAPP = '131026';
export const ERROR_TOPE_META = '131049';
export const ERROR_EXPERIMENTO_META = '130472';
/** Intento sin respuesta del canal (incierto): cuenta como "en camino". */
export const ERROR_RED = 'network';

/** 'Sin WhatsApp' (131026) de una corrida; el API lo cuenta aparte de `failed`. */
export const sinWhatsAppDe = (byError: Record<string, number> | null | undefined): number =>
  byError?.[ERROR_SIN_WHATSAPP] ?? 0;

/**
 * Mapea la última corrida a `CampaignOla` para pintarla con OlaCard, con la
 * contabilidad real del API: `failed` son solo fallos reales de Meta, así que
 * intentos = sent + failed + 131026 + network; 131026 → sin_whatsapp,
 * 131049 → tope_meta, 130472 → experimento_meta, el resto de `failed` →
 * otros_fallos; 'network' (incierto) queda en pendientes. Sin entregas
 * cruzadas (delivered/read) los enviados cuentan como "en camino". Si el API
 * manda contadores incoherentes (p. ej. failed < suma de códigos), los
 * recortes a 0 rompen el invariante y OlaCard pinta la advertencia en vez de
 * una barra que mienta. null sin corrida.
 */
export function olaDeCorrida(
  item: Pick<JourneyItem, 'code' | 'name' | 'lastRun'>,
): CampaignOla | null {
  const r = item.lastRun;
  if (!r) return null;
  const sinWhatsApp = sinWhatsAppDe(r.byError);
  const red = r.byError[ERROR_RED] ?? 0;
  const topeMeta = r.byError[ERROR_TOPE_META] ?? 0;
  const experimento = r.byError[ERROR_EXPERIMENTO_META] ?? 0;
  const intentos = r.sent + r.failed + sinWhatsApp + red;
  const recibidos = r.delivered ?? 0;
  const leidos = Math.min(r.read ?? 0, recibidos);
  return {
    id: `${item.code.toLowerCase()}-ultima`,
    nombre: `${item.code} · ${item.name}`,
    cuando: r.startedCdmx ?? '—',
    estado: r.status === 'running' ? 'en curso' : 'enviada',
    intentos,
    recibidos,
    leidos,
    sin_whatsapp: sinWhatsApp,
    tope_meta: topeMeta,
    experimento_meta: experimento,
    otros_fallos: Math.max(0, r.failed - topeMeta - experimento),
    pendientes: Math.max(0, r.sent - recibidos + red),
    por_plantilla: null,
  };
}

/**
 * 'mar 25 nov 10:00 · Terminada · 120 enviados · 3 fallidos · 6 sin WhatsApp ·
 * 50 omitidos'. Omitidos = skipped − fallido − sin_whatsapp − detenido; "sin
 * WhatsApp" (131026) y "sin intentar" (detenida) se muestran aparte si hay.
 */
export function resumenCorrida(r: JourneyLastRun | null | undefined): string {
  if (!r) return 'Sin corridas todavía';
  const sinWhatsApp = sinWhatsAppDe(r.byError);
  const detenidos = r.byReason.detenido ?? 0;
  const partes = [
    r.startedCdmx ?? 'sin hora',
    etiquetaEstadoCorrida(r.status),
    `${n(r.sent)} enviados`,
    `${n(r.failed)} fallidos`,
    ...(sinWhatsApp > 0 ? [`${n(sinWhatsApp)} sin WhatsApp`] : []),
    `${n(omitidosNetos(r.byReason, r.skipped))} omitidos`,
    ...(detenidos > 0 ? [`${n(detenidos)} sin intentar`] : []),
  ];
  return partes.join(' · ');
}

// ── Controles de la tarjeta ────────────────────────────────────────────────

/** Opciones del grupo de control (fracción): 0 %, 10 %, 20 %. */
export const CONTROL_OPCIONES: readonly number[] = [0, 0.1, 0.2];

export const controlTexto = (v: number | null | undefined): string =>
  !isNum(v) || v <= 0 ? 'Sin control' : `${pct(v)} de control`;

export const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const DAILY_CAP_MAX = 100_000;

/** Campos de `params` conocidos por recorrido (los demás se conservan tal cual). */
export interface CampoParam {
  key: string;
  label: string;
  tipo: 'texto' | 'numero' | 'fecha' | 'url' | 'opcion';
  ayuda?: string;
  /** Solo 'opcion': valores posibles (se guardan como texto en params). */
  opciones?: { value: string; label: string }[];
  /** Solo 'opcion': el que aplica cuando el parámetro no está guardado. */
  defecto?: string;
  /** Ocupa todo el ancho de la cuadrícula de ajustes. */
  ancho?: boolean;
}

export const CAMPOS_PARAMS: Partial<Record<JourneyCode, CampoParam[]>> = {
  J3: [{ key: 'minPts', label: 'Puntos mínimos para avisar', tipo: 'numero', ayuda: 'Default 2,000.' }],
  J8: [
    {
      key: 'temporadas',
      label: 'De dónde sale la promoción',
      tipo: 'opcion',
      ancho: true,
      defecto: 'si',
      opciones: [
        { value: 'si', label: 'De Productos › Temporadas (automático)' },
        { value: 'no', label: 'Solo la capturada aquí (a mano)' },
      ],
      ayuda:
        'Automático: cada promoción se anuncia el día que empieza (nunca antes), con su nombre, condiciones y arte.',
    },
    {
      key: 'frecuencia',
      label: 'Con una oferta por día, cada persona recibe',
      tipo: 'opcion',
      ancho: true,
      defecto: 'una',
      opciones: [
        { value: 'una', label: 'Una sola promoción en toda la temporada' },
        { value: 'alterna', label: 'Un día sí y un día no' },
        { value: 'diaria', label: 'Todos los días' },
      ],
      ayuda:
        'Una sola: cada día sale a una parte distinta de la base y nadie recibe dos. Un día sí y un día no respeta el tope de 2 promociones en 7 días. Todos los días lo rebasa a propósito y deja a esas personas sin los avisos de cierre del periodo (tope de 4).',
    },
    {
      key: 'domingos',
      label: 'Enviar en domingo',
      tipo: 'opcion',
      ancho: true,
      defecto: 'si',
      opciones: [
        { value: 'si', label: 'Sí, si la promoción empieza en domingo' },
        { value: 'no', label: 'No' },
      ],
    },
    {
      key: 'date',
      label: 'A mano: fecha del envío',
      tipo: 'fecha',
      ayuda: 'Para una promoción que no está en Temporadas.',
    },
    { key: 'title', label: 'A mano: título', tipo: 'texto', ayuda: 'Vacío: "Promoción de <mes>".' },
    { key: 'validity', label: 'A mano: vigencia', tipo: 'texto', ayuda: 'Vacío: "hasta el <cierre del periodo>".' },
    { key: 'bodyText', label: 'A mano: texto de la promoción (un renglón)', tipo: 'texto', ancho: true },
    { key: 'imageUrl', label: 'A mano: imagen (URL pública en JPG o PNG)', tipo: 'url', ancho: true },
  ],
  J9: [
    {
      key: 'giftText',
      label: 'Frase de cumpleaños',
      tipo: 'texto',
      ayuda: 'Default: "Que este día sea tan especial como tú."',
    },
  ],
};

export const camposParams = (code: string): CampoParam[] =>
  (isJourneyCode(code) ? CAMPOS_PARAMS[code] : undefined) ?? [];

/** Nombre de plantilla de Meta: minúsculas, dígitos y guion bajo (columna VARCHAR(120)). */
export const TEMPLATE_NAME_RE = /^[a-z0-9_]{1,120}$/;

/** Nombre de la plantilla configurada ('' si el API no lo manda). */
export const plantillaConfigurada = (item: Pick<JourneyItem, 'templateName' | 'template'>): string =>
  item.templateName ?? item.template?.name ?? '';

/** Borrador editable de la tarjeta (todo como texto para los inputs). */
export interface AjustesRecorrido {
  controlPct: number;
  dailyCap: string;
  rampPct: string;
  sendTime: string;
  rampBranchIds: string[];
  params: Record<string, string>;
  /** Plantilla en Meta; '' = no cambiarla. */
  templateName: string;
}

/**
 * Valor guardado de un campo de opciones (acepta true/false de capturas
 * hechas por API) o, si no hay uno válido, el que aplica por defecto.
 */
export function valorOpcion(c: CampoParam, v: unknown): string {
  const raw = v === true ? 'si' : v === false ? 'no' : typeof v === 'string' ? v : '';
  return (c.opciones ?? []).some((o) => o.value === raw) ? raw : (c.defecto ?? '');
}

export function ajustesDe(item: JourneyItem): AjustesRecorrido {
  const params: Record<string, string> = {};
  for (const c of camposParams(item.code)) {
    const v = item.params[c.key];
    params[c.key] =
      c.tipo === 'opcion'
        ? valorOpcion(c, v)
        : v == null
          ? ''
          : typeof v === 'string'
            ? v
            : isNum(v)
              ? String(v)
              : JSON.stringify(v);
  }
  return {
    controlPct: item.controlPct,
    dailyCap: String(item.dailyCap),
    rampPct: String(item.rampPct),
    sendTime: item.sendTime,
    rampBranchIds: [...item.rampBranchIds],
    params,
    templateName: plantillaConfigurada(item),
  };
}

/** Errores de validación del borrador, en español; [] si está bien. */
export function validarAjustes(a: AjustesRecorrido): string[] {
  const errores: string[] = [];
  const cap = Number(a.dailyCap);
  if (!/^\d+$/.test(a.dailyCap.trim()) || cap < 1 || cap > DAILY_CAP_MAX) {
    errores.push(`El tope diario debe ser un entero entre 1 y ${n(DAILY_CAP_MAX)}.`);
  }
  const rampa = Number(a.rampPct);
  if (!/^\d+$/.test(a.rampPct.trim()) || rampa < 1 || rampa > 100) {
    errores.push('La rampa debe ser un porcentaje entero entre 1 y 100.');
  }
  if (!HHMM_RE.test(a.sendTime)) errores.push('La hora debe tener formato HH:MM (24 h).');
  if (!CONTROL_OPCIONES.includes(a.controlPct)) errores.push('El grupo de control debe ser 0 %, 10 % o 20 %.');
  const tpl = (a.templateName ?? '').trim();
  if (tpl !== '' && !TEMPLATE_NAME_RE.test(tpl)) {
    errores.push('La plantilla en Meta debe ser el nombre exacto: minúsculas, dígitos y guion bajo (máximo 120).');
  }
  return errores;
}

const mismaLista = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);

/**
 * Solo las llaves que cambiaron respecto al recorrido guardado (PATCH
 * parcial). `params` se manda completo (los campos conocidos encima de los
 * que ya tenía) solo si alguno cambió; un campo vaciado viaja como null (el
 * API borra el parámetro) y una opción viaja siempre con su valor.
 * `templateName` va solo si se capturó un nombre distinto del configurado
 * (la tarjeta lo confirma aparte).
 */
export function patchDeAjustes(item: JourneyItem, a: AjustesRecorrido): JourneyPatchInput {
  const out: JourneyPatchInput = {};
  const tpl = (a.templateName ?? '').trim();
  if (tpl !== '' && tpl !== plantillaConfigurada(item)) out.templateName = tpl;
  if (a.controlPct !== item.controlPct) out.controlPct = a.controlPct;
  const cap = Number(a.dailyCap);
  if (cap !== item.dailyCap) out.dailyCap = cap;
  const rampa = Number(a.rampPct);
  if (rampa !== item.rampPct) out.rampPct = rampa;
  if (a.sendTime !== item.sendTime) out.sendTime = a.sendTime;
  if (!mismaLista(a.rampBranchIds, item.rampBranchIds)) out.rampBranchIds = [...a.rampBranchIds];
  const params: Record<string, unknown> = { ...item.params };
  let paramsCambiaron = false;
  for (const c of camposParams(item.code)) {
    const texto = (a.params[c.key] ?? '').trim();
    const viejo = item.params[c.key];
    if (c.tipo === 'opcion') {
      if (texto !== '' && texto !== valorOpcion(c, viejo)) {
        paramsCambiaron = true;
        params[c.key] = texto;
      }
      continue;
    }
    const nuevo: unknown = texto === '' ? undefined : c.tipo === 'numero' ? Number(texto) : texto;
    if (nuevo === undefined ? viejo != null : nuevo !== viejo) {
      paramsCambiaron = true;
      params[c.key] = nuevo === undefined ? null : nuevo;
    }
  }
  if (paramsCambiaron) out.params = params;
  return out;
}

// ── Configuración global (diálogo) ─────────────────────────────────────────

export const MAX_MONITORES = 10;
export const E164_RE = /^\+\d{11,15}$/;

/** Las cuatro tarifas (USD por mensaje entregado) que exige el PUT del API. */
export const TARIFAS = ['marketingUsdMx', 'utilityUsdMx', 'utilityUsdUs', 'marketingUsdUs'] as const;
export const TARIFA_LABELS: Record<keyof JourneyCosts, string> = {
  marketingUsdMx: 'Marketing · México',
  utilityUsdMx: 'Utilidad · México',
  marketingUsdUs: 'Marketing · EE. UU.',
  utilityUsdUs: 'Utilidad · EE. UU.',
};

/**
 * Valores sugeridos (SPEC §3, defaults del API): tarifas de Meta por mensaje
 * entregado (USD) y tipo de cambio de respaldo USD→MXN.
 */
export const TARIFAS_SUGERIDAS: Readonly<JourneyCosts> = {
  marketingUsdMx: 0.0305,
  utilityUsdMx: 0.0034,
  marketingUsdUs: 0.0305,
  utilityUsdUs: 0.0085,
};
export const FX_SUGERIDO = 18.8;

/** Borrador con las tarifas y el tipo de cambio sugeridos (lo demás intacto). */
export const conValoresSugeridos = (s: JourneysSettings): JourneysSettings => ({
  ...s,
  costs: { ...TARIFAS_SUGERIDAS },
  fxUsdMxnFallback: FX_SUGERIDO,
});

export function validarSettings(s: JourneysSettings): string[] {
  const errores: string[] = [];
  if (!HHMM_RE.test(s.quietStart) || !HHMM_RE.test(s.quietEnd)) {
    errores.push('El horario debe tener formato HH:MM (24 h).');
  } else if (s.quietStart >= s.quietEnd) {
    errores.push('La hora de inicio debe ser menor que la de fin.');
  }
  if (!Number.isInteger(s.hourlyCap) || s.hourlyCap < 1) errores.push('El tope por hora debe ser un entero mayor que 0.');
  if (!Number.isInteger(s.attributionDays) || s.attributionDays < 1 || s.attributionDays > 60) {
    errores.push('La ventana de atribución debe ser de 1 a 60 días.');
  }
  if (s.monitorRecipients.length > MAX_MONITORES) errores.push(`Máximo ${MAX_MONITORES} números de monitoreo.`);
  s.monitorRecipients.forEach((m, i) => {
    if (!m.name.trim()) errores.push(`Monitor ${i + 1}: falta el nombre.`);
    if (!E164_RE.test(m.phone)) errores.push(`Monitor ${i + 1}: el teléfono debe ser lada + número completo.`);
  });
  // El PUT del API exige las cuatro tarifas (JourneysCostsDto): una vacía no se puede guardar.
  for (const k of TARIFAS) {
    const v = s.costs[k];
    if (v == null) errores.push(`Falta la tarifa de ${TARIFA_LABELS[k]} (USD por mensaje).`);
    else if (!isNum(v) || v < 0) errores.push(`La tarifa de ${TARIFA_LABELS[k]} no puede ser negativa.`);
  }
  if (s.fxUsdMxnFallback != null && (!isNum(s.fxUsdMxnFallback) || s.fxUsdMxnFallback <= 0)) {
    errores.push('El tipo de cambio de respaldo debe ser mayor que 0.');
  }
  return errores;
}

/**
 * Cuerpo del PUT con SOLO las llaves del contrato (el ValidationPipe del API
 * rechaza llaves extra). JourneysCostsDto exige las cuatro tarifas: si falta
 * alguna no se manda `costs` (el API conserva las suyas; validarSettings ya lo
 * reporta).
 */
export function payloadSettings(s: JourneysSettings): JourneysSettingsInput {
  const costs: Partial<JourneyCosts> | undefined = TARIFAS.every((k) => isNum(s.costs[k]))
    ? Object.fromEntries(TARIFAS.map((k) => [k, s.costs[k] as number]))
    : undefined;
  return {
    enabled: s.enabled,
    quietStart: s.quietStart,
    quietEnd: s.quietEnd,
    hourlyCap: s.hourlyCap,
    attributionDays: s.attributionDays,
    monitorRecipients: s.monitorRecipients.map((m) => {
      const customerNumber = (m.customerNumber ?? '').trim();
      return {
        name: m.name.trim(),
        phone: m.phone.trim(),
        ...(customerNumber ? { customerNumber } : {}),
      };
    }),
    ...(costs ? { costs } : {}),
    ...(isNum(s.fxUsdMxnFallback) ? { fxUsdMxnFallback: s.fxUsdMxnFallback } : {}),
  };
}

/** Teléfonos GUARDADOS a los que se puede mandar prueba (el API rechaza otros). */
export const telefonosDePrueba = (saved: readonly JourneyMonitorRecipient[]): JourneyMonitorRecipient[] =>
  saved.filter((m) => E164_RE.test(m.phone));
