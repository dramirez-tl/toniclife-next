// components/cart/CartDrawer.tsx - Slide-out cart drawer with API integration
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Badge } from '@/components/ui';
import {
  XMarkIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  ShoppingBagIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useCart, useClearCart, useUpdateCartItem, useRemoveCartItem } from '@/hooks/useCart';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/currency';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { toast } from 'sonner';

function DrawerProductImage({ src, name }: { src?: string; name: string }) {
  const [error, setError] = useState(false);
  const initials = (() => {
    const words = name.split(/\s+/).filter(w => w.length > 0);
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  })();

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <span className="text-xl font-bold text-[#3E667D]/70">{initials}</span>
  );
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}


export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const t = useTranslations('cart');
  const { currency, lang } = useStoreCountry();
  const fmt = (n: number | string) => formatCurrency(n, currency, lang);
  const { data: cart, isLoading } = useCart();
  const clearCart = useClearCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateItem.mutateAsync({ itemId, data: { quantity: newQuantity } });
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('updateError'));
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem.mutateAsync(itemId);
      toast.success(t('removedShort'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('removeError'));
    }
  };

  const handleClearCart = () => {
    toast(t('confirmEmptyTitle'), {
      description: t('confirmEmptyDesc'),
      action: {
        label: t('emptyAction'),
        onClick: async () => {
          try {
            await clearCart.mutateAsync();
            toast.success(t('emptied'));
          } catch (error: any) {
            toast.error(error.response?.data?.message || t('emptyError'));
          }
        },
      },
      cancel: {
        label: t('cancel'),
        onClick: () => {},
      },
    });
  };

  // Calculations
  const subtotal = cart ? parseFloat(cart.subtotal) : 0;
  const total = cart ? parseFloat(cart.total) : 0;
  const discount = cart ? parseFloat(cart.discountAmount) : 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBagIcon className="h-6 w-6 text-[#3E667D]" />
            <h2 className="text-lg font-bold text-[#3E667D]">{t('title')}</h2>
            {cart && cart.itemCount > 0 && (
              <Badge variant="success">{t('itemsShort', { count: cart.itemCount })}</Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D]"></div>
            </div>
          ) : !cart || cart.items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBagIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">{t('emptyDrawer')}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={onClose}
              >
                {t('exploreProducts')}
              </Button>
            </div>
          ) : (
            <>
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 bg-gray-50 rounded-xl p-4"
                >
                  {/* Product Image */}
                  <div className="w-20 h-20 bg-white rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm overflow-hidden">
                    <DrawerProductImage src={item.productImageUrl} name={item.productName} />
                  </div>

                  {/* Product Info */}
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-[#3E667D] truncate">
                      {item.productName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      SKU: {item.productCode}
                    </p>
                    <p className="text-sm text-[#3E667D] font-medium">
                      {fmt(item.unitPrice)} {t('perUnit')}
                    </p>

                    {/* Points */}
                    {item.points > 0 && (
                      <p className="text-xs text-[#3E667D]">{t('points', { points: item.points })}</p>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || updateItem.isPending}
                          className="p-1 rounded-lg bg-white border border-gray-200 hover:border-[#a7c1e2] transition-colors disabled:opacity-50"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={updateItem.isPending}
                          className="p-1 rounded-lg bg-white border border-gray-200 hover:border-[#a7c1e2] transition-colors disabled:opacity-50"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#3E667D]">
                          {fmt(item.lineTotal)}
                        </span>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={removeItem.isPending}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Clear Cart Button */}
              <button
                onClick={handleClearCart}
                disabled={clearCart.isPending}
                className="w-full text-sm text-red-500 hover:text-red-600 py-2 disabled:opacity-50"
              >
                {t('clearCart')}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-4 bg-white">
            {/* Order Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t('subtotal', { count: cart.itemCount })}</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('discount')}</span>
                  <span>-{fmt(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>{t('shipping')}</span>
                <span>{t('shippingAtCheckout')}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#3E667D] pt-2 border-t border-gray-100">
                <span>{t('total')}</span>
                <span>{fmt(total)}</span>
              </div>

              {/* Points */}
              {cart.totalPoints > 0 && (
                <p className="text-xs text-[#3E667D] text-center">
                  {t('pointsForPurchase', { points: cart.totalPoints })}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Link
                href="/carrito"
                onClick={onClose}
                className="block w-full py-3 text-center border-2 border-[#3E667D] text-[#3E667D] rounded-xl font-bold hover:bg-[#3E667D]/5 transition-colors"
              >
                {t('viewFullCart')}
              </Link>
              <Link
                href="/checkout"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#3E667D] text-white rounded-xl font-bold hover:bg-[#6aa526] transition-colors"
              >
                {t('proceedCheckout')}
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>

            {/* Continue Shopping */}
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-gray-500 hover:text-[#3E667D] transition-colors"
            >
              {t('keepShopping')}
            </button>

            {/* Payment Methods */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400">{t('securePaymentWith')}</span>
              <div className="flex items-center gap-2">
                {['Visa', 'MC', 'Amex', 'PayPal'].map((method) => (
                  <div
                    key={method}
                    className="w-10 h-6 bg-gray-100 rounded flex items-center justify-center text-[8px] font-bold text-gray-500"
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
