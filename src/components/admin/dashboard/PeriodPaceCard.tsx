'use client';

// Panel Principal › "Ritmo del periodo" (Diego, 14-nov-2026): la gráfica del Inicio de la app,
// en la web. Venta consolidada del periodo que se esté viendo, día por día, contra el periodo
// anterior y contra el mismo periodo del año pasado. Los textos y los renglones salen de
// lib/period-pace (puro, con pruebas); aquí solo se pinta.
//
// Forma: una serie es el tema (el periodo que se ve) y la otra es contexto (la referencia), así
// que va en un color de acento contra un gris. El acento es el azul de la marca un paso más
// claro: pasa el validador de paleta (banda de luminosidad, croma y contraste sobre blanco); el
// teal del logo (#3E667D) no, porque se lee casi gris junto a la línea gris. El tramo punteado
// es el día en curso (todavía no cierra) y la raya punteada, el total de la referencia.

import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLongRightIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  PresentationChartLineIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDashboardPace } from '@/hooks/useReports';
import {
  money,
  moneyCompact,
  paceAxisDays,
  paceChartRows,
  paceDayTicks,
  paceEndPoint,
  paceFigures,
  paceHeadline,
  paceProgressText,
  paceYAxis,
  periodLabel,
  shortDate,
  signedMoney,
  type PaceChartRow,
  type PaceTone,
} from '@/lib/period-pace';
import type { PanelPaceComparison } from '@/types/reports';

interface PeriodPaceCardProps {
  /** Periodo que se ve en el panel (sin valor = el actual). */
  periodId?: string;
  /**
   * Consolidado que ya muestra la tarjeta "Total consolidado" y de qué periodo es: con el
   * periodo en curso se usa como "hasta hoy" para que en pantalla sea el mismo número.
   */
  consolidated?: { periodId?: string | null; totalMxn?: number | null };
}

const ACCENT = '#145DA8';
const REFERENCE = '#8b95a5';
const GRID = '#e5e7eb';
const AXIS_TEXT = '#64748b';
const INK = '#0f172a';

type Tab = 'previous' | 'lastYear';

const TONE: Record<PaceTone, { box: string; icon: string; Icon: typeof FlagIcon }> = {
  ahead: { box: 'bg-emerald-50', icon: 'text-emerald-600', Icon: ArrowTrendingUpIcon },
  close: { box: 'bg-amber-50', icon: 'text-amber-600', Icon: ArrowLongRightIcon },
  behind: { box: 'bg-primary/10', icon: 'text-primary', Icon: FlagIcon },
  neutral: { box: 'bg-muted', icon: 'text-primary', Icon: RocketLaunchIcon },
};

/** Muestra de la línea para la leyenda y el detalle: un trazo del color de la serie. */
function LineKey({ color, dashed = false }: { color: string; dashed?: boolean }) {
  return (
    <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden="true" className="shrink-0">
      <line
        x1="1"
        y1="4"
        x2="21"
        y2="4"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={dashed ? '4 4' : undefined}
      />
    </svg>
  );
}

function Shell({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <Card className="mb-8 gap-0 p-5" data-testid="period-pace-card">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <PresentationChartLineIcon className="h-5 w-5 text-primary" />
        Ritmo del periodo
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {subtitle ?? 'Venta consolidada de todos los países, en pesos'}
      </p>
      {children}
    </Card>
  );
}

/** Detalle al pasar el cursor: las dos series de ese día, el importe primero. */
function PaceTooltip({
  active,
  label,
  rows,
  own,
  reference,
}: {
  active?: boolean;
  label?: number | string;
  rows: PaceChartRow[];
  own: string;
  reference: string;
}) {
  const row = active ? rows[Number(label) - 1] : undefined;
  if (!row) return null;
  const value = row.closed ?? row.today;
  const inProgress = row.closed == null && row.today != null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-foreground">Día {row.day}</p>
      {value != null && (
        <p className="flex items-center gap-2">
          <LineKey color={ACCENT} dashed={inProgress} />
          <span className="font-semibold tabular-nums text-foreground">{money(value)}</span>
          <span className="text-muted-foreground">
            {own}
            {row.date ? ` · ${shortDate(row.date)}` : ''}
            {inProgress ? ' · hoy, en curso' : ''}
          </span>
        </p>
      )}
      {row.reference != null && (
        <p className="mt-0.5 flex items-center gap-2">
          <LineKey color={REFERENCE} />
          <span className="font-semibold tabular-nums text-foreground">{money(row.reference)}</span>
          <span className="text-muted-foreground">
            {reference}
            {row.referenceDate ? ` · ${shortDate(row.referenceDate)}` : ''}
          </span>
        </p>
      )}
      {value != null && row.reference != null && (
        <p className="mt-1 border-t border-border pt-1 text-muted-foreground">
          Diferencia:{' '}
          <span className="font-semibold tabular-nums text-foreground">{signedMoney(value - row.reference)}</span>
        </p>
      )}
    </div>
  );
}

export function PeriodPaceCard({ periodId, consolidated }: PeriodPaceCardProps) {
  const { data: pace, isLoading, isError, isPlaceholderData, refetch } = useDashboardPace(periodId);
  const [tab, setTab] = useState<Tab>('previous');

  const options = useMemo(() => {
    const list: { key: Tab; comparison: PanelPaceComparison }[] = [];
    if (pace?.previous) list.push({ key: 'previous', comparison: pace.previous });
    if (pace?.lastYear) list.push({ key: 'lastYear', comparison: pace.lastYear });
    return list;
  }, [pace]);
  const selected = options.find((o) => o.key === tab) ?? options[0];
  const comparison = selected?.comparison;
  const period = pace?.period ?? null;
  const phase = pace?.phase ?? null;

  // Con el periodo en curso, "hasta hoy" es el mismo consolidado de la tarjeta de ingresos.
  const toDate =
    phase === 'current' && period && consolidated?.periodId === period.id && consolidated.totalMxn != null
      ? Math.round(consolidated.totalMxn)
      : null;

  const rows = useMemo(
    () =>
      period && phase && phase !== 'upcoming' && comparison ? paceChartRows(period, phase, comparison, toDate) : [],
    [period, phase, comparison, toDate],
  );

  if (isLoading && !pace) {
    return (
      <Shell>
        <div className="mt-4 h-72 animate-pulse rounded-xl bg-muted" aria-label="Cargando el ritmo del periodo" />
      </Shell>
    );
  }
  if (isError && !pace) {
    return (
      <Shell>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>No se pudo cargar el ritmo del periodo.</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      </Shell>
    );
  }
  if (!period || !phase) return null;

  const own = periodLabel(period.name);
  if (phase === 'upcoming') {
    return (
      <Shell subtitle={`Venta consolidada de todos los países, en pesos · ${own}`}>
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          {own} todavía no empieza: aquí aparecerá su ritmo cuando tenga ventas.
        </p>
      </Shell>
    );
  }
  if (!comparison) {
    return (
      <Shell subtitle={`Venta consolidada de todos los países, en pesos · ${own}`}>
        <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
          No hay un periodo anterior ni del año pasado con ventas contra el cual comparar a {own}.
        </p>
      </Shell>
    );
  }

  const ref = periodLabel(comparison.name);
  const headline = paceHeadline({ phase, period, comparison, minSignalDay: pace?.minSignalDay ?? 5 });
  const tone = TONE[headline.tone];
  const figures = paceFigures({ phase, period, comparison, currentToDate: toDate });
  const progress = paceProgressText(phase, comparison);
  const axisDays = paceAxisDays(period, comparison);
  const end = paceEndPoint(period, comparison, toDate);
  const referenceTotal = comparison.amounts?.referenceTotal ?? comparison.series.reference.at(-1) ?? 0;
  const inProgress = phase === 'current';
  // Eje de pesos: hasta la primera marca redonda que cubre lo más alto de las dos curvas.
  const yAxis = paceYAxis(Math.max(referenceTotal, end?.value ?? 0, ...comparison.series.current));

  return (
    <Card
      className={cn('mb-8 gap-0 p-5 transition-opacity', isPlaceholderData && 'opacity-60')}
      data-testid="period-pace-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <PresentationChartLineIcon className="h-5 w-5 text-primary" />
            Ritmo del periodo
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Venta consolidada de todos los países, en pesos · {own}
          </p>
        </div>
        {options.length > 1 && (
          <div
            role="radiogroup"
            aria-label="Contra qué periodo se compara"
            className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-sm"
          >
            {options.map((option) => {
              const active = option.key === selected.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTab(option.key)}
                  className={cn(
                    'min-h-8 rounded-md px-3 py-1 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  vs {periodLabel(option.comparison.name)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {/* Titular + gráfica */}
        <div className="min-w-0">
          <div className={cn('flex items-center gap-3 rounded-xl px-4 py-3', tone.box)} data-testid="pace-headline">
            <tone.Icon className={cn('h-7 w-7 shrink-0', tone.icon)} />
            <div>
              <p className="font-semibold leading-snug text-foreground">{headline.title}</p>
              {headline.subtitle && <p className="text-sm text-muted-foreground">{headline.subtitle}</p>}
            </div>
          </div>

          <div
            className="mt-4"
            role="img"
            aria-label={`Venta acumulada por día de ${own} contra ${ref}. ${headline.title}`}
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={rows} margin={{ top: 26, right: 30, left: 4, bottom: 4 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[1, axisDays]}
                  ticks={paceDayTicks(axisDays)}
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: AXIS_TEXT }}
                  tickLine={false}
                  axisLine={{ stroke: GRID }}
                  tickFormatter={(day: number) => (day === 1 ? 'Día 1' : String(day))}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: AXIS_TEXT }}
                  tickLine={false}
                  axisLine={false}
                  width={62}
                  domain={[0, yAxis.max]}
                  ticks={yAxis.ticks}
                  tickFormatter={(value: number) => moneyCompact(value)}
                />
                <Tooltip
                  cursor={{ stroke: AXIS_TEXT, strokeWidth: 1 }}
                  isAnimationActive={false}
                  content={<PaceTooltip rows={rows} own={own} reference={ref} />}
                />
                {/* Total con el que cerró la referencia: la meta a la vista. */}
                {referenceTotal > 0 && (
                  <ReferenceLine
                    y={referenceTotal}
                    stroke={REFERENCE}
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                    label={{
                      value: `${ref}: ${moneyCompact(referenceTotal)}`,
                      position: 'insideTopLeft',
                      fill: AXIS_TEXT,
                      fontSize: 12,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="reference"
                  stroke={REFERENCE}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4, fill: REFERENCE, stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="closed"
                  stroke={ACCENT}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={ACCENT}
                  fillOpacity={0.1}
                  dot={false}
                  activeDot={{ r: 4, fill: ACCENT, stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                {inProgress && (
                  <Line
                    type="linear"
                    dataKey="today"
                    stroke={ACCENT}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    dot={false}
                    activeDot={false}
                    connectNulls
                    isAnimationActive={false}
                  />
                )}
                {end && (
                  <ReferenceDot
                    x={end.day}
                    y={end.value}
                    r={5}
                    fill={ACCENT}
                    stroke="#fff"
                    strokeWidth={2}
                    ifOverflow="extendDomain"
                    label={{
                      value: moneyCompact(end.value),
                      position: 'top',
                      offset: 10,
                      fill: INK,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <LineKey color={ACCENT} />
              <span className="text-foreground">{own}</span>
            </span>
            {inProgress && (
              <span className="inline-flex items-center gap-1.5">
                <LineKey color={ACCENT} dashed />
                <span className="text-foreground">Hoy, en curso</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <LineKey color={REFERENCE} />
              <span className="text-foreground">{ref}</span>
            </span>
            <span className="ml-auto">Eje horizontal: día del periodo</span>
          </div>

          {progress && <p className="mt-3 text-sm text-foreground">{progress}</p>}

          {/* La misma información en tabla, para quien no puede leer la gráfica o quiere el dato exacto. */}
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Ver los datos día por día
            </summary>
            <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-left font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Día</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-right">{own}</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-right">{ref}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const value = row.closed ?? row.today;
                    return (
                      <tr key={row.day} className="border-t border-border">
                        <td className="px-3 py-1.5 tabular-nums">{row.day}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                          {shortDate(row.date)}
                          {row.closed == null && row.today != null ? ' (hoy, en curso)' : ''}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{value != null ? money(value) : '—'}</td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                          {shortDate(row.referenceDate, true)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {row.reference != null ? money(row.reference) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>

        {/* Cifras */}
        <div className="min-w-0">
          <dl className="rounded-xl bg-muted/50 px-4 py-2" data-testid="pace-figures">
            {figures.map((figure, index) => (
              <div
                key={figure.label}
                className={cn(
                  'flex items-baseline justify-between gap-3 py-2',
                  // Separadores: después de la cifra principal y antes del cierre de la referencia.
                  (index === 1 || (inProgress && index === figures.length - 1 && figures.length > 2)) &&
                    'border-t border-border',
                )}
              >
                <dt className="text-sm text-muted-foreground">{figure.label}</dt>
                <dd
                  className={cn(
                    'whitespace-nowrap text-right tabular-nums text-foreground',
                    figure.strong ? 'text-lg font-bold' : 'text-sm font-semibold',
                  )}
                >
                  {figure.tone && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mr-1.5 inline-block h-2 w-2 rounded-full align-middle',
                        figure.tone === 'positive' ? 'bg-emerald-500' : 'bg-amber-500',
                      )}
                    />
                  )}
                  {figure.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Venta global con IVA, en pesos. Las ventas de otros países se convierten con el tipo de cambio del
            periodo{inProgress ? '' : ' que se está viendo'}.
          </p>
        </div>
      </div>
    </Card>
  );
}
