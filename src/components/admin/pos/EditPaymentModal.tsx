'use client';

// EditPaymentModal — cambiar el método de pago de una venta POS
// (PATCH /pos/sales/:id/payment-method). Lo usan Reportes › Ventas y la vista
// previa de la factura global (tickets "Por definir", Contabilidad 3-nov-2026).
// El API rechaza ventas con nominativa PUE viva o dentro de una global viva y,
// en pago mixto, solo redefine el componente "Por definir".

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export const PAYMENT_METHOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit', label: 'Crédito' },
  { value: 'mixed', label: 'Mixto' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'promotion', label: 'Promoción' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'usd_cash', label: 'Pago en Dólares' },
  { value: 'undefined', label: 'Por definir' },
];

export interface EditPaymentSale {
  id: string;
  saleNumber: string;
  paymentMethod: string;
}

interface EditPaymentModalProps {
  sale: EditPaymentSale | null;
  onClose: () => void;
  onConfirm: (paymentMethod: string) => void;
  isPending: boolean;
  /** Texto de ayuda bajo el folio (p. ej. qué pasa con la global al definir el cobro). */
  hint?: string;
}

export function EditPaymentModal({ sale, onClose, onConfirm, isPending, hint }: EditPaymentModalProps) {
  const [selected, setSelected] = useState(sale?.paymentMethod ?? 'cash');

  if (!sale) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle>Editar método de pago</DialogTitle>
        <DialogDescription>
          Venta <span className="font-semibold text-[#3E667D]">{sale.saleNumber}</span>
          {hint ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}
        </DialogDescription>

        <div className="grid grid-cols-3 gap-2 mb-6" role="group" aria-label="Método de pago">
          {PAYMENT_METHOD_OPTIONS.map((opt) => (
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

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            onClick={() => onConfirm(selected)}
            disabled={isPending || selected === sale.paymentMethod}
          >
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
