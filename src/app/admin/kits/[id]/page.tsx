'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  GiftIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useKit,
  useKitComponents,
  useReplaceKitComponents,
} from '@/hooks/useKits';
import { useProducts, useUpdateProduct } from '@/hooks/useProducts';
import { ProductType, KitPosition, KIT_POSITION_LABEL } from '@/types/product';
import type { Product } from '@/types/product';
import type { BulkComponentItem } from '@/types/kit';

type CompRow = BulkComponentItem & {
  productName: string;
  productCode: string;
};

export default function EditarKitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: kit, isLoading: kitLoading } = useKit(id);
  const { data: components, isLoading: compsLoading } = useKitComponents(id);
  const updateProduct = useUpdateProduct();
  const replaceComponents = useReplaceKitComponents(id);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [description, setDescription] = useState('');
  const [kitPosition, setKitPosition] = useState<KitPosition | ''>('');
  const [isActive, setIsActive] = useState(true);

  const [rows, setRows] = useState<CompRow[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Cargar datos del kit en el form
  useEffect(() => {
    if (kit) {
      setName(kit.name);
      setShortName(kit.shortName ?? '');
      setDescription(kit.description ?? '');
      setKitPosition((kit.kitPosition as KitPosition) || '');
      setIsActive(kit.isActive);
    }
  }, [kit]);

  // Cargar componentes en filas editables
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

  // Buscador de productos para agregar como componentes
  const { data: productSearchResults } = useProducts(
    productSearch.trim().length >= 2
      ? { search: productSearch, isActive: true, limit: 10, productType: ProductType.FINISHED_GOOD }
      : { limit: 0 },
  );

  const addComponent = (p: Product) => {
    if (rows.some((r) => r.componentProductId === p.id)) {
      toast.warning('Ese producto ya está en el kit');
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

  const removeRow = (productId: string) => {
    setRows((prev) => prev.filter((r) => r.componentProductId !== productId));
  };

  const updateQty = (productId: string, qty: number) => {
    setRows((prev) =>
      prev.map((r) => (r.componentProductId === productId ? { ...r, quantity: qty } : r)),
    );
  };

  const handleSaveDetails = async () => {
    if (!kit) return;
    try {
      await updateProduct.mutateAsync({
        id: kit.id,
        dto: {
          name,
          shortName: shortName.trim() || undefined,
          description: description.trim() || undefined,
          kitPosition: (kitPosition || undefined) as KitPosition | undefined,
          isActive,
        },
      });
      toast.success('Datos del kit actualizados');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al actualizar';
      toast.error(msg);
    }
  };

  const handleSaveComponents = async () => {
    try {
      await replaceComponents.mutateAsync({
        components: rows.map((r, i) => ({
          componentProductId: r.componentProductId,
          quantity: r.quantity,
          sortOrder: i,
        })),
      });
      toast.success('Composición del kit guardada');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar componentes';
      toast.error(msg);
    }
  };

  if (kitLoading || !kit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link href="/admin/kits" className="inline-flex items-center text-white/80 hover:text-white mb-3 text-sm">
            <ArrowLeftIcon className="h-4 w-4 mr-1" /> Volver a Kits
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <GiftIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">{kit.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="bg-white/15 px-3 py-1 rounded text-sm font-mono">{kit.code}</span>
            {kit.kitPosition && (
              <span className="bg-white/15 px-3 py-1 rounded text-sm">
                Posición: {KIT_POSITION_LABEL[kit.kitPosition as KitPosition] || kit.kitPosition}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Datos del kit</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre corto</label>
              <input
                type="text"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posición</label>
              <select
                value={kitPosition}
                onChange={(e) => setKitPosition(e.target.value as KitPosition | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Sin posición</option>
                <option value={KitPosition.BASIC}>{KIT_POSITION_LABEL.basic}</option>
                <option value={KitPosition.PREMIUM}>{KIT_POSITION_LABEL.premium}</option>
                <option value={KitPosition.PREFERENTE}>{KIT_POSITION_LABEL.preferente}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Kit activo</span>
            </label>

            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                onClick={handleSaveDetails}
                isLoading={updateProduct.isPending}
                leftIcon={<CheckIcon className="h-4 w-4" />}
              >
                Guardar datos
              </Button>
            </div>

            <div className="border-t pt-4 text-xs text-gray-500 space-y-1">
              <p><strong>Precios:</strong> los precios por país se manejan desde /admin/productos (mismo endpoint).</p>
              <p><strong>Inventario:</strong> al vender el kit con &quot;descontar inventario&quot; activo, se descuenta stock de cada componente listado abajo.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Componentes del kit ({rows.length})</h2>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CheckIcon className="h-4 w-4" />}
                onClick={handleSaveComponents}
                isLoading={replaceComponents.isPending}
                disabled={compsLoading}
              >
                Guardar composición
              </Button>
            </div>

            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
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
                <p className="text-sm">No hay componentes. Busca productos arriba para agregarlos al kit.</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
