'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  ArrowLongRightIcon,
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
  ArrowDownTrayIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useCreateTransfer, useBranchStock } from '@/hooks/useInventory';
import api from '@/lib/axios';
import { useActiveBranches } from '@/hooks/useBranches';
import type { CreateTransferDto, TransferDto } from '@/types/inventory';
import { generateTransferTicketPdf } from '@/lib/generate-transfer-ticket';
import { LotEntriesList } from '@/components/inventory/LotEntriesList';
import type { LotEntry } from '@/types/inventory';

interface TransferItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  lots: LotEntry[];
  currentStock: number;
}

export default function NuevoTraspasoPage() {
  const router = useRouter();
  const createTransfer = useCreateTransfer();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fromBranchId: '',
    toBranchId: '',
    reason: '',
    notes: '',
  });
  const [items, setItems] = useState<TransferItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [skuCode, setSkuCode] = useState('');
  const [skuSearching, setSkuSearching] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdTransfer, setCreatedTransfer] = useState<TransferDto | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fetch branches from API
  const { data: branches } = useActiveBranches();

  // Fetch products from source branch stock
  const { data: branchStockData, isLoading: isLoadingStock } = useBranchStock(
    formData.fromBranchId,
    {
      search: searchTerm || undefined,
      limit: 20,
    }
  );

  // Transform stock data
  const filteredProducts = useMemo(() => {
    if (!branchStockData?.data) return [];
    return branchStockData.data.map((stock) => ({
      id: stock.productId,
      code: stock.productCode,
      name: stock.productName,
      currentStock: stock.quantityAvailable,
    }));
  }, [branchStockData]);

  // Auto-focus search input when modal opens
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
        params: { branchId: formData.fromBranchId },
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
          lots: [],
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
          params: { branchId: formData.fromBranchId },
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
          lots: [],
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
  }, [bulkLines, formData.fromBranchId, items]);

  // Resolve branch names
  const sourceBranch = branches?.find((b) => b.id === formData.fromBranchId);
  const destBranch = branches?.find((b) => b.id === formData.toBranchId);

  const handleAddProduct = (product: {
    id: string;
    code: string;
    name: string;
    currentStock: number;
  }) => {
    if (items.some((item) => item.productId === product.id)) return;

    setItems([
      ...items,
      {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: 1,
        currentStock: product.currentStock,
        lots: [],
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

  const handleLotsChange = (productId: string, lots: LotEntry[]) => {
    setItems(items.map((item) => item.productId === productId ? { ...item, lots } : item));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fromBranchId) newErrors.fromBranchId = 'Selecciona la sucursal origen';
    if (!formData.toBranchId) newErrors.toBranchId = 'Selecciona la sucursal destino';
    if (formData.fromBranchId === formData.toBranchId && formData.fromBranchId) {
      newErrors.toBranchId = 'La sucursal destino debe ser diferente a la origen';
    }
    if (!formData.reason.trim()) newErrors.reason = 'Ingresa el motivo del traspaso';
    if (items.length === 0) newErrors.items = 'Agrega al menos un producto';

    for (const item of items) {
      if (item.lots.length > 0) {
        const lotsTotal = item.lots.reduce((s, l) => s + l.quantity, 0);
        if (lotsTotal > item.currentStock) {
          newErrors[`quantity-${item.productId}`] = 'La suma de lotes excede el stock disponible';
        }
        const lotNumbers = item.lots.map((l) => l.lotNumber.trim()).filter(Boolean);
        if (new Set(lotNumbers).size !== lotNumbers.length) {
          newErrors[`lots-${item.productId}`] = `${item.productName}: lotes duplicados`;
        }
        for (const lot of item.lots) {
          if (!lot.lotNumber.trim() || !lot.expirationDate || lot.quantity < 1) {
            newErrors[`lots-${item.productId}`] = `${item.productName}: lote incompleto`;
            break;
          }
        }
      } else if (item.quantity > item.currentStock) {
        newErrors[`quantity-${item.productId}`] = 'Excede stock';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const transferData: CreateTransferDto = {
      sourceBranchId: formData.fromBranchId,
      destinationBranchId: formData.toBranchId,
      reason: formData.reason.trim(),
      notes: formData.notes || undefined,
      items: items.map((item) => {
        const lotsTotal = item.lots.reduce((sum, l) => sum + l.quantity, 0);
        return {
          productId: item.productId,
          quantity: item.lots.length > 0 ? lotsTotal : item.quantity,
          lots: item.lots.length > 0
            ? item.lots.map((l) => ({ lotId: l.lotId, lotNumber: l.lotNumber, expirationDate: l.expirationDate, quantity: l.quantity }))
            : undefined,
        };
      }),
    };

    try {
      const result = await createTransfer.mutateAsync(transferData);
      toast.success('Traspaso creado correctamente');
      setCreatedTransfer(result);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error al crear el traspaso');
    }
  };

  const totalItems = items.reduce((sum, item) => {
    const lotsTotal = item.lots.reduce((s, l) => s + l.quantity, 0);
    return sum + (item.lots.length > 0 ? lotsTotal : item.quantity);
  }, 0);
  const totalProducts = items.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/inventario/traspasos"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nuevo Traspaso</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Crear solicitud de traspaso entre sucursales
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/inventario/traspasos"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                form="transfer-form"
                disabled={createTransfer.isPending || items.length === 0}
                className="px-5 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#2f5165] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
              >
                {createTransfer.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    Crear Traspaso
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form id="transfer-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — Main form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Branch Selection — Visual Flow */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <BuildingStorefrontIcon className="h-5 w-5 text-[#3E667D]" />
                  Sucursales
                </h2>

                <div className="flex flex-col md:flex-row items-stretch gap-4">
                  {/* Origin */}
                  <div className="flex-1">
                    <div
                      className={`rounded-lg border-2 p-4 transition-colors ${
                        formData.fromBranchId
                          ? 'border-[#3E667D]/30 bg-[#C8DDF2]/10'
                          : errors.fromBranchId
                            ? 'border-red-300 bg-red-50/30'
                            : 'border-gray-200'
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Origen
                      </p>
                      <SearchableSelect
                        options={(branches ?? []).map((branch) => ({
                          value: branch.id,
                          label: branch.name,
                        }))}
                        value={formData.fromBranchId}
                        onChange={(val) => {
                          setFormData({ ...formData, fromBranchId: val, toBranchId: formData.toBranchId === val ? '' : formData.toBranchId });
                          setItems([]);
                        }}
                        showAllOption={false}
                        placeholder="Seleccionar sucursal..."
                      />
                      {errors.fromBranchId && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.fromBranchId}</p>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center md:pt-5">
                    <div className="hidden md:flex w-12 h-12 rounded-full bg-[#3E667D]/10 items-center justify-center">
                      <ArrowLongRightIcon className="h-5 w-5 text-[#3E667D]" />
                    </div>
                    <div className="md:hidden flex items-center justify-center py-1">
                      <ArrowLongRightIcon className="h-5 w-5 text-[#3E667D] rotate-90" />
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex-1">
                    <div
                      className={`rounded-lg border-2 p-4 transition-colors ${
                        formData.toBranchId
                          ? 'border-green-200 bg-green-50/30'
                          : errors.toBranchId
                            ? 'border-red-300 bg-red-50/30'
                            : 'border-gray-200'
                      }`}
                    >
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Destino
                      </p>
                      <SearchableSelect
                        options={(branches ?? [])
                          .filter((b) => b.id !== formData.fromBranchId)
                          .map((branch) => ({
                            value: branch.id,
                            label: branch.name,
                          }))}
                        value={formData.toBranchId}
                        onChange={(val) => setFormData({ ...formData, toBranchId: val })}
                        showAllOption={false}
                        placeholder="Seleccionar sucursal..."
                      />
                      {errors.toBranchId && (
                        <p className="mt-1.5 text-xs text-red-500">{errors.toBranchId}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <CubeIcon className="h-5 w-5 text-[#3E667D]" />
                    Productos a Transferir
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (!formData.fromBranchId) {
                        setErrors({ ...errors, fromBranchId: 'Selecciona la sucursal origen primero' });
                        return;
                      }
                      setShowProductSearch(true);
                    }}
                    disabled={!formData.fromBranchId}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#2f5165] transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Agregar Producto
                  </button>
                </div>

                {!formData.fromBranchId && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    <InformationCircleIcon className="h-5 w-5 flex-shrink-0" />
                    Selecciona la sucursal origen para poder agregar productos.
                  </div>
                )}

                {errors.items && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
                    {errors.items}
                  </div>
                )}

                {/* Items */}
                {items.length > 0 ? (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const effectiveQty = item.lots.length > 0
                        ? item.lots.reduce((s, l) => s + l.quantity, 0)
                        : item.quantity;
                      const pct = Math.round((effectiveQty / item.currentStock) * 100);
                      const hasError = errors[`quantity-${item.productId}`];
                      const hasLotError = errors[`lots-${item.productId}`];
                      return (
                        <div
                          key={item.productId}
                          className={`rounded-lg border p-4 transition-colors ${
                            hasError || hasLotError ? 'border-red-300 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Product info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {item.productName}
                              </p>
                              <p className="text-sm text-gray-500 font-mono">
                                {item.productCode}
                              </p>
                            </div>

                            {/* Stock badge */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-500">Disponible</p>
                              <p className="text-sm font-semibold text-gray-700">
                                {item.currentStock} uds
                              </p>
                            </div>

                            {/* Stepper: visible solo si no hay lotes */}
                            {item.lots.length === 0 && (
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
                                    className="w-14 text-center py-1.5 text-sm font-semibold border-x border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#3E667D] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                            )}

                            {/* Remove */}
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
                                  pct > 80 ? 'bg-amber-400' : pct > 50 ? 'bg-[#3E667D]' : 'bg-[#3E667D]/60'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 tabular-nums w-10 text-right">
                              {pct}%
                            </span>
                          </div>

                          {(hasError || hasLotError) && (
                            <p className="text-xs text-red-500 mt-2">{hasError || hasLotError}</p>
                          )}

                          {formData.fromBranchId && (
                            <LotEntriesList
                              productId={item.productId}
                              branchId={formData.fromBranchId}
                              lots={item.lots}
                              initialQuantity={item.quantity}
                              maxQuantity={item.currentStock}
                              mode="transfer"
                              onChange={(lots) => handleLotsChange(item.productId, lots)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : formData.fromBranchId ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 px-6 text-center">
                    <CubeIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">Sin productos agregados</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Haz clic en &quot;Agregar Producto&quot; para buscar en el inventario de{' '}
                      <span className="font-medium text-gray-500">{sourceBranch?.name}</span>
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Reason & Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <DocumentTextIcon className="h-5 w-5 text-[#3E667D]" />
                  Detalle del Traspaso
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Motivo del Traspaso <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Ej: Reabastecimiento por alta demanda, Redistribución de inventario..."
                      maxLength={1000}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#3E667D]/30 focus:border-[#3E667D] text-sm ${
                        errors.reason ? 'border-red-400 bg-red-50/30' : 'border-gray-300'
                      }`}
                    />
                    {errors.reason && (
                      <p className="mt-1 text-xs text-red-500">{errors.reason}</p>
                    )}
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
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D]/30 focus:border-[#3E667D] text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column — Summary Sidebar */}
            <div className="space-y-6">
              {/* Transfer Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4">Resumen</h2>

                {/* Branch flow */}
                {(sourceBranch || destBranch) && (
                  <div className="space-y-3 mb-5">
                    {sourceBranch && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#C8DDF2]/40 flex items-center justify-center flex-shrink-0">
                          <BuildingStorefrontIcon className="h-4 w-4 text-[#3E667D]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                            Origen
                          </p>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {sourceBranch.name}
                          </p>
                        </div>
                      </div>
                    )}
                    {sourceBranch && destBranch && (
                      <div className="pl-3.5">
                        <div className="w-px h-4 bg-gray-200 ml-0.5" />
                        <ArrowLongRightIcon className="h-4 w-4 text-gray-300 rotate-90 -ml-1.5 -my-1" />
                        <div className="w-px h-4 bg-gray-200 ml-0.5" />
                      </div>
                    )}
                    {destBranch && (
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                          <BuildingStorefrontIcon className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                            Destino
                          </p>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {destBranch.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Productos</span>
                    <span className="font-semibold text-gray-900">{totalProducts}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total unidades</span>
                    <span className="font-semibold text-[#3E667D]">{totalItems}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Estado</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                      Pendiente
                    </span>
                  </div>
                </div>

                {/* Motivo preview */}
                {formData.reason.trim() && (
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Motivo</p>
                    <p className="text-sm text-gray-700 line-clamp-2">{formData.reason}</p>
                  </div>
                )}

                {/* Completion checklist */}
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Checklist</p>
                  <ChecklistItem done={!!formData.fromBranchId} label="Sucursal origen" />
                  <ChecklistItem done={!!formData.toBranchId} label="Sucursal destino" />
                  <ChecklistItem done={items.length > 0} label="Al menos un producto" />
                  <ChecklistItem done={!!formData.reason.trim()} label="Motivo del traspaso" />
                </div>

                {/* Submit button (mobile) */}
                <div className="mt-6 lg:hidden">
                  <button
                    type="submit"
                    form="transfer-form"
                    disabled={createTransfer.isPending || items.length === 0}
                    className="w-full px-5 py-2.5 bg-[#3E667D] text-white rounded-lg hover:bg-[#2f5165] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {createTransfer.isPending ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <ArrowsRightLeftIcon className="h-4 w-4" />
                        Crear Traspaso
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
            onClick={() => {
              setShowProductSearch(false);
              setSearchTerm('');
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Agregar Producto</h3>
                <p className="text-sm text-gray-500">
                  Inventario de {sourceBranch?.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    bulkMode ? 'bg-[#C8DDF2] text-[#3E667D]' : 'hover:bg-gray-100 text-gray-400'
                  }`}
                  title="Alta masiva por SKU"
                >
                  <QueueListIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProductSearch(false);
                    setSearchTerm('');
                    setBulkMode(false);
                    setBulkText('');
                  }}
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D]/30 focus:border-[#3E667D] text-sm font-mono resize-none"
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
                    className="px-4 py-2 bg-[#3E667D] text-white text-sm font-medium rounded-lg hover:bg-[#2f5165] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
                {/* Search */}
                <div className="px-6 py-3 space-y-2">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar por nombre..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D]/30 focus:border-[#3E667D] text-sm"
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
                      className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D]/30 focus:border-[#3E667D] text-sm font-mono disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleSkuSearch}
                      disabled={!skuCode.trim() || skuSearching}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#3E667D] text-white text-xs font-medium rounded-md hover:bg-[#2f5165] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {skuSearching ? '...' : 'Buscar'}
                    </button>
                  </div>
                </div>

                {/* Product List */}
                <div className="px-6 pb-2 max-h-72 overflow-y-auto">
                  {isLoadingStock ? (
                    <div className="py-8 text-center">
                      <div className="inline-block w-6 h-6 border-2 border-[#3E667D] border-t-transparent rounded-full animate-spin mb-2" />
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
                            disabled={isAdded}
                            className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                              isAdded
                                ? 'border-green-200 bg-green-50/50 cursor-default'
                                : 'border-gray-200 hover:border-[#3E667D]/40 hover:bg-[#C8DDF2]/10 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-gray-900 text-sm truncate">
                                  {product.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5 font-mono">
                                  {product.code}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {product.currentStock} uds
                                </span>
                                {isAdded && (
                                  <span className="text-xs text-green-600 font-medium">
                                    Agregado
                                  </span>
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
                        {searchTerm
                          ? 'No se encontraron productos'
                          : 'Escribe para buscar productos'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-400 text-center">
                {items.length > 0
                  ? `${items.length} producto${items.length > 1 ? 's' : ''} agregado${items.length > 1 ? 's' : ''}`
                  : 'Selecciona productos para agregarlos al traspaso'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with PDF Download */}
      {createdTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-8 text-center">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Traspaso Creado</h3>
            <p className="text-gray-600 mb-2">
              El traspaso <span className="font-semibold">{createdTransfer.movementNumber}</span> ha sido creado correctamente.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Estado: Pendiente de aprobación
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  setIsGeneratingPdf(true);
                  try {
                    const url = await generateTransferTicketPdf(createdTransfer);
                    window.open(url, '_blank');
                  } catch {
                    toast.error('Error al generar el PDF');
                  } finally {
                    setIsGeneratingPdf(false);
                  }
                }}
                disabled={isGeneratingPdf}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#3E667D] text-white rounded-xl hover:bg-[#2f5165] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                {isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}
              </button>
              <button
                onClick={() => router.push(`/admin/inventario/traspasos/${createdTransfer.id}`)}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-700"
              >
                Ver Detalle
              </button>
              <button
                onClick={() => router.push('/admin/inventario/traspasos')}
                className="w-full px-5 py-3 text-gray-500 hover:text-gray-700 transition-colors font-medium text-sm"
              >
                Volver a Traspasos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================
// Checklist Item
// ================================

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
          done ? 'bg-[#3E667D] border-[#3E667D]' : 'border-gray-300'
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
