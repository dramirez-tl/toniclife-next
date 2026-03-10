// components/pos/PosProductGrid.tsx - Product catalog grid for POS
'use client';

import { useState, useRef, useCallback } from 'react';
import { usePosProductCatalog } from '@/hooks/usePos';
import { usePosCartStore } from '@/stores/pos-cart.store';
import type { QuickProduct } from '@/types/pos';
import { posService } from '@/services/pos.service';
import { toast } from 'sonner';
import Image from 'next/image';
import { MagnifyingGlassIcon, QueueListIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PosProductGridProps {
  branchId?: string;
  priceTypeId?: string;
  countryId?: string;
  currencySymbol?: string;
  currencyCode?: string;
}

export function PosProductGrid({ branchId, priceTypeId, countryId, currencySymbol = '$', currencyCode }: PosProductGridProps) {
  const [filter, setFilter] = useState('');
  const [skuQuery, setSkuQuery] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const bulkTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: products, isLoading } = usePosProductCatalog(branchId, priceTypeId, countryId);
  const addItem = usePosCartStore((s) => s.addItem);
  const cartItems = usePosCartStore((s) => s.cart.items);

  const filtered = (products || []).filter((p) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  const handleAdd = (product: QuickProduct) => {
    if (product.stock !== undefined && product.stock <= 0) {
      toast.error(`${product.name} no tiene existencias`);
      return;
    }
    if (product.stock !== undefined) {
      const existing = cartItems.find((i) => i.productId === product.id);
      const inCart = existing ? existing.quantity : 0;
      if (inCart >= product.stock) {
        toast.error(`Stock máximo alcanzado (${product.stock})`);
        return;
      }
    }
    addItem(product, 1);
    toast.success(`${product.name} agregado`);
  };

  // Handle SKU,qty barcode input
  const handleSkuSubmit = useCallback(async (input: string) => {
    const parts = input.split(',');
    const sku = parts[0].trim();
    const qty = parts.length > 1 ? parseInt(parts[1].trim(), 10) : 1;
    const quantity = isNaN(qty) || qty < 1 ? 1 : qty;

    const product = await posService.getProductBySku(sku, countryId, branchId);
    if (product) {
      if (product.stock !== undefined && product.stock <= 0) {
        toast.error(`${product.name} no tiene existencias en esta sucursal`);
        return;
      }
      let effectiveQty = quantity;
      if (product.stock !== undefined) {
        const existing = usePosCartStore.getState().cart.items.find((i) => i.productId === product.id);
        const inCart = existing ? existing.quantity : 0;
        const available = product.stock - inCart;
        if (available <= 0) {
          toast.error(`Stock máximo alcanzado para ${product.name}`);
          return;
        }
        effectiveQty = Math.min(quantity, available);
        if (effectiveQty < quantity) {
          toast.warning(
            `${product.sku}: se agregaron ${effectiveQty} de ${quantity} (stock: ${product.stock})`,
            { duration: Infinity, action: { label: 'Entendido', onClick: () => {} } },
          );
        }
      }
      addItem(product, effectiveQty);
      toast.success(`${product.name} x${effectiveQty} agregado`);
      setSkuQuery('');
    } else {
      toast.error(`Producto no encontrado: ${sku}`);
    }
  }, [addItem, countryId, branchId]);

  const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skuQuery.trim().length > 0) {
      e.preventDefault();
      handleSkuSubmit(skuQuery);
    } else if (e.key === 'Escape') {
      setSkuQuery('');
    }
  };

  // Bulk add
  const parseBulkInput = useCallback((text: string) => {
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

  const bulkLines = parseBulkInput(bulkText);

  const handleBulkAdd = useCallback(async () => {
    if (bulkLines.length === 0) return;
    setBulkProcessing(true);
    const currentItems = usePosCartStore.getState().cart.items;

    const results = await Promise.allSettled(
      bulkLines.map(async ({ sku, quantity }) => {
        const product = await posService.getProductBySku(sku, countryId, branchId);
        if (!product) throw new Error(sku);
        return { product, quantity, sku };
      })
    );

    let added = 0;
    const notFound: string[] = [];
    const outOfStock: string[] = [];
    const adjusted: string[] = [];

    for (const result of results) {
      if (result.status === 'rejected') {
        notFound.push(result.reason?.message || 'desconocido');
        continue;
      }
      const { product, quantity } = result.value;
      if (product.stock !== undefined && product.stock <= 0) {
        outOfStock.push(product.sku);
        continue;
      }
      let effectiveQty = quantity;
      if (product.stock !== undefined) {
        const existing = currentItems.find((i) => i.productId === product.id);
        const inCart = existing ? existing.quantity : 0;
        const available = product.stock - inCart;
        if (available <= 0) { outOfStock.push(product.sku); continue; }
        effectiveQty = Math.min(quantity, available);
        if (effectiveQty < quantity) {
          adjusted.push(`${product.sku}: ${effectiveQty} de ${quantity} (stock: ${product.stock})`);
        }
      }
      addItem(product, effectiveQty);
      added++;
    }

    if (added > 0) toast.success(`${added} producto${added > 1 ? 's' : ''} agregado${added > 1 ? 's' : ''}`);
    if (notFound.length > 0) toast.error(`SKU no encontrados: ${notFound.join(', ')}`);
    if (outOfStock.length > 0) toast.error(`Sin existencias: ${outOfStock.join(', ')}`);
    if (adjusted.length > 0) toast.warning(`Cantidad ajustada por stock:\n${adjusted.join('\n')}`, { duration: Infinity, action: { label: 'Entendido', onClick: () => {} } });

    setBulkProcessing(false);
    setBulkText('');
    setBulkMode(false);
  }, [bulkLines, countryId, branchId, addItem]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {bulkMode ? (
        /* Bulk mode */
        <div className="border-2 border-[#3E667D]/30 rounded-xl p-4 bg-[#C8DDF2]/5 mb-3 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <QueueListIcon className="h-5 w-5 text-[#3E667D]" />
            <span className="font-medium text-[#3E667D]">Alta masiva de productos</span>
          </div>
          <textarea
            ref={bulkTextareaRef}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'SKU,cantidad (uno por línea)\nEj:\n9019,3\n8001,1\n7050,2'}
            rows={6}
            disabled={bulkProcessing}
            className="w-full px-4 py-3 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D]/40 focus:border-[#3E667D]/50 transition-all resize-none disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => { setBulkMode(false); setBulkText(''); }}
              disabled={bulkProcessing}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkAdd}
              disabled={bulkProcessing || bulkLines.length === 0}
              className="px-5 py-2 text-sm font-medium text-white bg-[#3E667D] rounded-lg hover:bg-[#3E667D]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {bulkProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </>
              ) : (
                `Agregar todos${bulkLines.length > 0 ? ` (${bulkLines.length})` : ''}`
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Search bar: filter + SKU + bulk toggle */
        <div className="flex gap-2 mb-3 flex-shrink-0">
          {/* Catalog filter */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={filterRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar en catálogo..."
              className="w-full pl-9 pr-20 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#3E667D]/40 focus:border-[#3E667D]/40 transition-all bg-white"
            />
            {filtered.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                {filtered.length} producto{filtered.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {/* SKU,qty input */}
          <div className="relative w-40">
            <input
              ref={skuInputRef}
              type="text"
              value={skuQuery}
              onChange={(e) => setSkuQuery(e.target.value)}
              onKeyDown={handleSkuKeyDown}
              placeholder="SKU,cant"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#3E667D]/40 focus:border-[#3E667D]/40 transition-all bg-white font-mono"
            />
            {skuQuery && (
              <button
                onClick={() => { setSkuQuery(''); skuInputRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Bulk mode toggle */}
          <button
            onClick={() => { setBulkMode(true); setTimeout(() => bulkTextareaRef.current?.focus(), 50); }}
            title="Alta masiva"
            className="px-3 py-2.5 border border-gray-200 rounded-xl hover:bg-[#C8DDF2]/20 hover:border-[#3E667D]/30 text-gray-400 hover:text-[#3E667D] transition-all"
          >
            <QueueListIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-0.5">
          {filtered.map((product) => {
            const outOfStock = product.stock !== undefined && product.stock <= 0;
            const inCart = cartItems.find((i) => i.productId === product.id);
            return (
              <button
                key={product.id}
                onClick={() => handleAdd(product)}
                disabled={outOfStock}
                className={`relative overflow-visible flex flex-col bg-white border rounded-xl p-2.5 text-left transition-all hover:shadow-md hover:border-[#3E667D]/30 active:scale-[0.97] ${
                  outOfStock ? 'opacity-50 cursor-not-allowed' : ''
                } ${inCart ? 'ring-2 ring-[#3E667D]/30 border-[#3E667D]/20' : 'border-gray-200'}`}
              >
                {/* Image */}
                <div className="w-full aspect-square bg-gray-50 rounded-lg overflow-hidden mb-2 relative">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={120}
                      height={120}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg font-bold">
                      {product.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <span className="text-red-700 text-[10px] font-bold bg-white/90 px-1.5 py-0.5 rounded">AGOTADO</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight mb-1">{product.name}</p>
                <p className="text-[10px] text-gray-400 font-mono">{product.sku}</p>

                {/* Price & Stock */}
                <div className="mt-auto pt-1.5 flex items-end justify-between">
                  <span className="text-sm font-bold text-[#3E667D]">
                    {currencySymbol}{product.basePrice.toFixed(2)}
                    {currencyCode && <span className="text-[9px] text-gray-400 font-normal ml-0.5">{currencyCode}</span>}
                  </span>
                  {product.stock !== undefined && product.stock > 0 && (
                    <span className="text-[10px] text-green-600 font-medium">{product.stock}</span>
                  )}
                </div>

                {/* Cart indicator */}
                {inCart && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#3E667D] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                    {inCart.quantity}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            {filter ? 'No se encontraron productos' : 'No hay productos disponibles'}
          </div>
        )}
      </div>
    </div>
  );
}
