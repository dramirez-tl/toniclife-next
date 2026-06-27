// components/cart/CartSummary.tsx - Cart summary with totals
'use client';

import { formatCurrency } from '@/lib/currency';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import type { Cart } from '@/types/cart';

interface CartSummaryProps {
  cart: Cart;
}

export function CartSummary({ cart }: CartSummaryProps) {
  const { currency, lang, countryCode } = useStoreCountry();
  const fmt = (n: number) => formatCurrency(n, currency, lang);
  const subtotal = parseFloat(cart.subtotal);
  const discount = parseFloat(cart.discountAmount);
  const total = parseFloat(cart.total);
  // MX: precios con IVA incluido. US y demás: el impuesto se suma en checkout.
  const taxIncluded = countryCode === 'MX';

  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen del Pedido</h3>

      {/* Summary Lines */}
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal ({cart.itemCount} productos)</span>
          <span>{fmt(subtotal)}</span>
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Descuento</span>
            <span>-{fmt(discount)}</span>
          </div>
        )}

        {taxIncluded && (
          <div className="flex justify-between text-gray-500 text-sm">
            <span>IVA incluido en precios</span>
          </div>
        )}

        <div className="flex justify-between text-gray-500 text-sm">
          <span>Envío</span>
          <span>Calculado en checkout</span>
        </div>
      </div>

      {/* Total */}
      <div className="mt-4 pt-4 border-t border-gray-300">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-[#3E667D]">
            {fmt(total)}
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
