// components/pos/PosProductSearch.tsx - Product search for POS
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, QueueListIcon } from '@heroicons/react/24/outline';
import { usePosProductSearch } from '@/hooks/usePos';
import { usePosCartStore } from '@/stores/pos-cart.store';
import type { QuickProduct } from '@/types/pos';
import { posService } from '@/services/pos.service';
import { toast } from 'sonner';
import Image from 'next/image';

interface PosProductSearchProps {
  onProductSelected?: (product: QuickProduct) => void;
  /** Cuando se detecta un kit de inscripción, en vez de agregarlo se delega al padre (para abrir modal de prospecto). */
  onKitDetected?: (product: QuickProduct) => void;
  autoFocus?: boolean;
  branchId?: string;
  priceTypeId?: string;
  countryId?: string;
}

export function PosProductSearch({ onProductSelected, onKitDetected, autoFocus = true, branchId, priceTypeId, countryId }: PosProductSearchProps) {
  const [query, setQuery] = useState('');
  const [skuQuery, setSkuQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);
  const bulkTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Extract just the SKU part (before comma) for searching
  const skuOnly = skuQuery.split(',')[0].trim();
  const activeSkuSearch = skuOnly.length >= 1 ? skuOnly : undefined;
  const { data: products, isLoading } = usePosProductSearch(
    activeSkuSearch ? skuOnly : query,
    activeSkuSearch ? true : query.length >= 2,
    branchId, priceTypeId, countryId,
    activeSkuSearch,
  );
  const addItem = usePosCartStore((state) => state.addItem);

  // Handle barcode scan or SKU,qty input (typically fast input ending with Enter)
  const handleBarcodeInput = useCallback(async (input: string) => {
    // Support "SKU,qty" syntax
    const parts = input.split(',');
    const sku = parts[0].trim();
    const qty = parts.length > 1 ? parseInt(parts[1].trim(), 10) : 1;
    const quantity = isNaN(qty) || qty < 1 ? 1 : qty;

    const product = await posService.getProductBySku(sku, countryId, branchId);
    if (product) {
      // Si es un kit de inscripción, delegar al padre (abre modal de prospecto en lugar de agregar)
      if (product.isEnrollmentKit && onKitDetected) {
        onKitDetected(product);
        setQuery('');
        setSkuQuery('');
        return;
      }
      // Validate stock (los kits no tienen stock propio, ya filtrados arriba)
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
      onProductSelected?.(product);
      toast.success(`${product.name} x${effectiveQty} agregado`);
      setQuery('');
      setSkuQuery('');
    } else {
      toast.error(`Producto no encontrado: ${sku}`);
    }
  }, [addItem, onProductSelected, onKitDetected, countryId, branchId]);

  // Parse bulk input lines: "SKU,qty" or just "SKU" (qty defaults to 1)
  const parseBulkInput = useCallback((text: string): Array<{ sku: string; quantity: number }> => {
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

  // Handle bulk add: resolve all SKUs in parallel and add to cart
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
        continue;
      }
      if (result.status === 'fulfilled') {
        const { product, quantity, sku } = result.value;
        if (!product) {
          notFound.push(sku);
          continue;
        }
        if (product.stock !== undefined && product.stock <= 0) {
          outOfStock.push(product.sku);
          continue;
        }
        // Check available stock considering current cart
        let effectiveQty = quantity;
        if (product.stock !== undefined) {
          const existing = currentItems.find((i) => i.productId === product.id);
          const inCart = existing ? existing.quantity : 0;
          const available = product.stock - inCart;
          if (available <= 0) {
            outOfStock.push(product.sku);
            continue;
          }
          effectiveQty = Math.min(quantity, available);
          if (effectiveQty < quantity) {
            adjusted.push(`${product.sku}: ${effectiveQty} de ${quantity} (stock: ${product.stock})`);
          }
        }
        addItem(product, effectiveQty);
        added++;
      }
    }

    // Collect not-found SKUs from rejected promises
    for (const result of results) {
      if (result.status === 'rejected') {
        const msg = result.reason?.message || 'desconocido';
        notFound.push(msg);
      }
    }

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
      toast.warning(
        `Cantidad ajustada por stock:\n${adjusted.join('\n')}`,
        { duration: Infinity, action: { label: 'Entendido', onClick: () => {} } },
      );
    }
    if (added === 0 && notFound.length === 0 && outOfStock.length === 0) {
      toast.error('No se pudo agregar ningún producto');
    }

    setBulkProcessing(false);
    setBulkText('');
    setBulkMode(false);
    inputRef.current?.focus();
  }, [bulkLines, countryId, branchId, addItem]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!products || products.length === 0) {
      // If Enter is pressed and no dropdown, try barcode lookup
      if (e.key === 'Enter' && query.length > 0) {
        e.preventDefault();
        handleBarcodeInput(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, products.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (products[selectedIndex]) {
          handleSelectProduct(products[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  const cartItems = usePosCartStore((state) => state.cart.items);

  const handleSelectProduct = (product: QuickProduct) => {
    // Si es un kit de inscripción, delegar al padre antes de validar nada
    if (product.isEnrollmentKit && onKitDetected) {
      onKitDetected(product);
      setQuery('');
      setSkuQuery('');
      setIsOpen(false);
      setSelectedIndex(0);
      inputRef.current?.focus();
      return;
    }

    // Parse quantity from SKU input if comma present (e.g. "9019,4")
    const skuParts = skuQuery.split(',');
    const parsedQty = skuParts.length > 1 ? parseInt(skuParts[1].trim(), 10) : 1;
    const requestedQty = isNaN(parsedQty) || parsedQty < 1 ? 1 : parsedQty;

    if (product.stock !== undefined && product.stock <= 0) {
      toast.error(`${product.name} no tiene existencias en esta sucursal`);
      return;
    }
    let effectiveQty = requestedQty;
    if (product.stock !== undefined) {
      const existing = cartItems.find((i) => i.productId === product.id);
      const inCart = existing ? existing.quantity : 0;
      const available = product.stock - inCart;
      if (available <= 0) {
        toast.error(`Stock máximo alcanzado (${product.stock})`);
        return;
      }
      effectiveQty = Math.min(requestedQty, available);
      if (effectiveQty < requestedQty) {
        toast.warning(
          `${product.sku}: se agregaron ${effectiveQty} de ${requestedQty} (stock: ${product.stock})`,
          { duration: Infinity, action: { label: 'Entendido', onClick: () => {} } },
        );
      }
    }
    addItem(product, effectiveQty);
    onProductSelected?.(product);
    toast.success(`${product.name} x${effectiveQty} agregado`);
    setQuery('');
    setSkuQuery('');
    setIsOpen(false);
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  // Show dropdown when there are results
  useEffect(() => {
    if (products && products.length > 0 && (query.length >= 2 || skuQuery.length >= 1)) {
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [products, query, skuQuery]);

  // Focus input on mount
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node) &&
        !skuInputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSkuKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!products || products.length === 0) {
      if (e.key === 'Enter' && skuQuery.length > 0) {
        e.preventDefault();
        handleBarcodeInput(skuQuery);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, products.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (products[selectedIndex]) {
          handleSelectProduct(products[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSkuQuery('');
        break;
    }
  };

  return (
    <div className="relative w-full">
      {bulkMode ? (
        /* ===== BULK MODE ===== */
        <div className="border-2 border-[#3E667D]/30 rounded-xl p-4 bg-[#C8DDF2]/5">
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
        /* ===== NORMAL MODE ===== */
        <>
          {/* Search Inputs */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSkuQuery(''); }}
                onKeyDown={handleKeyDown}
                onFocus={() => query.length >= 2 && products && products.length > 0 && setIsOpen(true)}
                placeholder="Buscar producto por nombre..."
                className="w-full pl-12 pr-10 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent transition-all"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="relative w-44">
              <input
                ref={skuInputRef}
                type="text"
                value={skuQuery}
                onChange={(e) => { setSkuQuery(e.target.value); setQuery(''); }}
                onKeyDown={handleSkuKeyDown}
                onFocus={() => skuQuery.length >= 1 && products && products.length > 0 && setIsOpen(true)}
                placeholder="SKU,cant"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent transition-all"
              />
              {skuQuery && (
                <button
                  onClick={() => {
                    setSkuQuery('');
                    skuInputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            {/* Bulk mode toggle */}
            <button
              onClick={() => { setBulkMode(true); setTimeout(() => bulkTextareaRef.current?.focus(), 50); }}
              title="Alta masiva"
              className="px-3 py-3 border border-gray-300 rounded-xl hover:bg-[#C8DDF2]/20 hover:border-[#3E667D]/30 text-gray-500 hover:text-[#3E667D] transition-all"
            >
              <QueueListIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Loading indicator */}
          {isLoading && (query.length >= 2 || skuQuery.length >= 1) && (
            <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-xl shadow-lg border text-center text-gray-500">
              Buscando...
            </div>
          )}

          {/* Results Dropdown */}
          {isOpen && products && products.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border max-h-96 overflow-y-auto z-50"
            >
              {products.map((product, index) => {
                const outOfStock = product.stock !== undefined && product.stock <= 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
                      outOfStock ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'
                    } ${index === selectedIndex ? 'bg-[#C8DDF2]/10' : ''} ${index !== products.length - 1 ? 'border-b' : ''}`}
                  >
                    {/* Product Image */}
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                          {product.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      {outOfStock && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                          <span className="text-red-700 text-[10px] font-bold bg-white/80 px-1 rounded">AGOTADO</span>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-grow min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        SKU: {product.sku}
                        {product.categoryName && ` • ${product.categoryName}`}
                      </p>
                    </div>

                    {/* Price & Stock */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#3E667D]">
                        ${product.basePrice.toFixed(2)}
                      </p>
                      {product.stock !== undefined && (
                        <p className={`text-xs font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.stock > 0 ? `${product.stock} en stock` : 'Sin existencias'}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {!isLoading && (query.length >= 2 || skuQuery.length >= 1) && products && products.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-xl shadow-lg border text-center text-gray-500">
              No se encontraron productos
              {query.length >= 2 && !skuQuery && (
                <button
                  onClick={() => handleBarcodeInput(query)}
                  className="block w-full mt-2 text-[#3E667D] hover:underline text-sm"
                >
                  Buscar por código exacto
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
