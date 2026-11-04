'use client';

// useWhatsAppPeriodImpact.ts - Hook React Query del "Impacto del periodo"
// (Comercial → WhatsApp). Clave ['whatsapp', 'impact', periodo]: se consulta
// cada 2 min SOLO mientras el periodo (de tonic.commission_periods, lo dice el
// API con `periodo.cerrado`) está abierto y la pestaña del navegador está
// visible; tras un 403 deja de consultar. Nunca se invalida ['whatsapp'] a
// secas (prefijo compartido con Inducción).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { statusPollInterval } from '@/lib/legacy-sync/format';
import { whatsappImpactService } from '@/services/whatsapp-impact.service';

export const WHATSAPP_IMPACT_POLL_MS = 120_000;

export const whatsappImpactKeys = {
  all: ['whatsapp', 'impact'] as const,
  periodo: (periodNumber: number) => [...whatsappImpactKeys.all, periodNumber] as const,
};

export const useWhatsAppPeriodImpact = (periodNumber: number | null | undefined) =>
  useQuery({
    queryKey: whatsappImpactKeys.periodo(periodNumber ?? 0),
    queryFn: () => whatsappImpactService.getPeriodImpact(periodNumber as number),
    enabled: periodNumber != null && periodNumber > 0,
    refetchInterval: (q) =>
      q.state.data && !q.state.data.periodo.cerrado
        ? statusPollInterval(q.state.error, WHATSAPP_IMPACT_POLL_MS)
        : false,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    retry: false,
  });

/** Recalcula el impacto de una campaña (permiso whatsapp:manage) y refresca el rollup. */
export const useRefreshCampaignImpact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignKey: string) => whatsappImpactService.refreshCampaignImpact(campaignKey),
    onSettled: () => void qc.invalidateQueries({ queryKey: whatsappImpactKeys.all }),
  });
};
