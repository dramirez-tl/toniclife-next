'use client';

// useWhatsAppCampaigns.ts - Hooks React Query de Comercial → WhatsApp.
// El tablero se consulta cada 2 min SOLO mientras la campaña está activa y la
// pestaña del navegador está visible; tras un 403 deja de consultar.

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { whatsappCampaignsService } from '@/services/whatsapp-campaigns.service';
import { statusPollInterval } from '@/lib/legacy-sync/format';
import type { CampaignMembersParams } from '@/types/whatsappCampaign';

/** Sondeo del tablero: cada 2 min (la sync legacy→v2 corre cada 2 h). */
export const WHATSAPP_DASHBOARD_POLL_MS = 120_000;

export const whatsappCampaignKeys = {
  all: ['whatsapp', 'campaigns'] as const,
  dashboard: (key: string) => [...whatsappCampaignKeys.all, key, 'dashboard'] as const,
  members: (key: string, params: CampaignMembersParams) =>
    [...whatsappCampaignKeys.all, key, 'members', params] as const,
};

export const useWhatsAppCampaigns = () =>
  useQuery({
    queryKey: whatsappCampaignKeys.all,
    queryFn: () => whatsappCampaignsService.listCampaigns(),
    staleTime: 60_000,
    retry: false,
  });

export const useWhatsAppCampaignDashboard = (key: string | null | undefined) =>
  useQuery({
    queryKey: whatsappCampaignKeys.dashboard(key ?? ''),
    queryFn: () => whatsappCampaignsService.getDashboard(key as string),
    enabled: !!key,
    refetchInterval: (q) =>
      q.state.data?.campana.estado === 'activa'
        ? statusPollInterval(q.state.error, WHATSAPP_DASHBOARD_POLL_MS)
        : false,
    refetchIntervalInBackground: false,
    retry: false,
    staleTime: 30_000,
  });

export const useWhatsAppCampaignMembers = (
  key: string | null | undefined,
  params: CampaignMembersParams,
  opts: { enabled?: boolean } = {},
) =>
  useQuery({
    queryKey: whatsappCampaignKeys.members(key ?? '', params),
    queryFn: () => whatsappCampaignsService.getMembers(key as string, params),
    enabled: !!key && (opts.enabled ?? true),
    placeholderData: keepPreviousData,
    retry: false,
  });
