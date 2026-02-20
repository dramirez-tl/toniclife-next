// components/cart/CartSummary.tsx - Cart summary with totals
'use client';

import { useState } from 'react';
import { TagIcon, XMarkIcon, CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useApplyCoupon, useRemoveCoupon, useValidateCoupon } from '@/hooks/useCart';
import { cartService } from '@/services/cart.service';
import type { Cart } from '@/types/cart';
import { toast } from 'sonner';

interface CartSummaryProps {
  cart: Cart;
  showCouponInput?: boolean;
}

export function CartSummary({ cart, showCouponInput = true }: CartSummaryProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const validateCoupon = useValidateCoupon();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsValidating(true);
    try {
      // First validate
      const result = await validateCoupon.mutateAsync({ code: couponCode.trim() });

      if (result.valid) {
        // Apply the coupon
        await applyCoupon.mutateAsync({ code: couponCode.trim() });
        toast.success(`Cupón "${result.code}" aplicado`);
        setCouponCode('');
      } else {
        toast.error(result.errorMessage || 'Cupón inválido');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al aplicar cupón');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCoupon.mutateAsync();
      toast.success('Cupón removido');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al remover cupón');
    }
  };

  const hasCoupon = !!cart.coupon;
  const hasDiscount = parseFloat(cart.discountAmount) > 0;
  const hasShipping = parseFloat(cart.shippingAmount) > 0;

  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen del Pedido</h3>

      {/* Coupon Input */}
      {showCouponInput && !hasCoupon && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Tienes un cupón?
          </label>
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Código de cupón"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
              />
            </div>
            <button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || isValidating}
              className="px-4 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002b5c] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isValidating ? '...' : 'Aplicar'}
            </button>
          </div>
        </div>
      )}

      {/* Applied Coupon */}
      {hasCoupon && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckIcon className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">{cart.coupon!.code}</p>
              <p className="text-xs text-green-600">{cart.coupon!.name}</p>
            </div>
          </div>
          <button
            onClick={handleRemoveCoupon}
            disabled={removeCoupon.isPending}
            className="p-1 text-green-600 hover:text-red-500 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Summary Lines */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({cart.itemCount} productos)</span>
          <span>{cartService.formatCurrency(cart.subtotal)}</span>
        </div>

        {hasDiscount && (
          <div className="flex justify-between text-green-600">
            <span>Descuento</span>
            <span>-{cartService.formatCurrency(cart.discountAmount)}</span>
          </div>
        )}

        {hasCoupon && cart.couponDiscountAmount && (
          <div className="flex justify-between text-green-600">
            <span>Cupón ({cart.coupon!.code})</span>
            <span>-{cartService.formatCurrency(cart.couponDiscountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-600">
          <span>IVA</span>
          <span>{cartService.formatCurrency(cart.taxAmount)}</span>
        </div>

        {hasShipping ? (
          <div className="flex justify-between text-gray-600">
            <span>Envío</span>
            <span>{cartService.formatCurrency(cart.shippingAmount)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-gray-500 text-sm">
            <span>Envío</span>
            <span>Calculado en checkout</span>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-[#003B7A]">
            {cartService.formatCurrency(cart.total)}
          </span>
        </div>

        {/* Points */}
        {cart.totalPoints > 0 && (
          <p className="text-sm text-[#7AB82E] mt-1 text-right">
            +{cart.totalPoints} puntos por esta compra
          </p>
        )}
      </div>
    </div>
  );
}
