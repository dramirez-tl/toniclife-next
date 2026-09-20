'use client';

// ReadinessKpis — tarjetas-filtro coherentes con la cola (misma CTE que las
// filas): Sin iniciar · Incompletos · Por revisar · Rechazados · Validados ·
// Listos para pagar · Con comisión del periodo bloqueados ($ por moneda) ·
// Fuera de SLA. Cada tarjeta es un botón que fija el filtro correspondiente.

import { Skeleton } from '@/components/ui/skeleton';
import type { ReadinessOverallStatus, ReadinessStats } from '@/types/treasury-readiness';
import { formatInt, formatMoney } from '../treasury-format';
import { READINESS_STATUS_LABELS } from './readiness-labels';

export type ReadinessKpiTarget =
  | { kind: 'status'; status: ReadinessOverallStatus | null }
  | { kind: 'readyToPay' }
  | { kind: 'earnersBlocked' }
  | { kind: 'sla' };

interface ReadinessKpisProps {
  stats: ReadinessStats | undefined;
  isLoading: boolean;
  activeStatus: ReadinessOverallStatus | null;
  earnersActive: boolean;
  slaActive: boolean;
  slaDays: number | null;
  hasPeriod: boolean;
  onSelect: (target: ReadinessKpiTarget) => void;
}

const STATUS_ORDER: ReadinessOverallStatus[] = [
  'not_started',
  'incomplete',
  'pending_validation',
  'rejected',
  'validated',
];

const STATUS_TONE: Record<ReadinessOverallStatus, string> = {
  not_started: 'text-muted-foreground',
  incomplete: 'text-foreground',
  pending_validation: 'text-amber-700',
  rejected: 'text-destructive',
  validated: 'text-emerald-700',
};

function KpiCard({
  label,
  value,
  sub,
  tone,
  active,
  onClick,
  ariaLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  active: boolean;
  onClick: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel ?? `${label}: ${value}`}
      className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-card hover:border-primary/30'
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${tone ?? 'text-foreground'}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
    </button>
  );
}

export function ReadinessKpis({
  stats,
  isLoading,
  activeStatus,
  earnersActive,
  slaActive,
  slaDays,
  hasPeriod,
  onSelect,
}: ReadinessKpisProps) {
  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  const s = stats;
  const blockedAmounts = (s?.earnersBlocked.amountByCurrency ?? [])
    .map((a) => formatMoney(a.amount, a.currency))
    .join(' · ');

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      {STATUS_ORDER.map((status) => {
        const value =
          status === 'not_started'
            ? s?.notStarted
            : status === 'incomplete'
              ? s?.incomplete
              : status === 'pending_validation'
                ? s?.pendingValidation
                : status === 'rejected'
                  ? s?.rejected
                  : s?.validated;
        return (
          <KpiCard
            key={status}
            label={READINESS_STATUS_LABELS[status]}
            value={formatInt(value ?? 0)}
            tone={STATUS_TONE[status]}
            active={activeStatus === status}
            onClick={() => onSelect({ kind: 'status', status: activeStatus === status ? null : status })}
          />
        );
      })}
      <KpiCard
        label="Listos para pagar"
        value={formatInt(s?.readyToPay ?? 0)}
        sub="Expediente, cuenta y régimen"
        tone="text-emerald-700"
        active={false}
        onClick={() => onSelect({ kind: 'readyToPay' })}
      />
      <KpiCard
        label="Con comisión bloqueados"
        value={formatInt(s?.earnersBlocked.count ?? 0)}
        sub={hasPeriod ? blockedAmounts || 'Sin importe' : 'Elige un periodo'}
        tone="text-amber-700"
        active={earnersActive}
        onClick={() => onSelect({ kind: 'earnersBlocked' })}
      />
      <KpiCard
        label="Fuera de SLA"
        value={formatInt(s?.slaBreaches ?? 0)}
        sub={slaDays !== null ? `En cola > ${slaDays} días` : 'SLA de revisión'}
        tone="text-destructive"
        active={slaActive}
        onClick={() => onSelect({ kind: 'sla' })}
      />
    </div>
  );
}
