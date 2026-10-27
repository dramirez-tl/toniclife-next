'use client';

// useWhatsAppChannel.ts - Hooks de la salud del canal WhatsApp. El estado se
// consulta cada 5 min mientras la pestaña está visible (el API cachea 60 s);
// "Actualizar" fuerza la lectura en Meta.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { whatsappChannelService } from '@/services/whatsapp-channel.service';

export const whatsappChannelKeys = {
  status: ['whatsapp', 'channel', 'status'] as const,
};

export const useWhatsAppChannelStatus = () =>
  useQuery({
    queryKey: whatsappChannelKeys.status,
    queryFn: () => whatsappChannelService.getStatus(false),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });

export const useRefreshWhatsAppChannel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => whatsappChannelService.getStatus(true),
    onSuccess: (data) => qc.setQueryData(whatsappChannelKeys.status, data),
  });
};

export const useSetMarketingPause = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { paused: boolean; reason?: string }) =>
      whatsappChannelService.setMarketingPause(input.paused, input.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: whatsappChannelKeys.status }),
  });
};
