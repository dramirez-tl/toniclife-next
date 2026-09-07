// useMarketingLeads.ts - Hooks de React Query para las respuestas de
// formularios de marketing (admin > Comercial > Formularios). Todo va
// parametrizado por formSlug ('oportunidad' | 'induccion').

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  marketingService,
  type MarketingFormSlug,
  type MarketingLeadQueryParams,
  type UpdateMarketingFormConfigInput,
} from '@/services/marketing.service';

export const marketingLeadKeys = {
  all: ['marketing-leads'] as const,
  list: (params: MarketingLeadQueryParams) =>
    [...marketingLeadKeys.all, 'list', params] as const,
  stats: (formSlug: string) =>
    [...marketingLeadKeys.all, 'stats', formSlug] as const,
  config: (formSlug: string) =>
    [...marketingLeadKeys.all, 'config', formSlug] as const,
};

export const useMarketingLeads = (params: MarketingLeadQueryParams = {}) =>
  useQuery({
    queryKey: marketingLeadKeys.list(params),
    queryFn: () => marketingService.getLeads(params),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useMarketingLeadStats = (formSlug: MarketingFormSlug = 'oportunidad') =>
  useQuery({
    queryKey: marketingLeadKeys.stats(formSlug),
    queryFn: () => marketingService.getStats(formSlug),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useMarketingFormConfig = (formSlug: MarketingFormSlug = 'oportunidad') =>
  useQuery({
    queryKey: marketingLeadKeys.config(formSlug),
    queryFn: () => marketingService.getFormConfig(formSlug),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

export const useUpdateMarketingFormConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMarketingFormConfigInput) =>
      marketingService.updateFormConfig(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: marketingLeadKeys.config(input.formSlug ?? 'oportunidad'),
      });
    },
  });
};
