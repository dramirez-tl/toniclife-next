'use client';

// Compositor de componentes (BoM) de un producto — compartido entre el editor
// de kits (/admin/kits/[id]) y la ficha de producto (paquetes). Guarda con
// reemplazo atómico PUT /products/:id/components/bulk (alcance GLOBAL; las
// promos editan por país en /admin/promociones/[id]).
//
// - La búsqueda solo consulta con 2+ caracteres y 300 ms de retraso (antes
//   disparaba GET /products?limit=0 → 400 al montar).
// - "Guardar composición" solo se habilita si hay cambios.
// - `controller` (opcional) permite a la ficha enterarse de los cambios sin
//   guardar y dispararlos desde "Guardar todo".

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Plus, Search, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKitComponents, useReplaceKitComponents } from '@/hooks/useKits';
import { useProducts } from '@/hooks/useProducts';
import { ProductType } from '@/types/product';
import type { Product } from '@/types/product';
import type { BulkComponentItem } from '@/types/kit';
import { productAdminErrorMessage } from './lib/errors';

type CompRow = BulkComponentItem & {
  productName: string;
  productCode: string;
};

export interface ComponentsSectionController {
  onDirtyChange: (dirty: boolean) => void;
  bind: (handle: { save: () => Promise<boolean>; discard: () => void }) => void;
}

interface ProductComponentsSectionProps {
  productId: string;
  /** TRUE cuando el producto descuenta inventario de componentes al venderse
   *  (kit/paquete dinámico) — activa el aviso de BoM vacío. */
  deductsInventory?: boolean;
  /** Sustantivo para los textos ("kit" | "paquete"). Default: "producto". */
  noun?: string;
  readOnly?: boolean;
  controller?: ComponentsSectionController;
  onSaved?: () => void;
}

const sameRows = (a: CompRow[], b: CompRow[]): boolean =>
  a.length === b.length &&
  a.every((row, i) => row.componentProductId === b[i].componentProductId && row.quantity === b[i].quantity);

export function ProductComponentsSection({
  productId,
  deductsInventory = false,
  noun = 'producto',
  readOnly = false,
  controller,
  onSaved,
}: ProductComponentsSectionProps) {
  const searchId = useId();
  const { data: components, isLoading: compsLoading } = useKitComponents(productId);
  const replaceComponents = useReplaceKitComponents(productId);

  const serverRows = useMemo<CompRow[]>(
    () =>
      (components ?? []).map((c) => ({
        componentProductId: c.componentProductId ?? '',
        productName: c.componentProductName ?? '',
        productCode: c.componentProductCode ?? '',
        quantity: Number(c.quantity),
        sortOrder: c.sortOrder,
      })),
    [components],
  );

  // `draft` = edición local; null = se muestra lo guardado.
  const [draft, setDraft] = useState<CompRow[] | null>(null);
  const rows = draft ?? serverRows;
  const isDirty = draft !== null && !sameRows(draft, serverRows);
  const hasInvalidQty = rows.some((r) => !Number.isFinite(r.quantity) || r.quantity <= 0);

  const [productSearch, setProductSearch] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setTerm(productSearch.trim()), 300);
    return () => clearTimeout(t);
  }, [productSearch]);
  const searchEnabled = term.length >= 2;

  const { data: productSearchResults, isFetching: searching } = useProducts(
    { search: term, isActive: true, limit: 10, productType: ProductType.FINISHED_GOOD },
    { enabled: searchEnabled },
  );

  const addComponent = (p: Product) => {
    if (p.id === productId) {
      toast.warning('Un producto no puede ser componente de sí mismo');
      return;
    }
    if (rows.some((r) => r.componentProductId === p.id)) {
      toast.warning(`Ese producto ya está en el ${noun}`);
      return;
    }
    setDraft([
      ...rows,
      { componentProductId: p.id, productName: p.name, productCode: p.code, quantity: 1, sortOrder: rows.length },
    ]);
    setProductSearch('');
  };

  const removeRow = (pid: string) => setDraft(rows.filter((r) => r.componentProductId !== pid));

  const updateQty = (pid: string, qty: number) =>
    setDraft(rows.map((r) => (r.componentProductId === pid ? { ...r, quantity: qty } : r)));

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!isDirty) return true;
    if (hasInvalidQty) {
      toast.error('Todas las cantidades deben ser mayores a cero');
      return false;
    }
    try {
      await replaceComponents.mutateAsync({
        components: rows.map((r, i) => ({
          componentProductId: r.componentProductId,
          quantity: r.quantity,
          sortOrder: i,
        })),
      });
      setDraft(null);
      toast.success('Composición guardada');
      onSaved?.();
      return true;
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudieron guardar los componentes'));
      return false;
    }
  }, [hasInvalidQty, isDirty, onSaved, replaceComponents, rows]);

  const discard = useCallback(() => setDraft(null), []);

  // Enlace opcional con la ficha (cambios sin guardar + "Guardar todo").
  const handlers = useRef({ handleSave, discard });
  useEffect(() => {
    handlers.current = { handleSave, discard };
  }, [handleSave, discard]);
  const bind = controller?.bind;
  const onDirtyChange = controller?.onDirtyChange;
  useEffect(() => {
    bind?.({ save: () => handlers.current.handleSave(), discard: () => handlers.current.discard() });
  }, [bind]);
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const results = searchEnabled ? (productSearchResults?.data ?? []) : [];

  return (
    <Card className="p-0">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            Componentes ({rows.length})
            {isDirty ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                Sin guardar
              </span>
            ) : null}
          </h2>
          {!readOnly ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={discard} disabled={!isDirty || replaceComponents.isPending}>
                Descartar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={!isDirty || hasInvalidQty || replaceComponents.isPending || compsLoading}
                aria-busy={replaceComponents.isPending}
              >
                {replaceComponents.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="mr-2 h-4 w-4" aria-hidden />
                )}
                Guardar composición
              </Button>
            </div>
          ) : null}
        </div>

        {deductsInventory && !compsLoading && rows.length === 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              Este {noun} está configurado para <strong>descontar inventario de componentes</strong>,
              pero no tiene componentes cargados: las ventas NO descontarán inventario hasta que
              agregues su composición aquí.
            </p>
          </div>
        )}

        {!deductsInventory && !compsLoading && rows.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              Este {noun} tiene componentes pero <strong>NO está marcado para descontar inventario de
              componentes</strong> (según lo último guardado): el POS validará y descontará el stock del{' '}
              {noun} mismo y marcará «Stock insuficiente» si esa fila está en cero. Si debe armarse al
              vender, activa «Descuenta inventario de sus componentes» en los datos del producto.
            </p>
          </div>
        )}

        {!readOnly ? (
          <div className="relative">
            <Label htmlFor={searchId} className="sr-only">
              Buscar producto para agregarlo como componente
            </Label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
            <Input
              id={searchId}
              type="search"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              placeholder="Buscar producto para agregar (mínimo 2 caracteres)…"
              className="pl-9"
              autoComplete="off"
            />
            {searchEnabled ? (
              <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                {searching && results.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-600" role="status">
                    Buscando…
                  </p>
                ) : results.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-700">Sin resultados para «{term}».</p>
                ) : (
                  <ul>
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => addComponent(p)}
                          className="flex min-h-11 w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
                        >
                          <span>
                            <span className="block text-sm font-medium text-gray-900">{p.name}</span>
                            <span className="block font-mono text-xs text-gray-600">{p.code}</span>
                          </span>
                          <Plus className="h-4 w-4 text-[#3E667D]" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {compsLoading ? (
          <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando componentes…
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed py-10 text-center text-gray-700">
            <p className="text-sm">
              No hay componentes.{readOnly ? '' : ` Busca productos arriba para agregarlos al ${noun}.`}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const qtyId = `${searchId}-qty-${row.componentProductId}`;
              const invalid = !Number.isFinite(row.quantity) || row.quantity <= 0;
              return (
                <li
                  key={row.componentProductId}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{row.productName}</p>
                    <p className="font-mono text-xs text-gray-600">{row.productCode}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={qtyId} className="text-xs text-gray-700">
                      Cantidad
                    </Label>
                    <Input
                      id={qtyId}
                      type="number"
                      inputMode="decimal"
                      min={0.0001}
                      step={0.0001}
                      value={Number.isFinite(row.quantity) ? row.quantity : ''}
                      disabled={readOnly}
                      aria-invalid={invalid}
                      onChange={(e) => updateQty(row.componentProductId, Number(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      className="h-9 w-24 text-right"
                    />
                  </div>
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 text-red-700 hover:text-red-800"
                      onClick={() => removeRow(row.componentProductId)}
                      aria-label={`Quitar ${row.productName}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <p className="border-t pt-3 text-xs text-gray-600">
          Con «descontar inventario» activo, al vender el {noun} se descuenta stock de cada producto
          listado aquí.
        </p>
      </CardContent>
    </Card>
  );
}
