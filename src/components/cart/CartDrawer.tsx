'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Badge } from '@/components/ui';
import {
  XMarkIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  ShoppingBagIcon,
  TruckIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { products } from '@/lib/mock-data';
import type { CartItem } from '@/types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock cart data for demo
const mockCartItems: CartItem[] = [
  { product: products[0], quantity: 2 }, // Tonic Life
  { product: products[3], quantity: 1 }, // Lexi Life
  { product: products[6], quantity: 1 }, // Oxifila
];

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>(mockCartItems);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);

  const updateQuantity = (productId: string, delta: number) => {
    setCartItems(items =>
      items.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setCartItems(items => items.filter(item => item.product.id !== productId));
  };

  const applyCoupon = () => {
    if (couponCode.toLowerCase() === 'wellness10') {
      setCouponApplied(true);
    }
  };

  // Calculations
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discount = couponApplied ? subtotal * 0.1 : 0;
  const shipping = subtotal >= 99 ? 0 : 9.99;
  const total = subtotal - discount + shipping;

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
            <ShoppingBagIcon className="h-6 w-6 text-[#003B7A]" />
            <h2 className="text-lg font-bold text-[#003B7A]">Tu Carrito</h2>
            <Badge variant="success">{cartItems.length} items</Badge>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Free Shipping Banner */}
        {subtotal < 99 && (
          <div className="bg-[#7AB82E]/10 px-4 py-3 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-[#7AB82E]" />
            <p className="text-sm text-[#003B7A]">
              ¡Agrega <span className="font-bold">${(99 - subtotal).toFixed(2)}</span> más para envío gratis!
            </p>
          </div>
        )}
        {subtotal >= 99 && (
          <div className="bg-[#7AB82E]/10 px-4 py-3 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-[#7AB82E]" />
            <p className="text-sm text-[#7AB82E] font-medium">
              ¡Felicidades! Tienes envío gratis
            </p>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBagIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Tu carrito está vacío</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={onClose}
              >
                Explorar Productos
              </Button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-4 bg-gray-50 rounded-xl p-4"
              >
                {/* Product Image */}
                <div className="w-20 h-20 bg-white rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm">
                  <span className="text-xl font-bold text-[#003B7A]">
                    {item.product.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Product Info */}
                <div className="flex-grow min-w-0">
                  <h3 className="font-semibold text-[#003B7A] truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {item.product.shortDescription}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 rounded-lg bg-white border border-gray-200 hover:border-[#7AB82E] transition-colors"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 rounded-lg bg-white border border-gray-200 hover:border-[#7AB82E] transition-colors"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[#003B7A]">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-4 bg-white">
            {/* Coupon Code */}
            <div className="flex gap-2">
              <div className="flex-grow relative">
                <TagIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Código de descuento"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7AB82E]"
                />
              </div>
              <Button
                variant="outline"
                onClick={applyCoupon}
                disabled={!couponCode || couponApplied}
              >
                Aplicar
              </Button>
            </div>

            {couponApplied && (
              <div className="flex items-center gap-2 text-[#7AB82E] text-sm">
                <TagIcon className="h-4 w-4" />
                <span>Cupón WELLNESS10 aplicado - 10% descuento</span>
              </div>
            )}

            {/* Order Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#7AB82E]">
                  <span>Descuento</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span>{shipping === 0 ? 'Gratis' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#003B7A] pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button fullWidth size="lg">
              <Link href="/checkout" onClick={onClose}>
                Proceder al Checkout
              </Link>
            </Button>

            {/* Continue Shopping */}
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-gray-500 hover:text-[#7AB82E] transition-colors"
            >
              Continuar comprando
            </button>

            {/* Payment Methods */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-400">Pago seguro con:</span>
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
