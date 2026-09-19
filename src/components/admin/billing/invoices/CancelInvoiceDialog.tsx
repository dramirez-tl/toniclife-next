'use client';

// Cancelación de un CFDI (`POST /billing/invoices/:id/cancel`, contrato §5.5).
// Motivos 01-04 con descripción; el UUID de la sustituta solo con 01 (buscador
// de facturas timbradas en v2 o captura manual); 04 solo para globales; el
// usuario teclea CANCELAR. El SAT puede dejarla "en proceso": el hook lo avisa.

import { useEffect, useId, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useCancelInvoice, useInvoices } from '@/hooks/useBilling';
import {
  formatCurrency,
  InvoiceStatus,
  type CancellationReason,
  type InvoiceDetail,
  type InvoiceSummary,
} from '@/types/billing';
import { CANCELLATION_REASON_INFO } from './labels';

const SAT_UUID_REGEX = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

export function CancelInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Con el detalle (`cancellation`) la re-consulta reutiliza el motivo y el UUID ya solicitados. */
  invoice: InvoiceSummary & { cancellation?: InvoiceDetail['cancellation'] };
  onDone?: () => void;
}) {
  const isGlobal = invoice.invoiceType === 'global';
  const isRefresh = invoice.providerStatus === InvoiceStatus.CANCEL_PENDING;
  const previous = invoice.cancellation ?? null;
  const [reason, setReason] = useState<CancellationReason>(
    (isRefresh && previous?.reason) || (isGlobal ? '04' : '02'),
  );
  const [replacementUuid, setReplacementUuid] = useState(
    (isRefresh && previous?.replacementUuid) || '',
  );
  // Re-consulta de una solicitud ya enviada: el motivo no se vuelve a elegir.
  const lockReason = isRefresh && !!previous?.reason;
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const cancel = useCancelInvoice();
  const uuidId = useId();
  const searchId = useId();

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 400);
    return () => window.clearTimeout(t);
  }, [search]);

  const candidates = useInvoices(
    { search: debounced, status: InvoiceStatus.STAMPED, limit: 10 },
    open && reason === '01' && debounced.length >= 3,
  );

  const candidateOptions = useMemo(
    () =>
      (candidates.data?.data ?? [])
        .filter((c) => c.id !== invoice.id && c.satUuid)
        .map((c) => ({
          value: c.satUuid as string,
          label: `${c.folioDisplay} · ${formatCurrency(c.total)}`,
          hint: `${c.receiverRfc ?? ''} · ${c.satUuid}`,
        })),
    [candidates.data, invoice.id],
  );

  const reasonOptions = (Object.keys(CANCELLATION_REASON_INFO) as CancellationReason[])
    .filter((r) => (isGlobal ? true : r !== '04'))
    .map((r) => ({ value: r, label: CANCELLATION_REASON_INFO[r].label }));

  const uuidOk = reason !== '01' || SAT_UUID_REGEX.test(replacementUuid.trim());

  const handleConfirm = async () => {
    try {
      await cancel.mutateAsync({
        id: invoice.id,
        data: {
          reason,
          replacementUuid: reason === '01' ? replacementUuid.trim().toUpperCase() : undefined,
        },
      });
      onOpenChange(false);
      onDone?.();
    } catch {
      // El hook ya avisó.
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isRefresh ? `Actualizar cancelación de ${invoice.folioDisplay}` : `Cancelar factura ${invoice.folioDisplay}`}
      description={
        isRefresh
          ? 'La solicitud ya está ante el SAT. Volver a enviarla consulta si el receptor la aceptó.'
          : 'La cancelación se solicita al SAT y no se puede deshacer. Si el receptor debe aceptarla, la factura sigue vigente hasta entonces.'
      }
      confirmLabel={isRefresh ? 'Consultar al SAT' : 'Cancelar factura'}
      confirmText={isRefresh ? undefined : 'CANCELAR'}
      destructive={!isRefresh}
      isPending={cancel.isPending}
      disabled={!uuidOk}
      onConfirm={handleConfirm}
    >
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
          <p>
            <span className="text-gray-500">Receptor:</span> {invoice.receiverName ?? '—'} ({invoice.receiverRfc ?? '—'})
          </p>
          <p>
            <span className="text-gray-500">Total:</span> {formatCurrency(invoice.total)}
          </p>
          {invoice.satUuid && (
            <p className="font-mono break-all">
              <span className="font-sans text-gray-500">UUID:</span> {invoice.satUuid}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uuidId}-reason`}>Motivo de cancelación (SAT)</Label>
          <SearchableSelect
            id={`${uuidId}-reason`}
            options={reasonOptions}
            value={reason}
            onChange={(v) => setReason(v as CancellationReason)}
            showAllOption={false}
            disabled={cancel.isPending || lockReason}
          />
          <p className="text-xs text-muted-foreground">{CANCELLATION_REASON_INFO[reason].help}</p>
        </div>

        {reason === '01' && !lockReason && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
            <div className="space-y-1.5">
              <Label htmlFor={searchId}>Buscar la sustituta entre las facturas de v2</Label>
              <Input
                id={searchId}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Folio, UUID, RFC o razón social (mínimo 3 caracteres)"
                autoComplete="off"
              />
              {debounced.length >= 3 && (
                <SearchableSelect
                  aria-label="Factura sustituta"
                  options={candidateOptions}
                  value={candidateOptions.some((o) => o.value === replacementUuid) ? replacementUuid : ''}
                  onChange={setReplacementUuid}
                  showAllOption={false}
                  placeholder={
                    candidates.isFetching
                      ? 'Buscando…'
                      : candidateOptions.length === 0
                        ? 'Sin coincidencias timbradas'
                        : 'Elige la factura sustituta'
                  }
                  disabled={candidateOptions.length === 0}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={uuidId}>UUID de la factura sustituta</Label>
              <Input
                id={uuidId}
                value={replacementUuid}
                onChange={(e) => setReplacementUuid(e.target.value.toUpperCase())}
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                className="font-mono"
                aria-invalid={replacementUuid.length > 0 && !uuidOk}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Obligatorio con el motivo 01. Puede ser una factura de v2 o una emitida en el sistema
                anterior (el API la verifica ante el PAC).
              </p>
            </div>
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}
