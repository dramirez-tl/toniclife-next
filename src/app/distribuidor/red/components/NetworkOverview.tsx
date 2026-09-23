'use client';

// NetworkOverview — Tira "Tu red este periodo" (contrato /distribuidor/red
// §5.2, V5): seis fichas con el patrón statCell/statValue/statLabel/statHint
// del home y las MISMAS definiciones (activo = puntos > 0; calificado ≥ 3,300;
// en riesgo = compró el periodo anterior y aún no este; nuevo = alta en el
// periodo 26→25). Cada ficha es un botón que aplica el filtro equivalente en
// la Lista; debajo, chips por nivel (tocar = filtrar por nivel). Cargando = 6
// esqueletos; error = una línea con reintento (no bloquea el resto).

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { OverviewKpi } from '@/lib/network/filters';
import { fmtInt } from '@/lib/network/format';
import type { NetworkOverview as NetworkOverviewData } from '@/types/network';

const VISIBLE_LEVELS = 8;

interface NetworkOverviewProps {
  overview: NetworkOverviewData | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onKpi: (kpi: OverviewKpi) => void;
  onLevel: (level: number) => void;
  /** Filtro de actividad activo en la Lista (para marcar la ficha). */
  activeKpi?: OverviewKpi | null;
  activeLevel?: number | null;
}

const KPIS: { kpi: OverviewKpi; labelKey: string; hintKey: string }[] = [
  { kpi: 'total', labelKey: 'total', hintKey: 'totalHint' },
  { kpi: 'active', labelKey: 'active', hintKey: 'activeHint' },
  { kpi: 'qualified', labelKey: 'qualified', hintKey: 'qualifiedHint' },
  { kpi: 'toQualify', labelKey: 'toQualify', hintKey: 'toQualifyHint' },
  { kpi: 'atRisk', labelKey: 'atRisk', hintKey: 'atRiskHint' },
  { kpi: 'newThisPeriod', labelKey: 'newThisPeriod', hintKey: 'newThisPeriodHint' },
];

export function NetworkOverview({
  overview,
  isLoading,
  isError,
  onRetry,
  onKpi,
  onLevel,
  activeKpi = null,
  activeLevel = null,
}: NetworkOverviewProps) {
  const t = useTranslations('distributor.network.overview');
  const locale = useLocale();
  const [showAllLevels, setShowAllLevels] = useState(false);

  const totals = overview?.totals;
  const levels = overview?.byLevel ?? [];
  const visibleLevels = showAllLevels ? levels : levels.slice(0, VISIBLE_LEVELS);
  const hiddenLevels = levels.length - visibleLevels.length;

  return (
    <Card data-tour="d-red-kpis" className="overflow-hidden p-0">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-3 px-4 pt-4">
          <h2 className="text-sm font-semibold text-gray-900">{t('title')}</h2>
          {isError && !isLoading && (
            <Button variant="ghost" size="sm" onClick={onRetry} className="text-[#3E667D]">
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
              {t('retry')}
            </Button>
          )}
        </div>

        {isError && !overview ? (
          <p role="alert" className="px-4 pb-4 pt-2 text-sm text-red-600">
            {t('error')}
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 lg:grid-cols-6">
            {KPIS.map(({ kpi, labelKey, hintKey }) => {
              const value = totals ? totals[kpi] : 0;
              const pressed = activeKpi === kpi;
              return (
                <button
                  key={kpi}
                  type="button"
                  onClick={() => onKpi(kpi)}
                  aria-pressed={pressed}
                  className={`flex flex-col items-start gap-0.5 bg-white p-4 text-left transition-colors hover:bg-[#C8DDF2]/15 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3E667D] sm:items-center sm:text-center ${
                    pressed ? 'bg-[#C8DDF2]/25' : ''
                  }`}
                >
                  {isLoading && !totals ? (
                    <Skeleton className="h-7 w-14 bg-gray-100" />
                  ) : (
                    <span className="text-lg font-bold leading-tight tabular-nums text-[#3E667D]">{fmtInt(value, locale)}</span>
                  )}
                  <span className="text-xs font-medium text-gray-700">{t(labelKey)}</span>
                  <span className="text-xs text-gray-500">
                    {kpi === 'total' ? t(hintKey, { direct: totals?.direct ?? 0 }) : t(hintKey)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Chips por nivel: tocar = filtrar la Lista por ese nivel */}
        {levels.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3">
            <span className="text-xs font-medium text-gray-500">{t('byLevel')}</span>
            {visibleLevels.map((row) => {
              const pressed = activeLevel === row.level;
              return (
                <Tooltip key={row.level}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onLevel(row.level)}
                      aria-pressed={pressed}
                      aria-label={t('levelTooltip', { level: row.level, count: row.count, active: row.active })}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D] ${
                        pressed
                          ? 'border-[#3E667D] bg-[#3E667D] text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-[#3E667D]/40 hover:bg-[#C8DDF2]/15'
                      }`}
                    >
                      <span className="font-semibold">{t('levelChip', { level: row.level })}</span>
                      <span>{fmtInt(row.count, locale)}</span>
                      <span className={pressed ? 'text-white/70' : 'text-gray-400'}>·</span>
                      <span className={pressed ? 'text-white/90' : 'text-emerald-700'}>{fmtInt(row.active, locale)}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t('levelTooltip', { level: row.level, count: row.count, active: row.active })}</TooltipContent>
                </Tooltip>
              );
            })}
            {hiddenLevels > 0 && (
              <button
                type="button"
                onClick={() => setShowAllLevels(true)}
                className="text-xs font-medium text-[#3E667D] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
              >
                {t('moreLevels', { count: hiddenLevels })}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
