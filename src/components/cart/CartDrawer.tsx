'use client';

// CartDrawer (contrato ecommerce 7.3, bloque C1): Sheet derecho; en móvil ocupa toda
// la pantalla. Se abre al agregar desde el catálogo o el detalle y desde el icono del
// Header (`cart-drawer-store`). Líneas con miniatura, nombre con enlace, cantidad con
// tope, "Quitar", barra de envío gratis por país, subtotal, "Ver carrito" y "Pagar".
//
// Accesibilidad: Radix atrapa el foco, pero NO sabe a quién devolverlo: este Sheet es
// controlado y no tiene `SheetTrigger`, así que su `triggerRef` es null y al cerrar el
// foco caería en <body>. Por eso QUIEN ABRE pasa su elemento a `openCartDrawer(el)` (el
// icono del Header y "Agregar") y `onCloseAutoFocus` le devuelve el foco. Al abrir, el
// foco va al título (el lector anuncia "Tu carrito, N productos"); los cambios de
// cantidad, las bajas y el bloqueo de pago se anuncian por aria-live. Escape dentro del
// campo de cantidad con un borrador cancela la edición SIN cerrar el drawer.
// C2: los importes van en la moneda DEL CARRITO (`cart.currencyCode`) y, si el carrito tiene
// FIJADO otro país que la tienda visitada, sale un aviso no bloqueante y "Pagar" lleva al
// checkout de la tienda del carrito. Sin esos campos (API previo) todo queda como antes.
// Solo CONSUME los hooks del carrito; el checkout y el pago no se tocan.

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { ShoppingBagIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ProductImage } from '@/components/storefront/ProductImage';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/useCart';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { useStorefrontViewer } from '@/hooks/useStorefront';
import { Link, usePathname } from '@/i18n/routing';
import {
  closeCartDrawer,
  getCartDrawerOpen,
  getServerCartDrawerOpen,
  setCartDrawerOpen,
  subscribeCartDrawer,
  takeCartDrawerReturnFocus,
} from '@/lib/storefront/cart-drawer-store';
import {
  cartCountryKnown,
  cartCountryMismatch,
  cartDisplayCurrency,
  pinnedCartCountry,
  storeLocaleFor,
} from '@/lib/storefront/cart-country';
import {
  cartBlockers,
  checkoutGate,
  escapeCancelsQuantityDraft,
  lineIssue,
  lineLimit,
  linePointsPerUnit,
  lineSlug,
  resolveShowPoints,
} from '@/lib/storefront/cart-logic';
import { formatProductName } from '@/lib/storefront/content-format';
import { formatCurrency } from '@/lib/currency';
import { productPath } from '@/lib/storefront/slug';
import type { CartItem } from '@/types/cart';
import { CartCountryNotice } from './CartCountryNotice';
import { CartLineQuantity } from './CartLineQuantity';
import { FreeShippingBar } from './FreeShippingBar';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';

export function CartDrawer() {
  const t = useTranslations('storefront.cart.drawer');
  const open = useSyncExternalStore(subscribeCartDrawer, getCartDrawerOpen, getServerCartDrawerOpen);
  const pathname = usePathname();
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Cualquier navegación (Ver carrito, Pagar, enlace de un producto, atrás) lo cierra.
  useEffect(() => {
    closeCartDrawer();
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setCartDrawerOpen}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          titleRef.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          // Radix oye Escape en `document` antes que el campo: aquí se evita el cierre.
          if (escapeCancelsQuantityDraft(document.activeElement)) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          // Sin `SheetTrigger` Radix no tiene a quién devolver el foco: se le devuelve a quien abrió.
          const trigger = takeCartDrawerReturnFocus();
          if (!trigger) return;
          event.preventDefault();
          trigger.focus();
        }}
        className="w-full max-w-none gap-0 p-0 sm:max-w-md"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* El contenido (y sus consultas) solo existe con el drawer abierto. */}
        <CartDrawerBody titleRef={titleRef} closeLabel={t('close')} />
      </SheetContent>
    </Sheet>
  );
}

function CartDrawerBody({ titleRef, closeLabel }: { titleRef: React.RefObject<HTMLHeadingElement | null>; closeLabel: string }) {
  const t = useTranslations('storefront.cart.drawer');
  const tLine = useTranslations('storefront.cart.line');
  const tBlocked = useTranslations('storefront.cart.blocked');
  const { currency, lang, countryCode } = useStoreCountry();
  const { hasCustomerSession } = useStorefrontViewer();
  const { data: cart, isLoading, isError, refetch } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const [status, setStatus] = useState('');
  const blockedId = useId();

  const items = cart?.items ?? [];
  // Moneda DEL CARRITO si el API la manda (C2); si no, la del país de la tienda (como antes).
  const money = (amount: number | string) => formatCurrency(amount, cartDisplayCurrency(cart?.currencyCode, currency), lang);
  const showPoints = resolveShowPoints(cart?.showPoints, hasCustomerSession);
  const blockers = cartBlockers(items);
  // Se bloquea a la sesión de cliente y al invitado cuyo carrito YA trae su país (C2); al
  // invitado con carrito sin país solo se le AVISA: puede continuar a iniciar sesión.
  // País FIJADO en el carrito (C2); `null` = carrito sin país fijado: todo como antes de C2.
  const pinnedCountry = pinnedCartCountry(cart);
  const gate = checkoutGate(blockers, hasCustomerSession, cartCountryKnown(pinnedCountry));
  const countryMismatch = cartCountryMismatch({
    cartCountryCode: pinnedCountry,
    storeCountryCode: countryCode,
    itemCount: items.length,
  });
  // Carrito de otro país: se paga en SU tienda (el checkout de esta respondería CHK_COUNTRY_MISMATCH).
  const checkoutLocale = countryMismatch ? storeLocaleFor(lang, countryMismatch.cartCountry) ?? undefined : undefined;
  const slugs = items.map(lineSlug).filter((slug): slug is string => slug !== null);
  const busy = updateItem.isPending || removeItem.isPending;

  // Con una petición en vuelo los controles ignoran el clic (`aria-disabled`, no
  // `disabled`: el botón con foco no lo pierde).
  const setQuantity = (item: CartItem, quantity: number, announce?: string) => {
    if (busy) return;
    updateItem.mutate(
      { itemId: item.id, data: { quantity } },
      { onSuccess: () => setStatus(announce ?? '') },
    );
  };
  const remove = (item: CartItem, name: string) => {
    if (busy) return;
    removeItem.mutate(item.id, { onSuccess: () => setStatus(tLine('removed', { name })) });
  };

  return (
    <>
      <SheetHeader className="flex-row items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <SheetTitle ref={titleRef} tabIndex={-1} className="text-lg text-[#2f5165] outline-none">
            {t('title')}
          </SheetTitle>
          <SheetDescription className="text-sm text-gray-700">{t('count', { count: cart?.itemCount ?? 0 })}</SheetDescription>
        </div>
        <SheetClose
          aria-label={closeLabel}
          className={`-mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 ${FOCUS_RING}`}
        >
          <XMarkIcon aria-hidden="true" className="size-6" />
        </SheetClose>
      </SheetHeader>

      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>

      {isLoading ? (
        <div className="flex flex-1 flex-col gap-4 p-4" role="status" aria-label={t('loading')}>
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex gap-3" aria-hidden="true">
              <div className="size-16 shrink-0 animate-pulse rounded-lg bg-gray-100 motion-reduce:animate-none" />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
          <p className="text-sm text-gray-800">{t('loadError')}</p>
          <Button type="button" variant="outline" onClick={() => void refetch()} className="min-h-11 cursor-pointer">
            {t('retry')}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <ShoppingBagIcon aria-hidden="true" className="size-12 text-[#3E667D]/60" />
          <p className="text-base font-semibold text-[#2f5165]">{t('empty')}</p>
          <p className="text-sm text-gray-700">{t('emptyBody')}</p>
          <Button asChild className="mt-2 min-h-11">
            <Link href="/productos" onClick={closeCartDrawer}>
              {t('emptyCta')}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <ul aria-label={t('listLabel')} className="flex-1 divide-y divide-gray-200 overflow-y-auto overscroll-contain px-4">
            {items.map((item) => {
              const name = formatProductName(item.productName);
              const slug = lineSlug(item);
              const issue = lineIssue(item);
              const limit = lineLimit(item);
              const perUnit = linePointsPerUnit(item, showPoints);
              return (
                <li key={item.id} className="flex gap-3 py-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                    <ProductImage src={item.productImageUrl} alt="" name={name} sizes="64px" className="p-1" monogramClassName="text-base" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-2">
                      {slug ? (
                        <Link
                          href={productPath(slug)}
                          onClick={closeCartDrawer}
                          className={`line-clamp-2 rounded-sm text-sm font-semibold text-[#2f5165] underline-offset-4 hover:underline ${FOCUS_RING}`}
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="line-clamp-2 text-sm font-semibold text-[#2f5165]">{name}</span>
                      )}
                      <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">{money(item.lineTotal)}</span>
                    </div>
                    <p className="text-xs text-gray-700">{tLine('unitPrice', { price: money(item.unitPrice) })}</p>
                    {perUnit !== null && <p className="text-xs text-[#2f5165]">{tLine('pointsPerUnit', { points: perUnit })}</p>}

                    {issue === 'sold_out' && (
                      <p className="text-xs font-medium text-amber-900">
                        <span className="mr-1 rounded-full bg-amber-100 px-2 py-0.5">{tLine('soldOut')}</span>
                        {tLine('soldOutNote')}
                      </p>
                    )}
                    {issue === 'exceeds_stock' && (
                      <p className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-amber-900">
                        <span>
                          {tLine(limit.reason === 'order_max' ? 'exceedsOrderMax' : 'exceeds', {
                            requested: item.quantity,
                            available: limit.max,
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item, limit.max, tLine('adjusted'))}
                          aria-disabled={busy}
                          className={`inline-flex min-h-11 cursor-pointer items-center rounded-sm font-semibold text-[#2f5165] underline underline-offset-4 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${FOCUS_RING}`}
                        >
                          {tLine('adjust', { count: limit.max })}
                        </button>
                      </p>
                    )}

                    <div className="flex flex-wrap items-end justify-between gap-2">
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
                      <button
                        type="button"
                        onClick={() => remove(item, name)}
                        aria-disabled={busy}
                        aria-label={tLine('removeLabel', { name })}
                        className={`inline-flex min-h-11 cursor-pointer items-center rounded-sm px-1 text-sm font-medium text-gray-700 underline underline-offset-4 hover:text-red-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${FOCUS_RING}`}
                      >
                        {tLine('remove')}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-3 border-t border-gray-200 bg-white px-4 py-4">
            <CartCountryNotice mismatch={countryMismatch} lang={lang} onNavigate={closeCartDrawer} />
            <FreeShippingBar
              subtotal={Number.parseFloat(cart?.subtotal ?? '0')}
              cartCurrencyCode={cart?.currencyCode}
              cartCountryCode={pinnedCountry}
              slugs={slugs}
            />
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold text-gray-900">{t('subtotal')}</span>
              <span className="text-xl font-bold tabular-nums text-[#2f5165]" aria-live="polite">
                {money(cart?.subtotal ?? '0')}
              </span>
            </div>
            <p className="text-xs text-gray-700">{t('shippingNote')}</p>

            {gate.showNotice && (
              <p id={blockedId} role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                <span className="font-semibold">{tBlocked(gate.blocked ? 'title' : 'guestTitle')}. </span>
                {blockers.soldOut > 0 && <span>{tBlocked('soldOut', { count: blockers.soldOut })}. </span>}
                {blockers.exceedsStock > 0 && <span>{tBlocked('exceeds', { count: blockers.exceedsStock })}. </span>}
                <span>{tBlocked(gate.blocked ? 'hint' : 'guestHint')}</span>
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="min-h-12 flex-1 border-[#3E667D] text-[#2f5165]">
                <Link href="/carrito" onClick={closeCartDrawer}>
                  {t('viewCart')}
                </Link>
              </Button>
              {gate.blocked ? (
                // `aria-disabled` (no `disabled`): sigue en el orden del tabulador y el lector lee el motivo.
                <Button
                  type="button"
                  aria-disabled="true"
                  aria-describedby={blockedId}
                  className="min-h-12 flex-1 cursor-not-allowed opacity-50 hover:bg-primary"
                >
                  {t('checkout')}
                </Button>
              ) : (
                <Button asChild className="min-h-12 flex-1">
                  <Link
                    href="/checkout"
                    locale={checkoutLocale}
                    onClick={closeCartDrawer}
                    aria-describedby={gate.showNotice ? blockedId : undefined}
                  >
                    {t('checkout')}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
