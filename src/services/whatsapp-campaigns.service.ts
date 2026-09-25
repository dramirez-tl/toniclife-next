// whatsapp-campaigns.service.ts - Comercial → WhatsApp (campañas medibles).
// Solo LECTURA: GET /whatsapp/campaigns, /:key/dashboard y /:key/members
// (permiso 'comercial' en el API). Nada de envíos desde aquí.
//
// El tablero se pasa por adaptarDashboard(): acepta el JSON v1/v2 y rellena
// las llaves nuevas que falten para que la página no se rompa si el API aún
// no calcula algún bloque.

import api from '@/lib/axios';
import { adaptarDashboard } from '@/lib/whatsapp-campaign/format';
import type {
  CampaignDashboard,
  CampaignListItem,
  CampaignMember,
  CampaignMembersPage,
  CampaignMembersParams,
} from '@/types/whatsappCampaign';

const BASE = '/whatsapp/campaigns';

/** Normaliza la página de /members: paginate() del API usa `data`; la spec de ejemplo, `items`. */
export function normalizeMembersPage(raw: unknown, params: CampaignMembersParams = {}): CampaignMembersPage {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const items = (Array.isArray(r.data) ? r.data : Array.isArray(r.items) ? r.items : []) as CampaignMember[];
  const total = typeof r.total === 'number' ? r.total : items.length;
  const limit = typeof r.limit === 'number' && r.limit > 0 ? r.limit : (params.limit ?? 50);
  const page = typeof r.page === 'number' && r.page > 0 ? r.page : (params.page ?? 1);
  const totalPages =
    typeof r.totalPages === 'number' ? r.totalPages : limit > 0 ? Math.ceil(total / limit) : 0;
  return { items, total, page, limit, totalPages };
}

export const whatsappCampaignsService = {
  async listCampaigns(): Promise<CampaignListItem[]> {
    const { data } = await api.get<CampaignListItem[]>(BASE);
    return Array.isArray(data) ? data : [];
  },

  async getDashboard(key: string): Promise<CampaignDashboard> {
    const { data } = await api.get<unknown>(`${BASE}/${encodeURIComponent(key)}/dashboard`);
    return adaptarDashboard(data, key);
  },

  async getMembers(key: string, params: CampaignMembersParams = {}): Promise<CampaignMembersPage> {
    // Solo se mandan los campos declarados en CampaignMembersQueryDto
    // (ValidationPipe con forbidNonWhitelisted rechaza cualquier otro).
    const query: Record<string, string | number> = {};
    if (params.filtro) query.filtro = params.filtro;
    if (params.segmento) query.segmento = params.segmento;
    if (params.ola) query.ola = params.ola;
    if (params.grupo) query.grupo = params.grupo;
    if (params.page) query.page = params.page;
    if (params.limit) query.limit = params.limit;
    const { data } = await api.get<unknown>(`${BASE}/${encodeURIComponent(key)}/members`, {
      params: query,
    });
    return normalizeMembersPage(data, params);
  },
};

export default whatsappCampaignsService;
