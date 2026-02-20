// components/cart/CartDrawer.tsx - Slide-out cart drawer with API integration
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce
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
  TagIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useCart, useClearCart, useUpdateCartItem, useRemoveCartItem, useApplyCoupon, useRemoveCoupon } from '@/hooks/useCart';
import { cartService } from '@/services/cart.service';
import { toast } from 'sonner';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Free shipping threshold
const FREE_SHIPPING_THRESHOLD = 999;

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const { data: cart, isLoading } = useCart();
  const clearCart = useClearCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateItem.mutateAsync({ itemId, data: { quantity: newQuantity } });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar cantidad');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem.mutateAsync(itemId);
      toast.success('Producto eliminado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar producto');
    }
  };

  const handleClearCart = async () => {
    if (confirm('¿Estás seguro de que deseas vaciar el carrito?')) {
      try {
        await clearCart.mutateAsync();
        toast.success('Carrito vaciado');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error al vaciar carrito');
      }
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    try {
      await applyCoupon.mutateAsync({ code: couponCode.trim().toUpperCase() });
      toast.success('Cupón aplicado exitosamente');
      setCouponCode('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Cupón inválido');
    } finally {
      setIsApplyingCoupon(false);
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

  // Calculations
  const subtotal = cart ? parseFloat(cart.subtotal) : 0;
  const total = cart ? parseFloat(cart.total) : 0;
  const discount = cart ? parseFloat(cart.discountAmount) : 0;
  const shipping = cart ? parseFloat(cart.shippingAmount) : 0;
  const hasCoupon = !!cart?.coupon;
  const couponDiscount = cart?.couponDiscountAmount ? parseFloat(cart.couponDiscountAmount) : 0;

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
            {cart && cart.itemCount > 0 && (
              <Badge variant="success">{cart.itemCount} items</Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Free Shipping Banner */}
        {cart && subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD && (
          <div className="bg-[#7AB82E]/10 px-4 py-3 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-[#7AB82E]" />
            <p className="text-sm text-[#003B7A]">
              ¡Agrega <span className="font-bold">{cartService.formatCurrency(FREE_SHIPPING_THRESHOLD - subtotal)}</span> más para envío gratis!
            </p>
          </div>
        )}
        {cart && subtotal >= FREE_SHIPPING_THRESHOLD && (
          <div className="bg-[#7AB82E]/10 px-4 py-3 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-[#7AB82E]" />
            <p className="text-sm text-[#7AB82E] font-medium">
              ¡Felicidades! Tienes envío gratis
            </p>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003B7A]"></div>
            </div>
          ) : !cart || cart.items.length === 0 ? (
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
            <>
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 bg-gray-50 rounded-xl p-4"
                >
                  {/* Product Image */}
                  <div className="w-20 h-20 bg-white rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm overflow-hidden">
                    {item.productSnapshot?.imageUrl ? (
                      <img
                        src={item.productSnapshot.imageUrl}
                        alt={item.productSnapshot.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-[#003B7A]">
                        {(item.productSnapshot?.name || 'P').substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-[#003B7A] truncate">
                      {item.productSnapshot?.name || 'Producto'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      SKU: {item.productSnapshot?.sku}
                    </p>
                    <p className="text-sm text-[#003B7A] font-medium">
                      {cartService.formatCurrency(item.unitPrice)} c/u
                    </p>

                    {/* Points */}
                    {item.points > 0 && (
                      <p className="text-xs text-[#7AB82E]">+{item.points} puntos</p>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || updateItem.isPending}
                          className="p-1 rounded-lg bg-white border border-gray-200 hover:border-[#7AB82E] transition-colors disabled:opacity-50"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={updateItem.isPending}
                          className="p-1 rounded-lg bg-white border border-gray-200 hover:border-[#7AB82E] transition-colors disabled:opacity-50"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#003B7A]">
                          {cartService.formatCurrency(item.lineTotal)}
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
                Vaciar carrito
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-4 bg-white">
            {/* Coupon Code */}
            {!hasCoupon ? (
              <div className="flex gap-2">
                <div className="flex-grow relative">
                  <TagIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Código de descuento"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7AB82E]"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || isApplyingCoupon}
                >
                  {isApplyingCoupon ? '...' : 'Aplicar'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-700">
                  <TagIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">{cart.coupon!.code}</span>
                  <span className="text-xs text-green-600">
                    -{cartService.formatCurrency(couponDiscount)}
                  </span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  disabled={removeCoupon.isPending}
                  className="text-green-600 hover:text-red-500 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Order Summary */}
            <div className="space-y-2 text-sm">
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
              {hasCoupon && couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Cupón ({cart.coupon!.code})</span>
                  <span>-{cartService.formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span>{shipping === 0 ? 'Calculado en checkout' : cartService.formatCurrency(shipping)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[#003B7A] pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>{cartService.formatCurrency(total)}</span>
              </div>

              {/* Points */}
              {cart.totalPoints > 0 && (
                <p className="text-xs text-[#7AB82E] text-center">
                  +{cart.totalPoints} puntos por esta compra
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Link
                href="/carrito"
                onClick={onClose}
                className="block w-full py-3 text-center border-2 border-[#003B7A] text-[#003B7A] rounded-xl font-bold hover:bg-[#003B7A]/5 transition-colors"
              >
                Ver Carrito Completo
              </Link>
              <Link
                href="/checkout"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#7AB82E] text-white rounded-xl font-bold hover:bg-[#6aa526] transition-colors"
              >
                Proceder al Checkout
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>

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
