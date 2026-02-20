// components/pos/PosCart.tsx - Shopping cart component for POS
'use client';

import { TrashIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline';
import { usePosCartStore } from '@/stores/pos-cart.store';
import Image from 'next/image';

interface PosCartProps {
  onCheckout?: () => void;
  disabled?: boolean;
}

export function PosCart({ onCheckout, disabled }: PosCartProps) {
  const { cart, updateItemQuantity, removeItem, clearCart } = usePosCartStore();

  const hasItems = cart.items.length > 0;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold text-gray-900">
          Carrito ({cart.items.length})
        </h2>
        {hasItems && (
          <button
            onClick={clearCart}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Vaciar
          </button>
        )}
      </div>

      {/* Items List */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
            <svg
              className="h-16 w-16 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm">Busca productos para agregar</p>
          </div>
        ) : (
          cart.items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              {/* Image */}
              <div className="w-12 h-12 bg-white rounded-lg overflow-hidden flex-shrink-0 border">
                {item.productImage ? (
                  <Image
                    src={item.productImage}
                    alt={item.productName}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                    {item.productName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-grow min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {item.productName}
                </p>
                <p className="text-xs text-gray-500">${item.unitPrice.toFixed(2)} c/u</p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                  className="p-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="w-8 text-center font-medium text-sm">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                  className="p-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Total */}
              <div className="text-right w-20 flex-shrink-0">
                <p className="font-bold text-[#003B7A] text-sm">
                  ${item.total.toFixed(2)}
                </p>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(item.productId)}
                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      {hasItems && (
        <div className="p-4 border-t bg-gray-50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${cart.subtotal.toFixed(2)}</span>
          </div>

          {cart.discountAmount && cart.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                Descuento
                {cart.discountPercent && ` (${cart.discountPercent}%)`}
              </span>
              <span>-${cart.discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IVA (16%)</span>
            <span className="font-medium">${cart.taxAmount.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-[#003B7A]">${cart.total.toFixed(2)}</span>
          </div>

          {/* Customer Info */}
          {cart.customerName && (
            <div className="text-sm text-gray-600 pt-2 border-t">
              <p>Cliente: {cart.customerName}</p>
              {cart.customerRfc && <p>RFC: {cart.customerRfc}</p>}
            </div>
          )}

          {cart.requiresInvoice && (
            <div className="text-sm text-blue-600 font-medium">
              Requiere factura
            </div>
          )}
        </div>
      )}

      {/* Checkout Button */}
      <div className="p-4 border-t">
        <button
          onClick={onCheckout}
          disabled={!hasItems || disabled}
          className="w-full py-4 px-6 bg-[#7AB82E] text-white font-bold text-lg rounded-xl hover:bg-[#6aa526] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cobrar ${cart.total.toFixed(2)}
        </button>
      </div>
    </div>
  );
}
