// useMarketingLeads.ts — Hooks de React Query para las respuestas de
// formularios de marketing (admin → Comercial → Formularios).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  marketingService,
  type MarketingLeadQueryParams,
} from '@/services/marketing.service';

export const marketingLeadKeys = {
  all: ['marketing-leads'] as const,
  list: (params: MarketingLeadQueryParams) =>
    [...marketingLeadKeys.all, 'list', params] as const,
  stats: (formSlug: string) =>
    [...marketingLeadKeys.all, 'stats', formSlug] as const,
  config: () => [...marketingLeadKeys.all, 'config'] as const,
};

export const useMarketingLeads = (params: MarketingLeadQueryParams = {}) =>
  useQuery({
    queryKey: marketingLeadKeys.list(params),
    queryFn: () => marketingService.getLeads(params),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useMarketingLeadStats = (formSlug = 'oportunidad') =>
  useQuery({
    queryKey: marketingLeadKeys.stats(formSlug),
    queryFn: () => marketingService.getStats(formSlug),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useMarketingFormConfig = () =>
  useQuery({
    queryKey: marketingLeadKeys.config(),
    queryFn: () => marketingService.getFormConfig(),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useUpdateMarketingFormConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (meetingUrl: string) =>
      marketingService.updateFormConfig(meetingUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingLeadKeys.config() });
    },
  });
};
