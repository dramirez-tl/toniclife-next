// components/pos/PosCustomerSelector.tsx - Distributor customer selector for POS
'use client';

import { useState, useRef, useCallback } from 'react';
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
  /** Fallback price type ID for distributors who have no priceTypeId assigned in the DB */
  distributorPriceTypeId?: string;
}

export function PosCustomerSelector({ prominent = false, countryId, distributorPriceTypeId }: PosCustomerSelectorProps) {
  const [customerNumber, setCustomerNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mothersLastName, setMothersLastName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCustomerNumber, setSearchCustomerNumber] = useState<string | undefined>(undefined);
  const [searchNameFields, setSearchNameFields] = useState<{ firstName?: string; lastName?: string; mothersLastName?: string } | undefined>(undefined);
  const [hasSearched, setHasSearched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cart = usePosCartStore((s) => s.cart);
  const setCustomer = usePosCartStore((s) => s.setCustomer);
  const refreshItemPrices = usePosCartStore((s) => s.refreshItemPrices);

  const { data: results, isLoading } = usePosCustomerSearch(searchQuery, searchQuery.length >= 2 || (!!searchCustomerNumber && searchCustomerNumber.length >= 1), searchCustomerNumber, searchNameFields);
  const customers = results?.data || [];

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
    const fullName = [customer.firstName, customer.lastName, customer.lastNameMother].filter(Boolean).join(' ');
    // Use customer's own price type, or fall back to the distributor price type when not assigned
    const effectivePriceTypeId = customer.priceTypeId ?? distributorPriceTypeId ?? undefined;
    setCustomer(customer.id, fullName, customer.rfc ?? undefined, effectivePriceTypeId);
    setSearchQuery('');
    setSearchCustomerNumber(undefined);
    setHasSearched(false);
    setCustomerNumber('');
    setFirstName('');
    setLastName('');
    setMothersLastName('');

    // Refresh cart item prices with customer's price type
    if (effectivePriceTypeId) {
      await refreshPrices(effectivePriceTypeId);
    }
  }, [setCustomer, refreshPrices, distributorPriceTypeId]);

  const handleRemove = useCallback(async () => {
    setCustomer(undefined, undefined, undefined, undefined);
    // Revert to public prices
    await refreshPrices(PUBLIC_PRICE_TYPE_ID);
  }, [setCustomer, refreshPrices]);

  const handleSearch = () => {
    const trimmedNumber = customerNumber.trim();
    const trimFirst = firstName.trim();
    const trimLast = lastName.trim();
    const trimMothers = mothersLastName.trim();
    const hasNameInput = trimFirst || trimLast || trimMothers;

    if (!trimmedNumber && !hasNameInput) return;

    if (trimmedNumber) {
      // Exact match by customer number
      setSearchCustomerNumber(trimmedNumber);
      setSearchNameFields(undefined);
      setSearchQuery(trimmedNumber); // needed for enabled check
    } else {
      // Individual name field search (AND logic in backend)
      setSearchCustomerNumber(undefined);
      setSearchNameFields({
        firstName: trimFirst || undefined,
        lastName: trimLast || undefined,
        mothersLastName: trimMothers || undefined,
      });
      // searchQuery is needed for the enabled check (>= 2 chars)
      setSearchQuery([trimFirst, trimLast, trimMothers].filter(Boolean).join(' '));
    }
    setHasSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
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

  const inputClass = prominent
    ? 'w-full px-3 py-2 text-sm border-2 border-[#3E667D]/20 bg-[#C8DDF2]/10 rounded-lg focus:ring-2 focus:ring-[#3E667D]/40 focus:border-[#3E667D]/50 placeholder:text-gray-400 transition-all'
    : 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent placeholder:text-gray-400 transition-all';

  // Search form with individual fields
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">No. Distribuidor</label>
          <input
            type="text"
            value={customerNumber}
            onChange={(e) => setCustomerNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: 1772046"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Apellido Paterno</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apellido paterno"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Apellido Materno</label>
          <input
            type="text"
            value={mothersLastName}
            onChange={(e) => setMothersLastName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apellido materno"
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSearch}
        disabled={isLoading || (!customerNumber.trim() && !firstName.trim() && !lastName.trim() && !mothersLastName.trim())}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3E667D] text-white rounded-lg font-medium text-sm hover:bg-[#3E667D]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        {isLoading ? 'Buscando...' : 'Buscar Distribuidor'}
      </button>

      {/* Results */}
      {hasSearched && !isLoading && customers.length > 0 && (
        <div
          ref={dropdownRef}
          className="mt-2 bg-white rounded-lg shadow-lg border max-h-48 overflow-y-auto"
        >
          {customers.map((customer, index) => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 ${
                index !== customers.length - 1 ? 'border-b' : ''
              }`}
            >
              <UserIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {[customer.firstName, customer.lastName, customer.lastNameMother].filter(Boolean).join(' ')}
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
      {hasSearched && !isLoading && customers.length === 0 && (searchQuery.length >= 2 || !!searchCustomerNumber) && (
        <div className="mt-2 p-3 bg-white rounded-lg shadow-lg border text-center text-sm text-gray-500">
          No se encontraron distribuidores
        </div>
      )}
    </div>
  );
}
