// whatsapp-impact.service.ts - "Impacto del periodo" de WhatsApp (Comercial →
// WhatsApp): rollup por periodo de todos los recorridos y campañas
// (GET /whatsapp/campaigns/periods/:numero, permiso 'comercial', caché 60 s
// en el API) y el recálculo del impacto de una campaña
// (POST /whatsapp/campaigns/:key/impact/refresh, permiso 'whatsapp:manage').
//
// El rollup pasa por adaptarImpactoPeriodo(): llave ausente = null / [],
// para que el panel no se rompa si el API aún no calcula algún bloque.

import api from '@/lib/axios';
import { adaptarImpactoPeriodo } from '@/lib/whatsapp-campaign/impacto';
import type { ImpactoPeriodo } from '@/types/whatsappImpact';

const BASE = '/whatsapp/campaigns';

export const whatsappImpactService = {
  async getPeriodImpact(periodNumber: number): Promise<ImpactoPeriodo> {
    const { data } = await api.get<unknown>(`${BASE}/periods/${encodeURIComponent(String(periodNumber))}`);
    return adaptarImpactoPeriodo(data);
  },

  async refreshCampaignImpact(campaignKey: string): Promise<unknown> {
    const { data } = await api.post<unknown>(`${BASE}/${encodeURIComponent(campaignKey)}/impact/refresh`, {});
    return data;
  },
};

export default whatsappImpactService;
