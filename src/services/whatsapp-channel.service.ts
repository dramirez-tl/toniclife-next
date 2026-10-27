// whatsapp-channel.service.ts - Salud del canal WhatsApp (Comercial →
// WhatsApp): GET /whatsapp/account-status (permiso 'comercial') y
// POST /whatsapp/marketing-pause (super_admin / admin).

import api from '@/lib/axios';
import type { ChannelStatus, MarketingPauseState } from '@/types/whatsappChannel';

export const whatsappChannelService = {
  async getStatus(refresh = false): Promise<ChannelStatus> {
    const { data } = await api.get<ChannelStatus>('/whatsapp/account-status', {
      params: refresh ? { refresh: 'true' } : {},
    });
    return data;
  },

  async setMarketingPause(paused: boolean, reason?: string): Promise<MarketingPauseState> {
    const { data } = await api.post<MarketingPauseState>('/whatsapp/marketing-pause', {
      paused,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    });
    return data;
  },
};

export default whatsappChannelService;
