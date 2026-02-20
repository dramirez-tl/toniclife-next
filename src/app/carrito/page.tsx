// app/carrito/page.tsx - Cart page with API integration
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.4 E-commerce
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
  ArrowLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  useCart,
  useClearCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useApplyCoupon,
  useRemoveCoupon,
} from '@/hooks/useCart';
import { cartService } from '@/services/cart.service';
import { toast } from 'sonner';

// Free shipping threshold
const FREE_SHIPPING_THRESHOLD = 999;

export default function CartPage() {
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const { data: cart, isLoading } = useCart();
  const clearCart = useClearCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const applyCouponMutation = useApplyCoupon();
  const removeCouponMutation = useRemoveCoupon();

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
      toast.success('Producto eliminado del carrito');
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

    setCouponError('');
    setIsApplyingCoupon(true);
    try {
      await applyCouponMutation.mutateAsync({ code: couponCode.trim().toUpperCase() });
      toast.success('Cupón aplicado exitosamente');
      setCouponCode('');
    } catch (error: any) {
      setCouponError(error.response?.data?.message || 'Cupón no válido');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await removeCouponMutation.mutateAsync();
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
  const itemCount = cart?.itemCount || 0;

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
              Seguir comprando
            </Link>
          </div>

          {/* Page Title */}
          <div className="flex items-center gap-4 mb-8">
            <ShoppingBagIcon className="h-10 w-10 text-[#003B7A]" />
            <div>
              <h1 className="text-3xl font-bold text-[#003B7A]">Tu Carrito</h1>
              <p className="text-gray-500">
                {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003B7A]"></div>
            </div>
          ) : !cart || cart.items.length === 0 ? (
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
                  <Link href="/quiz">Iniciar mi Evaluación</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {/* Free Shipping Progress */}
                {subtotal < FREE_SHIPPING_THRESHOLD && (
                  <Card className="bg-[#7AB82E]/10 border-[#7AB82E]/20" padding="md">
                    <div className="flex items-center gap-4">
                      <TruckIcon className="h-8 w-8 text-[#7AB82E] flex-shrink-0" />
                      <div className="flex-grow">
                        <p className="font-medium text-[#003B7A]">
                          ¡Agrega {cartService.formatCurrency(FREE_SHIPPING_THRESHOLD - subtotal)} más para envío gratis!
                        </p>
                        <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#7AB82E] rounded-full transition-all"
                            style={{ width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {subtotal >= FREE_SHIPPING_THRESHOLD && (
                  <Card className="bg-[#7AB82E]/10 border-[#7AB82E]/20" padding="md">
                    <div className="flex items-center gap-4">
                      <TruckIcon className="h-8 w-8 text-[#7AB82E] flex-shrink-0" />
                      <p className="font-medium text-[#7AB82E]">
                        ¡Felicidades! Tu pedido califica para envío gratis
                      </p>
                    </div>
                  </Card>
                )}

                {/* Cart Items List */}
                {cart.items.map((item) => (
                  <Card key={item.id} className="overflow-hidden" padding="none">
                    <div className="flex flex-col sm:flex-row">
                      {/* Product Image */}
                      <div className="sm:w-40 h-40 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.productSnapshot?.imageUrl ? (
                          <img
                            src={item.productSnapshot.imageUrl}
                            alt={item.productSnapshot.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gradient-to-br from-[#7AB82E]/20 to-[#003B7A]/20 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl font-bold text-[#003B7A]">
                              {(item.productSnapshot?.name || 'P').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-grow p-5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-grow">
                            <p className="text-xs text-gray-500 mb-1">
                              SKU: {item.productSnapshot?.sku}
                            </p>
                            <h3 className="font-bold text-lg text-[#003B7A]">
                              {item.productSnapshot?.name || 'Producto'}
                            </h3>

                            {/* Unit Price */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-sm text-gray-500">
                                {cartService.formatCurrency(item.unitPrice)} c/u
                              </span>
                              {item.originalPrice && (
                                <span className="text-xs text-gray-400 line-through">
                                  {cartService.formatCurrency(item.originalPrice)}
                                </span>
                              )}
                            </div>

                            {/* Points */}
                            {item.points > 0 && (
                              <p className="text-xs text-[#7AB82E] mt-1">
                                +{item.points} puntos por unidad
                              </p>
                            )}
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removeItem.isPending}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || updateItem.isPending}
                                className="p-2 rounded-l-lg bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-14 text-center py-2 border-y border-gray-200 focus:outline-none"
                              />
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={updateItem.isPending}
                                className="p-2 rounded-r-lg bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            <span className="text-xl font-bold text-[#003B7A]">
                              {cartService.formatCurrency(item.lineTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Clear Cart Button */}
                <div className="text-center">
                  <button
                    onClick={handleClearCart}
                    disabled={clearCart.isPending}
                    className="text-sm text-red-500 hover:text-red-600 hover:underline disabled:opacity-50"
                  >
                    Vaciar carrito
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-32" padding="lg">
                  <h2 className="text-xl font-bold text-[#003B7A] mb-6">
                    Resumen del Pedido
                  </h2>

                  {/* Coupon Code */}
                  {!hasCoupon ? (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código de descuento
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Código de cupón"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          error={couponError}
                        />
                        <Button
                          variant="outline"
                          onClick={handleApplyCoupon}
                          disabled={!couponCode.trim() || isApplyingCoupon}
                        >
                          {isApplyingCoupon ? '...' : 'Aplicar'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2 text-green-700">
                        <TagIcon className="h-4 w-4" />
                        <div>
                          <span className="font-medium">{cart.coupon!.code}</span>
                          <p className="text-xs text-green-600">
                            {cart.coupon!.name} - {cartService.formatCurrency(couponDiscount)} de descuento
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleRemoveCoupon}
                        disabled={removeCouponMutation.isPending}
                        className="text-green-600 hover:text-red-500 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  )}

                  {/* Order Details */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal ({itemCount} productos)</span>
                      <span className="font-medium">{cartService.formatCurrency(subtotal)}</span>
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

                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA</span>
                      <span className="font-medium">
                        {cartService.formatCurrency(cart.taxAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Envío</span>
                      <span className={shipping === 0 ? 'text-[#7AB82E] font-medium' : ''}>
                        {shipping === 0 ? 'Calculado en checkout' : cartService.formatCurrency(shipping)}
                      </span>
                    </div>

                    <div className="flex justify-between text-lg font-bold text-[#003B7A] pt-3 border-t border-gray-200">
                      <span>Total</span>
                      <span>{cartService.formatCurrency(total)}</span>
                    </div>

                    {/* Points */}
                    {cart.totalPoints > 0 && (
                      <p className="text-sm text-[#7AB82E] text-center pt-2">
                        +{cart.totalPoints} puntos por esta compra
                      </p>
                    )}
                  </div>

                  {/* Checkout Button */}
                  <Link href="/checkout">
                    <Button fullWidth size="lg" className="mt-6">
                      Finalizar Compra
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
                      <span>Envío gratis en pedidos +{cartService.formatCurrency(FREE_SHIPPING_THRESHOLD)}</span>
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
                      {['Visa', 'MC', 'Amex', 'PayPal', 'MP'].map((method) => (
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
