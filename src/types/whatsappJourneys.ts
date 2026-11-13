// whatsappJourneys.ts - Contrato de los recorridos automáticos de WhatsApp
// (Comercial → WhatsApp → Recorridos). Espejo camelCase de los endpoints
// `/whatsapp/journeys` del API (SPEC Recorridos §5):
//
//  - GET  /whatsapp/journeys               → JourneysOverview
//  - PATCH /whatsapp/journeys/:code        → JourneyItem
//  - GET/PUT /whatsapp/journeys/settings   → JourneysSettings
//  - GET  /whatsapp/journeys/:code/preview → JourneyPreview (no envía nada)
//  - POST /whatsapp/journeys/:code/run     → corrida manual (respeta candados)
//  - POST /whatsapp/journeys/:code/test    → JourneyTestResult (solo monitores)
//  - GET  /whatsapp/journeys/runs          → JourneyRun[] (últimas 50)
//
// Todas las horas llegan YA formateadas en hora del centro de México (`*Cdmx`):
// el front no calcula fechas de negocio. El periodo es el de
// tonic.commission_periods (lo decide el API). Los adaptadores tolerantes que
// rellenan llaves ausentes viven en lib/whatsapp-campaign/recorridos.ts.

export type JourneyCategory = 'MARKETING' | 'UTILITY';

/** Códigos de los 12 recorridos (J1 Bienvenida … J12 Preferencias). */
export const JOURNEY_CODES = [
  'J1',
  'J2',
  'J3',
  'J4',
  'J5',
  'J6',
  'J7',
  'J8',
  'J9',
  'J10',
  'J11',
  'J12',
] as const;
export type JourneyCode = (typeof JOURNEY_CODES)[number];

/** Plantilla tal como la reporta Meta (null = no existe en Meta). */
export interface JourneyTemplateInfo {
  name: string;
  status: string;
  category: string;
  language: string;
  quality: string;
}

export type JourneyRunStatus = 'running' | 'done' | 'failed' | 'stopped';
export type JourneyRunSource = 'cron' | 'manual' | 'event';

/**
 * Última corrida del recorrido (contadores de la corrida, no de la bitácora).
 * Contabilidad del API (RunCounts): `failed` = fallos REALES de Meta (NO
 * incluye 131026 "sin WhatsApp" ni 'network'); esos dos van aparte en
 * `byError['131026']` y `byError['network']`. `skipped`/`byReason` incluyen
 * también 'fallido', 'sin_whatsapp' y 'detenido' (sin intentar al detenerse).
 */
export interface JourneyLastRun {
  startedCdmx: string | null;
  finishedCdmx: string | null;
  status: JourneyRunStatus | string;
  sent: number;
  /** Fallos reales de Meta (sin 131026 ni 'network'). */
  failed: number;
  skipped: number;
  /** Omitidos por motivo (opt_out, sin_opt_in, control, rampa, fallido, sin_whatsapp, detenido, …). */
  byReason: Record<string, number>;
  /** Por código de Meta ('131026', '131049', …), 'network' o del canal. */
  byError: Record<string, number>;
  /** ➕ Opcionales: si el API ya cruzó con la bitácora. */
  delivered: number | null;
  read: number | null;
}

export interface JourneyItem {
  code: JourneyCode | string;
  name: string;
  category: JourneyCategory;
  template: JourneyTemplateInfo | null;
  /**
   * Nombre de la plantilla configurada en el recorrido (lo manda el API aunque
   * no exista en Meta; se cae a template.name con un API viejo). Editable con
   * PATCH `templateName`.
   */
  templateName: string | null;
  enabled: boolean;
  /** 'HH:MM' hora local de la sucursal. */
  sendTime: string;
  /** 'Día 15 del periodo, 10:00 hora local'. */
  scheduleText: string;
  nextRunCdmx: string | null;
  lastRun: JourneyLastRun | null;
  /** Personas que entrarían hoy (caché 5 min en el API); null = sin cálculo. */
  audienceEstimate: number | null;
  /** Fracción 0..1 del grupo de control. */
  controlPct: number;
  dailyCap: number;
  rampPct: number;
  rampBranchIds: string[];
  params: Record<string, unknown>;
  campaignKey: string | null;
  /** Por qué no se puede encender (null = se puede). */
  blockReason: string | null;
  /**
   * Solo J8: de dónde sale el mensaje, con qué frecuencia y qué promoción de
   * Productos › Temporadas toca hoy y después. null en los demás recorridos
   * (o con un API anterior).
   */
  promo: JourneyPromoInfo | null;
}

/** Promoción de temporada que J8 anuncia el día que empieza (resumen para el admin). */
export interface JourneyPromoSummary {
  /** 'YYYY-MM-DD' (fecha local en que empieza). */
  date: string;
  seasonName: string;
  title: string;
  /** Condiciones en un renglón (lo que viaja en el mensaje). */
  text: string;
  /** 'solo hoy, sábado 14 de noviembre' / 'hasta el …'. */
  validity: string;
  /** Arte que va en el encabezado (JPG o PNG); null = sin arte usable. */
  imageUrl: string | null;
  promoCodes: string[];
}

export interface JourneyPromoInfo {
  /** 'temporadas' = automático desde Productos › Temporadas; 'manual' = solo lo capturado en Ajustes. */
  source: 'temporadas' | 'manual';
  /** 'alterna' = cada persona un día sí y un día no; 'diaria' = todos los días. */
  frequency: 'alterna' | 'diaria';
  /** La promoción que empieza en domingo sale ese domingo. */
  sundays: boolean;
  today: JourneyPromoSummary | null;
  next: JourneyPromoSummary | null;
  /** Aviso del API antes de encender (p. ej. "la hora de hoy ya pasó: sale en unos minutos"). */
  notice: string | null;
}

export interface JourneysPeriod {
  number: number;
  name: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
}

export interface JourneyMonitorRecipient {
  name: string;
  /** E.164 (+ y 11 a 15 dígitos). */
  phone: string;
  customerNumber?: string;
}

/** Tarifas por mensaje ENTREGADO (USD), por categoría y país. */
export interface JourneyCosts {
  marketingUsdMx: number | null;
  utilityUsdMx: number | null;
  utilityUsdUs: number | null;
  marketingUsdUs: number | null;
}

export interface JourneysSettings {
  /** Interruptor maestro: apagado, ningún recorrido manda nada. */
  enabled: boolean;
  /** Ventana de envío en hora local de la sucursal ('09:00'–'20:00'). */
  quietStart: string;
  quietEnd: string;
  hourlyCap: number;
  /** Días de la ventana de atribución (compras después del aviso). */
  attributionDays: number;
  monitorRecipients: JourneyMonitorRecipient[];
  costs: JourneyCosts;
  /** Tipo de cambio de respaldo USD→MXN si el periodo no tiene el suyo. */
  fxUsdMxnFallback: number | null;
}

export interface JourneysOverview {
  period: JourneysPeriod | null;
  settings: JourneysSettings;
  /** true = falta la migración 185: todo apagado y sin escrituras. */
  migrationPending: boolean;
  marketingPaused: boolean;
  /** false = WhatsApp Cloud API deshabilitado en el servidor: no sale ningún recorrido ni prueba. */
  whatsappEnabled: boolean;
  /** false = el cron de recorridos no corre en este entorno (solo production/local). */
  cronEnabled: boolean;
  /** Clientes con consentimiento de promociones (null = sin dato). */
  optInCount: number | null;
  journeys: JourneyItem[];
}

/** Cuerpo del PATCH /whatsapp/journeys/:code (solo las llaves que cambian). */
export interface JourneyPatchInput {
  enabled?: boolean;
  controlPct?: number;
  dailyCap?: number;
  rampPct?: number;
  rampBranchIds?: string[];
  sendTime?: string;
  params?: Record<string, unknown>;
  /** Nombre de la plantilla en Meta (minúsculas, dígitos y guion bajo). */
  templateName?: string;
}

/** Cuerpo del PUT /whatsapp/journeys/settings. */
export interface JourneysSettingsInput {
  enabled?: boolean;
  quietStart?: string;
  quietEnd?: string;
  hourlyCap?: number;
  attributionDays?: number;
  monitorRecipients?: JourneyMonitorRecipient[];
  costs?: Partial<JourneyCosts>;
  fxUsdMxnFallback?: number | null;
}

/** Fila de muestra de la vista previa (DATOS PERSONALES: solo para verificar). */
export interface JourneyPreviewSample {
  customerNumber: string;
  firstName: string;
  branch: string;
  points: number | null;
  /** Motivo de omisión, o null si saldría. */
  reason: string | null;
}

export interface JourneyPreview {
  period: JourneysPeriod | null;
  /** Candidatos EVALUADOS hoy (el API evalúa con tope de 4,000). */
  eligible: number;
  byReason: Record<string, number>;
  wouldSend: number;
  control: number;
  /** Alcance completo del segmento en toda la base (sin el tope); null = sin dato. */
  audience: number | null;
  sample: JourneyPreviewSample[];
}

export interface JourneyRunCounts {
  eligible: number | null;
  control: number | null;
  sent: number | null;
  failed: number | null;
  /** Omitidos por motivo. */
  skipped: Record<string, number>;
  byError: Record<string, number>;
  /** Copias a monitores enviadas (el API las manda como {sent, failed, skipped}). */
  monitors: number | null;
}

export interface JourneyRun {
  id: string;
  code: string;
  runKey: string | null;
  periodNumber: number | null;
  source: JourneyRunSource | string;
  status: JourneyRunStatus | string;
  startedCdmx: string | null;
  finishedCdmx: string | null;
  counts: JourneyRunCounts;
  error: string | null;
}

export interface JourneyRunsParams {
  periodNumber?: number | null;
  code?: string | null;
}

/**
 * Respuesta de POST /whatsapp/journeys/:code/run (tolerante: el API devuelve
 * JourneyRunOutcome {ran, reason, runId, runKey, status, counts…}). status
 * 'skipped' = no corrió; `message` trae el motivo en español.
 */
export interface JourneyRunResult {
  status: JourneyRunStatus | 'skipped' | string | null;
  counts: JourneyRunCounts | null;
  error: string | null;
  message: string | null;
}

/** Respuesta 200 de POST /whatsapp/journeys/:code/test. */
export interface JourneyTestResult {
  success: boolean;
  wamid: string | null;
  errorCode: string | null;
  error: string | null;
}
