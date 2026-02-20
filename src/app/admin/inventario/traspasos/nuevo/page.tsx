'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  TruckIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useCreateTransfer, useBranchStock } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import type { CreateTransferDto } from '@/types/inventory';

interface TransferItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  lotId?: string;
  currentStock: number;
}

export default function NuevoTraspasoPage() {
  const router = useRouter();
  const createTransfer = useCreateTransfer();

  const [formData, setFormData] = useState({
    fromBranchId: '',
    toBranchId: '',
    notes: '',
  });
  const [items, setItems] = useState<TransferItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch branches from API
  const { data: branches } = useActiveBranches();

  // Fetch products from source branch stock
  const { data: branchStockData } = useBranchStock(formData.fromBranchId, {
    search: searchTerm || undefined,
    limit: 20
  });

  // Filter products based on search term
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
        quantity: 1,
        currentStock: product.currentStock,
      },
    ]);
    setShowProductSearch(false);
    setSearchTerm('');
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fromBranchId) {
      newErrors.fromBranchId = 'Selecciona la sucursal origen';
    }
    if (!formData.toBranchId) {
      newErrors.toBranchId = 'Selecciona la sucursal destino';
    }
    if (formData.fromBranchId === formData.toBranchId && formData.fromBranchId) {
      newErrors.toBranchId = 'La sucursal destino debe ser diferente a la origen';
    }
    if (items.length === 0) {
      newErrors.items = 'Agrega al menos un producto';
    }

    // Validate quantities
    items.forEach((item) => {
      if (item.quantity > item.currentStock) {
        newErrors[`quantity-${item.productId}`] = 'Cantidad excede el stock disponible';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const transferData: CreateTransferDto = {
      sourceBranchId: formData.fromBranchId,
      destinationBranchId: formData.toBranchId,
      notes: formData.notes || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        requestedQuantity: item.quantity,
        lotId: item.lotId,
      })),
    };

    try {
      await createTransfer.mutateAsync(transferData);
      router.push('/admin/inventario/traspasos');
    } catch (error) {
      console.error('Error creating transfer:', error);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/inventario/traspasos"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Traspaso</h1>
          <p className="text-gray-600">Crear solicitud de traspaso entre sucursales</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branch Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-[#7AB82E]" />
            Información del Traspaso
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sucursal Origen *
              </label>
              <select
                value={formData.fromBranchId}
                onChange={(e) =>
                  setFormData({ ...formData, fromBranchId: e.target.value })
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent ${
                  errors.fromBranchId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar sucursal...</option>
                {branches?.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {errors.fromBranchId && (
                <p className="mt-1 text-sm text-red-500">{errors.fromBranchId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sucursal Destino *
              </label>
              <select
                value={formData.toBranchId}
                onChange={(e) =>
                  setFormData({ ...formData, toBranchId: e.target.value })
                }
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent ${
                  errors.toBranchId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar sucursal...</option>
                {branches?.filter((b) => b.id !== formData.fromBranchId).map(
                  (branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  )
                )}
              </select>
              {errors.toBranchId && (
                <p className="mt-1 text-sm text-red-500">{errors.toBranchId}</p>
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
                placeholder="Agregar notas o comentarios sobre el traspaso..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Productos a Transferir
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
                        Código: {product.code} | Existencias: {product.currentStock}
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
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      SKU
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Existencias Actuales
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Cantidad
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium">{item.productName}</td>
                      <td className="py-3 px-4 text-gray-600">{item.productCode}</td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {item.currentStock}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="1"
                            max={item.currentStock}
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(
                                item.productId,
                                parseInt(e.target.value) || 1
                              )
                            }
                            className={`w-20 px-2 py-1 border rounded text-right focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent ${
                              errors[`quantity-${item.productId}`]
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                          />
                        </div>
                        {errors[`quantity-${item.productId}`] && (
                          <p className="text-xs text-red-500 text-right mt-1">
                            {errors[`quantity-${item.productId}`]}
                          </p>
                        )}
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
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="py-3 px-4 font-medium text-right">
                      Total de productos:
                    </td>
                    <td className="py-3 px-4 font-bold text-right text-[#7AB82E]">
                      {totalItems} unidades
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <TruckIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay productos agregados</p>
              <p className="text-sm">Haz clic en "Agregar Producto" para comenzar</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/admin/inventario/traspasos"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={createTransfer.isPending || items.length === 0}
            className="px-6 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002d5c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createTransfer.isPending ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creando...
              </>
            ) : (
              'Crear Traspaso'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
