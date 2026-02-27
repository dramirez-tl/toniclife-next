// app/carrito/page.tsx - Cart page with API integration
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Header, Footer } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import {
  TrashIcon,
  PlusIcon,
  MinusIcon,
  ShoppingBagIcon,
  TruckIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import {
  useCart,
  useClearCart,
  useUpdateCartItem,
  useRemoveCartItem,
} from '@/hooks/useCart';
import { cartService } from '@/services/cart.service';
import { toast } from 'sonner';

// Free shipping threshold
const FREE_SHIPPING_THRESHOLD = 999;

export default function CartPage() {
  const { data: cart, isLoading } = useCart();
  const clearCart = useClearCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

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

  const handleClearCart = () => {
    toast('¿Vaciar el carrito?', {
      description: 'Se eliminarán todos los productos.',
      action: {
        label: 'Vaciar',
        onClick: async () => {
          try {
            await clearCart.mutateAsync();
            toast.success('Carrito vaciado');
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al vaciar carrito');
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    });
  };

  // Calculations
  const subtotal = cart ? parseFloat(cart.subtotal) : 0;
  const tax = cart ? parseFloat(cart.taxAmount) : 0;
  const discount = cart ? parseFloat(cart.discountAmount) : 0;
  const total = cart ? parseFloat(cart.total) : 0;
  const itemCount = cart?.itemCount || 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 pb-20 pt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link
              href="/productos"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-[#3E667D] transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Seguir comprando
            </Link>
          </div>

          {/* Page Title */}
          <div className="mb-8 rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-[#3E667D]/10 p-3">
                  <ShoppingBagIcon className="h-8 w-8 text-[#3E667D]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#3E667D]">Tu Carrito</h1>
                  <p className="text-gray-500">
                    {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
              </div>
              <Badge variant="info" className="text-xs sm:text-sm">
                Compra segura
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4 py-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-gray-100 shadow-sm" padding="none">
                  <div className="animate-pulse p-5">
                    <div className="mb-4 h-4 w-44 rounded bg-gray-200" />
                    <div className="h-3 w-64 rounded bg-gray-100" />
                    <div className="mt-4 h-10 w-full rounded bg-gray-100" />
                  </div>
                </Card>
              ))}
            </div>
          ) : !cart || cart.items.length === 0 ? (
            /* Empty Cart */
            <Card className="border-dashed border-gray-200 py-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#3E667D]/5">
                <ShoppingBagIcon className="h-10 w-10 text-[#3E667D]/60" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-[#3E667D]">
                Tu carrito está vacío
              </h2>
              <p className="mb-8 max-w-md mx-auto text-gray-500">
                Parece que aún no has agregado productos. Explora nuestro catálogo
                y encuentra los productos ideales para ti.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/productos">
                  <Button size="lg">Ver Productos</Button>
                </Link>
                <Link href="/quiz">
                  <Button variant="outline" size="lg">Iniciar mi Evaluación</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {/* Free Shipping Progress */}
                {subtotal < FREE_SHIPPING_THRESHOLD ? (
                  <Card className="border-[#a7c1e2]/20 bg-[#C8DDF2]/10 shadow-sm" padding="md">
                    <div className="flex items-center gap-4">
                      <TruckIcon className="h-8 w-8 text-[#3E667D] flex-shrink-0" />
                      <div className="flex-grow">
                        <p className="font-medium text-[#3E667D]">
                          ¡Agrega {cartService.formatCurrency(FREE_SHIPPING_THRESHOLD - subtotal)} más para envío gratis!
                        </p>
                        <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C8DDF2] rounded-full transition-all"
                            style={{ width: `${Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="bg-[#C8DDF2]/10 border-[#a7c1e2]/20" padding="md">
                    <div className="flex items-center gap-4">
                      <TruckIcon className="h-8 w-8 text-[#3E667D] flex-shrink-0" />
                      <p className="font-medium text-[#3E667D]">
                        ¡Felicidades! Tu pedido califica para envío gratis
                      </p>
                    </div>
                  </Card>
                )}

                {/* Cart Items List */}
                {cart.items.map((item) => (
                  <Card key={item.id} className="overflow-hidden border-gray-100 shadow-sm transition-all hover:shadow-md" padding="none">
                    <div className="flex flex-col sm:flex-row">
                      {/* Product Image */}
                      <div className="sm:w-40 h-40 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.productImageUrl ? (
                          <Image
                            src={item.productImageUrl}
                            alt={item.productName}
                            width={160}
                            height={160}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gradient-to-br from-[#C8DDF2]/20 to-[#3E667D]/20 rounded-2xl flex items-center justify-center">
                            <span className="text-2xl font-bold text-[#3E667D]">
                              {item.productName.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-grow p-5">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-grow">
                            <p className="text-xs text-gray-500 mb-1">
                              SKU: {item.productCode}
                            </p>
                            <h3 className="font-bold text-lg text-[#3E667D]">
                              {item.productName}
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
                              <p className="text-xs text-[#3E667D] mt-1">
                                +{item.points} puntos por unidad
                              </p>
                            )}
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={removeItem.isPending}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            aria-label={`Eliminar ${item.productName} del carrito`}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Quantity & Total */}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">Cantidad:</span>
                            <div className="flex items-center rounded-lg border border-gray-200 bg-white">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || updateItem.isPending}
                                className="p-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                <MinusIcon className="h-4 w-4" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-14 border-x border-gray-200 py-2 text-center focus:outline-none"
                              />
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                disabled={updateItem.isPending}
                                className="p-2 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                <PlusIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Line Total */}
                          <div className="text-right">
                            <span className="text-xl font-bold text-[#3E667D]">
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
                    className="rounded-lg px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    Vaciar carrito
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-32 border-gray-100 shadow-sm" padding="lg">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#3E667D]">
                      Resumen del Pedido
                    </h2>
                    <Badge variant="info" size="sm">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </Badge>
                  </div>

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

                    <div className="flex justify-between">
                      <span className="text-gray-600">IVA</span>
                      <span className="font-medium">
                        {cartService.formatCurrency(tax)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-600">Envío</span>
                      <span className="text-[#3E667D] font-medium">
                        {subtotal >= FREE_SHIPPING_THRESHOLD ? 'Gratis' : 'Calculado en checkout'}
                      </span>
                    </div>

                    <div className="flex justify-between text-lg font-bold text-[#3E667D] pt-3 border-t border-gray-200">
                      <span>Total</span>
                      <span>{cartService.formatCurrency(total)}</span>
                    </div>

                    {/* Points */}
                    {cart.totalPoints > 0 && (
                      <p className="text-sm text-[#3E667D] text-center pt-2">
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
                  <p className="mt-2 text-center text-xs text-gray-400">
                    Pago protegido y cifrado
                  </p>

                  {/* Trust Badges */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                      <ShieldCheckIcon className="h-5 w-5 text-[#3E667D]" />
                      <span>Compra 100% segura</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                      <TruckIcon className="h-5 w-5 text-[#3E667D]" />
                      <span>Envío gratis en pedidos +{cartService.formatCurrency(FREE_SHIPPING_THRESHOLD)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <svg className="h-5 w-5 text-[#3E667D]" fill="currentColor" viewBox="0 0 20 20">
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
