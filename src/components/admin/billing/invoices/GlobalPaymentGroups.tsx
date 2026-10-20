'use client';

// GlobalPaymentGroups — Factura global POR FORMA DE PAGO (Contabilidad,
// 20-oct-2026, mig 164). La vista previa trae un grupo por forma de pago
// (efectivo, tarjeta, transferencia…); cada grupo se emite como su propia
// global con el previewHash del grupo. Se pueden desmarcar tickets: los
// desmarcados quedan "por facturar" y pueden entrar a otra global del mismo
// día y forma. Los tickets que ya están en una global viva no aparecen aquí
// (salen como excluidos "ya está en otra global").

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ExclamationTriangleIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useCreateGlobalInvoice } from '@/hooks/useBilling';
import { isBillingErrorCode, isBillingFlowDisabled } from '@/lib/billing-error';
import { formatCurrency, getPaymentFormName, type GlobalConceptMode, type GlobalPreview, type GlobalPreviewGroup } from '@/types/billing';
import { InvoiceStatusBadge } from './InvoiceBadges';
import { globalBlockerLabel } from './labels';
import { formatIsoDate } from './useBranchTimezone';

type IncludedRow = GlobalPreview['included'][number];

interface GlobalPaymentGroupsProps {
  preview: GlobalPreview;
  branchId: string;
  date: string;
  conceptMode: GlobalConceptMode;
  canManage: boolean;
  flowDisabled: boolean;
  /** Tras emitir (o ante CFDI_GLOBAL_PREVIEW_STALE): volver a pedir la vista previa. */
  onRefresh: () => void;
  onFlowDisabled: () => void;
  onDiscard: (invoiceId: string) => void;
}

export function GlobalPaymentGroups({
  preview,
  branchId,
  date,
  conceptMode,
  canManage,
  flowDisabled,
  onRefresh,
  onFlowDisabled,
  onDiscard,
}: GlobalPaymentGroupsProps) {
  const create = useCreateGlobalInvoice();
  // Tickets desmarcados por forma de pago (ids). Se reinicia al cambiar la vista previa.
  const [excludedByForm, setExcludedByForm] = useState<Record<string, string[]>>({});
  const [confirmForm, setConfirmForm] = useState<string | null>(null);
  const [showItems, setShowItems] = useState<Record<string, boolean>>({});

  const dayBlocked = preview.blockers.some((b) => !preview.groups.some((g) => g.blockers.includes(b)));

  const columns: DataTableColumn<IncludedRow>[] = useMemo(
    () => [
      { key: 'folio', header: 'Folio', render: (r) => <span className="font-mono text-sm">{r.folio}<span className="ml-1 text-xs text-gray-500">{r.kind === 'order' ? 'pedido' : 'ticket'}</span></span> },
      { key: 'time', header: 'Hora', render: (r) => <span className="text-sm">{r.time}</span> },
      { key: 'customer', header: 'Cliente', render: (r) => <span className="text-sm text-gray-700">{r.customerName ?? 'Público en general'}</span> },
      { key: 'subtotal', header: 'Base', headerClassName: 'text-right', cellClassName: 'text-right', render: (r) => formatCurrency(r.subtotal) },
      { key: 'tax', header: 'IVA', headerClassName: 'text-right', cellClassName: 'text-right', render: (r) => formatCurrency(r.taxAmount) },
      { key: 'total', header: 'Total', headerClassName: 'text-right', cellClassName: 'text-right', render: (r) => <span className="font-medium">{formatCurrency(r.total)}</span> },
    ],
    [],
  );

  const selectedOf = (g: GlobalPreviewGroup) => {
    const excluded = new Set(excludedByForm[g.paymentForm] ?? []);
    return g.included.filter((r) => !excluded.has(r.id));
  };

  const emit = async (g: GlobalPreviewGroup) => {
    const excludedIds = excludedByForm[g.paymentForm] ?? [];
    try {
      await create.mutateAsync({
        branchId,
        date,
        conceptMode,
        previewHash: g.previewHash,
        paymentForm: g.paymentForm,
        ...(excludedIds.length > 0 ? { excludedIds } : {}),
      });
      setConfirmForm(null);
      setExcludedByForm((prev) => ({ ...prev, [g.paymentForm]: [] }));
      onRefresh();
    } catch (err) {
      setConfirmForm(null);
      if (isBillingFlowDisabled(err)) onFlowDisabled();
      if (isBillingErrorCode(err, 'CFDI_GLOBAL_PREVIEW_STALE')) {
        toast.info('Las ventas del día cambiaron desde la vista previa: se volvió a generar.');
        onRefresh();
      }
    }
  };

  const confirmGroup = preview.groups.find((g) => g.paymentForm === confirmForm) ?? null;
  const confirmSelected = confirmGroup ? selectedOf(confirmGroup) : [];
  const confirmTotal = confirmSelected.reduce((s, r) => s + r.total, 0);

  if (preview.groups.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-gray-500">
          No hay ventas por globalizar este día (revisa los excluidos: ya facturadas, en $0, a crédito, cashback, promoción o dólares, o ya dentro de una global).
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Globales por forma de pago ({preview.groups.length})
        </h2>
        <p className="text-xs text-gray-500">
          Una factura global por cada forma de pago. Desmarca un ticket para dejarlo por facturar (podrá entrar a otra global del mismo día).
        </p>
      </div>

      {preview.groups.map((g) => {
        const selected = selectedOf(g);
        const selectedKeys = selected.map((r) => r.id);
        const selectedTotal = selected.reduce((s, r) => s + r.total, 0);
        const liveExisting = g.existing.filter((e) => !['error', 'cancelled'].includes(e.providerStatus));
        const canEmit = canManage && !flowDisabled && g.canStamp && !dayBlocked && selected.length > 0 && !create.isPending;
        const items = showItems[g.paymentForm] ?? false;
        return (
          <Card key={g.paymentForm} className="border-[#3E667D]/20">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {g.paymentForm} · {getPaymentFormName(g.paymentForm)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {g.included.length} documento(s) · base {formatCurrency(g.totals.subtotal)} · IVA {formatCurrency(g.totals.taxes)} ·{' '}
                    <span className="font-medium text-gray-900">total {formatCurrency(g.totals.total)}</span>
                    {selected.length !== g.included.length && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                        se emitirán {selected.length} por {formatCurrency(selectedTotal)}
                      </span>
                    )}
                  </p>
                  {g.totals.byRate.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {g.totals.byRate.map((r) => `${r.factor === 'Exento' ? 'Exento' : `${Math.round(r.rate * 100)}%`}: base ${formatCurrency(r.base)} · IVA ${formatCurrency(r.tax)}`).join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowItems((s) => ({ ...s, [g.paymentForm]: !items }))}>
                    {items ? 'Ocultar conceptos' : `Conceptos (${g.items.length})`}
                  </Button>
                  <Button size="sm" disabled={!canEmit} onClick={() => setConfirmForm(g.paymentForm)}>
                    {create.isPending && confirmForm === g.paymentForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <GlobeAltIcon className="mr-1 h-4 w-4" aria-hidden />}
                    Emitir global {g.paymentForm}
                  </Button>
                </div>
              </div>

              {liveExisting.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900" role="status">
                  <span>Este día ya tiene global de esta forma de pago:</span>
                  {liveExisting.map((e) => (
                    <span key={e.invoiceId} className="inline-flex items-center gap-1">
                      <Link href={`/admin/facturacion/${e.invoiceId}`} className="font-mono underline-offset-2 hover:underline">{e.folioDisplay}</Link>
                      <InvoiceStatusBadge status={e.providerStatus} />
                      {typeof e.ticketCount === 'number' ? <span className="text-xs">({e.ticketCount} tickets · {formatCurrency(e.total ?? 0)})</span> : null}
                      {canManage && !e.satUuid && (e.providerStatus === 'error' || e.providerStatus === 'pending') && (
                        <Button size="sm" variant="ghost" className="h-7 text-red-600" onClick={() => onDiscard(e.invoiceId)}>Descartar intento</Button>
                      )}
                    </span>
                  ))}
                  <span className="text-xs text-blue-800/80">Los tickets de esas globales ya no aparecen abajo; lo que se lista sigue sin declarar.</span>
                </div>
              )}

              {g.blockers.length > 0 && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800" role="alert">
                  <div className="mb-1 flex items-center gap-2 font-semibold"><ExclamationTriangleIcon className="h-5 w-5" aria-hidden /> Esta global no pasaría la validación fiscal</div>
                  <ul className="list-disc space-y-1 pl-5">
                    {g.blockers.map((b, i) => (
                      <li key={i}><span className="font-medium">{globalBlockerLabel(b.code)}</span>{b.folio ? ` · ${b.folio}` : ''} — {b.message}</li>
                    ))}
                  </ul>
                </div>
              )}

              <DataTable
                columns={columns}
                data={g.included}
                getRowKey={(r) => r.id}
                enableRowSelection={canManage}
                rowSelectionMode="multiple"
                selectedRowKeys={selectedKeys}
                onSelectedRowKeysChange={(keys) => {
                  const keep = new Set(keys);
                  setExcludedByForm((prev) => ({
                    ...prev,
                    [g.paymentForm]: g.included.filter((r) => !keep.has(r.id)).map((r) => r.id),
                  }));
                }}
                emptyMessage="Ningún documento en esta forma de pago."
                minWidthClassName="min-w-[720px]"
              />

              {items && (
                <div className="max-h-80 overflow-auto rounded-lg border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="sticky top-0 bg-white text-left text-xs text-gray-500">
                      <tr><th className="px-2 py-1">#</th><th className="px-2 py-1">Clave / unidad</th><th className="px-2 py-1">No. identificación</th><th className="px-2 py-1">Descripción</th><th className="px-2 py-1 text-right">Cant.</th><th className="px-2 py-1 text-right">Importe</th><th className="px-2 py-1 text-right">IVA</th><th className="px-2 py-1 text-right">Total</th></tr>
                    </thead>
                    <tbody>
                      {g.items.map((it) => (
                        <tr key={it.lineNumber} className="border-t">
                          <td className="px-2 py-1">{it.lineNumber}</td>
                          <td className="px-2 py-1 font-mono text-xs">{it.satProductCode} / {it.satUnitCode}</td>
                          <td className="px-2 py-1 font-mono text-xs">{it.identificationNumber ?? '—'}</td>
                          <td className="px-2 py-1">{it.description}</td>
                          <td className="px-2 py-1 text-right">{it.quantity}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(it.amount)}</td>
                          <td className="px-2 py-1 text-right">{formatCurrency(it.taxes.reduce((s, t) => s + t.amount, 0))}</td>
                          <td className="px-2 py-1 text-right font-medium">{formatCurrency(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="px-2 py-1 text-xs text-gray-400">Conceptos calculados con todos los tickets del grupo; al desmarcar tickets el CFDI se arma solo con los seleccionados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {confirmGroup && (
        <ConfirmDialog
          open={!!confirmGroup}
          onOpenChange={(open) => {
            if (!open) setConfirmForm(null);
          }}
          title={`Emitir factura global · ${confirmGroup.paymentForm} ${getPaymentFormName(confirmGroup.paymentForm)}`}
          description="Es un CFDI ante el SAT: una vez timbrado solo se puede cancelar, no borrar."
          confirmLabel="Timbrar global"
          confirmText="EMITIR"
          cancelLabel="Volver"
          isPending={create.isPending}
          onConfirm={() => emit(confirmGroup)}
        >
          <p>
            Se timbrará <strong>1 CFDI</strong> con <strong>{confirmSelected.length}</strong> documento(s) por{' '}
            <strong>{formatCurrency(confirmTotal)}</strong> a <strong>PÚBLICO EN GENERAL</strong>, forma de pago{' '}
            <strong>{confirmGroup.paymentForm} · {getPaymentFormName(confirmGroup.paymentForm)}</strong>, para{' '}
            <strong>{preview.branch.name}</strong> del <strong>{formatIsoDate(preview.localDate)}</strong> ({conceptMode === 'ticket' ? 'un concepto por ticket' : 'agrupada por producto'}).
          </p>
          {confirmSelected.length !== confirmGroup.included.length && (
            <p className="mt-2 text-xs text-amber-800">
              {confirmGroup.included.length - confirmSelected.length} ticket(s) desmarcado(s) quedan por facturar: podrás emitirles otra global de esta forma de pago o facturarlos nominativamente.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">Si la selección del día cambió desde la vista previa, el API la rechazará y se recargará la vista previa.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
