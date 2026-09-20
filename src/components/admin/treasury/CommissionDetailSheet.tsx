'use client';

// CommissionDetailSheet — detalle de UNA comisión (GET /mlm/commissions/:id):
// distribuidor + readiness, importes congelados, desglose nivel/generación,
// impuestos con las tasas reales del régimen, convenios, pagos (ledger),
// lote y línea de tiempo derivada (columnas + ledger + audit_log).
// "Descargar recibo" solo en paid|reconciled (PDF en cliente).

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTreasuryCommissionDetail } from '@/hooks/useTreasury';
import { treasuryService } from '@/services/treasury.service';
import { generateCommissionStatementPdf } from '@/lib/generate-commission-statement-pdf';
import type { CommissionLevelBreakdown } from '@/types/commissions';
import type { BreakdownItem, CommissionDetail, CommissionRow } from '@/types/treasury';
import { StageBadge } from './StageBadge';
import { ReadinessChip } from './ReadinessChip';
import { treasuryErrorMessage } from './treasury-error';
import {
  COMMISSION_TYPE_LABELS,
  actorName,
  formatDateOnly,
  formatDateTime,
  formatInt,
  formatMoney,
  formatRate,
  timelineEventLabel,
  toNumber,
} from './treasury-format';

interface CommissionDetailSheetProps {
  commissionId: string | null;
  onClose: () => void;
  /** Acciones gateadas por el padre (permiso + periodo cerrado). */
  onCancel?: (row: CommissionRow) => void;
  onRestore?: (row: CommissionRow) => void;
  canCancel?: boolean;
}

export function CommissionDetailSheet({
  commissionId,
  onClose,
  onCancel,
  onRestore,
  canCancel = false,
}: CommissionDetailSheetProps) {
  const detail = useTreasuryCommissionDetail(commissionId);
  const [downloading, setDownloading] = useState(false);

  const handleReceipt = async (row: CommissionRow) => {
    setDownloading(true);
    try {
      const model = await treasuryService.getReceipt(row.id);
      generateCommissionStatementPdf({
        distributorName: model.distributorName,
        distributorCode: model.distributorCode ?? row.customerNumber ?? null,
        periodName: model.periodName,
        currencyCode: model.currencyCode || row.currencyCode || 'MXN',
        summary: model.summary,
        commissions: model.commissions,
        generatedAt: model.generatedAt ? new Date(model.generatedAt) : new Date(),
      });
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo generar el recibo'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Sheet open={!!commissionId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="pb-0">
          <SheetTitle>Detalle de la comisión</SheetTitle>
          <SheetDescription>
            Importes congelados por el motor, datos de pago, convenios, pagos y línea de tiempo.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {detail.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {!detail.isLoading && !detail.data && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 p-4 text-sm">
              <span className="text-destructive">
                {treasuryErrorMessage(detail.error, 'No se pudo cargar el detalle')}
              </span>
              <Button variant="outline" size="sm" onClick={() => void detail.refetch()}>
                <ArrowPathIcon className="mr-2 h-4 w-4" aria-hidden />
                Reintentar
              </Button>
            </div>
          )}

          {detail.data && (
            <DetailBody
              data={detail.data}
              canCancel={canCancel}
              onCancel={onCancel}
              onRestore={onRestore}
              onReceipt={handleReceipt}
              downloading={downloading}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailBody({
  data,
  canCancel,
  onCancel,
  onRestore,
  onReceipt,
  downloading,
}: {
  data: CommissionDetail;
  canCancel: boolean;
  onCancel?: (row: CommissionRow) => void;
  onRestore?: (row: CommissionRow) => void;
  onReceipt: (row: CommissionRow) => void;
  downloading: boolean;
}) {
  const { row, customer } = data;
  const cur = row.currencyCode || 'MXN';
  const readiness = customer?.readiness ?? row.readiness ?? null;
  const receiptAvailable = row.stage === 'paid' || row.stage === 'reconciled';
  const cancellable = canCancel && !row.payoutBatch && ['calculated', 'ready', 'approved'].includes(row.stage);
  const restorable = canCancel && row.stage === 'cancelled' && !!row.cancelledAt;
  const withheld = toNumber(row.companyWithholding?.amount);
  const net = toNumber(row.totalAmount);
  const breakdown = normalizeBreakdown(data.breakdown);
  const regime = data.taxes?.regime;
  const regimeCode = typeof regime === 'string' ? regime : (regime?.code ?? row.taxRegime ?? null);
  const regimeName = typeof regime === 'object' && regime ? (regime.name ?? null) : null;
  const rates = data.taxes?.ratesApplied ?? null;

  return (
    <>
      {/* Distribuidor */}
      <section className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-foreground">
              {customer?.id ? (
                <Link href={`/admin/distribuidores/${customer.id}`} className="hover:text-primary hover:underline">
                  {customer.name}
                </Link>
              ) : (
                customer?.name ?? row.customerName
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {customer?.number ? `#${customer.number}` : row.customerNumber ? `#${row.customerNumber}` : ''}
              {customer?.country ? ` · ${customer.country}` : ''}
              {customer?.currency ? ` · paga en ${customer.currency}` : ''}
              {' · '}periodo {row.periodCode}
              {' · '}
              {COMMISSION_TYPE_LABELS[row.commissionType] ?? row.commissionType}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={row.stage} isEstimate={row.isEstimate} />
            <ReadinessChip readiness={readiness} />
          </div>
        </div>
        {row.cancelReason && (
          <p className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            Cancelada {row.cancelledAt ? `el ${formatDateTime(row.cancelledAt)}` : ''}: {row.cancelReason}
          </p>
        )}
      </section>

      {/* Importes */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Importes ({cur})</h3>
        <dl className="overflow-hidden rounded-lg border border-border text-sm">
          <Row label="Bruto" value={formatMoney(row.subtotalEarnings, cur)} />
          {toNumber(row.ivaAmount) > 0 && <Row label="IVA" value={`+ ${formatMoney(row.ivaAmount, cur)}`} tone="blue" />}
          {toNumber(row.ivaWithholding) > 0 && (
            <Row label="Ret. IVA" value={`− ${formatMoney(row.ivaWithholding, cur)}`} tone="red" />
          )}
          {toNumber(row.isrAmount) > 0 && <Row label="ISR" value={`− ${formatMoney(row.isrAmount, cur)}`} tone="red" />}
          {toNumber(row.resicoAmount) > 0 && (
            <Row label="RESICO" value={`− ${formatMoney(row.resicoAmount, cur)}`} tone="red" />
          )}
          <Row label="Neto" value={formatMoney(net, cur)} strong />
          {withheld > 0 && (
            <Row
              label={`Convenios${row.companyWithholding?.projected ? ' (por aplicar al pagar)' : ''}`}
              value={`− ${formatMoney(withheld, cur)}`}
              tone="red"
            />
          )}
          {row.payoutAmount !== undefined && row.payoutAmount !== null ? (
            <Row
              label={`Importe del layout (${row.payoutCurrency ?? cur})`}
              value={formatMoney(row.payoutAmount, row.payoutCurrency ?? cur)}
              strong
              tone="green"
            />
          ) : (
            <Row label="A dispersar" value={formatMoney(Math.max(0, net - withheld), cur)} strong tone="green" />
          )}
        </dl>
      </section>

      {/* Impuestos / régimen */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Régimen fiscal aplicado</h3>
        <div className="rounded-lg border border-border p-3 text-sm">
          {regimeCode ? (
            <>
              <p className="font-medium text-foreground">
                {regimeName ?? regimeCode}{' '}
                <span className="font-mono text-xs text-muted-foreground">{regimeCode}</span>
              </p>
              {rates ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  IVA {formatRate(rates.ivaRate)} · ret. IVA {formatRate(rates.ivaWithholdingRate)} ·{' '}
                  {rates.usesProgressiveIsr
                    ? `ISR por tramos${rates.isrBracketsCount ? ` (${rates.isrBracketsCount})` : ''}`
                    : `ISR ${formatRate(rates.isrRetentionRate)}`}
                  {toNumber(rates.resicoRate) > 0 ? ` · RESICO ${formatRate(rates.resicoRate)}` : ''}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Tasas no informadas por el API.</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Sin régimen de comisión asignado.</p>
          )}
        </div>
      </section>

      {/* Desglose */}
      {breakdown.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Desglose por nivel / generación</h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[460px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Tramo</th>
                  <th className="px-3 py-2 text-right">%</th>
                  <th className="px-3 py-2 text-right">Miembros</th>
                  <th className="px-3 py-2 text-right">Base</th>
                  <th className="px-3 py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((b, i) => (
                  <tr key={`${b.kind ?? 'x'}-${b.level ?? b.generation ?? i}`} className="border-t border-border">
                    <td className="px-3 py-1.5">
                      {breakdownLabel(b)}
                      {b.upgraded && (
                        <Badge variant="info" className="ml-2">
                          mejorado
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatRate(b.percentage)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {b.members !== undefined && b.members !== null ? formatInt(b.members) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">
                      {b.base ?? b.businessPointsMxn ? formatMoney(b.base ?? b.businessPointsMxn, cur) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium tabular-nums">{formatMoney(b.amount, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Convenios */}
      {data.withholdings && data.withholdings.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Convenios de retención</h3>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {data.withholdings.map((w, i) => (
              <li key={`${w.concept}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <span>
                  {w.description || w.concept}
                  {w.projected && (
                    <Badge variant="warning" className="ml-2">
                      por aplicar
                    </Badge>
                  )}
                </span>
                <span className="tabular-nums text-destructive">
                  − {formatMoney(w.amount, w.currencyCode ?? cur)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lote */}
      {(data.batch || row.payoutBatch) && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Lote de dispersión</h3>
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="font-mono font-medium text-foreground">
              {data.batch?.batchNumber ?? row.payoutBatch?.batchNumber}
            </p>
            <p className="text-xs text-muted-foreground">
              estado {data.batch?.status ?? row.payoutBatch?.status}
              {data.batch?.paymentDate ? ` · fecha valor ${formatDateOnly(data.batch.paymentDate)}` : ''}
              {data.batch?.layoutFormat ? ` · ${data.batch.layoutFormat}` : ''}
            </p>
          </div>
        </section>
      )}

      {/* Pagos */}
      {data.payments && data.payments.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Pagos (ledger)</h3>
          <ul className="divide-y divide-border rounded-lg border border-border text-sm">
            {data.payments.map((p) => (
              <li key={p.id} className="px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium tabular-nums">{formatMoney(p.amount, p.currencyCode)}</span>
                  <Badge
                    variant={p.status === 'completed' ? 'success' : p.status === 'failed' ? 'destructive' : 'secondary'}
                  >
                    {p.status === 'completed' ? 'completado' : p.status === 'failed' ? 'rechazado' : p.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.paymentMethod ?? '—'}
                  {p.reference ? ` · ref. ${p.reference}` : ''}
                  {p.trackingKey ? ` · rastreo ${p.trackingKey}` : ''}
                  {p.paymentDate ? ` · ${formatDateOnly(p.paymentDate)}` : ''}
                  {p.bankName ? ` · ${p.bankName}` : ''}
                  {p.accountLast4 ? ` ****${p.accountLast4}` : ''}
                  {p.paidBy?.name ? ` · por ${p.paidBy.name}` : ''}
                </p>
                {p.failureReason && <p className="text-xs text-destructive">{p.failureReason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Línea de tiempo */}
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Línea de tiempo</h3>
        {data.timeline && data.timeline.length > 0 ? (
          <ol className="space-y-2 border-l border-border pl-4 text-sm">
            {data.timeline.map((t, i) => (
              <li key={`${t.event}-${t.at}-${i}`} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                <p className="font-medium text-foreground">{timelineEventLabel(t.event)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(t.at)} · {actorName(t.actor)}
                  {t.reference ? ` · ${t.reference}` : ''}
                  {t.note ? ` · ${t.note}` : ''}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <ol className="space-y-2 border-l border-border pl-4 text-sm">
            <TimelineFallback label="Calculada" at={row.createdAt} />
            {row.approvedAt && <TimelineFallback label="Aprobada" at={row.approvedAt} actor={row.approvedBy?.name} />}
            {row.paidAt && <TimelineFallback label="Pagada" at={row.paidAt} actor={row.paidBy?.name} note={row.paidReference} />}
            {row.cancelledAt && <TimelineFallback label="Cancelada" at={row.cancelledAt} note={row.cancelReason} />}
          </ol>
        )}
      </section>

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        {receiptAvailable && (
          <Button variant="outline" size="sm" onClick={() => onReceipt(row)} disabled={downloading}>
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" aria-hidden />
            )}
            Descargar recibo
          </Button>
        )}
        {cancellable && onCancel && (
          <Button variant="destructive" size="sm" onClick={() => onCancel(row)}>
            Cancelar comisión
          </Button>
        )}
        {restorable && onRestore && (
          <Button variant="outline" size="sm" onClick={() => onRestore(row)}>
            Restaurar
          </Button>
        )}
      </div>
    </>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'blue' | 'red' | 'green';
}) {
  const color =
    tone === 'blue' ? 'text-blue-700' : tone === 'red' ? 'text-destructive' : tone === 'green' ? 'text-emerald-700' : 'text-foreground';
  return (
    <div className={`flex items-center justify-between border-b border-border px-3 py-2 last:border-0 ${strong ? 'bg-muted/40' : ''}`}>
      <dt className={strong ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'font-bold' : 'font-medium'} ${color}`}>{value}</dd>
    </div>
  );
}

function TimelineFallback({
  label,
  at,
  actor,
  note,
}: {
  label: string;
  at: string;
  actor?: string | null;
  note?: string | null;
}) {
  return (
    <li className="relative">
      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">
        {formatDateTime(at)} · {actor || 'Sistema'}
        {note ? ` · ${note}` : ''}
      </p>
    </li>
  );
}

function normalizeBreakdown(
  breakdown: CommissionDetail['breakdown'],
): BreakdownItem[] {
  if (!breakdown) return [];
  if (Array.isArray(breakdown)) return breakdown;
  const lb = breakdown as CommissionLevelBreakdown;
  return (lb.levels ?? []).map((l) => ({
    kind: 'level',
    level: l.level,
    percentage: l.percentage,
    upgraded: l.upgraded,
    members: l.members,
    businessPointsMxn: l.businessPointsMxn,
    amount: l.amount,
  }));
}

function breakdownLabel(b: BreakdownItem): string {
  if (b.label) return b.label;
  if (b.kind === 'generation' || (b.generation !== undefined && b.generation !== null))
    return `Generación ${b.generation ?? ''}`.trim();
  if (b.level !== undefined && b.level !== null) return `Nivel ${b.level}`;
  return b.kind ?? 'Tramo';
}
