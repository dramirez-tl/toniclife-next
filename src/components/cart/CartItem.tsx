// components/cart/CartItem.tsx - Individual cart item component
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useUpdateCartItem, useRemoveCartItem } from '@/hooks/useCart';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/currency';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import type { CartItem as CartItemType } from '@/types/cart';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const t = useTranslations('cart');
  const { currency, lang } = useStoreCountry();
  const fmt = (n: number | string) => formatCurrency(n, currency, lang);
  const [isUpdating, setIsUpdating] = useState(false);
  const [imgError, setImgError] = useState(false);
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1 || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        data: { quantity: newQuantity },
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      await removeItem.mutateAsync(item.id);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex gap-4 py-4 border-b border-gray-100">
      {/* Product Image */}
      <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
        {item.productImageUrl && !imgError ? (
          <Image
            src={item.productImageUrl}
            alt={item.productName}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#C8DDF2]/30 to-[#3E667D]/20 flex items-center justify-center">
            <span className="text-lg font-bold text-[#3E667D]/70">
              {(() => {
                const words = item.productName.split(/\s+/).filter(w => w.length > 0);
                return words.length >= 2
                  ? (words[0][0] + words[1][0]).toUpperCase()
                  : item.productName.substring(0, 2).toUpperCase();
              })()}
            </span>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex-grow min-w-0">
        <h4 className="font-medium text-gray-900 truncate">
          {item.productName}
        </h4>
        <p className="text-sm text-gray-500">SKU: {item.productCode}</p>

        {/* Price */}
        <div className="mt-1 flex items-center gap-2">
          <span className="font-bold text-[#3E667D]">
            {fmt(item.unitPrice)}
          </span>
          {item.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              {fmt(item.originalPrice)}
            </span>
          )}
        </div>

        {/* Points */}
        {item.points > 0 && (
          <p className="text-xs text-[#3E667D]">{t('points', { points: item.points })}</p>
        )}
      </div>

      {/* Quantity Controls */}
      <div className="flex flex-col items-end justify-between">
        <button
          onClick={handleRemove}
          disabled={isUpdating}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          aria-label={t('emptyAction')}
        >
          <TrashIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            disabled={item.quantity <= 1 || isUpdating}
            className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MinusIcon className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-medium">{item.quantity}</span>
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            disabled={isUpdating}
            className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Line Total */}
        <span className="font-bold text-gray-900">
          {fmt(item.lineTotal)}
        </span>
      </div>
    </div>
  );
}
