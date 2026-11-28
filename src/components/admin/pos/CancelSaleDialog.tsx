'use client';

// CancelSaleDialog — cancelar una venta de caja desde el admin
// (PATCH /pos/sales/:id/cancel, permiso pos:manage).
//
// Sistemas (Diego, 27-nov-2026): "estaría bueno poder cancelar desde aquí", en
// el detalle de Reportes › Ventas. Hace falta sobre todo para el punto de venta
// móvil de eventos, que no tiene caja de escritorio desde donde cancelar.
// Es el mismo servicio que usa "Cancelar venta" en Punto de Venta: aquí solo se
// dice antes qué se va a revertir y se pide el motivo.

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCancelSale } from '@/hooks/usePos';
import { apiErrorMessage } from '@/lib/api-error';
import {
  CANCEL_REASON_MAX,
  CFDI_CANCEL_MOTIVES,
  cancelReasonMissing,
  cancelSaleNotice,
  cleanCancelReason,
  type CancelSaleOutcome,
  type CfdiCancelMotive,
} from '@/lib/pos/cancel-sale';

export interface CancelSaleTarget {
  id: string;
  saleNumber: string;
  customerId?: string;
  /** Folio fiscal de la factura de la venta, si ya se timbró. */
  invoiceUuid?: string;
}

interface CancelSaleDialogProps {
  sale: CancelSaleTarget | null;
  onClose: () => void;
}

export function CancelSaleDialog({ sale, onClose }: CancelSaleDialogProps) {
  const [reason, setReason] = useState('');
  const [motive, setMotive] = useState<CfdiCancelMotive>('03');
  const cancelSale = useCancelSale();
  const queryClient = useQueryClient();

  if (!sale) return null;

  const hasInvoice = !!sale.invoiceUuid;
  const missing = cancelReasonMissing(reason);
  const isPending = cancelSale.isPending;

  const confirm = () => {
    if (missing > 0 || isPending) return;
    cancelSale.mutate(
      {
        id: sale.id,
        data: { cancellationReason: cleanCancelReason(reason), ...(hasInvoice ? { cfdiMotive: motive } : {}) },
      },
      {
        onSuccess: (result) => {
          const notice = cancelSaleNotice(sale.saleNumber, hasInvoice, result as CancelSaleOutcome);
          if (notice.tone === 'success') toast.success(notice.text);
          else toast.warning(notice.text, { duration: 12000 });
          // Los puntos y los derechos de promoción del cliente cambian con la cancelación.
          if (sale.customerId) {
            void queryClient.invalidateQueries({ queryKey: ['customer-period-stats', sale.customerId] });
            void queryClient.invalidateQueries({ queryKey: ['promotions', 'available', sale.customerId] });
          }
          onClose();
        },
        onError: (err) => {
          toast.error(apiErrorMessage(err, 'No se pudo cancelar la venta.'), { duration: 8000 });
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !isPending) onClose(); }}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogTitle>Cancelar venta</DialogTitle>
        <DialogDescription>
          Venta <span className="font-semibold text-[#3E667D]">{sale.saleNumber}</span>
        </DialogDescription>

        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <p className="mb-1 flex items-center gap-1.5 font-medium">
            <ExclamationTriangleIcon className="h-4 w-4" />
            No se puede deshacer. Al cancelar:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>El producto regresa a las existencias de la sucursal.</li>
            <li>Se descuentan los puntos de la venta y se revierten su cupón y sus promociones.</li>
            <li>Lo cobrado en efectivo sale del corte de la caja como devolución.</li>
            <li>Si era el kit con el que se inscribió, el distribuidor puede volver a quedar pendiente.</li>
            <li>Si la venta ya entró a una factura global, esa global queda por reexpedir para Contabilidad.</li>
          </ul>
        </div>

        {hasInvoice && (
          <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-sm font-medium text-amber-900">Esta venta tiene factura timbrada</p>
            <p className="text-xs text-amber-800">
              Se pedirá su cancelación ante el SAT; si aplica, quien la recibió debe aceptarla.
            </p>
            <Label htmlFor="cancel-sale-motive" className="text-xs text-amber-900">
              Motivo SAT de cancelación
            </Label>
            <Select value={motive} onValueChange={(v) => setMotive(v as CfdiCancelMotive)}>
              <SelectTrigger id="cancel-sale-motive" className="w-full border-amber-300 bg-white text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CFDI_CANCEL_MOTIVES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="cancel-sale-reason">Motivo de la cancelación</Label>
          <Textarea
            id="cancel-sale-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, CANCEL_REASON_MAX))}
            placeholder="Por ejemplo: venta de prueba, o el cliente ya no quiso el producto"
            rows={2}
          />
          <p className="text-xs text-gray-500">
            {missing > 0 ? `Obligatorio. Faltan ${missing} caracteres.` : 'Queda guardado en la venta, con tu nombre y la hora.'}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={isPending}>
            Volver
          </Button>
          <Button variant="destructive" className="flex-1" onClick={confirm} disabled={missing > 0 || isPending}>
            {isPending ? 'Cancelando...' : 'Cancelar la venta'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
