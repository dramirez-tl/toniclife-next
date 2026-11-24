'use client';

// Captura por lote de la factura a Botnatura (Sistemas, 23-nov-2026): se pegan renglones
// "clave,cantidad" (por ejemplo 1020,100 y 5618,150), se revisan contra el catálogo y los que sí
// se encontraron se agregan de una vez a la factura. Lo que no se pudo casar se queda aquí con su
// motivo para corregirlo: nunca se agrega "lo más parecido". No timbra nada: solo llena la captura.

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useLookupBotnaturaProducts } from '@/hooks/useBotnatura';
import { BOTNATURA_LINE_LABEL, LINE_BADGE, lineOf } from '@/lib/billing/botnatura';
import {
  BATCH_MAX_ROWS,
  batchSummary,
  parseBatch,
  pendingBatchText,
  resolveBatch,
  type BatchParse,
  type BatchRow,
} from '@/lib/billing/botnatura-batch';
import type { BotnaturaLine, BotnaturaProduct } from '@/types/botnatura';

interface BotnaturaBatchDialogProps {
  /** Línea en la que está buscando quien captura ('' = las dos). */
  defaultLine: BotnaturaLine | '';
  onAdd: (rows: BatchRow[]) => void;
  onClose: () => void;
}

const LINE_OPTIONS = [
  ['', 'Las dos líneas'],
  ['regular', BOTNATURA_LINE_LABEL.regular],
  ['line2', BOTNATURA_LINE_LABEL.line2],
] as const;

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

export function BotnaturaBatchDialog({ defaultLine, onAdd, onClose }: BotnaturaBatchDialogProps) {
  const [text, setText] = useState('');
  const [line, setLine] = useState<BotnaturaLine | ''>(defaultLine);
  // Lo último que se revisó: el texto leído y los productos que devolvió el catálogo para esas claves.
  const [reviewed, setReviewed] = useState<{ parse: BatchParse; products: BotnaturaProduct[] } | null>(null);
  const lookup = useLookupBotnaturaProducts();

  // Cambiar de línea vuelve a casar lo ya consultado, sin otro viaje al servidor.
  const rows = reviewed ? resolveBatch(reviewed.parse.entries, reviewed.products, line) : [];
  const summary = batchSummary(rows);
  const errors = reviewed?.parse.errors ?? [];

  const review = () => {
    const parse = parseBatch(text);
    if (parse.entries.length === 0) {
      setReviewed({ parse, products: [] });
      if (parse.errors.length === 0) toast.error('Pega al menos un renglón: clave,cantidad');
      return;
    }
    lookup.mutate(
      parse.entries.map((e) => e.code),
      {
        onSuccess: (result) => setReviewed({ parse, products: result.data }),
        onError: () => toast.error('No se pudo revisar el lote. Intenta de nuevo.'),
      },
    );
  };

  const add = () => {
    const good = rows.filter((r) => r.status === 'ok');
    if (good.length === 0) return;
    onAdd(good);
    const pending = pendingBatchText(rows, errors);
    const pieces = summary.pieces.toLocaleString('es-MX');
    if (pending) {
      toast.success(`Se agregaron ${good.length} productos (${pieces} piezas). Quedan renglones por corregir.`);
      setText(pending);
      setReviewed(null);
    } else {
      toast.success(`Se agregaron ${good.length} ${good.length === 1 ? 'producto' : 'productos'} (${pieces} piezas)`);
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 sm:max-w-3xl" data-testid="botnatura-batch">
        <DialogHeader>
          <DialogTitle>Agregar productos por lote</DialogTitle>
          <DialogDescription>
            Un producto por renglón: la clave, una coma y la cantidad. También puedes pegar dos columnas de Excel. Máximo{' '}
            {BATCH_MAX_ROWS} renglones.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <label htmlFor="botnatura-batch-text" className="mb-1 block text-xs font-medium text-gray-600">
              Clave,cantidad
            </label>
            <Textarea
              id="botnatura-batch-text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setReviewed(null);
              }}
              rows={8}
              spellCheck={false}
              placeholder={'1020,100\n5618,150'}
              className="bg-gray-50 font-mono text-sm"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-600">Línea de producto</p>
            <div className="flex flex-col gap-1" role="radiogroup" aria-label="Línea de producto del lote">
              {LINE_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={line === value}
                  onClick={() => setLine(value)}
                  className={`rounded-md border px-3 py-1.5 text-left text-sm font-medium transition-colors ${
                    line === value ? 'border-[#3E667D] bg-[#3E667D] text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Hay claves que existen en las dos líneas con otro producto y otro precio: elige la línea del pedido.
            </p>
          </div>
        </div>

        {reviewed && (
          <div className="min-h-0 flex-1 space-y-2 overflow-auto">
            <p className="text-sm text-gray-700" role="status">
              <span className="font-semibold text-emerald-700">
                {summary.ok} {summary.ok === 1 ? 'renglón listo' : 'renglones listos'}
              </span>
              {summary.ok > 0 ? ` (${summary.pieces.toLocaleString('es-MX')} piezas)` : ''}
              {summary.problems + errors.length > 0 && (
                <span className="font-semibold text-amber-700">
                  {' '}
                  · {summary.problems + errors.length} por corregir
                </span>
              )}
              {reviewed.parse.merged > 0 ? ` · ${reviewed.parse.merged} con clave repetida (se sumaron)` : ''}
              {reviewed.parse.skippedHeader ? ' · se ignoró el encabezado' : ''}
            </p>
            {(rows.length > 0 || errors.length > 0) && (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Clave</th>
                      <th className="px-3 py-2 text-right">Cantidad</th>
                      <th className="px-3 py-2">Producto</th>
                      <th className="px-3 py-2 text-right">Precio venta · Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((row) => (
                      <tr key={`${row.row}-${row.code}`} className={row.status === 'ok' ? '' : 'bg-amber-50/60'}>
                        <td className="px-3 py-2 font-mono text-xs text-gray-700">{row.code}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.quantity.toLocaleString('es-MX')}</td>
                        <td className="px-3 py-2">
                          {row.product ? (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <CheckCircleIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                              <span className="text-gray-900">{row.product.name}</span>
                              <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${LINE_BADGE[lineOf(row.product)]}`}>
                                {BOTNATURA_LINE_LABEL[lineOf(row.product)]}
                              </span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-medium text-amber-800">
                              <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
                              {row.note}
                            </span>
                          )}
                          {row.product && row.note && <span className="mt-0.5 block text-xs text-amber-700">{row.note}</span>}
                        </td>
                        <td className="px-3 py-2 text-right text-xs tabular-nums text-gray-500">
                          {row.product
                            ? `${row.product.salePrice !== null ? money(row.product.salePrice) : '—'} · ${
                                row.product.listPrice !== null ? money(row.product.listPrice) : '—'
                              }`
                            : ''}
                        </td>
                      </tr>
                    ))}
                    {errors.map((error) => (
                      <tr key={`e-${error.row}`} className="bg-amber-50/60">
                        <td className="px-3 py-2 font-mono text-xs text-gray-700" colSpan={2}>
                          {error.text}
                        </td>
                        <td className="px-3 py-2 font-medium text-amber-800" colSpan={2}>
                          <span className="flex items-center gap-1.5">
                            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
                            Renglón {error.row}: {error.problem}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {reviewed && summary.ok > 0 ? (
            <Button type="button" onClick={add}>
              Agregar {summary.ok} {summary.ok === 1 ? 'producto' : 'productos'} a la factura
            </Button>
          ) : (
            <Button type="button" onClick={review} disabled={lookup.isPending || !text.trim()}>
              {lookup.isPending ? 'Revisando…' : 'Revisar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
