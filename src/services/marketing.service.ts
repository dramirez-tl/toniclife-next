// marketing.service.ts — Respuestas de formularios públicos de marketing
// (Oportunidad de Negocio). Lectura para /admin/comercial/formularios.

import api from '@/lib/axios';

export interface MarketingLead {
  id: string;
  formSlug: string;
  fullName: string;
  cityCountry?: string;
  phone?: string;
  invitedBy?: string;
  sourceHost?: string;
  createdAt: string;
}

export interface MarketingLeadList {
  data: MarketingLead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketingLeadStats {
  total: number;
  today: number;
  last7Days: number;
  byDay: Array<{ day: string; count: number }>;
}

export interface MarketingLeadQueryParams {
  formSlug?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface MarketingFormConfig {
  /** URL de la reunión/transmisión a la que se manda a los afiliados. */
  meetingUrl: string | null;
}

class MarketingService {
  async getLeads(params: MarketingLeadQueryParams = {}): Promise<MarketingLeadList> {
    const response = await api.get<MarketingLeadList>('/marketing/leads', {
      params,
    });
    return response.data;
  }

  async getStats(formSlug = 'oportunidad'): Promise<MarketingLeadStats> {
    const response = await api.get<MarketingLeadStats>('/marketing/leads/stats', {
      params: { formSlug },
    });
    return response.data;
  }

  async getFormConfig(): Promise<MarketingFormConfig> {
    const response = await api.get<MarketingFormConfig>('/marketing/forms/config');
    return response.data;
  }

  async updateFormConfig(meetingUrl: string): Promise<MarketingFormConfig> {
    const response = await api.put<MarketingFormConfig>('/marketing/forms/config', {
      meetingUrl,
    });
    return response.data;
  }
}

export const marketingService = new MarketingService();
