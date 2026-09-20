'use client';

// WithholdingPreviewCard — preview de aplicación del periodo (mismo plan que
// usará el pago: `planForCustomerRows`, orden customer_id, total DESC). Explica
// el tope GLOBAL multi-fila: por cada fila, tope = neto × % global sobre el
// REMANENTE; cada convenio aporta min(abono, tope del convenio, tope global
// restante, neto restante, saldo). Con varias filas por distribuidor el
// convenio se consume primero en la fila mayor y el saldo vivo baja entre
// filas. Se carga bajo demanda (botón) para no golpear el API al abrir.

import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWithholdingPreviewV2 } from '@/hooks/useTreasury';
import type { WithholdingPreviewItem } from '@/types/treasury';
import { treasuryErrorMessage } from '../treasury-error';
import { COMMISSION_TYPE_LABELS, formatInt, formatMoney, toNumber } from '../treasury-format';
import { capReasonLabel, normalizeAmountsByCurrency, previewWarningText } from './withholding-format';

interface WithholdingPreviewCardProps {
  periodId: string | undefined;
  periodName?: string | null;
  isPeriodClosed?: boolean;
  /** % global del ajuste si se conoce (super_admin); si no, se usa el del preview o 30. */
  globalMaxPct?: number | null;
}

interface CustomerGroup {
  customerId: string;
  name: string;
  number: string | null;
  items: WithholdingPreviewItem[];
}

function groupByCustomer(items: WithholdingPreviewItem[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();
  for (const it of items) {
    const g = map.get(it.customerId) ?? {
      customerId: it.customerId,
      name: it.customerName ?? 'Distribuidor',
      number: it.customerNumber ?? null,
      items: [],
    };
    g.items.push(it);
    map.set(it.customerId, g);
  }
  return Array.from(map.values());
}

export function WithholdingPreviewCard({
  periodId,
  periodName,
  isPeriodClosed,
  globalMaxPct,
}: WithholdingPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = useWithholdingPreviewV2(periodId, undefined, expanded);

  const groups = useMemo(() => groupByCustomer(preview.data?.items ?? []), [preview.data]);
  const totals = normalizeAmountsByCurrency(preview.data?.totalByCurrency);
  const pct = globalMaxPct ?? (preview.data?.globalMaxPct !== null && preview.data?.globalMaxPct !== undefined
    ? toNumber(preview.data.globalMaxPct)
    : 30);
  const multiRowCustomers = groups.filter((g) => g.items.length > 1).length;
  const globalWarnings = preview.data?.warnings ?? [];

  return (
    <Card className="mb-6 border-border shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">
              Preview de aplicación{periodName ? ` · ${periodName}` : ''}
            </h2>
            <p className="text-sm text-muted-foreground">
              Lo que se retendrá al pagar: mismo plan y mismo orden que el pago. Tope global {pct} % del neto por fila,
              aplicado sobre el remanente, además del tope de cada convenio.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="withholding-preview-body"
            disabled={!periodId}
          >
            {expanded ? <ChevronUpIcon className="mr-1.5 h-4 w-4" aria-hidden /> : <ChevronDownIcon className="mr-1.5 h-4 w-4" aria-hidden />}
            {expanded ? 'Ocultar' : 'Ver preview'}
          </Button>
        </div>

        {expanded && (
          <div id="withholding-preview-body" className="mt-4 space-y-4">
            {isPeriodClosed === false && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Periodo abierto: las comisiones aún son estimadas y no hay filas aprobadas; el preview suele venir vacío
                hasta el cierre.
              </p>
            )}
            {preview.isLoading ? (
              <Skeleton className="h-28 w-full" />
            ) : preview.isError ? (
              <p className="text-sm text-destructive">
                {treasuryErrorMessage(preview.error, 'No se pudo calcular el preview')}
              </p>
            ) : !preview.data || preview.data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin retenciones por aplicar: ningún distribuidor con convenio activo tiene comisiones aprobadas en este
                periodo.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Total por retener:</span>
                  {totals.map((t) => (
                    <Badge key={t.currency} variant="info" className="tabular-nums">
                      {formatMoney(t.amount, t.currency)}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    · {formatInt(groups.length)} distribuidor(es) · {formatInt(preview.data.items.length)} fila(s)
                  </span>
                </div>

                {multiRowCustomers > 0 && (
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {formatInt(multiRowCustomers)} distribuidor(es) con más de una fila de comisión: el convenio se
                    consume primero en la fila de mayor importe y el saldo baja entre filas; el tope global se evalúa
                    fila por fila sobre lo que aún no se ha retenido.
                  </p>
                )}

                {globalWarnings.length > 0 && (
                  <ul className="space-y-1 text-xs text-amber-800">
                    {globalWarnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        {previewWarningText(w)}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2">Distribuidor</th>
                        <th className="px-3 py-2">Fila</th>
                        <th className="px-3 py-2 text-right">Neto</th>
                        <th className="px-3 py-2 text-right">Tope global</th>
                        <th className="px-3 py-2 text-right">Retenido</th>
                        <th className="px-3 py-2 text-right">A dispersar</th>
                        <th className="px-3 py-2">Convenios</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g) =>
                        g.items.map((it, idx) => {
                          const cap =
                            it.capGlobal !== null && it.capGlobal !== undefined
                              ? toNumber(it.capGlobal)
                              : (toNumber(it.net) * pct) / 100;
                          const warnings = it.warnings ?? [];
                          return (
                            <tr key={it.commissionId} className="border-b border-border align-top last:border-0">
                              <td className="px-3 py-2">
                                {idx === 0 ? (
                                  <>
                                    <p className="font-medium text-foreground">{g.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {g.number ? `#${g.number}` : ''}
                                      {g.items.length > 1 ? ` · ${g.items.length} filas` : ''}
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">↳ misma persona</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {COMMISSION_TYPE_LABELS[it.commissionType ?? ''] ?? it.commissionType ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(it.net, it.currencyCode)}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                {formatMoney(cap, it.currencyCode)}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                {formatMoney(it.totalWithheld, it.currencyCode)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatMoney(it.toDisperse, it.currencyCode)}</td>
                              <td className="px-3 py-2">
                                <ul className="space-y-1 text-xs">
                                  {it.details.map((d) => (
                                    <li key={d.agreementId}>
                                      <span className="text-foreground">{d.description ?? d.concept ?? 'Convenio'}</span>
                                      {': '}
                                      <span className="tabular-nums">{formatMoney(d.amount, it.currencyCode)}</span>
                                      {d.amountAgreement !== null && d.amountAgreement !== undefined && d.agreementCurrency && d.agreementCurrency !== it.currencyCode && (
                                        <span className="text-muted-foreground">
                                          {' '}
                                          (= {formatMoney(d.amountAgreement, d.agreementCurrency)} al saldo)
                                        </span>
                                      )}
                                      {capReasonLabel(d.cappedBy) && (
                                        <span className="text-muted-foreground"> · limitado por {capReasonLabel(d.cappedBy)}</span>
                                      )}
                                    </li>
                                  ))}
                                  {warnings.map((w, i) => (
                                    <li key={`w-${i}`} className="text-amber-800">
                                      {previewWarningText(w)}
                                    </li>
                                  ))}
                                </ul>
                              </td>
                            </tr>
                          );
                        }),
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
