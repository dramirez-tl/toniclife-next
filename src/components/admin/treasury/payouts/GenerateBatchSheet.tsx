'use client';

// GenerateBatchSheet — Sheet "Generar lote" (contrato §4.2 / §5.3): periodo
// (cerrado y pagable), moneda con FX del periodo, formato `ready`, fecha
// valor ≥ hoy, alcance (solo listas / todas las aprobadas), resumen de
// bloqueadas por motivo, convenios proyectados y notas. Confirma con
// `confirmText` = nº de filas aprobadas elegibles. El API vuelve a validar
// todo (gates fail-closed) y genera el layout ANTES de marcar nada.

import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import {
  useCreatePayoutBatch,
  useLayoutFormats,
  useTreasuryCommissions,
  useTreasurySummary,
  useWithholdingPreviewV2,
} from '@/hooks/useTreasury';
import type { MlmPeriod } from '@/types/mlm-periods';
import { PAYOUT_CURRENCIES, type PayoutBatchFull, type PayoutCurrency } from '@/types/treasury';
import { readinessBlockerLabel, treasuryBlockedDetails, treasuryCodeLabel, treasuryErrorMessage } from '../treasury-error';
import { findCurrency, formatInt, formatMoney, formatPeriodRange, todayCdmx, toNumber } from '../treasury-format';
import { normalizeAmountsByCurrency } from '../withholdings/withholding-format';
import { layoutFormatLabel } from './payout-format';

interface GenerateBatchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: MlmPeriod | null;
  defaultFormat?: string | null;
  onCreated?: (batch: PayoutBatchFull) => void;
}

interface Eligible {
  count: number;
  loading: boolean;
  error: unknown;
}

export function GenerateBatchSheet({ open, onOpenChange, period, defaultFormat, onCreated }: GenerateBatchSheetProps) {
  const create = useCreatePayoutBatch();
  const summaryQuery = useTreasurySummary(open ? period?.id : undefined);
  const formatsQuery = useLayoutFormats(open);
  const previewQuery = useWithholdingPreviewV2(period?.id, undefined, open);

  const [currency, setCurrency] = useState<PayoutCurrency>('MXN');
  const [format, setFormat] = useState(defaultFormat ?? 'generic_csv');
  const [paymentDate, setPaymentDate] = useState(todayCdmx());
  const [onlyReady, setOnlyReady] = useState(true);
  const [notes, setNotes] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ids = { currency: useId(), format: useId(), date: useId(), onlyReady: useId(), notes: useId() };

  const summary = summaryQuery.data;
  const today = todayCdmx();
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) && paymentDate >= today;
  const periodClosed = !!period?.isClosed;
  const payable = summary?.period?.payable === true;
  const missingFx = summary?.missingFx ?? [];
  const fxMissingForCurrency = currency !== 'MXN' && missingFx.includes(currency);

  const formats = useMemo(() => formatsQuery.data ?? [], [formatsQuery.data]);
  const formatOptions = useMemo(
    () =>
      formats.length > 0
        ? formats.map((f) => ({
            value: f.code,
            label: f.ready ? f.name : `${f.name} (sin configurar)`,
            hint: f.bank ? `${f.bank}${f.fileType ? ` · ${f.fileType}` : ''}` : undefined,
          }))
        : [{ value: 'generic_csv', label: layoutFormatLabel('generic_csv') }],
    [formats],
  );
  const selectedFormat = formats.find((f) => f.code === format);
  const formatReady = formats.length === 0 ? true : selectedFormat?.ready === true;

  // Conteo de filas aprobadas elegibles para el alcance (periodo + moneda + readiness).
  const eligibleQuery = useTreasuryCommissions(
    {
      periodId: period?.id,
      stage: 'approved',
      currencyCode: currency,
      readiness: onlyReady ? 'ready' : undefined,
      page: 1,
      limit: 1,
    },
    open && !!period?.id,
  );
  const eligible: Eligible = {
    count: eligibleQuery.data ? (eligibleQuery.data.meta?.total ?? eligibleQuery.data.total ?? eligibleQuery.data.data.length) : 0,
    loading: eligibleQuery.isLoading || eligibleQuery.isFetching,
    error: eligibleQuery.error,
  };

  const byCurrency = findCurrency(summary?.byCurrency, currency);
  const blockedAmount = (summary?.readiness?.blockedAmountByCurrency ?? []).find((a) => a.currency === currency);
  const projectedWithheld = normalizeAmountsByCurrency(previewQuery.data?.totalByCurrency).find((a) => a.currency === currency);

  const canSubmit =
    periodClosed && payable && !fxMissingForCurrency && formatReady && dateOk && eligible.count > 0 && !eligible.loading;

  const handleCreate = async () => {
    if (!period) return;
    try {
      const batch = await create.mutateAsync({
        periodId: period.id,
        currencyCode: currency,
        layoutFormat: format,
        paymentDate,
        notes: notes.trim() || undefined,
      });
      toast.success(`Lote ${batch.batchNumber} generado: ${formatInt(batch.itemsCount)} filas · ${formatMoney(batch.totalNetPayout, batch.currencyCode)}`);
      setConfirmOpen(false);
      onCreated?.(batch);
      onOpenChange(false);
    } catch (err) {
      const blocked = treasuryBlockedDetails(err);
      toast.error(
        treasuryErrorMessage(err, 'No se pudo generar el lote') +
          (blocked.length > 0 ? ` · primeras bloqueadas: ${blocked.slice(0, 3).map((b) => b.customerNumber ?? b.id).join(', ')}` : ''),
      );
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="pb-0">
            <SheetTitle>Generar lote de dispersión</SheetTitle>
            <SheetDescription>
              Toma las comisiones aprobadas del periodo en la moneda elegida, aplica convenios, congela importes y FX,
              genera el layout bancario (sha256) y lo guarda en privado. Nada se marca como pagado aquí.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 px-4 pb-6">
            {/* Periodo */}
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">{period?.name ?? 'Sin periodo'}</p>
              <p className="text-xs text-muted-foreground">{formatPeriodRange(period) ?? '—'}</p>
              {summaryQuery.isLoading ? (
                <Skeleton className="mt-2 h-4 w-40" />
              ) : !periodClosed ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                  <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden /> Periodo abierto: no se puede lotear (TRS_PERIOD_OPEN).
                </p>
              ) : summary && !payable ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                  <ExclamationTriangleIcon className="h-3.5 w-3.5" aria-hidden />
                  {treasuryCodeLabel(summary.period.payableReason) || 'El periodo no es pagable.'}
                </p>
              ) : summary ? (
                <p className="mt-1 text-xs text-emerald-700">Periodo cerrado y pagable.</p>
              ) : summaryQuery.isError ? (
                <p className="mt-1 text-xs text-destructive">{treasuryErrorMessage(summaryQuery.error, 'No se pudo cargar el resumen')}</p>
              ) : null}
            </div>

            {/* Moneda + formato */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={ids.currency}>Moneda del lote</Label>
                <SearchableSelect
                  id={ids.currency}
                  options={PAYOUT_CURRENCIES.map((c) => ({
                    value: c,
                    label: c,
                    hint: c !== 'MXN' && missingFx.includes(c) ? 'Sin tipo de cambio del periodo' : undefined,
                  }))}
                  value={currency}
                  onChange={(v) => setCurrency((PAYOUT_CURRENCIES as readonly string[]).includes(v) ? (v as PayoutCurrency) : 'MXN')}
                  showAllOption={false}
                  disabled={create.isPending}
                />
                {fxMissingForCurrency && (
                  <p className="text-xs text-destructive">Sin FX del periodo para {currency}: el API rechazará el lote (TRS_NO_FX_RATE).</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={ids.format}>Formato bancario</Label>
                <SearchableSelect
                  id={ids.format}
                  options={formatOptions}
                  value={format}
                  onChange={setFormat}
                  showAllOption={false}
                  disabled={create.isPending || formatsQuery.isLoading}
                />
                {!formatReady && (
                  <p className="text-xs text-amber-700">Formato sin configurar (p. ej. CLABE ordenante en Ajustes de Tesorería).</p>
                )}
                {formatsQuery.isError && (
                  <p className="text-xs text-muted-foreground">No se pudo leer el catálogo de formatos; se usa CSV genérico.</p>
                )}
              </div>
            </div>

            {/* Fecha valor + alcance */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={ids.date}>Fecha valor (pago solicitado al banco)</Label>
                <Input id={ids.date} type="date" value={paymentDate} min={today} onChange={(e) => setPaymentDate(e.target.value)} disabled={create.isPending} aria-invalid={!dateOk} />
                {!dateOk && <p className="text-xs text-destructive">Debe ser hoy o posterior.</p>}
              </div>
              <div className="space-y-1.5">
                <span className="text-sm font-medium leading-none">Alcance</span>
                <label htmlFor={ids.onlyReady} className="flex items-start gap-2 text-sm">
                  <Checkbox id={ids.onlyReady} checked={onlyReady} onCheckedChange={(v) => setOnlyReady(v === true)} disabled={create.isPending} className="mt-0.5" />
                  <span>
                    Solo filas listas (datos de pago validados)
                    <span className="block text-xs text-muted-foreground">
                      Con el ajuste “exigir datos validados” activo, el API rechaza las bloqueadas de todos modos.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Resumen */}
            <div className="space-y-2 rounded-md border border-border p-3 text-sm">
              <p className="font-medium text-foreground">Resumen · {currency}</p>
              <ul className="space-y-1">
                <li className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Filas aprobadas elegibles</span>
                  <span className="tabular-nums" aria-live="polite">
                    {eligible.loading ? 'calculando…' : eligible.error ? 'sin dato' : formatInt(eligible.count)}
                  </span>
                </li>
                {byCurrency && (
                  <>
                    <li className="flex justify-between gap-2">
                      <span className="text-muted-foreground">A dispersar (periodo, todas las etapas)</span>
                      <span className="tabular-nums">{formatMoney(byCurrency.toDisperse, currency)}</span>
                    </li>
                    <li className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Convenios proyectados (resumen)</span>
                      <span className="tabular-nums">{formatMoney(byCurrency.companyWithheldProjected, currency)}</span>
                    </li>
                  </>
                )}
                {projectedWithheld && (
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Convenios por aplicar (preview)</span>
                    <span className="tabular-nums">{formatMoney(projectedWithheld.amount, currency)}</span>
                  </li>
                )}
                {(previewQuery.data?.warnings ?? []).length > 0 && (
                  <li className="text-xs text-amber-700">
                    {formatInt((previewQuery.data?.warnings ?? []).length)} convenio(s) sin tipo de cambio: no se retendrán.
                  </li>
                )}
              </ul>

              {summary?.readiness && summary.readiness.blockedCount > 0 && (
                <div className="mt-2 border-t border-border pt-2">
                  <p className="text-xs font-medium text-amber-700">
                    Bloqueadas en el periodo: {formatInt(summary.readiness.blockedCount)}
                    {blockedAmount ? ` (${formatMoney(blockedAmount.amount, currency)} en ${currency})` : ''}
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {summary.readiness.blockers.map((b) => (
                      <li key={b.code}>
                        <Badge variant="outline" className="text-xs">
                          {readinessBlockerLabel(b.code)}: {formatInt(b.count)}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Los totales exactos (neto, convenios, importe del layout) los calcula el API al generar y quedan
                congelados en el lote.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={ids.notes}>Notas (opcional)</Label>
              <Textarea id={ids.notes} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} disabled={create.isPending} placeholder="Ej. Primera dispersión v2 del periodo" />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => setConfirmOpen(true)} disabled={!canSubmit || create.isPending}>
                {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Generar lote…
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Generar lote de ${formatInt(eligible.count)} filas en ${currency}`}
        description="Se congelan importes, convenios y FX por fila y se genera el layout con hash. Después solo se puede cancelar mientras no se marque como enviado."
        confirmLabel="Generar lote"
        confirmText={String(eligible.count)}
        isPending={create.isPending}
        onConfirm={handleCreate}
      >
        <ul className="space-y-1 text-sm">
          <li>Periodo: {period?.name ?? '—'} · fecha valor {paymentDate}</li>
          <li>Formato: {selectedFormat?.name ?? layoutFormatLabel(format)}</li>
          <li>Alcance: {onlyReady ? 'solo filas listas' : 'todas las aprobadas (el API puede rechazar bloqueadas)'}</li>
          {byCurrency && <li>Referencia del periodo: a dispersar {formatMoney(toNumber(byCurrency.toDisperse), currency)}</li>}
        </ul>
      </ConfirmDialog>
    </>
  );
}
