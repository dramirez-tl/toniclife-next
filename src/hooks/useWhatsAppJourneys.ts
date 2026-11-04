'use client';

// useWhatsAppJourneys.ts - Hooks React Query de los recorridos automáticos
// de WhatsApp (Comercial → WhatsApp → Recorridos).
//
// Claves bajo ['whatsapp', 'journeys', …]: Inducción ya usa el prefijo
// ['whatsapp'] para plantillas y bitácora, así que NUNCA se invalida
// ['whatsapp'] a secas; las mutaciones invalidan solo ['whatsapp','journeys'].
// La lista se sondea cada 60 s mientras algún recorrido esté encendido y la
// pestaña del navegador esté visible; tras un 403 deja de consultar.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { statusPollInterval } from '@/lib/legacy-sync/format';
import { algunoEncendido } from '@/lib/whatsapp-campaign/recorridos';
import { whatsappJourneysService } from '@/services/whatsapp-journeys.service';
import type {
  JourneyPatchInput,
  JourneyRunsParams,
  JourneysSettingsInput,
} from '@/types/whatsappJourneys';

export const WHATSAPP_JOURNEYS_POLL_MS = 60_000;

export const whatsappJourneyKeys = {
  all: ['whatsapp', 'journeys'] as const,
  overview: () => [...whatsappJourneyKeys.all, 'overview'] as const,
  settings: () => [...whatsappJourneyKeys.all, 'settings'] as const,
  preview: (code: string, periodNumber: number | null) =>
    [...whatsappJourneyKeys.all, 'preview', code, periodNumber ?? 'actual'] as const,
  runs: (params: JourneyRunsParams) => [...whatsappJourneyKeys.all, 'runs', params] as const,
};

export const useWhatsAppJourneys = () =>
  useQuery({
    queryKey: whatsappJourneyKeys.overview(),
    queryFn: () => whatsappJourneysService.getOverview(),
    refetchInterval: (q) =>
      algunoEncendido(q.state.data?.journeys)
        ? statusPollInterval(q.state.error, WHATSAPP_JOURNEYS_POLL_MS)
        : false,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    retry: false,
  });

const useInvalidateJourneys = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: whatsappJourneyKeys.all });
};

export const useUpdateJourney = () => {
  const invalidate = useInvalidateJourneys();
  return useMutation({
    mutationFn: (input: { code: string; patch: JourneyPatchInput }) =>
      whatsappJourneysService.patchJourney(input.code, input.patch),
    onSettled: () => void invalidate(),
  });
};

export const useJourneySettings = (enabled = true) =>
  useQuery({
    queryKey: whatsappJourneyKeys.settings(),
    queryFn: () => whatsappJourneysService.getSettings(),
    enabled,
    staleTime: 30_000,
    retry: false,
  });

export const useUpdateJourneySettings = () => {
  const invalidate = useInvalidateJourneys();
  return useMutation({
    mutationFn: (input: JourneysSettingsInput) => whatsappJourneysService.putSettings(input),
    onSettled: () => void invalidate(),
  });
};

/** Vista previa (no envía nada); solo mientras el diálogo esté abierto. */
export const useJourneyPreview = (code: string, periodNumber: number | null, enabled: boolean) =>
  useQuery({
    queryKey: whatsappJourneyKeys.preview(code, periodNumber),
    queryFn: () => whatsappJourneysService.preview(code, periodNumber),
    enabled: enabled && !!code,
    staleTime: 60_000,
    retry: false,
  });

export const useRunJourney = () => {
  const invalidate = useInvalidateJourneys();
  return useMutation({
    mutationFn: (code: string) => whatsappJourneysService.run(code),
    onSettled: () => void invalidate(),
  });
};

/** Prueba a monitores: no toca la lista de recorridos (sale como mensaje manual). */
export const useTestJourney = () =>
  useMutation({
    mutationFn: (input: { code: string; phone: string }) =>
      whatsappJourneysService.test(input.code, input.phone),
  });

export const useJourneyRuns = (params: JourneyRunsParams, enabled = true) =>
  useQuery({
    queryKey: whatsappJourneyKeys.runs(params),
    queryFn: () => whatsappJourneysService.listRuns(params),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
