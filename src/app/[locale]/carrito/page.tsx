// app/[locale]/carrito/page.tsx - Carrito completo (contrato ecommerce 7.3, bloque C1)
//
// - Cantidad con commit en blur/Enter (antes: un PATCH por tecla) y "+" deshabilitado
//   en el tope de la línea (`maxQuantity` del API C1 o `availableStock` del actual).
// - Puntos POR UNIDAD y solo si `showPoints` (API C1) o, sin el campo, solo a una
//   sesión de cliente; nunca a invitados.
// - "Proceder al pago" bloqueado con aviso claro si hay agotados o excesos, SOLO con
//   sesión de cliente; a un invitado se le avisa pero puede continuar a iniciar sesión
//   (hasta C2 su carrito se resuelve como MX y nunca llega a una orden).
// - Durante una petición los controles usan `aria-disabled` e ignoran el clic (con
//   `disabled` el control con foco lo perdía).
// - Los errores de las mutaciones los avisa `useCart` (i18n y por código): aquí NO se
//   repite el toast. El checkout y el pago no se tocan.
'use client';

import { useId, useState } from 'react';
import { Header, Footer } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import {
  TrashIcon,
  ShoppingBagIcon,
  TruckIcon,
  ArrowLeftIcon,
  CreditCardIcon,
  SparklesIcon,
  TicketIcon,
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
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/i18n/routing';
import { formatCurrency } from '@/lib/currency';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { useStorefrontViewer } from '@/hooks/useStorefront';
import { CartLineQuantity } from '@/components/cart/CartLineQuantity';
import { FreeShippingBar } from '@/components/cart/FreeShippingBar';
import { ProductImage } from '@/components/storefront/ProductImage';
import { catalogErrorMessage } from '@/lib/storefront/errors';
import { formatProductName } from '@/lib/storefront/content-format';
import { productPath } from '@/lib/storefront/slug';
import {
  cartBlockers,
  checkoutGate,
  lineIssue,
  lineLimit,
  linePointsPerUnit,
  lineSlug,
  resolveShowPoints,
} from '@/lib/storefront/cart-logic';
import type { CartItem } from '@/types/cart';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';
const BUSY_STYLE = 'aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

/** Campo para aplicar/quitar cupón de descuento en el resumen del carrito. */
function CouponBox({ couponCode, useApiMessage }: { couponCode?: string; useApiMessage: boolean }) {
  const t = useTranslations('cart');
  const tCoupon = useTranslations('storefront.cart.coupon');
  const [code, setCode] = useState('');
  const inputId = useId();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();

  const handleApply = async () => {
    const value = code.trim();
    if (!value) return;
    try {
      await applyCoupon.mutateAsync({ code: value });
      toast.success(`${t('couponApplied')}: ${value.toUpperCase()}`);
      setCode('');
    } catch (err) {
      // El motivo real lo da el API (en español): en inglés se usa el texto traducido.
      toast.error(catalogErrorMessage(err, tCoupon('invalid'), { useApiMessage }));
    }
  };

  const handleRemove = async () => {
    try {
      await removeCoupon.mutateAsync();
      toast.success(tCoupon('removed'));
    } catch {
      toast.error(tCoupon('removeError'));
    }
  };

  if (couponCode) {
    return (
      <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1">
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          <TicketIcon aria-hidden="true" className="h-4 w-4" />
          {couponCode}
        </span>
        <button
          type="button"
          onClick={() => void handleRemove()}
          disabled={removeCoupon.isPending}
          aria-label={tCoupon('removeLabel', { code: couponCode })}
          className={`flex size-11 cursor-pointer items-center justify-center rounded text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-50 ${FOCUS_RING}`}
        >
          <XMarkIcon aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 grid grid-cols-[1fr_auto] gap-2">
      <label htmlFor={inputId} className="sr-only">
        {tCoupon('inputLabel')}
      </label>
      <input
        id={inputId}
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleApply();
        }}
        placeholder={t('couponPlaceholder')}
        className="min-h-11 w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm uppercase placeholder:font-sans placeholder:normal-case placeholder:text-gray-600 focus:border-[#3E667D] focus:outline-none focus:ring-1 focus:ring-[#a7c1e2]"
        maxLength={40}
      />
      <Button
        size="sm"
        variant="outline"
        className="h-full min-h-11 border-[#a7c1e2] text-[#2f5165] hover:bg-[#C8DDF2]/20 hover:text-[#2f5165]"
        onClick={() => void handleApply()}
        disabled={applyCoupon.isPending || !code.trim()}
      >
        {applyCoupon.isPending ? '…' : t('couponApply')}
      </Button>
    </div>
  );
}

export default function CartPage() {
  const t = useTranslations('cart');
  const tLine = useTranslations('storefront.cart.line');
  const tBlocked = useTranslations('storefront.cart.blocked');
  const { currency, lang, countryCode } = useStoreCountry();
  const { hasCustomerSession } = useStorefrontViewer();
  const taxIncluded = countryCode === 'MX';
  const { data: cart, isLoading } = useCart();
  const clearCart = useClearCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const [status, setStatus] = useState('');
  const blockedId = useId();

  const items = cart?.items ?? [];
  // Moneda del carrito si el API la manda (C2); si no, la del país de la tienda (como hoy).
  const fmt = (n: number | string) => formatCurrency(n, cart?.currencyCode || currency, lang);
  const showPoints = resolveShowPoints(cart?.showPoints, hasCustomerSession);
  const blockers = cartBlockers(items);
  // A un invitado se le AVISA pero no se le bloquea: puede continuar a iniciar sesión.
  const gate = checkoutGate(blockers, hasCustomerSession);
  const soldOutItems = items.filter((item) => lineIssue(item) === 'sold_out');
  const slugs = items.map(lineSlug).filter((slug): slug is string => slug !== null);
  const busy = updateItem.isPending || removeItem.isPending;

  // Los errores los avisa el hook (`useCart`): aquí solo el camino feliz.
  // Con una petición en vuelo se ignora la acción (`aria-disabled`, sin perder el foco).
  const setQuantity = (item: CartItem, quantity: number, done?: string) => {
    if (busy) return;
    updateItem.mutate(
      { itemId: item.id, data: { quantity } },
      {
        onSuccess: () => {
          setStatus(done ?? '');
          if (done) toast.success(done);
        },
      },
    );
  };

  const handleRemoveItem = (item: CartItem, name: string) => {
    if (busy) return;
    removeItem.mutate(item.id, {
      onSuccess: () => {
        setStatus(tLine('removed', { name }));
        toast.success(t('removed'));
      },
    });
  };

  const handleClearCart = () => {
    if (clearCart.isPending) return;
    toast(t('confirmEmptyTitle'), {
      description: t('confirmEmptyDesc'),
      action: {
        label: t('emptyAction'),
        onClick: () => clearCart.mutate(undefined, { onSuccess: () => toast.success(t('emptied')) }),
      },
      cancel: {
        label: t('cancel'),
        onClick: () => {},
      },
    });
  };

  const handleRemoveSoldOut = async () => {
    if (busy) return;
    try {
      for (const item of soldOutItems) {
        await removeItem.mutateAsync(item.id);
      }
      setStatus(t('soldOutRemoved'));
      toast.success(t('soldOutRemoved'));
    } catch {
      // `useRemoveCartItem` ya avisó el motivo.
    }
  };

  // Calculations
  const subtotal = cart ? parseFloat(cart.subtotal) : 0;
  const discount = cart ? parseFloat(cart.discountAmount) : 0;
  const total = cart ? parseFloat(cart.total) : 0;
  const itemCount = cart?.itemCount || 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 pb-20 pt-40 sm:pt-44">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="mb-8">
            <Link
              href="/productos"
              className={`inline-flex min-h-11 items-center gap-2 rounded-sm text-gray-700 transition-colors hover:text-[#2f5165] ${FOCUS_RING}`}
            >
              <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
              {t('keepShopping')}
            </Link>
          </div>

          {/* Page Title */}
          <div className="mb-8 rounded-2xl border border-gray-100 bg-white/90 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-[#3E667D]/10 p-3">
                  <ShoppingBagIcon aria-hidden="true" className="h-8 w-8 text-[#3E667D]" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[#2f5165]">{t('title')}</h1>
                  <p className="text-gray-700">{t('items', { count: itemCount })}</p>
                </div>
              </div>
              <Badge variant="outline" className="border-[#3E667D]/30 bg-[#C8DDF2]/30 text-[#2f5165] text-xs sm:text-sm">
                {t('secureBadge')}
              </Badge>
            </div>
          </div>

          <span className="sr-only" role="status" aria-live="polite">
            {status}
          </span>

          {isLoading ? (
            <div className="space-y-4 py-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border-gray-100 shadow-sm p-0">
                  <div className="animate-pulse p-5 motion-reduce:animate-none">
                    <div className="mb-4 h-4 w-44 rounded bg-gray-200" />
                    <div className="h-3 w-64 max-w-full rounded bg-gray-100" />
                    <div className="mt-4 h-10 w-full rounded bg-gray-100" />
                  </div>
                </Card>
              ))}
            </div>
          ) : !cart || items.length === 0 ? (
            /* Empty Cart */
            <Card className="border-dashed border-gray-200 py-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#3E667D]/5">
                <ShoppingBagIcon aria-hidden="true" className="h-10 w-10 text-[#3E667D]/60" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-[#2f5165]">{t('empty')}</h2>
              <p className="mb-8 max-w-md mx-auto px-4 text-gray-700">{t('emptyDesc')}</p>
              <div className="flex flex-col justify-center gap-4 px-4 sm:flex-row">
                <Button asChild size="lg" className="min-h-11">
                  <Link href="/productos">{t('viewProducts')}</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="min-h-11">
                  <Link href="/quiz">{t('startQuiz')}</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {/* Aviso de productos agotados (con opción de continuar con el resto) */}
                {soldOutItems.length > 0 && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-950">{t('soldOutBannerTitle')}</p>
                    <p className="mt-1 text-sm text-amber-900">{t('soldOutBannerBody')}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`mt-3 min-h-11 border-amber-400 text-amber-950 hover:bg-amber-100 ${BUSY_STYLE}`}
                      onClick={() => void handleRemoveSoldOut()}
                      aria-disabled={busy}
                    >
                      {t('removeSoldOut')}
                    </Button>
                  </div>
                )}

                {/* Cart Items List */}
                <ul className="space-y-4" aria-label={t('title')}>
                  {items.map((item) => {
                    const name = formatProductName(item.productName);
                    const slug = lineSlug(item);
                    const issue = lineIssue(item);
                    const limit = lineLimit(item);
                    const perUnit = linePointsPerUnit(item, showPoints);
                    const lowStock =
                      issue === null && item.availableStock != null && item.availableStock > 0 && item.availableStock <= 5;
                    return (
                      <li key={item.id}>
                        <Card className="overflow-hidden border-gray-100 shadow-sm transition-all hover:shadow-md p-0">
                          <div className="flex flex-col sm:flex-row">
                            {/* Product Image (decorativa: el nombre enlazado está al lado) */}
                            <div className="relative h-40 shrink-0 overflow-hidden border-b border-gray-100 bg-gray-50 sm:w-40 sm:border-b-0 sm:border-r">
                              <ProductImage
                                src={item.productImageUrl}
                                alt=""
                                name={name}
                                sizes="160px"
                                className="p-3"
                              />
                            </div>

                            {/* Product Info */}
                            <div className="min-w-0 flex-grow p-5">
                              <div className="flex justify-between items-start gap-4">
                                <div className="min-w-0 flex-grow">
                                  <p className="text-xs text-gray-700 mb-1">SKU: {item.productCode}</p>
                                  <h2 className="font-bold text-lg text-[#2f5165]">
                                    {slug ? (
                                      <Link href={productPath(slug)} className={`rounded-sm underline-offset-4 hover:underline ${FOCUS_RING}`}>
                                        {name}
                                      </Link>
                                    ) : (
                                      name
                                    )}
                                  </h2>

                                  {/* Aviso de agotado en el país */}
                                  {issue === 'sold_out' && (
                                    <div className="mt-1">
                                      <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-950">
                                        {t('soldOut')}
                                      </Badge>
                                      <span className="ml-2 text-xs text-amber-900">{t('soldOutNote')}</span>
                                    </div>
                                  )}

                                  {/* Pediste más de lo disponible → ofrecer ajustar */}
                                  {issue === 'exceeds_stock' && (
                                    <div className="mt-1 flex flex-wrap items-center gap-x-2">
                                      <span className="text-xs text-amber-900">
                                        {limit.reason === 'order_max'
                                          ? tLine('exceedsOrderMax', { requested: item.quantity, available: limit.max })
                                          : t('exceedsStock', { requested: item.quantity, available: limit.max })}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setQuantity(item, limit.max, t('quantityAdjusted'))}
                                        aria-disabled={busy}
                                        className={`inline-flex min-h-11 cursor-pointer items-center rounded-sm text-xs font-semibold text-[#2f5165] underline underline-offset-4 hover:no-underline ${BUSY_STYLE} ${FOCUS_RING}`}
                                      >
                                        {t('adjustToStock', { count: limit.max })}
                                      </button>
                                    </div>
                                  )}

                                  {/* Stock bajo (suficiente pero pocas piezas) */}
                                  {lowStock && (
                                    <p className="mt-1 text-xs text-amber-900">
                                      {t('lowStockLeft', { count: item.availableStock ?? 0 })}
                                    </p>
                                  )}

                                  {/* Unit Price */}
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="text-sm text-gray-700">
                                      {fmt(item.unitPrice)} {t('perUnit')}
                                    </span>
                                    {item.originalPrice && (
                                      <span className="text-xs text-gray-600 line-through">{fmt(item.originalPrice)}</span>
                                    )}
                                  </div>

                                  {/* Puntos POR UNIDAD, solo para quien ve puntos */}
                                  {perUnit !== null && (
                                    <p className="text-xs text-[#2f5165] mt-1">{t('pointsUnit', { points: perUnit })}</p>
                                  )}
                                </div>

                                {/* Remove Button */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item, name)}
                                  aria-disabled={busy}
                                  className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-red-50 hover:text-red-700 ${BUSY_STYLE} ${FOCUS_RING}`}
                                  aria-label={tLine('removeLabel', { name })}
                                >
                                  <TrashIcon aria-hidden="true" className="h-5 w-5" />
                                </button>
                              </div>

                              {/* Quantity & Total */}
                              <div className="flex flex-wrap items-end justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
                                {issue === 'sold_out' ? (
                                  <span />
                                ) : (
                                  <CartLineQuantity
                                    name={name}
                                    value={item.quantity}
                                    max={limit.max}
                                    maxKnown={limit.known}
                                    maxReason={limit.reason}
                                    busy={busy}
                                    onCommit={(next) => setQuantity(item, next)}
                                  />
                                )}

                                {/* Line Total */}
                                <span className="text-xl font-bold tabular-nums text-[#2f5165]">{fmt(item.lineTotal)}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </li>
                    );
                  })}
                </ul>

                {/* Clear Cart Button */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleClearCart}
                    aria-disabled={clearCart.isPending}
                    className={`min-h-11 cursor-pointer rounded-lg px-3 py-1.5 text-sm text-red-700 transition-colors hover:bg-red-50 ${BUSY_STYLE} ${FOCUS_RING}`}
                  >
                    {t('clearCart')}
                  </button>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-32 border-gray-100 shadow-sm p-6">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-bold text-[#2f5165]">{t('summaryTitle')}</h2>
                    <Badge variant="outline" className="border-[#3E667D]/30 bg-[#C8DDF2]/30 text-[#2f5165]">
                      {t('itemsShort', { count: itemCount })}
                    </Badge>
                  </div>

                  {/* Cupón de descuento */}
                  <CouponBox couponCode={cart.couponCode} useApiMessage={lang === 'es'} />

                  {/* Envío gratis por país (umbral real configurable; sin dato no se pinta) */}
                  <FreeShippingBar subtotal={subtotal} cartCurrencyCode={cart.currencyCode} slugs={slugs} className="mb-4" />

                  {/* Order Details. `aria-live` SOLO en el total: en todo el bloque se releía completo con cada cambio. */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-700">{t('subtotal', { count: itemCount })}</span>
                      <span className="font-medium tabular-nums">{fmt(subtotal)}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between gap-2 text-green-800">
                        <span>
                          {t('discount')}
                          {cart.couponCode ? ` (${cart.couponCode})` : ''}
                        </span>
                        <span className="tabular-nums">-{fmt(discount)}</span>
                      </div>
                    )}

                    {taxIncluded && (
                      <div className="flex justify-between text-gray-700 text-sm">
                        <span>{t('taxIncluded')}</span>
                      </div>
                    )}

                    <div className="flex justify-between gap-2">
                      <span className="text-gray-700">{t('shipping')}</span>
                      <span className="text-[#2f5165] font-medium">{t('shippingAtCheckout')}</span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 pt-3 border-t border-gray-200">
                      <span className="text-base font-bold text-gray-900">{t('total')}</span>
                      <span className="text-2xl font-bold tabular-nums text-[#2f5165]" aria-live="polite" aria-atomic="true">
                        {fmt(total)}
                      </span>
                    </div>

                    {/* Puntos: solo para quien ve puntos */}
                    {showPoints && cart.totalPoints > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[#C8DDF2]/30 px-2 py-2 text-center text-sm font-medium text-[#2f5165]">
                        <SparklesIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                        {t('earnPoints', { points: cart.totalPoints })}
                      </div>
                    )}
                  </div>

                  {/* Agotados o cantidades por encima del tope: bloquea a la sesión de cliente; al invitado solo le avisa */}
                  {gate.showNotice && (
                    <div id={blockedId} role="status" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                      <p className="font-semibold">{tBlocked(gate.blocked ? 'title' : 'guestTitle')}</p>
                      <ul className="mt-1 list-disc pl-5">
                        {blockers.soldOut > 0 && <li>{tBlocked('soldOut', { count: blockers.soldOut })}</li>}
                        {blockers.exceedsStock > 0 && <li>{tBlocked('exceeds', { count: blockers.exceedsStock })}</li>}
                      </ul>
                      <p className="mt-1">{tBlocked(gate.blocked ? 'hint' : 'guestHint')}</p>
                    </div>
                  )}

                  {/* Checkout Button */}
                  {gate.blocked ? (
                    // `aria-disabled` (no `disabled`): sigue en el tabulador y el lector lee el motivo.
                    <Button
                      type="button"
                      size="lg"
                      aria-disabled="true"
                      aria-describedby={blockedId}
                      className="mt-3 min-h-12 w-full cursor-not-allowed opacity-50 hover:bg-primary"
                    >
                      {t('checkout')}
                    </Button>
                  ) : (
                    <Button asChild size="lg" className={`${gate.showNotice ? 'mt-3' : 'mt-6'} min-h-12 w-full`}>
                      <Link href="/checkout" aria-describedby={gate.showNotice ? blockedId : undefined}>
                        {t('checkout')}
                      </Link>
                    </Button>
                  )}
                  <p className="mt-2 text-center text-xs text-gray-700">{t('protectedPayment')}</p>

                  {/* Solo lo que el sistema SÍ cumple (decisión 10: sin garantías ni promesas inventadas) */}
                  <div className="mt-6 space-y-2.5 border-t border-gray-100 pt-6 text-sm text-gray-700">
                    <div className="flex items-center gap-2">
                      <TruckIcon aria-hidden="true" className="h-5 w-5 shrink-0 text-[#3E667D]" />
                      <span>{t('trustShipping')}</span>
                    </div>
                  </div>

                  {/* Métodos de pago */}
                  <div className="mt-6 border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-700">
                      <CreditCardIcon aria-hidden="true" className="h-4 w-4 text-[#3E667D]" />
                      <span>{t('cardsAccepted')}</span>
                    </div>
                    <p className="mt-1.5 text-center text-[11px] text-gray-700">{t('stripeProcessed')}</p>
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
