'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ArrowUpIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MinusIcon,
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCreateMovement, useBranchStock } from '@/hooks/useInventory';
import api from '@/lib/axios';
import { useActiveBranches } from '@/hooks/useBranches';
import {
  MovementType,
  MovementReason,
  type CreateMovementDto,
  type MovementDto,
} from '@/types/inventory';
import { generateMovementTicketPdf } from '@/lib/generate-movement-ticket';

// ================================================================
// EXIT REASONS
// ================================================================
const EXIT_REASONS = [
  { value: MovementReason.SALE, label: 'Venta' },
  { value: MovementReason.RETURN_TO_SUPPLIER, label: 'Devolución a proveedor' },
  { value: MovementReason.LOSS, label: 'Pérdida' },
  { value: MovementReason.EXPIRATION, label: 'Caducidad' },
  { value: MovementReason.DAMAGE, label: 'Daño/Merma' },
  { value: MovementReason.ADJUSTMENT, label: 'Ajuste' },
];

interface ExitItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  currentStock: number;
}

export default function NuevaSalidaPage() {
  const router = useRouter();
  const createMovement = useCreateMovement();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    branchId: '',
    reason: '' as MovementReason | '',
    notes: '',
    referenceNumber: '',
  });
  const [items, setItems] = useState<ExitItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [skuSearching, setSkuSearching] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdMovement, setCreatedMovement] = useState<MovementDto | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data: branches } = useActiveBranches();

  const { data: branchStockData, isLoading: isLoadingStock } = useBranchStock(
    formData.branchId,
    { search: searchTerm || undefined, limit: 20 }
  );

  const filteredProducts = useMemo(() => {
    if (!branchStockData?.data) return [];
    return branchStockData.data.map((stock) => ({
      id: stock.productId,
      code: stock.productCode,
      name: stock.productName,
      currentStock: stock.quantityAvailable,
    }));
  }, [branchStockData]);

  useEffect(() => {
    if (showProductSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showProductSearch]);

  const handleSkuSearch = async () => {
    const parts = skuCode.split(',');
    const sku = parts[0].trim();
    const qty = parts.length > 1 ? parseInt(parts[1].trim(), 10) : undefined;

    if (!sku) return;
    setSkuSearching(true);
    try {
      const response = await api.get(`/products/code/${sku}`, {
        params: { branchId: formData.branchId },
      });
      const p = response.data;
      if (!p || !p.id) {
        toast.error(`Producto no encontrado: ${sku}`);
        return;
      }
      const stock = p.stock ?? 0;
      if (stock <= 0) {
        toast.error(`${p.name} no tiene existencias en esta sucursal`);
        return;
      }
      if (items.some((item) => item.productId === p.id)) {
        if (qty && !isNaN(qty) && qty >= 1) {
          handleQuantityChange(p.id, Math.min(qty, stock));
          toast.success(`Cantidad actualizada: ${p.name} → ${Math.min(qty, stock)}`);
        } else {
          toast.info(`${p.name} ya está en la lista`);
        }
        setSkuCode('');
        return;
      }
      const quantity = qty && !isNaN(qty) && qty >= 1 ? Math.min(qty, stock) : 1;
      setItems([
        ...items,
        {
          productId: p.id,
          productCode: p.code || sku,
          productName: p.name,
          quantity,
          currentStock: stock,
        },
      ]);
      toast.success(`${p.name}${quantity > 1 ? ` x${quantity}` : ''} agregado`);
      setSkuCode('');
    } catch {
      toast.error(`Producto no encontrado: ${sku}`);
    } finally {
      setSkuSearching(false);
    }
  };

  const parseBulkLines = useCallback((text: string) => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(',');
        const sku = parts[0].trim();
        const qty = parts.length > 1 ? parseInt(parts[1].trim(), 10) : 1;
        return { sku, quantity: isNaN(qty) || qty < 1 ? 1 : qty };
      })
      .filter((item) => item.sku.length > 0);
  }, []);

  const bulkLines = parseBulkLines(bulkText);

  const handleBulkAdd = useCallback(async () => {
    if (bulkLines.length === 0) return;
    setBulkProcessing(true);

    const results = await Promise.allSettled(
      bulkLines.map(async ({ sku, quantity }) => {
        const response = await api.get(`/products/code/${sku}`, {
          params: { branchId: formData.branchId },
        });
        const p = response.data;
        if (!p || !p.id) throw new Error(sku);
        return { product: p, quantity, sku };
      })
    );

    let added = 0;
    const notFound: string[] = [];
    const outOfStock: string[] = [];
    const adjusted: string[] = [];
    const newItems = [...items];

    for (const result of results) {
      if (result.status === 'rejected') {
        notFound.push(result.reason?.message || 'desconocido');
        continue;
      }
      const { product: p, quantity } = result.value;
      const stock = p.stock ?? 0;
      if (stock <= 0) {
        outOfStock.push(p.code || result.value.sku);
        continue;
      }
      const existing = newItems.find((item) => item.productId === p.id);
      const effectiveQty = Math.min(quantity, stock);
      if (effectiveQty < quantity) {
        adjusted.push(`${p.code}: ${effectiveQty} de ${quantity} (stock: ${stock})`);
      }
      if (existing) {
        existing.quantity = effectiveQty;
      } else {
        newItems.push({
          productId: p.id,
          productCode: p.code || result.value.sku,
          productName: p.name,
          quantity: effectiveQty,
          currentStock: stock,
        });
        added++;
      }
    }

    setItems(newItems);

    if (added > 0) {
      toast.success(`${added} producto${added > 1 ? 's' : ''} agregado${added > 1 ? 's' : ''}`);
    }
    if (notFound.length > 0) {
      toast.error(`SKU no encontrados: ${notFound.join(', ')}`);
    }
    if (outOfStock.length > 0) {
      toast.error(`Sin existencias: ${outOfStock.join(', ')}`);
    }
    if (adjusted.length > 0) {
      toast.warning(`Cantidad ajustada por stock: ${adjusted.join(', ')}`);
    }

    setBulkProcessing(false);
    setBulkText('');
    setBulkMode(false);
  }, [bulkLines, formData.branchId, items]);

  const selectedBranch = branches?.find((b) => b.id === formData.branchId);
  const selectedReasonLabel = EXIT_REASONS.find((r) => r.value === formData.reason)?.label || '';

  const handleAddProduct = (product: { id: string; code: string; name: string; currentStock: number }) => {
    if (items.some((item) => item.productId === product.id)) return;
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
          ? { ...item, quantity: Math.max(1, Math.min(quantity, item.currentStock)) }
          : item
      )
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.branchId) newErrors.branchId = 'Selecciona la sucursal';
    if (!formData.reason) newErrors.reason = 'Selecciona el motivo de la salida';
    if (items.length === 0) newErrors.items = 'Agrega al menos un producto';
    items.forEach((item) => {
      if (item.quantity > item.currentStock) {
        newErrors[`quantity-${item.productId}`] = 'Excede stock disponible';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const movementData: CreateMovementDto = {
      branchId: formData.branchId,
      movementType: MovementType.EXIT,
      reason: formData.reason as MovementReason,
      notes: formData.notes || undefined,
      referenceNumber: formData.referenceNumber || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };

    try {
      const result = await createMovement.mutateAsync(movementData);
      toast.success('Salida creada correctamente');
      setCreatedMovement(result);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al crear la salida');
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalProducts = items.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/inventario/salidas"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nueva Salida</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Registrar salida de producto del inventario
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/inventario/salidas"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                form="exit-form"
                disabled={createMovement.isPending || items.length === 0}
                className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
              >
                {createMovement.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <ArrowUpIcon className="h-4 w-4" />
                    Crear Salida
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form id="exit-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Branch Selection */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <BuildingStorefrontIcon className="h-5 w-5 text-red-600" />
                  Sucursal
                </h2>
                <div
                  className={`rounded-lg border-2 p-4 transition-colors ${
                    formData.branchId
                      ? 'border-red-200 bg-red-50/20'
                      : errors.branchId
                        ? 'border-red-300 bg-red-50/30'
                        : 'border-gray-200'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Sucursal origen de la salida
                  </p>
                  <SearchableSelect
                    options={(branches ?? []).map((branch) => ({
                      value: branch.id,
                      label: branch.name,
                    }))}
                    value={formData.branchId}
                    onChange={(val) => {
                      setFormData({ ...formData, branchId: val });
                      setItems([]);
                    }}
                    showAllOption={false}
                    placeholder="Seleccionar sucursal..."
                  />
                  {errors.branchId && (
                    <p className="mt-1.5 text-xs text-red-500">{errors.branchId}</p>
                  )}
                </div>
              </div>

              {/* Products */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <CubeIcon className="h-5 w-5 text-red-600" />
                    Productos a Retirar
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.branchId) {
                        setErrors({ ...errors, branchId: 'Selecciona la sucursal primero' });
                        return;
                      }
                      setShowProductSearch(true);
                    }}
                    disabled={!formData.branchId}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Agregar Producto
                  </button>
                </div>

                {!formData.branchId && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    <InformationCircleIcon className="h-5 w-5 flex-shrink-0" />
                    Selecciona la sucursal para poder agregar productos.
                  </div>
                )}

                {errors.items && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                    {errors.items}
                  </div>
                )}

                {items.length > 0 ? (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const pct = Math.round((item.quantity / item.currentStock) * 100);
                      const hasError = errors[`quantity-${item.productId}`];
                      return (
                        <div
                          key={item.productId}
                          className={`rounded-lg border p-4 transition-colors ${
                            hasError ? 'border-red-300 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                              <p className="text-sm text-gray-500 font-mono">{item.productCode}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-500">Disponible</p>
                              <p className="text-sm font-semibold text-gray-700">{item.currentStock} uds</p>
                            </div>
                            <div className="flex-shrink-0">
                              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                  className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  max={item.currentStock}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(item.productId, parseInt(e.target.value) || 1)
                                  }
                                  className="w-14 text-center py-1.5 text-sm font-semibold border-x border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                                  disabled={item.quantity >= item.currentStock}
                                  className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Stock usage bar */}
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-400/60'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums w-10 text-right">{pct}%</span>
                          </div>

                          {hasError && (
                            <p className="text-xs text-red-500 mt-2">{hasError}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : formData.branchId ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 px-6 text-center">
                    <CubeIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">Sin productos agregados</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Haz clic en &quot;Agregar Producto&quot; para buscar en el inventario de{' '}
                      <span className="font-medium text-gray-500">{selectedBranch?.name}</span>
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Reason & Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-red-600" />
                  Detalle de la Salida
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Motivo de la Salida <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value as MovementReason })}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm ${
                        errors.reason ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Seleccionar motivo...</option>
                      {EXIT_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {errors.reason && (
                      <p className="mt-1 text-xs text-red-500">{errors.reason}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      No. Referencia <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="Ej: NC-001, Ticket-2024-001..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Notas <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      placeholder="Agregar notas o comentarios adicionales..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — Summary Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Resumen</h2>

                {selectedBranch && (
                  <div className="flex items-center gap-2.5 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <BuildingStorefrontIcon className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                        Sucursal
                      </p>
                      <p className="text-sm font-medium text-gray-900 truncate">{selectedBranch.name}</p>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Productos</span>
                    <span className="font-semibold text-gray-900">{totalProducts}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total unidades</span>
                    <span className="font-semibold text-red-600">{totalItems}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Estado</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      Pendiente
                    </span>
                  </div>
                </div>

                {selectedReasonLabel && (
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Motivo</p>
                    <p className="text-sm text-gray-700">{selectedReasonLabel}</p>
                  </div>
                )}

                {formData.referenceNumber && (
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Referencia</p>
                    <p className="text-sm text-gray-700 font-mono">{formData.referenceNumber}</p>
                  </div>
                )}

                <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Checklist</p>
                  <ChecklistItem done={!!formData.branchId} label="Sucursal seleccionada" />
                  <ChecklistItem done={items.length > 0} label="Al menos un producto" />
                  <ChecklistItem done={!!formData.reason} label="Motivo de la salida" />
                </div>

                <div className="mt-6 lg:hidden">
                  <button
                    type="submit"
                    form="exit-form"
                    disabled={createMovement.isPending || items.length === 0}
                    className="w-full px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {createMovement.isPending ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <ArrowUpIcon className="h-4 w-4" />
                        Crear Salida
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Product Search Modal */}
      {showProductSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => { setShowProductSearch(false); setSearchTerm(''); }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Agregar Producto</h3>
                <p className="text-sm text-gray-500">Inventario de {selectedBranch?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    bulkMode ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100 text-gray-400'
                  }`}
                  title="Alta masiva por SKU"
                >
                  <QueueListIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setShowProductSearch(false); setSearchTerm(''); setBulkMode(false); setBulkText(''); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </div>

            {bulkMode ? (
              <div className="px-6 py-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Alta masiva por SKU</p>
                  <p className="text-xs text-gray-500 mb-3">
                    Escribe un SKU por línea. Formato: <span className="font-mono bg-gray-100 px-1 rounded">SKU,cantidad</span> (ej: 9019,5)
                  </p>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    rows={8}
                    placeholder={"9019,10\n9020,5\n9021,3"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm font-mono resize-none"
                    disabled={bulkProcessing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {bulkLines.length > 0
                      ? `${bulkLines.length} línea${bulkLines.length > 1 ? 's' : ''} detectada${bulkLines.length > 1 ? 's' : ''}`
                      : 'Pega o escribe los códigos SKU'}
                  </p>
                  <button
                    type="button"
                    onClick={handleBulkAdd}
                    disabled={bulkLines.length === 0 || bulkProcessing}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {bulkProcessing ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4" />
                        Agregar {bulkLines.length > 0 ? `(${bulkLines.length})` : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-6 py-3 space-y-2">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <CubeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      ref={skuInputRef}
                      type="text"
                      value={skuCode}
                      onChange={(e) => setSkuCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSkuSearch();
                        }
                      }}
                      placeholder="SKU exacto (ej: 9019 o 9019,5)"
                      disabled={skuSearching}
                      className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500/30 focus:border-red-500 text-sm font-mono disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleSkuSearch}
                      disabled={!skuCode.trim() || skuSearching}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {skuSearching ? '...' : 'Buscar'}
                    </button>
                  </div>
                </div>

                <div className="px-6 pb-2 max-h-72 overflow-y-auto">
                  {isLoadingStock ? (
                    <div className="py-8 text-center">
                      <div className="inline-block w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mb-2" />
                      <p className="text-sm text-gray-500">Buscando productos...</p>
                    </div>
                  ) : filteredProducts.length > 0 ? (
                    <div className="space-y-2">
                      {filteredProducts.map((product) => {
                        const isAdded = items.some((item) => item.productId === product.id);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleAddProduct(product)}
                            disabled={isAdded || product.currentStock <= 0}
                            className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                              isAdded
                                ? 'border-green-200 bg-green-50/50 cursor-default'
                                : product.currentStock <= 0
                                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                                  : 'border-gray-200 hover:border-red-400/40 hover:bg-red-50/10 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 text-sm truncate">{product.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5 font-mono">{product.code}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  product.currentStock <= 0
                                    ? 'text-red-600 bg-red-100'
                                    : 'text-gray-500 bg-gray-100'
                                }`}>
                                  {product.currentStock} uds
                                </span>
                                {isAdded && (
                                  <span className="text-xs text-green-600 font-medium">Agregado</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <MagnifyingGlassIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-500">
                        {searchTerm ? 'No se encontraron productos' : 'Escribe para buscar productos'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400 text-center">
                {items.length > 0
                  ? `${items.length} producto${items.length > 1 ? 's' : ''} agregado${items.length > 1 ? 's' : ''}`
                  : 'Selecciona productos para agregarlos a la salida'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {createdMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-8 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Salida Creada</h3>
            <p className="text-gray-600 mb-2">
              La salida <span className="font-semibold">{createdMovement.movementNumber}</span> ha sido creada correctamente.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Estado: Pendiente de aprobación
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  setIsGeneratingPdf(true);
                  try {
                    const url = await generateMovementTicketPdf(createdMovement);
                    window.open(url, '_blank');
                  } catch {
                    toast.error('Error al generar el PDF');
                  } finally {
                    setIsGeneratingPdf(false);
                  }
                }}
                disabled={isGeneratingPdf}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                {isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}
              </button>
              <button
                onClick={() => router.push('/admin/inventario/salidas')}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Volver a Salidas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
          done ? 'bg-red-600 border-red-600' : 'border-gray-300'
        }`}
      >
        {done && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-xs ${done ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}
