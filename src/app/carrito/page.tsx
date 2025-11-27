'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Header, Footer } from '@/components/layout';
import { Button, Card, Badge, Input } from '@/components/ui';
import {
  TrashIcon,
  PlusIcon,
  MinusIcon,
  ShoppingBagIcon,
  TruckIcon,
  TagIcon,
  ShieldCheckIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { products, productBundles } from '@/lib/mock-data';
import type { CartItem } from '@/types';

// Mock cart data
const initialCartItems: CartItem[] = [
  { product: products[0], quantity: 2 }, // Tonic Life
  { product: products[3], quantity: 1 }, // Lexi Life
  { product: products[6], quantity: 1 }, // Oxifila
];

export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(items =>
      items.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setCartItems(items => items.filter(item => item.product.id !== productId));
  };

  const applyCoupon = () => {
    setCouponError('');
    if (couponCode.toLowerCase() === 'wellness10') {
      setCouponApplied(true);
    } else {
      setCouponError('Cupón no válido');
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

  // Recommended products based on cart
  const recommendedBundle = productBundles[0];

  return (
    <>
      <Header />
      <main className="min-h-screen pt-32 pb-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#7AB82E] transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Continuar comprando
            </Link>
          </div>

          {/* Page Title */}
          <div className="flex items-center gap-4 mb-8">
            <ShoppingBagIcon className="h-10 w-10 text-[#003B7A]" />
            <div>
              <h1 className="text-3xl font-bold text-[#003B7A]">Tu Carrito</h1>
              <p className="text-gray-500">
                {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>

          {cartItems.length === 0 ? (
            /* Empty Cart */
            <Card className="text-center py-16">
              <ShoppingBagIcon className="h-20 w-20 mx-auto text-gray-300 mb-6" />
              <h2 className="text-2xl font-bold text-[#003B7A] mb-2">
                Tu carrito está vacío
              </h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Parece que aún no has agregado productos. Explora nuestro catálogo
                y encuentra los productos ideales para ti.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg">
                  <Link href="/productos">Ver Productos</Link>
                </Button>
                <Button variant="outline" size="lg">
                  <Link href="/quiz">Hacer el Health Quiz</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {/* Free Shipping Progress */}
                {subtotal < 99 && (
                  <Card className="bg-[#7AB82E]/10 border-[#7AB82E]/20" padding="md">
                    <div className="flex items-center gap-4">
                      <TruckIcon className="h-8 w-8 text-[#7AB82E] flex-shrink-0" />
                      <div className="flex-grow">
                        <p className="font-medium text-[#003B7A]">
                          ¡Agrega ${(99 - subtotal).toFixed(2)} más para envío gratis!
                        </p>
                        <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7AB82E] rounded-full transition-all"
                            style={{ width: `${Math.min((subtotal / 99) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Cart Items List */}
                {cartItems.map((item) => (
                  <Card key={item.product.id} className="overflow-hidden" padding="none">
                    <div className="flex flex-col sm:flex-row">
                      {/* Product Image */}
                      <Link
                        href={`/productos/${item.product.slug}`}
                        className="sm:w-40 h-40 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0"
                      >
                        <div className="w-24 h-24 bg-gradient-to-br from-[#7AB82E]/20 to-[#003B7A]/20 rounded-2xl flex items-center justify-center">
                          <span className="text-2xl font-bold text-[#003B7A]">
                            {item.product.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                      </Link>

                      {/* Product Info */}
                      <div className="flex-grow p-5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-[#7AB82E] uppercase">
                                {item.product.category}
                              </span>
                              {item.product.compareAtPrice && (
                                <Badge variant="error" size="sm">Oferta</Badge>
                              )}
                            </div>
                            <h3 className="font-bold text-lg text-[#003B7A]">
                              <Link href={`/productos/${item.product.slug}`}>
                                {item.product.name}
                              </Link>
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {item.product.shortDescription}
                            </p>

                            {/* Unit Price */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm text-gray-500">
                                ${item.product.price.toFixed(2)} c/u
                              </span>
                              {item.product.compareAtPrice && (
                                <span className="text-xs text-gray-400 line-through">
                                  ${item.product.compareAtPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Quantity & Total */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">Cantidad:</span>
                            <div className="flex items-center">
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="p-2 rounded-l-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                                className="w-14 text-center py-2 border-y border-gray-200 focus:outline-none"
                              />
                              <button
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="p-2 rounded-r-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            <span className="text-xl font-bold text-[#003B7A]">
                              ${(item.product.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Recommended Bundle */}
                <Card className="bg-gradient-to-r from-[#003B7A]/5 to-[#7AB82E]/5 border-[#7AB82E]/20">
                  <div className="flex items-center gap-2 mb-4">
                    <TagIcon className="h-5 w-5 text-[#7AB82E]" />
                    <h3 className="font-bold text-[#003B7A]">Recomendado para ti</h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#003B7A]">{recommendedBundle.name}</p>
                      <p className="text-sm text-gray-500">{recommendedBundle.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400 line-through">
                        ${recommendedBundle.originalPrice.toFixed(2)}
                      </p>
                      <p className="font-bold text-[#7AB82E]">
                        ${recommendedBundle.bundlePrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="mt-4">
                    Agregar al carrito
                  </Button>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-32" padding="lg">
                  <h2 className="text-xl font-bold text-[#003B7A] mb-6">
                    Resumen del Pedido
                  </h2>

                  {/* Coupon Code */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código de descuento
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ej: WELLNESS10"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        error={couponError}
                        disabled={couponApplied}
                      />
                      <Button
                        variant="outline"
                        onClick={applyCoupon}
                        disabled={!couponCode || couponApplied}
                      >
                        Aplicar
                      </Button>
                    </div>
                    {couponApplied && (
                      <p className="mt-2 text-sm text-[#7AB82E] flex items-center gap-1">
                        <TagIcon className="h-4 w-4" />
                        Cupón aplicado: 10% descuento
                      </p>
                    )}
                  </div>

                  {/* Order Details */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal ({cartItems.length} productos)</span>
                      <span className="font-medium">${subtotal.toFixed(2)}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between text-[#7AB82E]">
                        <span>Descuento</span>
                        <span>-${discount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-gray-600">Envío</span>
                      <span className={shipping === 0 ? 'text-[#7AB82E] font-medium' : ''}>
                        {shipping === 0 ? 'Gratis' : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>

                    <div className="flex justify-between text-lg font-bold text-[#003B7A] pt-3 border-t border-gray-200">
                      <span>Total</span>
                      <span>${total.toFixed(2)} USD</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Link href="/checkout">
                    <Button fullWidth size="lg" className="mt-6">
                      Proceder al Checkout
                    </Button>
                  </Link>

                  {/* Trust Badges */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                      <ShieldCheckIcon className="h-5 w-5 text-[#7AB82E]" />
                      <span>Compra 100% segura</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                      <TruckIcon className="h-5 w-5 text-[#7AB82E]" />
                      <span>Envío gratis en pedidos +$99</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <svg className="h-5 w-5 text-[#7AB82E]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      <span>30 días de garantía</span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-3 text-center">
                      Métodos de pago aceptados
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      {['Visa', 'MC', 'Amex', 'PayPal'].map((method) => (
                        <div
                          key={method}
                          className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center text-[10px] font-bold text-gray-500"
                        >
                          {method}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
