'use client';

// Tesorería › Bonos de rango (2-nov-2026): Bono Auto mensual por rango
// (Platino en adelante) del periodo de comisiones. Importe del catálogo de
// rangos (MXN para México/Frontera, USD para Estados Unidos) según el rango
// alcanzado en el periodo; IVA y retenciones con el régimen de comisiones de
// cada distribuidor. El motor de comisiones no lo incluye: es un apartado
// aparte, como CEDEAS. Periodo = selector común de Tesorería (commission_periods).

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useRankBonuses } from '@/hooks/useRankBonuses';
import { rankBonusesService } from '@/services/rank-bonuses.service';
import { saveBlob } from '@/lib/download';
import {
  PeriodSelector,
  TreasuryHeader,
  TreasuryTabs,
  filenameFromDisposition,
  formatMoney,
  treasuryErrorMessage,
  useTreasuryPeriod,
} from '@/components/admin/treasury';
import type { RankBonusCurrencyTotal } from '@/types/rank-bonuses';

function formatInt(value: number): string {
  return new Intl.NumberFormat('es-MX').format(value);
}

export default function BonosRangoPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BonosRangoContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function TotalCard({ total }: { total: RankBonusCurrencyTotal }) {
  const c = total.currencyCode;
  const retained = total.ivaWithholding + total.isr + total.resico;
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {c} · {total.rows} distribuidor{total.rows === 1 ? '' : 'es'}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Bonos (subtotal)</dt>
            <dd className="font-semibold text-foreground">{formatMoney(total.subtotal, c)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">+ IVA</dt>
            <dd className="font-semibold text-foreground">{formatMoney(total.iva, c)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">− Retenciones</dt>
            <dd className="font-semibold text-foreground">{formatMoney(retained, c)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total a pagar</dt>
            <dd className="text-lg font-bold tabular-nums text-primary">{formatMoney(total.total, c)}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          {total.byRank.map((r) => (
            <Badge key={r.rankCode} variant="secondary">
              {r.rankName}: {formatInt(r.rows)} · {formatMoney(r.subtotal, c)}
            </Badge>
          ))}
        </div>
        {total.withoutRegime > 0 ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {total.withoutRegime} sin régimen fiscal: su bono no entra en el total a pagar hasta capturarlo en
            Validación de datos.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BonosRangoContent() {
  const { get, setParams } = useQueryFilters({});
  const periodSel = useTreasuryPeriod(get('period'));
  const { effectivePeriodId } = periodSel;
  const query = effectivePeriodId ? { periodId: effectivePeriodId } : {};
  const { data, isLoading, error } = useRankBonuses(query, !periodSel.isLoading);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { blob, disposition } = await rankBonusesService.exportRankBonuses(query);
      const fallback = `bonos-rango-${new Date().toISOString().slice(0, 10)}.csv`;
      saveBlob(blob, filenameFromDisposition(disposition, fallback), blob.type || 'text/csv;charset=utf-8;');
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo exportar el CSV'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6">
      <TreasuryHeader
        icon={TrophyIcon}
        title="Bonos de rango"
        subtitle="Bono Auto mensual de Platinos y Diamantes según el rango alcanzado en el periodo, con IVA y retenciones por régimen. Aparte de las comisiones de red."
        actions={
          <Button variant="outline" onClick={handleExport} disabled={exporting || !data}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" aria-hidden />
            )}
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-6">
        <TreasuryTabs active="bonos-rango" periodId={effectivePeriodId} />
      </div>

      <PeriodSelector selection={periodSel} onChange={(id) => setParams({ period: id })} />

      {data?.period && !data.period.isClosed ? (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            <strong>Periodo en curso: rangos estimados.</strong> El estimador los reescribe cada 4 h; la lista
            definitiva sale con el cierre del periodo.
          </p>
        </div>
      ) : null}

      {error ? (
        <Card className="mb-6 border-destructive/40">
          <CardContent className="p-5 text-sm text-destructive">
            {treasuryErrorMessage(error, 'No se pudieron cargar los bonos de rango.')}
          </CardContent>
        </Card>
      ) : null}

      {isLoading || !data ? (
        !error ? <PageSkeleton /> : null
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            {data.totals.map((t) => (
              <TotalCard key={t.currencyCode} total={t} />
            ))}
          </div>

          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{data.rule}</span>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Distribuidor</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead className="text-right">Pts. personales</TableHead>
                    <TableHead>Régimen</TableHead>
                    <TableHead className="text-right">Bono</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Retenciones</TableHead>
                    <TableHead className="text-right">Total a pagar</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Aviso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center text-muted-foreground">
                        Ningún distribuidor con rango Platino o superior en el periodo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.rows.map((r) => {
                      const inv = r.invoice;
                      const retained = inv ? inv.ivaWithholding + inv.isr + inv.resico : null;
                      const notes = [r.warning, r.currencyNote].filter(Boolean).join(' · ');
                      return (
                        <TableRow key={r.customerId}>
                          <TableCell>
                            <Link
                              href={`/admin/distribuidores/${r.customerId}`}
                              className="font-mono text-sm text-primary hover:underline"
                            >
                              {r.customerNumber ?? '—'}
                            </Link>
                            <span className="block text-xs text-muted-foreground">{r.customerName}</span>
                          </TableCell>
                          <TableCell className="text-sm">{r.countryCode ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{r.rankName}</Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatInt(r.pointsPersonal)}</TableCell>
                          <TableCell className="text-sm">
                            {r.taxRegimeCode ?? <span className="text-amber-700 dark:text-amber-300">Sin régimen</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(r.subtotal, r.currencyCode)}</TableCell>
                          <TableCell className="text-right tabular-nums">{inv ? formatMoney(inv.iva, r.currencyCode) : '—'}</TableCell>
                          <TableCell className="text-right tabular-nums text-destructive">
                            {retained != null ? `− ${formatMoney(retained, r.currencyCode)}` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-primary">
                            {inv ? formatMoney(inv.total, r.currencyCode) : '—'}
                          </TableCell>
                          <TableCell className="text-sm">{r.currencyCode}</TableCell>
                          <TableCell className="text-xs text-amber-700 dark:text-amber-300">
                            {notes ? (
                              <span className="inline-flex items-start gap-1">
                                <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                {notes}
                              </span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
