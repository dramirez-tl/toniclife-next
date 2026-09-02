'use client';

// Compositor de componentes (BoM) de un producto — compartido entre el editor
// de kits (/admin/kits/[id]) y el editor genérico de producto para paquetes
// (/admin/productos/[id]/editar, tipo Kit). Guarda con reemplazo atómico
// PUT /products/:id/components/bulk (alcance GLOBAL; las promos editan por
// país en /admin/promociones/[id]).

import { useEffect, useState } from 'react';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useKitComponents, useReplaceKitComponents } from '@/hooks/useKits';
import { useProducts } from '@/hooks/useProducts';
import { ProductType } from '@/types/product';
import type { Product } from '@/types/product';
import type { BulkComponentItem } from '@/types/kit';

type CompRow = BulkComponentItem & {
  productName: string;
  productCode: string;
};

interface ProductComponentsSectionProps {
  productId: string;
  /** TRUE cuando el producto descuenta inventario de componentes al venderse
   *  (kit/paquete dinámico) — activa el aviso de BoM vacío. */
  deductsInventory?: boolean;
  /** Sustantivo para los textos ("kit" | "paquete"). Default: "producto". */
  noun?: string;
}

export function ProductComponentsSection({
  productId,
  deductsInventory = false,
  noun = 'producto',
}: ProductComponentsSectionProps) {
  const { data: components, isLoading: compsLoading } = useKitComponents(productId);
  const replaceComponents = useReplaceKitComponents(productId);

  const [rows, setRows] = useState<CompRow[]>([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    if (components) {
      setRows(
        components.map((c) => ({
          componentProductId: c.componentProductId ?? '',
          productName: c.componentProductName ?? '',
          productCode: c.componentProductCode ?? '',
          quantity: Number(c.quantity),
          sortOrder: c.sortOrder,
        })),
      );
    }
  }, [components]);

  const { data: productSearchResults } = useProducts(
    productSearch.trim().length >= 2
      ? { search: productSearch, isActive: true, limit: 10, productType: ProductType.FINISHED_GOOD }
      : { limit: 0 },
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
    setRows((prev) => [
      ...prev,
      {
        componentProductId: p.id,
        productName: p.name,
        productCode: p.code,
        quantity: 1,
        sortOrder: prev.length,
      },
    ]);
    setProductSearch('');
  };

  const removeRow = (pid: string) => {
    setRows((prev) => prev.filter((r) => r.componentProductId !== pid));
  };

  const updateQty = (pid: string, qty: number) => {
    setRows((prev) =>
      prev.map((r) => (r.componentProductId === pid ? { ...r, quantity: qty } : r)),
    );
  };

  const handleSave = async () => {
    try {
      await replaceComponents.mutateAsync({
        components: rows.map((r, i) => ({
          componentProductId: r.componentProductId,
          quantity: r.quantity,
          sortOrder: i,
        })),
      });
      toast.success('Composición guardada');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al guardar componentes';
      toast.error(msg);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Componentes ({rows.length})</h2>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={replaceComponents.isPending || compsLoading}
          >
            {replaceComponents.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            <CheckIcon className="h-4 w-4" />
            Guardar composición
          </Button>
        </div>

        {deductsInventory && !compsLoading && rows.length === 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              Este {noun} está configurado para <strong>descontar inventario de componentes</strong>,
              pero no tiene componentes cargados: las ventas NO descontarán inventario hasta que
              agregues su composición aquí.
            </p>
          </div>
        )}

        {!deductsInventory && !compsLoading && rows.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 mt-0.5" />
            <p>
              Este {noun} tiene componentes pero <strong>NO está marcado para descontar
              inventario de componentes</strong>: el POS validará y descontará el stock del{' '}
              {noun} mismo (no el de sus componentes) y marcará &quot;Stock insuficiente&quot; si
              esa fila está en cero. Si debe armarse al vender, activa la casilla
              &quot;deduce inventario de componentes&quot; en los datos del producto.
            </p>
          </div>
        )}

        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            onKeyDown={(e) => {
              // Evita que Enter dispare el submit del form contenedor (editor de producto).
              if (e.key === 'Enter') e.preventDefault();
            }}
            placeholder="Buscar producto para agregar (mínimo 2 caracteres)..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
          />
          {productSearch.trim().length >= 2 && productSearchResults?.data && productSearchResults.data.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
              {productSearchResults.data.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addComponent(p)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{p.code}</div>
                  </div>
                  <PlusIcon className="h-4 w-4 text-[#3E667D]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg">
            <p className="text-sm">
              No hay componentes. Busca productos arriba para agregarlos al {noun}.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.componentProductId}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{row.productName}</div>
                  <div className="text-xs text-gray-500 font-mono">{row.productCode}</div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Cant:</label>
                  <input
                    type="number"
                    min={0.0001}
                    step={0.0001}
                    value={row.quantity}
                    onChange={(e) => updateQty(row.componentProductId, Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.componentProductId)}
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Quitar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 border-t pt-3">
          Con &quot;descontar inventario&quot; activo, al vender el {noun} se descuenta stock de cada
          producto listado aquí.
        </p>
      </CardContent>
    </Card>
  );
}
