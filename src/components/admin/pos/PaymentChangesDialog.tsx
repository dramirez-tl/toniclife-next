'use client';

// PaymentChangesDialog — Historial de correcciones del método de pago
// (GET /pos/payment-method-changes): venta, de qué método a cuál, quién, cuándo,
// el motivo y cómo quedó su factura. "Solo con factura por corregir" deja a la
// vista lo que Contabilidad todavía tiene que reexpedir o sustituir.

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePaymentChanges } from '@/hooks/usePos';
import { apiErrorMessage } from '@/lib/api-error';
import { FISCAL_STATE_CLASS } from '@/lib/pos/payment-changes';

const PAGE_SIZE = 25;

const when = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function PaymentChangesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">{open && <Body />}</DialogContent>
    </Dialog>
  );
}

function Body() {
  const [pending, setPending] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, isFetching } = usePaymentChanges({ pending, page, limit: PAGE_SIZE });
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cambios de método de pago</DialogTitle>
        <DialogDescription>
          Cada corrección con su motivo. Las que dejaron una factura por corregir las atiende Contabilidad en Facturación.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center justify-between gap-3 py-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="payment-changes-pending"
            checked={pending}
            onCheckedChange={(v) => {
              setPending(v === true);
              setPage(1);
            }}
          />
          <Label htmlFor="payment-changes-pending" className="font-normal">
            Solo con factura por corregir{data ? ` (${data.pending.toLocaleString('es-MX')})` : ''}
          </Label>
        </div>
        <p className="text-sm text-gray-500">{total.toLocaleString('es-MX')} cambios</p>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-gray-500">Cargando…</p>
      ) : isError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {apiErrorMessage(error, 'No se pudo cargar el historial.')}
        </p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-500">
          {pending ? 'No hay facturas por corregir por un cambio de método de pago.' : 'Todavía no hay correcciones.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-3 font-medium">Venta</th>
                <th className="py-2 pr-3 font-medium">Cambio</th>
                <th className="py-2 pr-3 font-medium">Quién y cuándo</th>
                <th className="py-2 pr-3 font-medium">Motivo</th>
                <th className="py-2 font-medium">Factura</th>
              </tr>
            </thead>
            <tbody className={isFetching ? 'opacity-60' : ''}>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-[#3E667D]">{c.saleNumber}</p>
                    {c.branchName && <p className="text-xs text-gray-500">{c.branchName}</p>}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-gray-900">
                    {c.previousLabel} → {c.newLabel}
                  </td>
                  <td className="py-2 pr-3 text-gray-700">
                    <p>{c.changedBy ?? '—'}</p>
                    <p className="text-xs text-gray-500">{when(c.createdAt)}</p>
                  </td>
                  <td className="max-w-[280px] py-2 pr-3 text-gray-700">{c.reason}</td>
                  <td className="py-2">
                    <Badge variant="outline" className={FISCAL_STATE_CLASS[c.fiscalState] ?? ''}>
                      {c.fiscalStateLabel}
                    </Badge>
                    {c.invoiceFolio && <p className="mt-1 text-xs text-gray-500">{c.invoiceFolio}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-2 text-sm">
          <Button type="button" variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Anterior
          </Button>
          <span className="text-gray-600">
            {page} de {pages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
          >
            Siguiente
          </Button>
        </div>
      )}
    </>
  );
}
