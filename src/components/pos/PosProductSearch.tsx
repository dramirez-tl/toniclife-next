// components/pos/PosProductSearch.tsx - Product search for POS
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePosProductSearch } from '@/hooks/usePos';
import { usePosCartStore } from '@/stores/pos-cart.store';
import type { QuickProduct } from '@/types/pos';
import { posService } from '@/services/pos.service';
import { toast } from 'sonner';
import Image from 'next/image';

interface PosProductSearchProps {
  onProductSelected?: (product: QuickProduct) => void;
  autoFocus?: boolean;
  branchId?: string;
  priceTypeId?: string;
}

export function PosProductSearch({ onProductSelected, autoFocus = true, branchId, priceTypeId }: PosProductSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading } = usePosProductSearch(query, query.length >= 2, branchId, priceTypeId);
  const addItem = usePosCartStore((state) => state.addItem);

  // Handle barcode scan (typically fast input ending with Enter)
  const handleBarcodeInput = useCallback(async (sku: string) => {
    const product = await posService.getProductBySku(sku.trim());
    if (product) {
      addItem(product);
      onProductSelected?.(product);
      toast.success(`${product.name} agregado`);
      setQuery('');
    } else {
      toast.error(`Producto no encontrado: ${sku}`);
    }
  }, [addItem, onProductSelected]);

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
    if (product.stock !== undefined && product.stock <= 0) {
      toast.error(`${product.name} no tiene existencias en esta sucursal`);
      return;
    }
    // Check if adding one more would exceed stock
    if (product.stock !== undefined) {
      const existing = cartItems.find((i) => i.productId === product.id);
      if (existing && existing.quantity >= product.stock) {
        toast.error(`Stock máximo alcanzado (${product.stock})`);
        return;
      }
    }
    addItem(product);
    onProductSelected?.(product);
    toast.success(`${product.name} agregado`);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  // Show dropdown when there are results
  useEffect(() => {
    if (products && products.length > 0 && query.length >= 2) {
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [products, query]);

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
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && products && products.length > 0 && setIsOpen(true)}
          placeholder="Buscar producto por nombre o escanear código..."
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

      {/* Loading indicator */}
      {isLoading && query.length >= 2 && (
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
      {!isLoading && query.length >= 2 && products && products.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white rounded-xl shadow-lg border text-center text-gray-500">
          No se encontraron productos
          <button
            onClick={() => handleBarcodeInput(query)}
            className="block w-full mt-2 text-[#3E667D] hover:underline text-sm"
          >
            Buscar por código exacto
          </button>
        </div>
      )}
    </div>
  );
}
