'use client';

// ReportOverview — resumen del periodo: seis fichas (inscritos, con puntos,
// calificados, por calificar, en riesgo y ventas) con el patrón de "Mi red",
// más chips por rango del periodo y por país. Tocar una ficha o un chip aplica
// el filtro equivalente en la lista (aria-pressed marca el activo).

import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { fmtMoney, type OverviewKpi } from '@/lib/distributors-report/filters';
import { fmtInt } from '@/lib/network/format';
import { rankColorByNumber } from '@/lib/network/rank-color';
import type { DistributorsOverview } from '@/types/distributors-report';

const LOCALE = 'es';

interface ReportOverviewProps {
  overview: DistributorsOverview | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onKpi: (kpi: OverviewKpi) => void;
  onRank: (rankNumber: number) => void;
  onCountry: (code: string | null) => void;
  activeKpi: OverviewKpi | null;
  activeRank: number | null;
  activeCountry: string | null;
}

const KPIS: { kpi: OverviewKpi; label: string; hint: string }[] = [
  { kpi: 'newThisPeriod', label: 'Inscritos', hint: 'altas del 26 al 25' },
  { kpi: 'active', label: 'Con puntos', hint: 'compraron este periodo' },
  { kpi: 'qualified', label: 'Calificados', hint: '3,300 pts o más' },
  { kpi: 'toQualify', label: 'Por calificar', hint: 'con puntos, menos de 3,300' },
  { kpi: 'atRisk', label: 'En riesgo', hint: 'compraron el periodo pasado y aún no este' },
];

const COUNTRY_LABEL: Record<string, string> = { MX: 'México', US: 'EE. UU.', CO: 'Colombia', GT: 'Guatemala' };

export function ReportOverview({
  overview,
  isLoading,
  isError,
  onRetry,
  onKpi,
  onRank,
  onCountry,
  activeKpi,
  activeRank,
  activeCountry,
}: ReportOverviewProps) {
  const totals = overview?.totals;
  const tile =
    'flex flex-col items-start gap-0.5 bg-white p-4 text-left transition-colors hover:bg-[#C8DDF2]/15 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3E667D] sm:items-center sm:text-center';

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Resumen del periodo</h2>
            <p className="text-xs text-gray-500">
              {totals
                ? `${fmtInt(totals.total, LOCALE)} distribuidores en la base · ${fmtInt(totals.accountActive, LOCALE)} con cuenta activa`
                : isLoading
                  ? 'Calculando…'
                  : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {totals && (
              <button
                type="button"
                onClick={() => onKpi('total')}
                aria-pressed={activeKpi === null}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-[#3E667D]/40 hover:bg-[#C8DDF2]/15 aria-pressed:border-[#3E667D] aria-pressed:bg-[#C8DDF2]/25"
              >
                Ver todos
              </button>
            )}
            {isError && !isLoading && (
              <Button variant="ghost" size="sm" onClick={onRetry} className="text-[#3E667D]">
                <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </Button>
            )}
          </div>
        </div>

        {isError && !overview ? (
          <p role="alert" className="px-4 pb-4 pt-2 text-sm text-red-600">
            No se pudo cargar el resumen. Revisa tu conexión o tu permiso (Comercial o Reportes).
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 lg:grid-cols-6">
            {KPIS.map(({ kpi, label, hint }) => {
              const value = totals ? totals[kpi] : 0;
              const pressed = activeKpi === kpi;
              return (
                <button
                  key={kpi}
                  type="button"
                  onClick={() => onKpi(pressed ? 'total' : kpi)}
                  aria-pressed={pressed}
                  className={`${tile} ${pressed ? 'bg-[#C8DDF2]/25' : ''}`}
                >
                  {isLoading && !totals ? (
                    <Skeleton className="h-7 w-14 bg-gray-100" />
                  ) : (
                    <span className="text-lg font-bold leading-tight tabular-nums text-[#3E667D]">{fmtInt(value, LOCALE)}</span>
                  )}
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                  <span className="text-xs text-gray-500">{hint}</span>
                </button>
              );
            })}
            <div className={`${tile} cursor-default hover:bg-white`}>
              {isLoading && !totals ? (
                <Skeleton className="h-7 w-20 bg-gray-100" />
              ) : (
                <span className="text-lg font-bold leading-tight tabular-nums text-[#3E667D]">{fmtMoney(totals?.salesMxn, 'MXN')}</span>
              )}
              <span className="text-xs font-medium text-gray-700">Ventas del periodo</span>
              <span className="text-xs text-gray-500">
                {totals && totals.salesUsd > 0 ? `+ ${fmtMoney(totals.salesUsd, 'USD')} USD · ` : ''}
                {totals ? `${fmtInt(totals.pointsPersonal, LOCALE)} pts personales` : 'valor de negocio'}
              </span>
            </div>
          </div>
        )}

        {overview && overview.byRank.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3">
            <span className="text-xs font-medium text-gray-500">Por rango del periodo</span>
            {overview.byRank.map((r) => {
              const pressed = activeRank === r.rankNumber;
              return (
                <Tooltip key={r.rankNumber}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onRank(r.rankNumber)}
                      aria-pressed={pressed}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs tabular-nums transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D] ${
                        pressed ? 'border-[#3E667D] bg-[#3E667D] text-white' : `border-transparent hover:opacity-80 ${rankColorByNumber(r.rankNumber)}`
                      }`}
                    >
                      <span className="font-semibold">{r.rankName}</span>
                      <span>{fmtInt(r.count, LOCALE)}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {fmtInt(r.count, LOCALE)} distribuidores con rango {r.rankName} en el periodo
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {overview && overview.byCountry.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3">
            <span className="text-xs font-medium text-gray-500">Por país</span>
            {overview.byCountry.map((c) => {
              const code = c.countryCode ?? '';
              const pressed = !!code && activeCountry === code;
              return (
                <Tooltip key={code || 'sin-pais'}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      disabled={!code}
                      onClick={() => onCountry(pressed ? null : code)}
                      aria-pressed={pressed}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D] disabled:cursor-default ${
                        pressed ? 'border-[#3E667D] bg-[#3E667D] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#3E667D]/40 hover:bg-[#C8DDF2]/15'
                      }`}
                    >
                      <span className="font-semibold">{code ? (COUNTRY_LABEL[code] ?? code) : 'Sin país'}</span>
                      <span>{fmtInt(c.total, LOCALE)}</span>
                      <span className={pressed ? 'text-white/70' : 'text-gray-400'}>·</span>
                      <span className={pressed ? 'text-white/90' : 'text-emerald-700'}>{fmtInt(c.qualified, LOCALE)} calif.</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {fmtInt(c.total, LOCALE)} en la base · {fmtInt(c.active, LOCALE)} con puntos · {fmtInt(c.qualified, LOCALE)} calificados ·{' '}
                    {fmtMoney(c.salesMxn, 'MXN')}
                    {c.salesUsd > 0 ? ` + ${fmtMoney(c.salesUsd, 'USD')} USD` : ''}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
