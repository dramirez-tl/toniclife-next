'use client';

// EditPaymentModal — corregir el método de pago de una venta POS
// (PATCH /pos/sales/:id/payment-method). Lo usan Reportes › Ventas y la vista
// previa de la factura global (tickets "Por definir", Contabilidad 3-nov-2026).
//
// Sistemas (Diego, 27-nov-2026): el cambio pide MOTIVO y, antes de guardar, el
// sistema dice qué va a pasar (GET …/payment-method/preview): qué corte se
// mueve y, si la venta ya está facturada, qué factura queda por reexpedir o por
// sustituir. Lo que no se permite sale con su razón y no deja guardar. Debajo
// van las correcciones anteriores de la venta.

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSalePaymentPreview } from '@/hooks/usePos';
import { apiErrorMessage } from '@/lib/api-error';
import {
  PAYMENT_EDIT_OPTIONS,
  PAYMENT_REASON_MAX,
  PAYMENT_REASON_MIN,
  canSavePaymentChange,
  cleanReason,
  reasonMissing,
} from '@/lib/pos/payment-changes';

import { PAYMENT_METHOD_OPTIONS } from './payment-method-options';

// Se sigue exportando desde aquí para quien ya lo importaba del modal.
export { PAYMENT_METHOD_OPTIONS };

export interface EditPaymentSale {
  id: string;
  saleNumber: string;
  paymentMethod: string;
}

interface EditPaymentModalProps {
  sale: EditPaymentSale | null;
  onClose: () => void;
  onConfirm: (paymentMethod: string, reason: string) => void;
  isPending: boolean;
  /** Texto de ayuda bajo el folio (p. ej. qué pasa con la global al definir el cobro). */
  hint?: string;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function EditPaymentModal({ sale, onClose, onConfirm, isPending, hint }: EditPaymentModalProps) {
  const [selected, setSelected] = useState(sale?.paymentMethod ?? 'cash');
  const [reason, setReason] = useState('');
  const changed = !!sale && selected !== sale.paymentMethod;
  const preview = useSalePaymentPreview(sale?.id ?? '', selected, changed);

  if (!sale) return null;

  const data = changed ? preview.data : undefined;
  const fiscal = data?.allowed && data.fiscalAction !== 'none';
  const missing = reasonMissing(reason, data?.reasonMinLength ?? PAYMENT_REASON_MIN);
  const canSave = changed && !isPending && canSavePaymentChange(data, reason);
  const history = preview.data?.history ?? [];

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !isPending) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogTitle>Corregir método de pago</DialogTitle>
        <DialogDescription>
          Venta <span className="font-semibold text-[#3E667D]">{sale.saleNumber}</span>
          {hint ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}
        </DialogDescription>

        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Método de pago">
          {PAYMENT_EDIT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected === opt.value}
              onClick={() => setSelected(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                selected === opt.value
                  ? 'border-[#3E667D] bg-[#3E667D]/5 text-[#3E667D]'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${selected === opt.value ? 'bg-[#3E667D]' : 'bg-gray-300'}`} />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Lo que va a pasar al guardar */}
        {changed && (
          <div className="space-y-2">
            {preview.isFetching && !data ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Revisando el cambio…
              </p>
            ) : preview.isError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {apiErrorMessage(preview.error, 'No se pudo revisar el cambio.')}
              </p>
            ) : data && !data.allowed ? (
              <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                {data.blockMessage}
              </p>
            ) : data ? (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  fiscal ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-gray-200 bg-gray-50 text-gray-700'
                }`}
              >
                <p className="mb-1 flex items-center gap-1.5 font-medium">
                  {fiscal ? <ExclamationTriangleIcon className="h-4 w-4" /> : <InformationCircleIcon className="h-4 w-4" />}
                  {fiscal ? 'Esta venta ya está facturada. Al guardar:' : 'Al guardar:'}
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {data.effects.map((effect, i) => (
                    <li key={i}>{effect}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {/* Motivo */}
        <div className="space-y-1.5">
          <Label htmlFor="payment-change-reason">Motivo del cambio</Label>
          <Textarea
            id="payment-change-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, PAYMENT_REASON_MAX))}
            placeholder="Por ejemplo: la clienta pagó con tarjeta y se capturó en efectivo"
            rows={2}
          />
          <p className="text-xs text-gray-500">
            {missing > 0
              ? `Obligatorio. Faltan ${missing} caracteres.`
              : 'Queda en el historial de la venta y se avisa a Sistemas y Contabilidad.'}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={() => onConfirm(selected, cleanReason(reason))} disabled={!canSave}>
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>

        {history.length > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Correcciones anteriores de esta venta
            </p>
            <ul className="space-y-2 text-xs text-gray-600">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="font-medium text-gray-900">
                    {h.previousLabel} → {h.newLabel}
                  </span>{' '}
                  · {when(h.createdAt)}
                  {h.changedBy ? ` · ${h.changedBy}` : ''}
                  <span className="block text-gray-500">Motivo: {h.reason}</span>
                  {h.fiscalState !== 'not_needed' && (
                    <span className="block text-gray-500">
                      Factura{h.invoiceFolio ? ` ${h.invoiceFolio}` : ''}: {h.fiscalStateLabel.toLowerCase()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
