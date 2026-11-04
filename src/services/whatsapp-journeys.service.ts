// whatsapp-journeys.service.ts - Recorridos automáticos de WhatsApp
// (Comercial → WhatsApp → Recorridos): endpoints /whatsapp/journeys del API.
// Lecturas con permiso 'comercial'; escrituras (PATCH, PUT settings, run,
// test) con 'whatsapp:manage'. Sin la migración 185 el API responde 503
// PRD_MIGRATION_PENDING a las escrituras y `migrationPending: true` en la
// lectura.
//
// Todas las respuestas pasan por los adaptadores tolerantes de
// lib/whatsapp-campaign/recorridos.ts (llave ausente = null / []).

import api from '@/lib/axios';
import {
  adaptarJourneyItem,
  adaptarPreview,
  adaptarRecorridos,
  adaptarRunResult,
  adaptarRuns,
  adaptarSettings,
  adaptarTestResult,
} from '@/lib/whatsapp-campaign/recorridos';
import type {
  JourneyItem,
  JourneyPatchInput,
  JourneyPreview,
  JourneyRun,
  JourneyRunResult,
  JourneyRunsParams,
  JourneysOverview,
  JourneysSettings,
  JourneysSettingsInput,
  JourneyTestResult,
} from '@/types/whatsappJourneys';

const BASE = '/whatsapp/journeys';

const codePath = (code: string) => `${BASE}/${encodeURIComponent(code)}`;

/** Solo las llaves del contrato del PATCH (ValidationPipe con forbidNonWhitelisted). */
export function toJourneyPatchPayload(input: JourneyPatchInput): JourneyPatchInput {
  const out: JourneyPatchInput = {};
  if (input.enabled !== undefined) out.enabled = input.enabled;
  if (input.controlPct !== undefined) out.controlPct = input.controlPct;
  if (input.dailyCap !== undefined) out.dailyCap = input.dailyCap;
  if (input.rampPct !== undefined) out.rampPct = input.rampPct;
  if (input.rampBranchIds !== undefined) out.rampBranchIds = [...input.rampBranchIds];
  if (input.sendTime !== undefined) out.sendTime = input.sendTime;
  if (input.params !== undefined) out.params = { ...input.params };
  if (input.templateName !== undefined) out.templateName = input.templateName.trim();
  return out;
}

export const whatsappJourneysService = {
  async getOverview(): Promise<JourneysOverview> {
    const { data } = await api.get<unknown>(BASE);
    return adaptarRecorridos(data);
  },

  async patchJourney(code: string, input: JourneyPatchInput): Promise<JourneyItem | null> {
    const { data } = await api.patch<unknown>(codePath(code), toJourneyPatchPayload(input));
    return adaptarJourneyItem(data);
  },

  async getSettings(): Promise<JourneysSettings> {
    const { data } = await api.get<unknown>(`${BASE}/settings`);
    return adaptarSettings(data);
  },

  async putSettings(input: JourneysSettingsInput): Promise<JourneysSettings> {
    const { data } = await api.put<unknown>(`${BASE}/settings`, input);
    return adaptarSettings(data);
  },

  /** Conteos por motivo y muestra (≤ 20) de lo que saldría hoy; no envía nada. */
  async preview(code: string, periodNumber?: number | null): Promise<JourneyPreview> {
    const { data } = await api.get<unknown>(`${codePath(code)}/preview`, {
      params: periodNumber != null ? { periodNumber } : {},
    });
    return adaptarPreview(data);
  },

  /** Corrida manual: respeta todos los candados; 409 fuera de horario o con corrida en curso. */
  async run(code: string): Promise<JourneyRunResult> {
    const { data } = await api.post<unknown>(`${codePath(code)}/run`, {});
    return adaptarRunResult(data);
  },

  /** Prueba a un teléfono GUARDADO en monitorRecipients (el API rechaza otros). */
  async test(code: string, phone: string): Promise<JourneyTestResult> {
    const { data } = await api.post<unknown>(`${codePath(code)}/test`, { phone });
    return adaptarTestResult(data);
  },

  async listRuns(params: JourneyRunsParams = {}): Promise<JourneyRun[]> {
    const query: Record<string, string | number> = {};
    if (params.periodNumber != null) query.periodNumber = params.periodNumber;
    if (params.code) query.code = params.code;
    const { data } = await api.get<unknown>(`${BASE}/runs`, { params: query });
    return adaptarRuns(data);
  },
};

export default whatsappJourneysService;
