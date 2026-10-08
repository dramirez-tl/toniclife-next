'use client';

// Admin > Comercial > Distribuidores: reporte de distribuidores (pedido del
// director de Comercial, 07-oct-2026): inscritos, activos, calificados, rangos
// y ventas como base, sobre TODOS los distribuidores, con los mismos filtros
// del dashboard "Mi red" (actividad, estado, rango, periodo de alta, búsqueda)
// más país y sucursal de alta. Datos: GET /reports/distributors/* (permiso
// comercial o reports:read). Mismas definiciones que "Mi red": activo = puntos
// personales > 0; calificado ≥ 3,300; en riesgo = compró el periodo anterior y
// aún no este; inscrito = fecha de alta dentro del periodo 26→25.
//
// Todo el estado vive en la URL (lib/distributors-report/filters.ts) con
// useQueryFilters: ?periodo=&pais=&sucursal=&estado= (alcance del resumen y
// la lista) y ?actividad=&rango=&alta=&q=&orden=&pagina=&limite= (solo lista).

import { Suspense, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { periodsUpToCurrent, useCommissionPeriods } from '@/hooks/useCommissions';
import { useDistributorsOverview } from '@/hooks/useDistributorsReport';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import {
  URL_PARAM,
  kpiToFilter,
  scopeOf,
  urlToQuery,
  type OverviewKpi,
} from '@/lib/distributors-report/filters';
import { ReportHeader, type PeriodOption } from './components/ReportHeader';
import { ReportList } from './components/ReportList';
import { ReportOverview } from './components/ReportOverview';

/** Fila de GET /mlm/periods (camel o snake según el endpoint; índice para periodsUpToCurrent). */
type PeriodRow = Record<string, unknown> & {
  id: string;
  name: string;
  startDate?: string;
  start_date?: string;
  periodNumber?: number;
  period_number?: number;
  isCurrent?: boolean;
};

/** Estable a propósito: useQueryFilters recrea get/setParams si `defaults` cambia de identidad. */
const QUERY_DEFAULTS: Record<string, string> = {};

export default function DistribuidoresPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <DistribuidoresContent />
    </Suspense>
  );
}

function DistribuidoresContent() {
  const { searchParams, setParams } = useQueryFilters(QUERY_DEFAULTS);

  // Periodo (26→25): selector hasta el actual; sin `periodo=` en la URL el
  // servidor resuelve el actual con CURRENT_DATE.
  const { data: periodsData } = useCommissionPeriods();
  const periods = useMemo(() => {
    const raw = periodsData as unknown as PeriodRow[] | { data?: PeriodRow[] } | undefined;
    const list: PeriodRow[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
    const sorted = [...list].sort((a, b) => {
      const ad = String(a.startDate ?? a.start_date ?? '');
      const bd = String(b.startDate ?? b.start_date ?? '');
      if (ad && bd && ad !== bd) return bd.localeCompare(ad);
      return Number(b.periodNumber ?? b.period_number ?? 0) - Number(a.periodNumber ?? a.period_number ?? 0);
    });
    return periodsUpToCurrent(sorted);
  }, [periodsData]);
  const currentPeriod = periods.find((p) => p.isCurrent) ?? null;
  const periodOptions: PeriodOption[] = periods.map((p) => ({ id: p.id, name: p.name, isCurrent: Boolean(p.isCurrent) }));

  const query = useMemo(() => urlToQuery(searchParams), [searchParams]);
  const scope = useMemo(() => scopeOf(query), [query]);
  const overviewQuery = useDistributorsOverview(scope);
  const overview = overviewQuery.data;
  const shownPeriodId = overview?.period.id ?? query.periodId ?? currentPeriod?.id ?? '';

  const activeKpi: OverviewKpi | null = query.activity
    ? query.activity === 'none'
      ? null
      : query.activity
    : query.joinedPeriodId && query.joinedPeriodId === shownPeriodId
      ? 'newThisPeriod'
      : null;

  const onPeriodChange = (id: string) =>
    setParams({ [URL_PARAM.period]: id && id !== currentPeriod?.id ? id : null, [URL_PARAM.page]: null });
  const onScope = (key: 'pais' | 'sucursal' | 'estado', value: string | null) =>
    setParams({ [key]: value || null, [URL_PARAM.page]: null });
  const onKpi = (kpi: OverviewKpi) => setParams(kpiToFilter(kpi, shownPeriodId));
  const onRank = (rankNumber: number) =>
    setParams({ [URL_PARAM.rank]: query.rankNumber === rankNumber ? null : String(rankNumber), [URL_PARAM.page]: null });
  const onCountry = (code: string | null) =>
    setParams({ [URL_PARAM.country]: code && code !== query.countryCode ? code : null, [URL_PARAM.page]: null });

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
        <ReportHeader
          periods={periodOptions}
          selectedPeriodId={query.periodId ?? currentPeriod?.id ?? ''}
          period={overview?.period ?? null}
          onPeriodChange={onPeriodChange}
          countryCode={query.countryCode ?? null}
          branchId={query.branchId ?? null}
          status={query.status ?? null}
          countryCodes={overview?.byCountry.map((c) => c.countryCode).filter((c): c is string => !!c) ?? []}
          onScope={onScope}
        />
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <ReportOverview
            overview={overview}
            isLoading={overviewQuery.isLoading}
            isError={overviewQuery.isError}
            onRetry={() => void overviewQuery.refetch()}
            onKpi={onKpi}
            onRank={onRank}
            onCountry={onCountry}
            activeKpi={activeKpi}
            activeRank={query.rankNumber ?? null}
            activeCountry={query.countryCode ?? null}
          />
          <ReportList query={query} periods={periodOptions} setParams={setParams} />
        </div>
      </div>
    </TooltipProvider>
  );
}
