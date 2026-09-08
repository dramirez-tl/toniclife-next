'use client';

// useInduction.ts - Hooks React Query de la campana de WhatsApp del Taller de
// Induccion (admin > Comercial > Formularios > Taller de Induccion).
// Las claves de cohorte van por workshopDate ('current' cuando el API decide).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  inductionService,
  type MonitorTestInput,
  type SendInvitationsInput,
  type SendReminderInput,
  type SetExclusionInput,
  type UpdateInductionSettingsInput,
  type WhatsAppMessageQueryParams,
  type WhatsAppMessageStatsParams,
} from '@/services/induction.service';

export const inductionKeys = {
  all: ['induction'] as const,
  settings: () => [...inductionKeys.all, 'settings'] as const,
  cohort: (workshopDate?: string) =>
    [...inductionKeys.all, 'cohort', workshopDate ?? 'current'] as const,
};

export const whatsappKeys = {
  all: ['whatsapp'] as const,
  templates: () => [...whatsappKeys.all, 'templates'] as const,
  messages: (params: WhatsAppMessageQueryParams) =>
    [...whatsappKeys.all, 'messages', 'list', params] as const,
  stats: (params: WhatsAppMessageStatsParams) =>
    [...whatsappKeys.all, 'messages', 'stats', params] as const,
};

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const useInductionSettings = () =>
  useQuery({
    queryKey: inductionKeys.settings(),
    queryFn: () => inductionService.getSettings(),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

export const useUpdateInductionSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateInductionSettingsInput) =>
      inductionService.updateSettings(input),
    onSuccess: (data) => {
      // Si el PUT devuelve la configuracion completa se siembra la cache
      // (sin parpadeo); en cualquier caso se revalida.
      if (data && typeof data === 'object' && 'workshopWeekday' in data) {
        queryClient.setQueryData(inductionKeys.settings(), data);
      }
      queryClient.invalidateQueries({ queryKey: inductionKeys.settings() });
      // La cohorte depende de requireKit / includePreferred / dia del taller.
      queryClient.invalidateQueries({
        queryKey: [...inductionKeys.all, 'cohort'],
      });
    },
  });
};

// ---------------------------------------------------------------------------
// Cohorte y envios
// ---------------------------------------------------------------------------

export const useInductionCohort = (workshopDate?: string, enabled = true) =>
  useQuery({
    queryKey: inductionKeys.cohort(workshopDate),
    queryFn: () => inductionService.getCohort(workshopDate),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

/** Invalida cohorte (todas las fechas) + historial/metricas de mensajes. */
const useInvalidateCampaignData = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: [...inductionKeys.all, 'cohort'] });
    queryClient.invalidateQueries({
      queryKey: [...whatsappKeys.all, 'messages'],
    });
  };
};

export const useSendInvitations = () => {
  const invalidate = useInvalidateCampaignData();
  return useMutation({
    mutationFn: (input: SendInvitationsInput) =>
      inductionService.sendInvitations(input),
    onSettled: () => invalidate(),
  });
};

export const useSendReminder = () => {
  const invalidate = useInvalidateCampaignData();
  return useMutation({
    mutationFn: (input: SendReminderInput) => inductionService.sendReminder(input),
    onSettled: () => invalidate(),
  });
};

/**
 * Prueba de monitoreo: manda la invitacion del proximo taller a uno de los
 * numeros de monitoreo guardados (kind 'manual', repetible). Solo toca el
 * historial de mensajes, no la cohorte.
 */
export const useSendMonitorTest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MonitorTestInput) =>
      inductionService.sendMonitorTest(input),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...whatsappKeys.all, 'messages'],
      });
    },
  });
};

export const useSetInductionExclusion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetExclusionInput) => inductionService.setExclusion(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: inductionKeys.cohort(input.workshopDate),
      });
      queryClient.invalidateQueries({ queryKey: inductionKeys.cohort() });
    },
  });
};

// ---------------------------------------------------------------------------
// WhatsApp: plantillas, video, historial y metricas
// ---------------------------------------------------------------------------

export const useWhatsAppTemplates = (enabled = true) =>
  useQuery({
    queryKey: whatsappKeys.templates(),
    queryFn: () => inductionService.getTemplates(),
    enabled,
    // Meta cambia el estado de aprobacion de vez en cuando; 5 min basta.
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

export const useUploadWhatsAppMedia = () =>
  useMutation({
    mutationFn: (file: File) => inductionService.uploadMedia(file),
  });

export const useWhatsAppMessages = (
  params: WhatsAppMessageQueryParams = {},
  enabled = true,
) =>
  useQuery({
    queryKey: whatsappKeys.messages(params),
    queryFn: () => inductionService.getMessages(params),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });

export const useWhatsAppMessageStats = (
  params: WhatsAppMessageStatsParams = {},
  enabled = true,
) =>
  useQuery({
    queryKey: whatsappKeys.stats(params),
    queryFn: () => inductionService.getMessageStats(params),
    enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
