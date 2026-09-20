'use client';

// CommissionKpis — tarjetas POR MONEDA del resumen (nunca se suman monedas
// mezcladas): Bruto · Retenciones fiscales · Convenios (por aplicar) ·
// A dispersar; y el embudo por etapa (calculadas → listas → aprobadas → en
// lote → pagadas → conciliadas). Todo sale de GET /mlm/commissions/summary.

import {
  ArrowPathIcon,
  BanknotesIcon,
  ChartBarIcon,
  ReceiptPercentIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CommissionStage, CommissionSummary, SummaryByCurrency } from '@/types/treasury';
import { treasuryErrorMessage } from './treasury-error';
import {
  STAGE_FUNNEL,
  STAGE_LABELS,
  formatInt,
  formatMoney,
  sortByCurrency,
  toNumber,
} from './treasury-format';

interface CommissionKpisProps {
  summary: CommissionSummary | undefined;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Clic en una etapa del embudo → filtra el listado. */
  onStageClick?: (stage: CommissionStage) => void;
  activeStage?: CommissionStage | null;
}

export function CommissionKpis({
  summary,
  isLoading,
  error,
  onRetry,
  onStageClick,
  activeStage,
}: CommissionKpisProps) {
  if (isLoading) {
    return (
      <div className="mb-6 space-y-4">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <Card className="mb-6 border-destructive/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-destructive">
            {treasuryErrorMessage(error, 'No se pudo cargar el resumen del periodo')}
          </span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const byCurrency = sortByCurrency(summary.byCurrency ?? []);
  const estimated = summary.period && !summary.period.isClosed;

  return (
    <div className="mb-6 space-y-4">
      {byCurrency.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Sin comisiones calculadas en este periodo.
          </CardContent>
        </Card>
      ) : (
        byCurrency.map((c) => <CurrencyCards key={c.currency} data={c} estimated={estimated} />)
      )}

      <StageFunnel summary={summary} onStageClick={onStageClick} activeStage={activeStage} />
    </div>
  );
}

function CurrencyCards({ data, estimated }: { data: SummaryByCurrency; estimated: boolean }) {
  const fiscal = toNumber(data.fiscalWithheld);
  const applied = toNumber(data.companyWithheld);
  const projected = toNumber(data.companyWithheldProjected);
  const cur = data.currency;
  return (
    <section aria-label={`Totales en ${cur}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono">
          {cur}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {formatInt(data.rows)} {data.rows === 1 ? 'comisión' : 'comisiones'}
        </span>
        {estimated && (
          <Badge variant="warning" title="Periodo abierto: cifras estimadas que cambian cada 4 h">
            Estimado
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Bruto"
          value={formatMoney(data.subtotal, cur)}
          hint={`+ IVA ${formatMoney(data.iva, cur)}`}
          icon={BanknotesIcon}
          tone="primary"
        />
        <KpiCard
          label="Retenciones fiscales"
          value={formatMoney(fiscal, cur)}
          hint={`Ret. IVA ${formatMoney(data.ivaWithholding, cur)} · ISR ${formatMoney(data.isr, cur)} · RESICO ${formatMoney(data.resico, cur)}`}
          icon={ReceiptPercentIcon}
          tone="violet"
        />
        <KpiCard
          label="Convenios"
          value={formatMoney(applied + projected, cur)}
          hint={
            projected > 0
              ? `${formatMoney(projected, cur)} por aplicar al pagar · ${formatMoney(applied, cur)} aplicados`
              : applied > 0
                ? 'Aplicados al pagar'
                : 'Sin convenios en el periodo'
          }
          icon={ScaleIcon}
          tone="amber"
        />
        <KpiCard
          label="A dispersar"
          value={formatMoney(data.toDisperse, cur)}
          hint={`Neto ${formatMoney(data.net, cur)} − convenios`}
          icon={ChartBarIcon}
          tone="emerald"
        />
      </div>
    </section>
  );
}

const TONES = {
  primary: 'bg-primary/10 text-primary',
  violet: 'bg-violet-500/10 text-violet-700',
  amber: 'bg-amber-500/10 text-amber-700',
  emerald: 'bg-emerald-500/10 text-emerald-700',
} as const;

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone: keyof typeof TONES;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm text-muted-foreground">{label}</p>
            <p className="truncate text-xl font-bold leading-tight text-foreground" title={value}>
              {value}
            </p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <span
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${TONES[tone]}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function StageFunnel({
  summary,
  onStageClick,
  activeStage,
}: {
  summary: CommissionSummary;
  onStageClick?: (stage: CommissionStage) => void;
  activeStage?: CommissionStage | null;
}) {
  const byStage = summary.byStage;
  if (!byStage) return null;
  const counts: Record<CommissionStage, number> = {
    estimated: byStage.estimated ?? 0,
    calculated: byStage.calculated ?? 0,
    ready: byStage.ready ?? 0,
    approved: byStage.approved ?? 0,
    in_dispersion: byStage.inDispersion ?? 0,
    paid: byStage.paid ?? 0,
    reconciled: byStage.reconciled ?? 0,
    cancelled: byStage.cancelled ?? 0,
  };
  const stages: CommissionStage[] = counts.estimated > 0 ? ['estimated', ...STAGE_FUNNEL] : [...STAGE_FUNNEL];

  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Embudo por etapa
        </p>
        <ol className="flex flex-wrap items-stretch gap-2" aria-label="Comisiones por etapa">
          {stages.map((stage, idx) => {
            const count = counts[stage];
            const active = activeStage === stage;
            const content = (
              <>
                <span className="text-xs text-muted-foreground">{STAGE_LABELS[stage]}</span>
                <span className="text-lg font-bold tabular-nums text-foreground">{formatInt(count)}</span>
              </>
            );
            return (
              <li key={stage} className="flex items-center gap-2">
                {onStageClick ? (
                  <button
                    type="button"
                    onClick={() => onStageClick(stage)}
                    aria-pressed={active}
                    className={`flex min-w-[7.5rem] flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted ${
                      active ? 'border-primary bg-primary/5' : 'border-border'
                    }`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className="flex min-w-[7.5rem] flex-col items-start rounded-lg border border-border px-3 py-2">
                    {content}
                  </div>
                )}
                {idx < stages.length - 1 && (
                  <span className="text-muted-foreground" aria-hidden>
                    →
                  </span>
                )}
              </li>
            );
          })}
          {counts.cancelled > 0 && (
            <li className="flex items-center">
              <div className="flex min-w-[7.5rem] flex-col items-start rounded-lg border border-destructive/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">{STAGE_LABELS.cancelled}</span>
                <span className="text-lg font-bold tabular-nums text-destructive">
                  {formatInt(counts.cancelled)}
                </span>
              </div>
            </li>
          )}
        </ol>
      </CardContent>
    </Card>
  );
}
