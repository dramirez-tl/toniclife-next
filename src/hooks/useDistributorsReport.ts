// hooks/useDistributorsReport.ts - React Query del reporte de distribuidores
// de Comercial: resumen (5 min), lista (keepPreviousData al paginar/filtrar) y
// exportación a CSV (mutación: dispara la descarga en el navegador).
'use client';

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { distributorsReportApi } from '@/services/distributorsReport.service';
import type { DistributorsReportQuery, DistributorsScopeQuery } from '@/types/distributors-report';

/** Solo las claves con valor, para que la queryKey sea estable entre renders. */
const compact = (query: object): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(query as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, v as string | number | boolean]),
  );

export const distributorsReportKeys = {
  all: ['distributors-report'] as const,
  overview: (scope: DistributorsScopeQuery) => [...distributorsReportKeys.all, 'overview', compact(scope)] as const,
  list: (query: DistributorsReportQuery) => [...distributorsReportKeys.all, 'list', compact(query)] as const,
};

const TWO_MIN = 2 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;

export const useDistributorsOverview = (scope: DistributorsScopeQuery, enabled: boolean = true) =>
  useQuery({
    queryKey: distributorsReportKeys.overview(scope),
    queryFn: () => distributorsReportApi.getOverview(scope),
    enabled,
    staleTime: FIVE_MIN,
    placeholderData: keepPreviousData,
  });

export const useDistributorsReport = (query: DistributorsReportQuery, enabled: boolean = true) =>
  useQuery({
    queryKey: distributorsReportKeys.list(query),
    queryFn: () => distributorsReportApi.getList(query),
    enabled,
    staleTime: TWO_MIN,
    placeholderData: keepPreviousData,
  });

export const useExportDistributors = () =>
  useMutation({
    mutationFn: (query: DistributorsReportQuery) => distributorsReportApi.exportCsv(query),
  });
