'use client';

// TreasuryReadinessHeader — semáforo "¿Se puede pagar este periodo?" (patrón
// billing ReadinessHeader) con los bloqueadores enlazados: periodo abierto,
// corte no fijado, earners sin datos validados ($ por moneda) → Validación
// filtrada por earnersOfPeriodId, sin régimen, sin FX, convenios sin tasa.

import Link from 'next/link';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CommissionSummary } from '@/types/treasury';
import { readinessBlockerLabel, treasuryCodeLabel, treasuryErrorMessage } from './treasury-error';
import { formatDateTime, formatInt, formatMoney, sortByCurrency } from './treasury-format';

interface Blocker {
  key: string;
  text: string;
  href?: string;
  linkLabel?: string;
}

const REGIME_CODES = new Set(['TRS_REGIME_MISSING', 'REGIME_MISSING']);
const NO_RATE_CODES = new Set(['NO_RATE', 'WITHHOLDING_NO_RATE']);

/** Bloqueadores del periodo derivados del resumen (sin datos personales). */
export function periodBlockers(summary: CommissionSummary, periodId?: string): Blocker[] {
  const out: Blocker[] = [];
  const period = summary.period;
  const validacionHref = periodId
    ? `/admin/tesoreria/validacion-datos?earnersOfPeriodId=${encodeURIComponent(periodId)}`
    : '/admin/tesoreria/validacion-datos';

  if (period && !period.isClosed) {
    out.push({
      key: 'open',
      text: 'Periodo abierto: las cifras son estimadas (se recalculan cada 4 h) y no se puede aprobar ni pagar.',
    });
  }
  if (period && period.isClosed && period.payable === false && period.payableReason) {
    out.push({
      key: `payable-${period.payableReason}`,
      text: treasuryCodeLabel(period.payableReason),
      href: period.payableReason === 'TRS_CUTOVER_NOT_SET' ? '/admin/sistema?tab=tesoreria' : undefined,
      linkLabel: period.payableReason === 'TRS_CUTOVER_NOT_SET' ? 'Ajustes de Tesorería' : undefined,
    });
  }

  const readiness = summary.readiness;
  if (readiness && readiness.blockedCount > 0) {
    const amounts = sortByCurrency(readiness.blockedAmountByCurrency ?? [])
      .map((a) => formatMoney(a.amount, a.currency))
      .join(' + ');
    out.push({
      key: 'blocked',
      text: `${formatInt(readiness.blockedCount)} distribuidor(es) con comisión sin datos de pago validados${amounts ? ` (${amounts})` : ''}.`,
      href: validacionHref,
      linkLabel: 'Ver en Validación de datos',
    });
    const regime = (readiness.blockers ?? []).find((b) => REGIME_CODES.has(b.code));
    if (regime && regime.count > 0) {
      out.push({
        key: 'regime',
        text: `${formatInt(regime.count)} sin régimen fiscal de comisión asignado.`,
        href: validacionHref,
        linkLabel: 'Asignar régimen',
      });
    }
    const noRate = (readiness.blockers ?? []).find((b) => NO_RATE_CODES.has(b.code));
    if (noRate && noRate.count > 0) {
      out.push({
        key: 'no-rate',
        text: `${formatInt(noRate.count)} convenio(s) sin tipo de cambio para aplicar.`,
        href: '/admin/tesoreria/retenciones',
        linkLabel: 'Ver Retenciones',
      });
    }
  }
  if (summary.missingFx && summary.missingFx.length > 0) {
    out.push({
      key: 'fx',
      text: `Sin tipo de cambio del periodo para ${summary.missingFx.join(', ')}: esas filas no se pueden pagar.`,
      href: periodId ? `/admin/mlm/periodos` : undefined,
      linkLabel: periodId ? 'Capturar en Periodos' : undefined,
    });
  }
  if (summary.allNoTax) {
    out.push({
      key: 'all-no-tax',
      text: 'Todo el periodo salió SIN_IMPUESTO: falta asignar régimen de comisión (retención $0 no es válida).',
      href: validacionHref,
      linkLabel: 'Asignar régimen',
    });
  }
  return out;
}

interface TreasuryReadinessHeaderProps {
  summary: CommissionSummary | undefined;
  periodId?: string;
  isLoading: boolean;
  isFetching: boolean;
  error: unknown;
  onRefresh: () => void;
  generatedAt?: number | null;
}

export function TreasuryReadinessHeader({
  summary,
  periodId,
  isLoading,
  isFetching,
  error,
  onRefresh,
  generatedAt,
}: TreasuryReadinessHeaderProps) {
  if (isLoading) return <Skeleton className="h-28 w-full" />;

  if (!summary) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-destructive">
            {treasuryErrorMessage(error, 'No se pudo cargar el estado del periodo')}
          </span>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const blockers = periodBlockers(summary, periodId);
  const ready = blockers.length === 0;
  const otherBlockers = (summary.readiness?.blockers ?? []).filter(
    (b) => !REGIME_CODES.has(b.code) && !NO_RATE_CODES.has(b.code) && b.count > 0,
  );

  return (
    <Card className={ready ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {ready ? (
              <CheckCircleIcon className="mt-0.5 h-7 w-7 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <ExclamationTriangleIcon className="mt-0.5 h-7 w-7 shrink-0 text-amber-600" aria-hidden />
            )}
            <div>
              <p className={`text-lg font-semibold ${ready ? 'text-emerald-800' : 'text-amber-900'}`}>
                {ready
                  ? `Se puede pagar el periodo ${summary.period?.name ?? ''}`.trim()
                  : `${blockers.length} bloqueador${blockers.length === 1 ? '' : 'es'} para pagar el periodo ${summary.period?.name ?? ''}`.trim()}
              </p>
              <p className="text-sm text-muted-foreground">
                Fail-closed: ante la duda no se paga. Cada bloqueador lleva a donde se corrige.
                {generatedAt ? ` Consultado el ${formatDateTime(new Date(generatedAt).toISOString())}.` : ''}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden />
            )}
            Actualizar
          </Button>
        </div>

        {!ready && (
          <ul className="mt-3 list-disc space-y-1 pl-9 text-sm text-amber-950">
            {blockers.map((b) => (
              <li key={b.key}>
                {b.text}
                {b.href && (
                  <>
                    {' '}
                    <Link href={b.href} className="font-medium text-primary underline">
                      {b.linkLabel ?? 'Ir'}
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {otherBlockers.length > 0 && (
          <p className="mt-3 pl-9 text-xs text-muted-foreground">
            Detalle de bloqueadores:{' '}
            {otherBlockers.map((b) => `${readinessBlockerLabel(b.code)} (${formatInt(b.count)})`).join(' · ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
