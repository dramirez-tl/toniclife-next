'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useCreateAdjustment, useBranchStock } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { AdjustmentType } from '@/types/inventory';
import type { CreateAdjustmentDto } from '@/types/inventory';
import { inventoryService } from '@/services/inventory.service';

interface AdjustmentItem {
  productId: string;
  productCode: string;
  productName: string;
  currentQuantity: number;
  newQuantity: number;
  difference: number;
  reason?: string;
}

export default function NuevoAjustePage() {
  const router = useRouter();
  const createAdjustment = useCreateAdjustment();

  const [formData, setFormData] = useState({
    branchId: '',
    adjustmentType: AdjustmentType.COUNT,
    reason: '',
    notes: '',
  });
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch branches from API
  const { data: branches } = useActiveBranches();

  // Fetch products from selected branch stock
  const { data: branchStockData } = useBranchStock(formData.branchId, {
    search: searchTerm || undefined,
    limit: 20
  });

  // Transform stock data into product format
  const filteredProducts = useMemo(() => {
    if (!branchStockData?.data) return [];
    return branchStockData.data.map(stock => ({
      id: stock.productId,
      code: stock.productCode,
      name: stock.productName,
      currentStock: stock.quantityAvailable,
    }));
  }, [branchStockData]);

  const handleAddProduct = (product: { id: string; code: string; name: string; currentStock: number }) => {
    if (items.some((item) => item.productId === product.id)) {
      return; // Product already added
    }

    setItems([
      ...items,
      {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        currentQuantity: product.currentStock,
        newQuantity: product.currentStock,
        difference: 0,
      },
    ]);
    setShowProductSearch(false);
    setSearchTerm('');
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId));
  };

  const handleNewQuantityChange = (productId: string, newQuantity: number) => {
    setItems(
      items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              newQuantity: Math.max(0, newQuantity),
              difference: newQuantity - item.currentQuantity,
            }
          : item
      )
    );
  };

  const handleReasonChange = (productId: string, reason: string) => {
    setItems(
      items.map((item) =>
        item.productId === productId ? { ...item, reason } : item
      )
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.branchId) {
      newErrors.branchId = 'Selecciona una sucursal';
    }
    if (!formData.adjustmentType) {
      newErrors.type = 'Selecciona el tipo de ajuste';
    }
    if (items.length === 0) {
      newErrors.items = 'Agrega al menos un producto';
    }

    // Check if there are actual changes
    const hasChanges = items.some((item) => item.difference !== 0);
    if (!hasChanges && items.length > 0) {
      newErrors.items = 'Debe haber al menos un cambio en las cantidades';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const adjustmentData: CreateAdjustmentDto = {
      branchId: formData.branchId,
      adjustmentType: formData.adjustmentType,
      reason: formData.reason || 'Ajuste de inventario',
      notes: formData.notes || undefined,
      items: items
        .filter((item) => item.difference !== 0)
        .map((item) => ({
          productId: item.productId,
          systemQuantity: item.currentQuantity,
          countedQuantity: item.newQuantity,
          notes: item.reason,
        })),
    };

    try {
      await createAdjustment.mutateAsync(adjustmentData);
      router.push('/admin/inventario/ajustes');
    } catch (error) {
      console.error('Error creating adjustment:', error);
    }
  };

  const totalIncrease = items
    .filter((item) => item.difference > 0)
    .reduce((sum, item) => sum + item.difference, 0);
  const totalDecrease = items
    .filter((item) => item.difference < 0)
    .reduce((sum, item) => sum + Math.abs(item.difference), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/inventario/ajustes"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Ajuste de Inventario</h1>
          <p className="text-gray-600">Registrar ajustes por conteo físico, merma o corrección</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Adjustment Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-[#7AB82E]" />
            Información del Ajuste
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sucursal *
              </label>
              <select
                value={formData.branchId}
                onChange={(e) =>
                  setFormData({ ...formData, branchId: e.target.value })
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent ${
                  errors.branchId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar sucursal...</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {errors.branchId && (
                <p className="mt-1 text-sm text-red-500">{errors.branchId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Ajuste *
              </label>
              <select
                value={formData.adjustmentType}
                onChange={(e) =>
                  setFormData({ ...formData, adjustmentType: e.target.value as AdjustmentType })
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent ${
                  errors.type ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {Object.values(AdjustmentType).map((type) => (
                  <option key={type} value={type}>
                    {inventoryService.getAdjustmentTypeLabel(type)}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-500">{errors.type}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (Opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Describir el motivo del ajuste, observaciones relevantes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Productos a Ajustar
            </h2>
            <button
              type="button"
              onClick={() => setShowProductSearch(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#7AB82E] text-white rounded-lg hover:bg-[#6da628] transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              Agregar Producto
            </button>
          </div>

          {errors.items && (
            <p className="mb-4 text-sm text-red-500">{errors.items}</p>
          )}

          {/* Product Search Modal */}
          {showProductSearch && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
                <h3 className="text-lg font-semibold mb-4">Buscar Producto</h3>
                <div className="relative mb-4">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o SKU..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      disabled={items.some((item) => item.productId === product.id)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[#7AB82E] hover:bg-[#7AB82E]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">
                        SKU: {product.code} | Existencias actuales: {product.currentStock}
                      </div>
                    </button>
                  ))}
                  {filteredProducts.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No se encontraron productos
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductSearch(false);
                    setSearchTerm('');
                  }}
                  className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Items Table */}
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Producto
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Existencias en Sistema
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Cantidad Real
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Diferencia
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Motivo
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-gray-500">{item.productCode}</div>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {item.currentQuantity}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="0"
                          value={item.newQuantity}
                          onChange={(e) =>
                            handleNewQuantityChange(
                              item.productId,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.difference !== 0 && (
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              item.difference > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {item.difference > 0 ? (
                              <ArrowUpIcon className="h-4 w-4" />
                            ) : (
                              <ArrowDownIcon className="h-4 w-4" />
                            )}
                            {item.difference > 0 ? '+' : ''}
                            {item.difference}
                          </span>
                        )}
                        {item.difference === 0 && (
                          <span className="text-gray-400">Sin cambio</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={item.reason || ''}
                          onChange={(e) =>
                            handleReasonChange(item.productId, e.target.value)
                          }
                          placeholder="Opcional..."
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent text-sm"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <ClipboardDocumentCheckIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay productos agregados</p>
              <p className="text-sm">Haz clic en "Agregar Producto" para comenzar</p>
            </div>
          )}

          {/* Summary */}
          {items.length > 0 && (totalIncrease > 0 || totalDecrease > 0) && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-6">
              {totalIncrease > 0 && (
                <div className="text-green-600">
                  <span className="text-sm text-gray-600">Incrementos: </span>
                  <span className="font-bold">+{totalIncrease}</span>
                </div>
              )}
              {totalDecrease > 0 && (
                <div className="text-red-600">
                  <span className="text-sm text-gray-600">Decrementos: </span>
                  <span className="font-bold">-{totalDecrease}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/admin/inventario/ajustes"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createAdjustment.isPending || items.length === 0}
            className="px-6 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002d5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createAdjustment.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Ajuste'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
