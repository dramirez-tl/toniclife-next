'use client';

// KitClearOwnStockDialog — "Vaciar existencia propia" de un kit que se arma al
// vender (contrato de kits §4.2 / §5.2): vista previa (GET
// /inventory/kits/:id/clear-own-stock/preview), motivo obligatorio y POST
// /inventory/kits/:id/clear-own-stock. Con piezas reservadas por ventas sin
// cobrar el API responde 409 KIT_OWN_STOCK_RESERVED y no toca nada.

import { useId, useState } from 'react';
import { Loader2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClearKitOwnStock, useKitOwnStockPreview } from '@/hooks/useKitAdmin';
import { fmt } from '@/lib/kits/kit-availability';
import { ownStockClearedSentence, ownStockPreviewSentence, type KitOwnStockClearResult } from '@/lib/kits/kit-editor';
import { productAdminErrorMessage } from './lib/errors';

interface KitClearOwnStockDialogProps {
  productId: string;
  productCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tras dejar en cero (p. ej. reintentar el cambio de modo). */
  onCleared?: (result: KitOwnStockClearResult | null) => void;
}

const MIN_REASON = 5;
const MAX_BRANCHES_SHOWN = 8;

export function KitClearOwnStockDialog({ productId, productCode, open, onOpenChange, onCleared }: KitClearOwnStockDialogProps) {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const preview = useKitOwnStockPreview(productId, open);
  const clear = useClearKitOwnStock(productId);

  // Cada apertura/cierre deja el motivo en blanco (sin efecto: se limpia al cambiar).
  const handleOpenChange = (next: boolean) => {
    setReason('');
    onOpenChange(next);
  };

  const data = preview.data ?? null;
  const reasonOk = reason.trim().length >= MIN_REASON;
  const nothingToClear = !!data && data.rows === 0 && data.units === 0;
  const blocked = !!data && data.blocked;

  const confirm = async () => {
    try {
      const result = await clear.mutateAsync(reason.trim());
      toast.success(result ? `${productCode}: ${ownStockClearedSentence(result)}` : `${productCode}: existencia propia en cero.`);
      handleOpenChange(false);
      onCleared?.(result);
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo dejar en cero la existencia propia'));
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Vaciar existencia propia"
      description={`${productCode} se arma al vender: su existencia propia no la usa ninguna venta. Se registra UN movimiento de salida por sucursal (queda en el kardex y en la auditoría).`}
      confirmLabel="Dejar en cero"
      destructive
      isPending={clear.isPending}
      disabled={preview.isLoading || preview.isError || !data || nothingToClear || blocked || !reasonOk}
      onConfirm={confirm}
    >
      <div className="space-y-3">
        {preview.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Revisando existencias…
          </p>
        ) : preview.isError || !data ? (
          <p className="text-sm text-red-700" role="alert">
            {productAdminErrorMessage(preview.error, 'No se pudo consultar la existencia propia del kit.')}
          </p>
        ) : nothingToClear ? (
          <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">Este kit ya no tiene existencia propia. No hay nada que dejar en cero.</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-900">{ownStockPreviewSentence(data)}</p>
            {blocked ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <p>
                  Hay {fmt(data.reserved)} piezas reservadas por ventas sin cobrar; inténtalo cuando se liberen. Mientras, no se
                  toca nada.
                </p>
              </div>
            ) : null}
            <ul className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200 text-sm">
              {data.branches.slice(0, MAX_BRANCHES_SHOWN).map((b) => (
                <li key={b.branchId || b.code} className="flex items-center justify-between gap-3 px-3 py-1.5">
                  <span className="min-w-0 truncate">
                    <span className="font-mono text-xs text-gray-600">{b.code}</span> {b.name}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {fmt(b.units)} {b.units === 1 ? 'pieza' : 'piezas'}
                    {b.reserved > 0 ? <span className="ml-1 text-amber-700">({fmt(b.reserved)} reservadas)</span> : null}
                  </span>
                </li>
              ))}
              {data.branches.length > MAX_BRANCHES_SHOWN ? (
                <li className="px-3 py-1.5 text-xs text-gray-600">y {data.branches.length - MAX_BRANCHES_SHOWN} sucursales más…</li>
              ) : null}
            </ul>
            <div className="space-y-1.5">
              <Label htmlFor={reasonId}>Motivo de la baja</Label>
              <Input
                id={reasonId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="Ej.: existencia sembrada por error, el kit se arma al vender"
                disabled={clear.isPending || blocked}
                aria-describedby={`${reasonId}-help`}
                autoComplete="off"
              />
              <p id={`${reasonId}-help`} className="text-xs text-gray-600">
                Mínimo {MIN_REASON} caracteres. Queda en el kardex de cada sucursal y en la auditoría.
              </p>
            </div>
          </>
        )}
      </div>
    </ConfirmDialog>
  );
}
