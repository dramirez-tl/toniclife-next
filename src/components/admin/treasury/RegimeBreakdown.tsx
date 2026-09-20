'use client';

// RegimeBreakdown — desglose fiscal por régimen (y moneda) con las tasas
// REALES que aplicó el motor (`rates` desde la lib), sin etiquetas fijas
// "16 % / 10.6667 %". Aviso `allNoTax` cuando todo el periodo salió
// SIN_IMPUESTO (falta asignar régimen de comisión).

import Link from 'next/link';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { CommissionSummary, SummaryByRegime } from '@/types/treasury';
import { formatInt, formatMoney, formatRate, toNumber } from './treasury-format';

interface RegimeBreakdownProps {
  summary: CommissionSummary;
  periodId?: string;
}

export function RegimeBreakdown({ summary, periodId }: RegimeBreakdownProps) {
  const rows = summary.byRegime ?? [];
  const groups = new Map<string, SummaryByRegime[]>();
  for (const r of rows) {
    const cur = (r.currency || 'MXN').toUpperCase();
    groups.set(cur, [...(groups.get(cur) ?? []), r]);
  }
  const currencies = Array.from(groups.keys()).sort((a, b) =>
    a === 'MXN' ? -1 : b === 'MXN' ? 1 : a.localeCompare(b),
  );

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">Desglose fiscal por régimen</h2>
          <p className="text-xs text-muted-foreground">
            Importes congelados por el motor (ISR, IVA, ret. IVA, RESICO); tasas reales de cada régimen.
          </p>
        </div>

        {summary.allNoTax && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
          >
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              Todo el periodo salió <strong>SIN_IMPUESTO</strong>: falta asignar el régimen fiscal
              de comisión a los distribuidores MX. Retención $0 no es una retención válida; se
              asigna en{' '}
              <Link
                href={
                  periodId
                    ? `/admin/tesoreria/validacion-datos?earnersOfPeriodId=${encodeURIComponent(periodId)}`
                    : '/admin/tesoreria/validacion-datos'
                }
                className="font-medium underline"
              >
                Validación de datos
              </Link>
              .
            </p>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin desglose por régimen para este periodo.</p>
        ) : (
          <div className="space-y-5">
            {currencies.map((cur) => (
              <div key={cur} className="overflow-x-auto">
                {currencies.length > 1 && (
                  <Badge variant="outline" className="mb-2 font-mono">
                    {cur}
                  </Badge>
                )}
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">Régimen</th>
                      <th className="py-2 pr-3 text-right">Filas</th>
                      <th className="py-2 pr-3 text-right">Base</th>
                      <th className="py-2 pr-3 text-right">IVA</th>
                      <th className="py-2 pr-3 text-right">Ret. IVA</th>
                      <th className="py-2 pr-3 text-right">ISR</th>
                      <th className="py-2 pr-3 text-right">RESICO</th>
                      <th className="py-2 text-right">Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(groups.get(cur) ?? []).map((r) => {
                      const net =
                        toNumber(r.base) +
                        toNumber(r.iva) -
                        toNumber(r.ivaWithholding) -
                        toNumber(r.isr) -
                        toNumber(r.resico);
                      return (
                        <tr key={`${cur}-${r.code}`} className="border-b border-border last:border-0">
                          <td className="py-2 pr-3">
                            <div className="font-medium text-foreground">{r.name || r.code}</div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-mono">{r.code}</span>
                              {r.rates && <span> · {ratesText(r.rates)}</span>}
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatInt(r.rows)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.base, cur)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums text-blue-700">
                            {toNumber(r.iva) > 0 ? `+ ${formatMoney(r.iva, cur)}` : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-destructive">
                            {toNumber(r.ivaWithholding) > 0 ? `− ${formatMoney(r.ivaWithholding, cur)}` : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-destructive">
                            {toNumber(r.isr) > 0 ? `− ${formatMoney(r.isr, cur)}` : '—'}
                          </td>
                          <td className="py-2 pr-3 text-right tabular-nums text-destructive">
                            {toNumber(r.resico) > 0 ? `− ${formatMoney(r.resico, cur)}` : '—'}
                          </td>
                          <td className="py-2 text-right font-semibold tabular-nums text-primary">
                            {formatMoney(net, cur)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ratesText(rates: NonNullable<SummaryByRegime['rates']>): string {
  const parts: string[] = [];
  if (rates.ivaRate !== undefined && rates.ivaRate !== null) parts.push(`IVA ${formatRate(rates.ivaRate)}`);
  if (rates.ivaWithholdingRate !== undefined && rates.ivaWithholdingRate !== null)
    parts.push(`ret. IVA ${formatRate(rates.ivaWithholdingRate)}`);
  if (rates.usesProgressiveIsr) {
    parts.push(`ISR por tramos${rates.isrBracketsCount ? ` (${rates.isrBracketsCount})` : ''}`);
  } else if (rates.isrRetentionRate !== undefined && rates.isrRetentionRate !== null) {
    parts.push(`ISR ${formatRate(rates.isrRetentionRate)}`);
  }
  if (rates.resicoRate !== undefined && rates.resicoRate !== null && toNumber(rates.resicoRate) > 0)
    parts.push(`RESICO ${formatRate(rates.resicoRate)}`);
  return parts.join(' · ');
}
