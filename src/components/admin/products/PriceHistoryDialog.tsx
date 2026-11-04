'use client';

// PriceHistoryDialog — "Historial" de un país/zona en la sección Precios de la
// ficha: cada cambio de precio (alta, modificación, baja, activar/desactivar) con
// quién, cuándo y antes → después, y el botón "Restablecer" que vuelve al valor
// de ANTES de ese cambio (queda registrado como un cambio nuevo, auditado).
// Fuente: GET /products/:id/prices/history?countryId=… (auditoría de product_prices).
// Motivo: un precio de Frontera capturado por error sin forma de ver el anterior (3-nov-2026).

import { useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { Country } from '@/types/config';
import type { ProductPriceHistoryEntry } from '@/types/product';
import { PRICE_HISTORY_ACTION_LABEL, priceHistoryChanges, restoreSummary } from './lib/price-history';
import { priceCountryLabel } from './lib/labels';
import { useAdminProductPriceHistory } from './useProductsAdmin';

interface PriceHistoryDialogProps {
  productId: string;
  country: Country | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Con permiso de edición: muestra "Restablecer" en los cambios que lo admiten. */
  canRestore: boolean;
  /** Restablece el precio de ANTES de la entrada; resuelve true si se guardó. */
  onRestore: (entry: ProductPriceHistoryEntry) => Promise<boolean>;
}

export function PriceHistoryDialog({ productId, country, open, onOpenChange, canRestore, onRestore }: PriceHistoryDialogProps) {
  const currency = country?.currencyCode?.trim() || 'MXN';
  const query = useAdminProductPriceHistory(productId, country?.id, open && !!country);
  const [pending, setPending] = useState<ProductPriceHistoryEntry | null>(null);
  const [restoring, setRestoring] = useState(false);
  const entries = query.data ?? [];

  const confirmRestore = async () => {
    if (!pending) return;
    setRestoring(true);
    try {
      const ok = await onRestore(pending);
      if (ok) setPending(null);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Historial de precios{country ? ` · ${priceCountryLabel(country)}` : ''}</DialogTitle>
            <DialogDescription>
              Cada cambio con su valor anterior. &ldquo;Restablecer&rdquo; vuelve al valor que había antes de ese cambio y queda
              registrado como un cambio nuevo.
            </DialogDescription>
          </DialogHeader>

          {query.isLoading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-gray-600" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Consultando el historial…
            </p>
          ) : query.isError ? (
            <div className="flex flex-wrap items-center gap-3 py-4">
              <p className="text-sm text-gray-700" role="status">
                No se pudo consultar el historial de precios.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
                Reintentar
              </Button>
            </div>
          ) : entries.length === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center text-sm text-gray-600">
              Sin cambios de precio registrados para {country ? priceCountryLabel(country) : 'este país'}.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 hover:bg-transparent">
                    <TableHead className="bg-gray-100 px-3 py-2 text-xs font-medium uppercase text-gray-500">Cuándo</TableHead>
                    <TableHead className="bg-gray-100 px-3 py-2 text-xs font-medium uppercase text-gray-500">Tipo de precio</TableHead>
                    <TableHead className="bg-gray-100 px-3 py-2 text-xs font-medium uppercase text-gray-500">Cambio</TableHead>
                    <TableHead className="bg-gray-100 px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      <span className="sr-only">Acciones</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => (
                    <TableRow key={e.id} className="border-b border-gray-100">
                      <TableCell className="px-3 py-2 align-top">
                        <div className="whitespace-nowrap text-gray-900">
                          {new Date(e.at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {PRICE_HISTORY_ACTION_LABEL[e.action]}
                          {e.userName ? ` · ${e.userName}` : ''}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top text-gray-900">{e.priceTypeName ?? e.priceTypeCode ?? '—'}</TableCell>
                      <TableCell className="px-3 py-2 align-top">
                        <ul className="space-y-0.5">
                          {priceHistoryChanges(e, currency).map((line) => (
                            <li key={line} className="text-gray-800">
                              {line}
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right align-top">
                        {canRestore && e.restorable ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1"
                            onClick={() => setPending(e)}
                            aria-label={`Restablecer ${restoreSummary(e, currency)}`}
                          >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                            Restablecer
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {pending ? (
        <ConfirmDialog
          open={!!pending}
          onOpenChange={(o) => {
            if (!o && !restoring) setPending(null);
          }}
          title="Restablecer el precio anterior"
          description={`Se guardará ${restoreSummary(pending, currency)} en ${country ? priceCountryLabel(country) : 'este país'}. Aplica de inmediato en el POS y la tienda; las vigencias no cambian.`}
          confirmLabel="Sí, restablecer"
          isPending={restoring}
          onConfirm={() => void confirmRestore()}
        />
      ) : null}
    </>
  );
}
