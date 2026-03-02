// components/pos/PosCustomerSelector.tsx - Distributor customer selector for POS
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UserIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { usePosCustomerSearch } from '@/hooks/usePos';
import { usePosCartStore } from '@/stores/pos-cart.store';
import { posService } from '@/services/pos.service';
import type { Customer } from '@/types/customer';

// Public price type ID (fallback when no customer selected)
const PUBLIC_PRICE_TYPE_ID = '13c1528d-c093-4c74-86ad-86e9e55231e6';

interface PosCustomerSelectorProps {
  /** Larger, teal-styled input for center panel */
  prominent?: boolean;
  /** Branch country ID for correct price resolution */
  countryId?: string;
}

export function PosCustomerSelector({ prominent = false, countryId }: PosCustomerSelectorProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cart = usePosCartStore((s) => s.cart);
  const setCustomer = usePosCartStore((s) => s.setCustomer);
  const refreshItemPrices = usePosCartStore((s) => s.refreshItemPrices);

  const { data: results, isLoading, isError } = usePosCustomerSearch(debouncedQuery, debouncedQuery.length >= 2);
  const customers = results?.data || [];

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Show dropdown when query is long enough and we got a response
  const showDropdown = isOpen && debouncedQuery.length >= 2 && !isLoading;

  // Open/close dropdown based on query and results
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refreshPrices = useCallback(async (priceTypeId: string) => {
    const productIds = usePosCartStore.getState().cart.items.map((i) => i.productId);
    if (productIds.length === 0) return;
    try {
      const prices = await posService.resolveProductPrices(productIds, priceTypeId, countryId);
      refreshItemPrices(prices);
    } catch {
      // Silent fail - prices will stay as is
    }
  }, [refreshItemPrices, countryId]);

  const handleSelect = useCallback(async (customer: Customer) => {
    const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
    setCustomer(customer.id, fullName, customer.rfc ?? undefined, customer.priceTypeId ?? undefined);
    setQuery('');
    setIsOpen(false);

    // Refresh cart item prices with customer's price type
    if (customer.priceTypeId) {
      await refreshPrices(customer.priceTypeId);
    }
  }, [setCustomer, refreshPrices]);

  const handleRemove = useCallback(async () => {
    setCustomer(undefined, undefined, undefined, undefined);
    // Revert to public prices
    await refreshPrices(PUBLIC_PRICE_TYPE_ID);
  }, [setCustomer, refreshPrices]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!customers.length) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, customers.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (customers[selectedIndex]) {
          handleSelect(customers[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  // Selected customer display
  if (cart.customerId && cart.customerName) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[#C8DDF2]/30 border border-[#3E667D]/20 rounded-lg">
        <UserIcon className="h-4 w-4 text-[#3E667D] flex-shrink-0" />
        <div className="flex-grow min-w-0">
          <p className="text-sm font-medium text-[#3E667D] truncate">{cart.customerName}</p>
          {cart.customerRfc && (
            <p className="text-xs text-gray-500">RFC: {cart.customerRfc}</p>
          )}
        </div>
        <button
          onClick={handleRemove}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Search input
  return (
    <div className="relative">
      <div className="relative">
        <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 ${prominent ? 'h-5 w-5 text-[#3E667D]/50' : 'h-4 w-4 text-gray-400'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => debouncedQuery.length >= 2 && setIsOpen(true)}
          placeholder="Buscar distribuidor (nombre o ID)..."
          autoFocus={prominent}
          className={prominent
            ? 'w-full pl-10 pr-4 py-3 text-base border-2 border-[#3E667D]/30 bg-[#C8DDF2]/10 rounded-xl focus:ring-2 focus:ring-[#3E667D]/40 focus:border-[#3E667D]/50 placeholder:text-[#3E667D]/40 transition-all'
            : 'w-full pl-9 pr-3 py-2 text-sm border border-orange-300 bg-orange-50 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent placeholder:text-orange-400 transition-all'
          }
        />
      </div>

      {/* Loading */}
      {isLoading && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white rounded-lg shadow-lg border text-center text-sm text-gray-500 z-50">
          Buscando...
        </div>
      )}

      {/* Results Dropdown */}
      {showDropdown && customers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border max-h-48 overflow-y-auto z-50"
        >
          {customers.map((customer, index) => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 ${
                index === selectedIndex ? 'bg-[#C8DDF2]/10' : ''
              } ${index !== customers.length - 1 ? 'border-b' : ''}`}
            >
              <UserIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  #{customer.customerNumber}
                  {customer.rfc && ` • RFC: ${customer.rfc}`}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 flex-shrink-0">
                Distribuidor
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {showDropdown && customers.length === 0 && !isError && (
        <div className="absolute top-full left-0 right-0 mt-1 p-3 bg-white rounded-lg shadow-lg border text-center text-sm text-gray-500 z-50">
          No se encontraron distribuidores
        </div>
      )}
    </div>
  );
}
