// useMarketingLeads.ts — Hooks de React Query para las respuestas de
// formularios de marketing (admin → Comercial → Formularios).

import { useQuery } from '@tanstack/react-query';
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
