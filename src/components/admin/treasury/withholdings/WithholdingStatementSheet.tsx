'use client';

// WithholdingStatementSheet — estado de cuenta del convenio: resumen (total,
// abonado, saldo, abono, tope, próximo abono), pagaré (URL firmada 15 min,
// nunca /storage/file/*), abonos por periodo 26→25 con export, notas
// append-only y línea de tiempo. Acciones gateadas por `canWithhold`.

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  PauseIcon,
  PencilSquareIcon,
  PlayIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useUploadWithholdingAttachment, useWithholdingStatement } from '@/hooks/useTreasury';
import { withholdingsTreasuryService } from '@/services/treasury.service';
import { exportToCsv } from '@/lib/csv-export';
import { saveBlob } from '@/lib/download';
import type { WithholdingAgreementRow, WithholdingStatusChange } from '@/types/treasury';
import { treasuryErrorMessage } from '../treasury-error';
import {
  actorName,
  csvSafe,
  filenameFromDisposition,
  formatDateOnly,
  formatDateTime,
  formatInt,
  formatMoney,
  formatRate,
  toNumber,
} from '../treasury-format';
import {
  WITHHOLDING_STATUS_TONES,
  loanProgressPct,
  splitNotes,
  withholdingConceptLabel,
  withholdingEventLabel,
  withholdingExportFilename,
  withholdingStatusLabel,
} from './withholding-format';

interface WithholdingStatementSheetProps {
  agreement: WithholdingAgreementRow | null;
  onClose: () => void;
  canWithhold: boolean;
  onEdit?: (row: WithholdingAgreementRow) => void;
  onStatusChange?: (row: WithholdingAgreementRow, target: WithholdingStatusChange) => void;
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function WithholdingStatementSheet({
  agreement,
  onClose,
  canWithhold,
  onEdit,
  onStatusChange,
}: WithholdingStatementSheetProps) {
  const statement = useWithholdingStatement(agreement);
  const upload = useUploadWithholdingAttachment();
  const [opening, setOpening] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileReset, setFileReset] = useState(0);

  const row = statement.data?.agreement ?? agreement;
  const applications = statement.data?.applications ?? [];
  const events = statement.data?.events ?? [];

  const openAttachment = async () => {
    if (!row) return;
    setOpening(true);
    try {
      const { url } = await withholdingsTreasuryService.attachmentUrl(row.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo abrir el pagaré'));
    } finally {
      setOpening(false);
    }
  };

  const uploadAttachment = async () => {
    if (!row || !file) return;
    try {
      await upload.mutateAsync({ id: row.id, file });
      toast.success('Pagaré adjuntado');
      setFile(null);
      setFileReset((n) => n + 1);
    } catch (err) {
      toast.error(treasuryErrorMessage(err, 'No se pudo adjuntar el pagaré'));
    }
  };

  const exportApplications = async () => {
    if (!row) return;
    setExporting(true);
    try {
      const { blob, disposition } = await withholdingsTreasuryService.exportApplications(row.id);
      saveBlob(blob, filenameFromDisposition(disposition, withholdingExportFilename('abonos')), blob.type || undefined);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404 && applications.length > 0) {
        // El API aún no expone el export: CSV con lo que ya está en pantalla.
        exportToCsv(
          withholdingExportFilename('abonos'),
          ['Periodo', 'Retenido', 'Moneda fila', 'Abono', 'Moneda convenio', 'Saldo antes', 'Saldo después', 'Aplicado el', 'Referencia'],
          applications.map((a) => [
            csvSafe(a.periodName ?? a.periodCode ?? ''),
            toNumber(a.amountWithheld),
            a.currencyCode,
            toNumber(a.agreementAmount),
            a.agreementCurrency,
            a.balanceBefore === null ? '' : toNumber(a.balanceBefore),
            a.balanceAfter === null ? '' : toNumber(a.balanceAfter),
            a.appliedAt,
            csvSafe(a.paymentReference ?? ''),
          ]),
        );
        toast.info('Export local: el API aún no expone el CSV auditado de abonos');
      } else {
        toast.error(treasuryErrorMessage(err, 'No se pudo exportar'));
      }
    } finally {
      setExporting(false);
    }
  };

  const progress = row ? loanProgressPct(row.totalAmount, row.balanceRemaining) : null;
  const paidSoFar =
    row && row.totalAmount !== null && row.balanceRemaining !== null
      ? toNumber(row.totalAmount) - toNumber(row.balanceRemaining)
      : row?.withheldToDate !== null && row?.withheldToDate !== undefined
        ? toNumber(row.withheldToDate)
        : null;
  const canMutate = canWithhold && !!row && (row.status === 'active' || row.status === 'paused');

  return (
    <Sheet open={!!agreement} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="pb-0">
          <SheetTitle>Estado de cuenta del convenio</SheetTitle>
          <SheetDescription>
            Abonos por periodo 26→25, saldo vivo, pagaré y bitácora. Los importes se aplican al pagar comisiones.
          </SheetDescription>
        </SheetHeader>

        {!row ? null : (
          <div className="space-y-6 px-4 pb-6">
            {/* Cabecera */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/distribuidores/${row.customerId}`}
                  className="text-base font-semibold text-primary hover:underline"
                >
                  {row.customerName ?? 'Distribuidor'}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {row.customerNumber ? `#${row.customerNumber} · ` : ''}
                  {row.currencyCode}
                  {row.countryCode ? ` · ${row.countryCode}` : ''}
                </p>
                <p className="mt-1 text-sm text-foreground">{row.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{withholdingConceptLabel(row.concept)}</Badge>
                <Badge variant={WITHHOLDING_STATUS_TONES[row.status] ?? 'secondary'}>
                  {withholdingStatusLabel(row.status)}
                </Badge>
                {row.inBatch && (
                  <Badge variant="warning" title="Comisiones del distribuidor en un lote vivo">
                    En lote
                  </Badge>
                )}
              </div>
            </div>

            {/* Acciones */}
            {canMutate && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onEdit?.(row)}>
                  <PencilSquareIcon className="mr-1.5 h-4 w-4" aria-hidden /> Editar
                </Button>
                {row.status === 'active' && (
                  <Button type="button" variant="outline" size="sm" onClick={() => onStatusChange?.(row, 'paused')}>
                    <PauseIcon className="mr-1.5 h-4 w-4" aria-hidden /> Pausar
                  </Button>
                )}
                {row.status === 'paused' && (
                  <Button type="button" variant="outline" size="sm" onClick={() => onStatusChange?.(row, 'active')}>
                    <PlayIcon className="mr-1.5 h-4 w-4" aria-hidden /> Reactivar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onStatusChange?.(row, 'cancelled')}
                >
                  <XCircleIcon className="mr-1.5 h-4 w-4" aria-hidden /> Cancelar convenio
                </Button>
              </div>
            )}

            {/* Resumen */}
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Total" value={row.totalAmount === null ? 'Sin tope' : formatMoney(row.totalAmount, row.currencyCode)} />
              <Stat label="Abonado" value={paidSoFar === null ? '—' : formatMoney(paidSoFar, row.currencyCode)} />
              <Stat label="Saldo" value={row.balanceRemaining === null ? '—' : formatMoney(row.balanceRemaining, row.currencyCode)} />
              <Stat label="Abono por periodo" value={formatMoney(row.installmentAmount, row.currencyCode)} />
              <Stat label="Tope del convenio" value={formatRate(toNumber(row.maxPctOfNet) / 100)} hint="% del neto de la fila" />
              <Stat
                label="Próximo abono estimado"
                value={
                  row.nextInstallmentEstimate === null || row.nextInstallmentEstimate === undefined
                    ? '—'
                    : formatMoney(row.nextInstallmentEstimate, row.currencyCode)
                }
                hint="Preview del periodo (tope global incluido)"
              />
            </div>
            {progress !== null && (
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Avance del préstamo</span>
                  <span className="tabular-nums">{progress} %</span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                  aria-label="Avance del préstamo"
                >
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Aplica desde</dt>
                <dd className="text-foreground">{row.startsPeriodName ?? (row.startsPeriodId ? 'Periodo definido' : 'Siguiente pago')}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Folio de autorización</dt>
                <dd className="font-mono text-foreground">{row.authorizationFolio || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Creado</dt>
                <dd className="text-foreground">
                  {formatDateTime(row.createdAt)}
                  {row.createdBy ? ` · ${actorName(row.createdBy)}` : ''}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Último cambio de estado</dt>
                <dd className="text-right text-foreground">
                  {row.statusChangedAt ? formatDateTime(row.statusChangedAt) : '—'}
                  {row.statusChangedBy ? ` · ${actorName(row.statusChangedBy)}` : ''}
                </dd>
              </div>
              {row.statusReason && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Motivo</dt>
                  <dd className="text-foreground">{row.statusReason}</dd>
                </div>
              )}
            </dl>

            {/* Pagaré */}
            <section aria-labelledby="wh-attachment">
              <h3 id="wh-attachment" className="mb-2 text-sm font-semibold text-foreground">
                Pagaré / convenio firmado
              </h3>
              {row.hasAttachment ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Button type="button" variant="outline" size="sm" onClick={() => void openAttachment()} disabled={opening}>
                    {opening ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <ArrowTopRightOnSquareIcon className="mr-1.5 h-4 w-4" aria-hidden />
                    )}
                    Ver pagaré (enlace de 15 min)
                  </Button>
                  {row.attachmentUploadedAt && (
                    <span className="text-xs text-muted-foreground">Subido {formatDateTime(row.attachmentUploadedAt)}</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin adjunto.</p>
              )}
              {canWithhold && (
                <div className="mt-3 space-y-2">
                  <FileUpload
                    label={row.hasAttachment ? 'Reemplazar pagaré' : 'Adjuntar pagaré'}
                    name="attachment"
                    maxSizeMB={5}
                    onChange={setFile}
                    disabled={upload.isPending}
                    hideStatus
                    resetKey={fileReset}
                  />
                  {file && (
                    <Button type="button" size="sm" onClick={() => void uploadAttachment()} disabled={upload.isPending} aria-busy={upload.isPending}>
                      {upload.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />}
                      Subir archivo
                    </Button>
                  )}
                </div>
              )}
            </section>

            {/* Abonos por periodo */}
            <section aria-labelledby="wh-applications">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 id="wh-applications" className="text-sm font-semibold text-foreground">
                  Abonos por periodo {applications.length > 0 && `(${formatInt(applications.length)})`}
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => void exportApplications()} disabled={exporting || applications.length === 0}>
                  {exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : <ArrowDownTrayIcon className="mr-1.5 h-4 w-4" aria-hidden />}
                  Exportar
                </Button>
              </div>
              {statement.isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : statement.isError ? (
                <p className="text-sm text-destructive">
                  {treasuryErrorMessage(statement.error, 'No se pudo cargar el historial')}
                </p>
              ) : applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún sin abonos: se registran al pagar las comisiones del periodo.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2">Periodo</th>
                        <th className="px-3 py-2 text-right">Retenido</th>
                        <th className="px-3 py-2 text-right">Abono</th>
                        <th className="px-3 py-2 text-right">Saldo</th>
                        <th className="px-3 py-2">Aplicado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((a) => (
                        <tr key={a.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2">{a.periodName ?? a.periodCode ?? '—'}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(a.amountWithheld, a.currencyCode)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatMoney(a.agreementAmount, a.agreementCurrency)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {a.balanceAfter === null ? '—' : formatMoney(a.balanceAfter, a.agreementCurrency)}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {formatDateOnly(a.appliedAt)}
                            {a.paymentReference ? ` · ${a.paymentReference}` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Notas */}
            <section aria-labelledby="wh-notes">
              <h3 id="wh-notes" className="mb-2 text-sm font-semibold text-foreground">
                Notas (solo se anexan)
              </h3>
              {splitNotes(row.notes).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin notas.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {splitNotes(row.notes).map((n, i) => (
                    <li key={i} className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 px-3 py-2 text-foreground">
                      {n}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Línea de tiempo */}
            {events.length > 0 && (
              <section aria-labelledby="wh-events">
                <h3 id="wh-events" className="mb-2 text-sm font-semibold text-foreground">
                  Línea de tiempo
                </h3>
                <ol className="space-y-2 border-l border-border pl-4 text-sm">
                  {events.map((e, i) => (
                    <li key={`${e.at}-${i}`} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
                      <p className="font-medium text-foreground">{withholdingEventLabel(e.event)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(e.at)} · {actorName(e.actor)}
                        {e.reason ? ` · ${e.reason}` : ''}
                      </p>
                      {e.note && <p className="text-xs text-foreground">{e.note}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
