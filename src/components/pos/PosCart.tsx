// components/pos/PosCart.tsx - Shopping cart component for POS
'use client';

import { TrashIcon, PlusIcon, MinusIcon, ShoppingCartIcon, UserIcon } from '@heroicons/react/24/outline';
import { usePosCartStore } from '@/stores/pos-cart.store';
import Image from 'next/image';

interface PosCartProps {
  onCheckout?: () => void;
  disabled?: boolean;
  currencySymbol?: string;
}

export function PosCart({ onCheckout, disabled, currencySymbol = '$' }: PosCartProps) {
  const { cart, updateItemQuantity, removeItem, clearCart } = usePosCartStore();

  const hasItems = cart.items.length > 0;

  const fmt = (amount: number) =>
    `${currencySymbol}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Build dynamic tax label from item rates
  const taxLabel = (() => {
    if (!hasItems) return 'Impuestos';
    const rates = new Set(cart.items.map((i) => i.taxRate));
    if (rates.size === 1) {
      const rate = rates.values().next().value!;
      const pct = Math.round(rate * 100);
      return `IVA (${pct}%)`;
    }
    return 'Impuestos';
  })();

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <ShoppingCartIcon className="h-5 w-5 text-[#3E667D]" />
          <h2 className="text-lg font-bold text-gray-900">
            Carrito
          </h2>
          {hasItems && (
            <span className="bg-[#3E667D] text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {cart.items.length}
            </span>
          )}
        </div>
        {hasItems && (
          <button
            onClick={clearCart}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded font-medium transition-colors"
          >
            Vaciar
          </button>
        )}
      </div>

      {/* Customer Display */}
      <div className="px-3 pt-3">
        {cart.customerId && cart.customerName ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-[#C8DDF2]/30 border border-[#3E667D]/20 rounded-lg">
            <UserIcon className="h-4 w-4 text-[#3E667D] flex-shrink-0" />
            <div className="flex-grow min-w-0">
              <p className="text-sm font-medium text-[#3E667D] truncate">{cart.customerName}</p>
              {cart.customerRfc && (
                <p className="text-xs text-gray-500">RFC: {cart.customerRfc}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-center text-orange-500 bg-orange-50 border border-orange-200 rounded-lg py-2 px-3">
            Selecciona un distribuidor en el panel central
          </p>
        )}
      </div>

      {/* Items List */}
      <div className="flex-grow overflow-y-auto p-3 space-y-2">
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 py-8">
            <ShoppingCartIcon className="h-16 w-16 mb-3" />
            <p className="text-sm text-gray-400">Busca productos para agregar</p>
          </div>
        ) : (
          cart.items.map((item) => (
            <div
              key={item.productId}
              className="bg-gray-50 rounded-lg border border-gray-100 p-3"
            >
              {/* Row 1: Image + Name + Remove */}
              <div className="flex items-start gap-2.5 mb-2">
                {/* Image */}
                <div className="w-10 h-10 bg-white rounded-md overflow-hidden flex-shrink-0 border border-gray-200">
                  {item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#3E667D]/10 text-[#3E667D] text-xs font-bold">
                      {item.productName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                    {item.productName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmt(item.unitPrice)} c/u
                  </p>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.productId)}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Row 2: Quantity Controls + Total */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg">
                  <button
                    onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                    className="p-1.5 hover:bg-gray-100 rounded-l-lg transition-colors text-gray-500"
                  >
                    <MinusIcon className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-9 text-center font-bold text-sm text-gray-900 select-none">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                    disabled={item.stock != null && item.quantity >= item.stock}
                    className="p-1.5 hover:bg-gray-100 rounded-r-lg transition-colors text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="font-bold text-[#3E667D] text-sm">
                  {fmt(item.total)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      {hasItems && (
        <div className="px-4 py-3 border-t bg-gray-50/80 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-700">{fmt(cart.subtotal)}</span>
          </div>

          {cart.discountAmount && cart.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                Descuento
                {cart.discountPercent && ` (${cart.discountPercent}%)`}
              </span>
              <span>-{fmt(cart.discountAmount)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{taxLabel}</span>
            <span className="font-medium text-gray-700">{fmt(cart.taxAmount)}</span>
          </div>

          <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-gray-200">
            <span className="text-gray-900">Total</span>
            <span className="text-[#3E667D]">{fmt(cart.total)}</span>
          </div>

          {/* Points & Business Volume */}
          {cart.customerId && (cart.totalPoints > 0 || cart.totalBusinessVolume > 0) && (
            <div className="pt-2 border-t border-gray-200 space-y-1">
              {cart.totalPoints > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-purple-600">Puntos</span>
                  <span className="font-medium text-purple-700">{cart.totalPoints.toFixed(2)}</span>
                </div>
              )}
              {cart.totalBusinessVolume > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-indigo-600">Valor Negocio</span>
                  <span className="font-medium text-indigo-700">{cart.totalBusinessVolume.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {cart.requiresInvoice && (
            <div className="text-xs text-blue-600 font-medium">
              Requiere factura
            </div>
          )}
        </div>
      )}

      {/* Checkout Button */}
      <div className="p-3 border-t">
        <button
          onClick={onCheckout}
          disabled={!hasItems || disabled || !cart.customerId}
          className="w-full py-3.5 px-6 bg-[#3E667D] text-white font-bold text-base rounded-xl hover:bg-[#2d4f63] active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {cart.customerId ? `Cobrar ${fmt(cart.total)}` : 'Seleccione distribuidor'}
        </button>
      </div>
    </div>
  );
}
