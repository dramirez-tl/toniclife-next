// induction.service.ts - Campana de WhatsApp del Taller de Induccion
// (admin > Comercial > Formularios > pestana Taller de Induccion).
//
// Dos familias de endpoints:
//  - /marketing/induccion/*  (settings, cohorte, envios, exclusiones)
//  - /whatsapp/*             (plantillas de Meta, subir video, historial de
//                             mensajes y metricas de whatsapp_messages)
// Todos requieren JWT + permiso 'comercial' (incluidos upload-media y
// templates; solo el envio manual de pruebas /whatsapp/send-template es de
// admins y no se usa aqui).

import api from '@/lib/axios';

// ---------------------------------------------------------------------------
// Settings (system_settings category 'induccion')
// ---------------------------------------------------------------------------

/** Recordatorio programado: dia de la semana (0=domingo) + hora HH:MM + plantilla. */
export interface InductionReminder {
  weekday: number;
  time: string;
  template: string;
}

/**
 * Numero corporativo de monitoreo: recibe una copia de cada invitacion y
 * recordatorio que sale a la cohorte (una sola vez por envio, kind
 * 'induccion_monitor'). No cuenta en las metricas de la cohorte.
 */
export interface InductionMonitorRecipient {
  /** 1-80 caracteres; el primer nombre va en {{1}} de la copia. */
  name: string;
  /** E.164: '+' + 11 a 15 digitos (p. ej. +524775813450). */
  phone: string;
  /**
   * Numero de distribuidor propio (solo digitos, opcional) para el boton
   * dinamico de la plantilla; sin el, el API manda '0'.
   */
  customerNumber?: string;
}

/** Tope de numeros de monitoreo (espejo del ArrayMaxSize del API). */
export const MAX_MONITOR_RECIPIENTS = 10;

export interface InductionSettings {
  /** Dia del taller (0=domingo ... 6=sabado). Default 2 (martes). */
  workshopWeekday: number;
  /** Hora del taller HH:MM (24 h). Default '20:00'. */
  workshopTime: string;
  /** Dia en que inicia la cohorte (default 3 = miercoles anterior). */
  cohortStartWeekday: number;
  /** Envios automaticos por cron (invitacion diaria + recordatorios). */
  autoEnabled: boolean;
  /** Hora HH:MM del envio diario de invitaciones (cron). */
  inviteDailyTime: string;
  /** Nombre EXACTO de la plantilla aprobada en Meta para la invitacion. */
  invitationTemplate: string;
  /** Path en GCS del video del encabezado (p. ej. whatsapp/bienvenida_nuevo_distribuidor.mp4). */
  invitationVideoPath: string;
  reminders: InductionReminder[];
  /** Solo distribuidores con kit (kit_type no nulo). */
  requireKit: boolean;
  /** Incluir clientes preferentes ademas de distribuidores. */
  includePreferred: boolean;
  /** Numeros corporativos que reciben copia de cada envio (maximo 10). */
  monitorRecipients: InductionMonitorRecipient[];
}

export type UpdateInductionSettingsInput = Partial<InductionSettings>;

/** Boton de la plantilla tal como lo describe el API (GET /settings.template). */
export interface InductionTemplateButton {
  type: string;
  text: string | null;
  url: string | null;
  hasVariable: boolean;
}

/** Detalle de la plantilla de invitacion en Meta (GET /settings.template). */
export interface InductionTemplateInfo {
  name: string;
  status: string;
  language: string;
  category: string;
  headerFormat: string | null;
  bodyText: string | null;
  bodyVariables: number;
  footerText: string | null;
  buttons: InductionTemplateButton[];
  buttonUrl: string | null;
  buttonHasVariable: boolean;
}

/**
 * Respuesta de GET/PUT /marketing/induccion/settings: la configuracion mas
 * datos de SOLO LECTURA (enlace, canal, proximo taller, plantilla). Estos
 * extras NO se pueden reenviar en el PUT (ver toSettingsPayload).
 */
export interface InductionSettingsResponse extends InductionSettings {
  /** Enlace del taller (marketing.induccion_meeting_url). */
  meetingUrl: string | null;
  whatsappEnabled: boolean;
  maxSendsPerRun: number;
  nextWorkshop: {
    workshopDate: string;
    cohortStart: string;
    cohortEnd: string;
    /** 'martes 8 de septiembre' (tal como lo manda el API en {{2}}). */
    longDate: string;
    /** '8:00 p. m.' ({{3}}). */
    timeLabel: string;
    bodyParamsPreview: string[];
  };
  template: InductionTemplateInfo | null;
  templatesError: string | null;
}

/**
 * Recorta cualquier objeto a las 11 claves que acepta
 * UpdateInductionSettingsDto. El ValidationPipe del API corre con whitelist +
 * forbidNonWhitelisted: si el borrador (que es el response completo del GET)
 * se mandara tal cual, meetingUrl/nextWorkshop/template/... darian 400
 * "property X should not exist". Lo mismo aplica dentro de cada
 * monitorRecipient (solo name, phone y customerNumber cuando existe).
 */
export function toSettingsPayload(
  input: UpdateInductionSettingsInput,
): UpdateInductionSettingsInput {
  const out: UpdateInductionSettingsInput = {};
  if (input.workshopWeekday !== undefined) out.workshopWeekday = input.workshopWeekday;
  if (input.workshopTime !== undefined) out.workshopTime = input.workshopTime;
  if (input.cohortStartWeekday !== undefined)
    out.cohortStartWeekday = input.cohortStartWeekday;
  if (input.autoEnabled !== undefined) out.autoEnabled = input.autoEnabled;
  if (input.inviteDailyTime !== undefined) out.inviteDailyTime = input.inviteDailyTime;
  if (input.invitationTemplate !== undefined)
    out.invitationTemplate = input.invitationTemplate;
  if (input.invitationVideoPath !== undefined)
    out.invitationVideoPath = input.invitationVideoPath;
  if (input.reminders !== undefined) {
    out.reminders = input.reminders.map((r) => ({
      weekday: r.weekday,
      time: r.time,
      template: r.template,
    }));
  }
  if (input.requireKit !== undefined) out.requireKit = input.requireKit;
  if (input.includePreferred !== undefined)
    out.includePreferred = input.includePreferred;
  if (input.monitorRecipients !== undefined) {
    out.monitorRecipients = input.monitorRecipients.map((m) => {
      const customerNumber = (m.customerNumber ?? '').trim();
      return {
        name: (m.name ?? '').trim(),
        phone: (m.phone ?? '').trim(),
        ...(customerNumber ? { customerNumber } : {}),
      };
    });
  }
  return out;
}

/**
 * Lista de monitoreo tal como la manda el API, o [] si aun no la incluye
 * (API sin desplegar / fila JSONB vieja): la UI siempre itera un arreglo.
 */
function normalizeMonitorRecipients(raw: unknown): InductionMonitorRecipient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .map((x) => ({
      name: typeof x.name === 'string' ? x.name : '',
      phone: typeof x.phone === 'string' ? x.phone : '',
      ...(typeof x.customerNumber === 'string' && x.customerNumber
        ? { customerNumber: x.customerNumber }
        : {}),
    }));
}

function normalizeSettingsResponse(
  data: InductionSettingsResponse,
): InductionSettingsResponse {
  return {
    ...data,
    monitorRecipients: normalizeMonitorRecipients(
      (data as { monitorRecipients?: unknown }).monitorRecipients,
    ),
  };
}

// ---------------------------------------------------------------------------
// Mensajes WhatsApp (tabla whatsapp_messages, mig 131)
// ---------------------------------------------------------------------------

export const WHATSAPP_MESSAGE_STATUSES = [
  'queued',
  'accepted',
  'sent',
  'delivered',
  'read',
  'failed',
  'received',
] as const;
export type WhatsAppMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number];

export const WHATSAPP_CAMPAIGN_KINDS = [
  'manual',
  'induccion_invitacion',
  'induccion_recordatorio',
  /** Copia corporativa de un envio de la campana (mig 132). */
  'induccion_monitor',
  'inbound',
] as const;
export type WhatsAppCampaignKind = (typeof WHATSAPP_CAMPAIGN_KINDS)[number];

export interface WhatsAppMessage {
  id: string;
  direction: 'out' | 'in';
  wamid: string | null;
  customerId: string | null;
  /** Numero de distribuidor (resuelto por el API). */
  customerNumber?: string | null;
  /** Nombre del cliente (resuelto por el API). */
  customerName?: string | null;
  phoneE164: string;
  templateName: string | null;
  language: string | null;
  bodyParams: string[] | null;
  headerMediaPath: string | null;
  campaignKind: WhatsAppCampaignKind | string;
  campaignKey: string | null;
  status: WhatsAppMessageStatus;
  errorCode: string | null;
  errorTitle: string | null;
  errorDetail: string | null;
  /** Solo entrantes. */
  textBody: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface WhatsAppMessageList {
  data: WhatsAppMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WhatsAppMessageQueryParams {
  campaignKind?: string;
  campaignKey?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WhatsAppMessageStats {
  total: number;
  /** En cola: fila creada y sin respuesta de Meta todavia (o atorada). */
  queued: number;
  accepted: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  byError: Array<{ code: string | null; title: string | null; count: number }>;
}

export interface WhatsAppMessageStatsParams {
  campaignKind?: string;
  campaignKey?: string;
}

// ---------------------------------------------------------------------------
// Plantillas de Meta (GET /whatsapp/templates)
// ---------------------------------------------------------------------------

export interface WhatsAppTemplateButton {
  type: string;
  text?: string;
  url?: string;
  phone_number?: string;
  example?: unknown;
}

/** Componente crudo de Meta: HEADER / BODY / FOOTER / BUTTONS. */
export interface WhatsAppTemplateComponent {
  type: string;
  format?: string;
  text?: string;
  example?: unknown;
  buttons?: WhatsAppTemplateButton[];
}

export interface WhatsAppTemplate {
  name: string;
  status: string;
  language: string;
  category: string;
  id?: string;
  components?: WhatsAppTemplateComponent[];
}

export type WhatsAppTemplatesResponse =
  | { success: true; templates: WhatsAppTemplate[] }
  | { success: false; error: string };

export interface WhatsAppUploadMediaResult {
  success: boolean;
  path: string;
  publicUrl: string | null;
  signedUrlSample: string | null;
  size: number;
  note?: string;
}

// ---------------------------------------------------------------------------
// Cohorte del taller
// ---------------------------------------------------------------------------

/** Estado de un mensaje de campana (invitacion o recordatorio) de un cliente. */
export interface InductionMessageState {
  status: WhatsAppMessageStatus;
  wamid?: string | null;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  failedAt?: string | null;
  errorCode?: string | null;
  error?: string | null;
  createdAt?: string | null;
}

export interface InductionReminderState extends InductionMessageState {
  /** campaign_key del recordatorio: '<workshopDate>#rec-<weekday>-<HHMM>'. */
  key: string;
}

export interface InductionCohortRow {
  customerId: string;
  customerNumber: string;
  name: string;
  /** Lada solo digitos ('52'). */
  phoneCountryCode: string | null;
  /** 10 digitos o null (mig 130). */
  phone: string | null;
  /** '+52XXXXXXXXXX' o null si no hay telefono valido. */
  phoneE164: string | null;
  /** Codigo ISO del pais (MX, US, FN, CO, GT). */
  country: string | null;
  kitType: 'basic' | 'premium' | null;
  /** YYYY-MM-DD */
  registrationDate: string;
  optOut: boolean;
  excluded: boolean;
  excludedReason?: string | null;
  /**
   * Numero del registro que SI recibe los mensajes cuando este comparte
   * telefono con otro de la cohorte (gemelo legacy/nativo de la doble
   * captura o telefono compartido); null si es el titular.
   */
  duplicateOf: string | null;
  invitation: InductionMessageState | null;
  reminders: InductionReminderState[];
}

export interface InductionCohortCounts {
  total: number;
  sinTelefono: number;
  optOut: number;
  excluidos: number;
  /** Registros con telefono repetido dentro de la cohorte (no se les envia). */
  duplicados?: number;
  porInvitar: number;
  invitados: number;
  entregados: number;
  leidos: number;
  fallidos: number;
}

export interface InductionCohort {
  workshopDate: string;
  cohortStart: string;
  cohortEnd: string;
  counts: InductionCohortCounts;
  rows: InductionCohortRow[];
}

export interface InductionSendDetail {
  customerId?: string;
  customerNumber?: string;
  name?: string;
  /** 'sent' | 'failed' | 'skipped' (el API puede usar status o result). */
  status?: string;
  result?: string;
  error?: string;
  reason?: string;
  wamid?: string;
}

/**
 * Copias de monitoreo de una corrida (solo en lotes: invitaciones sin
 * customerIds y recordatorios). No entran en sent/failed/skipped ni en details.
 */
export interface InductionMonitorSendResult {
  sent: number;
  failed: number;
  /** Ya tenia copia de este envio, opt-out o migracion 132 pendiente. */
  skipped: number;
}

export interface InductionSendResult {
  sent: number;
  failed: number;
  skipped: number;
  details: InductionSendDetail[];
  /** Ausente en reenvios individuales y en un API anterior al monitoreo. */
  monitor?: InductionMonitorSendResult;
}

export interface SendInvitationsInput {
  workshopDate?: string;
  customerIds?: string[];
}

export interface SendReminderInput {
  workshopDate?: string;
  reminderKey?: string;
}

/**
 * POST /marketing/induccion/monitor-test: prueba a uno de los numeros de
 * monitoreo GUARDADOS (el API responde 400 si el telefono no esta guardado;
 * nombre y numero de distribuidor salen de lo guardado).
 */
export interface MonitorTestInput {
  /** E.164 ('+' + 11 a 15 digitos) de un numero de monitoreo guardado. */
  phone: string;
}

/**
 * Respuesta de monitor-test. Sale como campaignKind 'manual' (sin unique, se
 * puede repetir). El API puede reportar el fallo con success=false o con
 * result='failed'; los demas campos son informativos.
 */
export interface MonitorTestResult {
  success?: boolean;
  result?: string;
  phone?: string;
  wamid?: string | null;
  template?: string;
  workshopDate?: string;
  error?: string | null;
  reason?: string | null;
}

export interface SetExclusionInput {
  customerId: string;
  workshopDate: string;
  excluded: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// Normalizacion defensiva de filas (por si el API manda alias snake_case)
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;

function pick<T>(obj: Raw, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined) return obj[k] as T;
  }
  return undefined;
}

function normalizeMessageState(raw: unknown): InductionMessageState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Raw;
  const status = pick<string>(r, 'status');
  if (!status) return null;
  return {
    status: status as WhatsAppMessageStatus,
    wamid: pick<string>(r, 'wamid') ?? null,
    sentAt: pick<string>(r, 'sentAt', 'sent_at') ?? null,
    deliveredAt: pick<string>(r, 'deliveredAt', 'delivered_at') ?? null,
    readAt: pick<string>(r, 'readAt', 'read_at') ?? null,
    failedAt: pick<string>(r, 'failedAt', 'failed_at') ?? null,
    errorCode: pick<string>(r, 'errorCode', 'error_code') ?? null,
    error:
      pick<string>(r, 'error', 'errorDetail', 'error_detail', 'errorTitle') ??
      null,
    createdAt: pick<string>(r, 'createdAt', 'created_at') ?? null,
  };
}

function normalizeCohortRow(raw: Raw): InductionCohortRow {
  const remindersRaw = pick<unknown[]>(raw, 'reminders', 'recordatorios') ?? [];
  const reminders: InductionReminderState[] = remindersRaw
    .map((x) => {
      const st = normalizeMessageState(x);
      const key = pick<string>(
        (x ?? {}) as Raw,
        'key',
        'campaignKey',
        'campaign_key',
      );
      if (!key || !st) return null;
      return { ...st, key };
    })
    .filter((x): x is InductionReminderState => x !== null);
  return {
    customerId: pick<string>(raw, 'customerId', 'customer_id', 'id') ?? '',
    customerNumber:
      pick<string>(raw, 'customerNumber', 'customer_number', 'number') ?? '',
    name: pick<string>(raw, 'name', 'fullName', 'full_name') ?? '',
    phoneCountryCode:
      pick<string>(raw, 'phoneCountryCode', 'phone_country_code') ?? null,
    phone: pick<string>(raw, 'phone') ?? null,
    phoneE164: pick<string>(raw, 'phoneE164', 'phone_e164', 'e164') ?? null,
    country:
      pick<string>(raw, 'country', 'countryCode', 'country_code') ?? null,
    kitType: (pick<string>(raw, 'kitType', 'kit_type', 'kit') ??
      null) as InductionCohortRow['kitType'],
    registrationDate:
      pick<string>(raw, 'registrationDate', 'registration_date') ?? '',
    optOut: Boolean(pick(raw, 'optOut', 'opt_out', 'whatsappOptOut')),
    excluded: Boolean(pick(raw, 'excluded')),
    excludedReason:
      pick<string>(
        raw,
        'excludedReason',
        'excluded_reason',
        'exclusionReason',
      ) ?? null,
    duplicateOf: pick<string>(raw, 'duplicateOf', 'duplicate_of') ?? null,
    invitation: normalizeMessageState(pick(raw, 'invitation', 'invitacion')),
    reminders,
  };
}

// ---------------------------------------------------------------------------
// Servicio
// ---------------------------------------------------------------------------

class InductionService {
  // --- Settings ---
  async getSettings(): Promise<InductionSettingsResponse> {
    const { data } = await api.get<InductionSettingsResponse>(
      '/marketing/induccion/settings',
    );
    return normalizeSettingsResponse(data);
  }

  /** Solo viajan las 11 claves del DTO (ver toSettingsPayload). */
  async updateSettings(
    input: UpdateInductionSettingsInput,
  ): Promise<InductionSettingsResponse> {
    const { data } = await api.put<InductionSettingsResponse>(
      '/marketing/induccion/settings',
      toSettingsPayload(input),
    );
    return normalizeSettingsResponse(data);
  }

  // --- Cohorte ---
  async getCohort(workshopDate?: string): Promise<InductionCohort> {
    const { data } = await api.get<InductionCohort>(
      '/marketing/induccion/cohort',
      { params: workshopDate ? { workshopDate } : undefined },
    );
    const rows = Array.isArray(data.rows)
      ? data.rows.map((r) => normalizeCohortRow(r as unknown as Raw))
      : [];
    return { ...data, rows };
  }

  async sendInvitations(
    input: SendInvitationsInput = {},
  ): Promise<InductionSendResult> {
    const { data } = await api.post<InductionSendResult>(
      '/marketing/induccion/send-invitations',
      input,
    );
    return data;
  }

  async sendReminder(input: SendReminderInput = {}): Promise<InductionSendResult> {
    const { data } = await api.post<InductionSendResult>(
      '/marketing/induccion/send-reminder',
      input,
    );
    return data;
  }

  async setExclusion(input: SetExclusionInput): Promise<unknown> {
    const { data } = await api.post('/marketing/induccion/exclusions', input);
    return data;
  }

  /**
   * Manda la invitacion del proximo taller a ese telefono como mensaje
   * 'manual' (boton "Enviar prueba" de los numeros de monitoreo).
   */
  async sendMonitorTest(input: MonitorTestInput): Promise<MonitorTestResult> {
    const { data } = await api.post<MonitorTestResult>(
      '/marketing/induccion/monitor-test',
      input,
    );
    return data ?? {};
  }

  // --- WhatsApp: plantillas y video ---
  async getTemplates(): Promise<WhatsAppTemplatesResponse> {
    const { data } = await api.get<WhatsAppTemplatesResponse>('/whatsapp/templates');
    return data;
  }

  async uploadMedia(file: File): Promise<WhatsAppUploadMediaResult> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post<WhatsAppUploadMediaResult>(
      '/whatsapp/upload-media',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  }

  // --- WhatsApp: historial y metricas ---
  async getMessages(
    params: WhatsAppMessageQueryParams = {},
  ): Promise<WhatsAppMessageList> {
    const { data } = await api.get<WhatsAppMessageList>('/whatsapp/messages', {
      params,
    });
    return data;
  }

  async getMessageStats(
    params: WhatsAppMessageStatsParams = {},
  ): Promise<WhatsAppMessageStats> {
    const { data } = await api.get<WhatsAppMessageStats>(
      '/whatsapp/messages/stats',
      { params },
    );
    return data;
  }
}

export const inductionService = new InductionService();
