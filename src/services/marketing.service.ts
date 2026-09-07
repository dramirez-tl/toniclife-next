// marketing.service.ts - Respuestas de formularios públicos de marketing
// (Oportunidad de Negocio y Taller de Inducción). Lectura y configuración
// para /admin/comercial/formularios.

import api from '@/lib/axios';

/** Formularios públicos publicados (mismo catálogo que MARKETING_FORM_SLUGS en el API). */
export const MARKETING_FORM_SLUGS = ['oportunidad', 'induccion'] as const;
export type MarketingFormSlug = (typeof MARKETING_FORM_SLUGS)[number];

export const isMarketingFormSlug = (v: unknown): v is MarketingFormSlug =>
  typeof v === 'string' && (MARKETING_FORM_SLUGS as readonly string[]).includes(v);

export interface MarketingLead {
  id: string;
  formSlug: string;
  fullName: string;
  cityCountry?: string;
  phone?: string;
  invitedBy?: string;
  sourceHost?: string;
  /** Solo formulario 'induccion' (mig 128/129): número de distribuidor del asistente. */
  memberNumber?: string;
  /** Solo formulario 'induccion': nombre completo del asistente resuelto por el API. */
  memberName?: string;
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
  /** Formulario al que pertenece la configuración. */
  formSlug: string;
  /** URL de la reunión/transmisión (o del taller) a la que se manda a quien completa el formulario. */
  meetingUrl: string | null;
}

export interface UpdateMarketingFormConfigInput {
  /** Default en el API: 'oportunidad'. */
  formSlug?: MarketingFormSlug;
  /** Vacío = quitar el enlace. */
  meetingUrl: string;
}

class MarketingService {
  async getLeads(params: MarketingLeadQueryParams = {}): Promise<MarketingLeadList> {
    const response = await api.get<MarketingLeadList>('/marketing/leads', {
      params,
    });
    return response.data;
  }

  async getStats(formSlug: MarketingFormSlug = 'oportunidad'): Promise<MarketingLeadStats> {
    const response = await api.get<MarketingLeadStats>('/marketing/leads/stats', {
      params: { formSlug },
    });
    return response.data;
  }

  // 'oportunidad' es el default del API y se manda SIN formSlug: así la pestaña
  // Oportunidad hace exactamente las mismas llamadas que antes y sigue
  // funcionando aunque el front se despliegue antes que el API (o el API se
  // regrese a una versión sin formSlug, cuya ValidationPipe con
  // forbidNonWhitelisted respondería 400 "property formSlug should not exist").
  async getFormConfig(formSlug: MarketingFormSlug = 'oportunidad'): Promise<MarketingFormConfig> {
    const response = await api.get<MarketingFormConfig>('/marketing/forms/config', {
      params: formSlug === 'oportunidad' ? undefined : { formSlug },
    });
    return response.data;
  }

  async updateFormConfig(input: UpdateMarketingFormConfigInput): Promise<MarketingFormConfig> {
    const slug = input.formSlug ?? 'oportunidad';
    const body =
      slug === 'oportunidad'
        ? { meetingUrl: input.meetingUrl }
        : { formSlug: slug, meetingUrl: input.meetingUrl };
    const response = await api.put<MarketingFormConfig>('/marketing/forms/config', body);
    return response.data;
  }
}

export const marketingService = new MarketingService();
