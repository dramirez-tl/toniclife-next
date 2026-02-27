// components/cart/CartSummary.tsx - Cart summary with totals
'use client';

import { cartService } from '@/services/cart.service';
import type { Cart } from '@/types/cart';

interface CartSummaryProps {
  cart: Cart;
}

const FREE_SHIPPING_THRESHOLD = 999;

export function CartSummary({ cart }: CartSummaryProps) {
  const subtotal = parseFloat(cart.subtotal);
  const tax = parseFloat(cart.taxAmount);
  const discount = parseFloat(cart.discountAmount);
  const total = parseFloat(cart.total);

  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen del Pedido</h3>

      {/* Summary Lines */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({cart.itemCount} productos)</span>
          <span>{cartService.formatCurrency(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Descuento</span>
            <span>-{cartService.formatCurrency(discount)}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-600">
          <span>IVA</span>
          <span>{cartService.formatCurrency(tax)}</span>
        </div>

        <div className="flex justify-between text-gray-500 text-sm">
          <span>Envío</span>
          <span>
            {subtotal >= FREE_SHIPPING_THRESHOLD ? 'Gratis' : 'Calculado en checkout'}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-[#3E667D]">
            {cartService.formatCurrency(total)}
          </span>
        </div>

        {/* Points */}
        {cart.totalPoints > 0 && (
          <p className="text-sm text-[#3E667D] mt-1 text-right">
            +{cart.totalPoints} puntos por esta compra
          </p>
        )}
      </div>
    </div>
  );
}
