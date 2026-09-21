'use client';

// Diálogo de PAÍS del carrito (contrato ecommerce 6.4 C2, decisión 4: manda el país de la
// tienda elegida; cambiar de país con el carrito no vacío pide confirmación y lo vacía).
// Se monta UNA vez en el layout de `[locale]` y lo abre `cart-country-dialog-store`:
//  · 409 `CART_COUNTRY_CHANGE` al agregar → "Vaciar y cambiar" / "Seguir en {país}".
//  · 409 `CHK_COUNTRY_MISMATCH` en el checkout → enlaces al carrito y a la tienda correcta
//    (el API no creó la orden ni cobró: es una guarda previa).
// Accesibilidad: `alertdialog`; el foco entra a la acción que NO destruye nada y al cerrar
// vuelve a quien lo provocó; Escape = conservar el carrito. Contra un API sin C2 nunca se abre.

import { useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAddCartItem, useCart, useSwitchCartCountry } from '@/hooks/useCart';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { Link } from '@/i18n/routing';
import { countryDisplayName, normalizeCountryCode, storeLocaleFor } from '@/lib/storefront/cart-country';
import {
  closeCartCountryDialog,
  getCartCountryDialog,
  getServerCartCountryDialog,
  subscribeCartCountryDialog,
  takeCartCountryDialogReturnFocus,
  type CartCountryDialogState,
} from '@/lib/storefront/cart-country-dialog-store';
import { openCartDrawer } from '@/lib/storefront/cart-drawer-store';

export function CartCountryDialog() {
  const state = useSyncExternalStore(subscribeCartCountryDialog, getCartCountryDialog, getServerCartCountryDialog);
  const safeActionRef = useRef<HTMLElement | null>(null);
  // El elemento que recibe el foco al cerrar puede cambiarlo "Vaciar y cambiar" (abre el drawer).
  const skipReturnFocus = useRef(false);

  return (
    <Dialog
      open={state !== null}
      onOpenChange={(next) => {
        if (!next) closeCartCountryDialog();
      }}
    >
      <DialogContent
        role="alertdialog"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          if (!safeActionRef.current) return;
          event.preventDefault();
          safeActionRef.current.focus();
        }}
        onCloseAutoFocus={(event) => {
          const target = takeCartCountryDialogReturnFocus();
          if (skipReturnFocus.current) {
            skipReturnFocus.current = false;
            event.preventDefault();
            return;
          }
          if (!target) return;
          event.preventDefault();
          target.focus();
        }}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        {state && <CartCountryDialogBody state={state} safeActionRef={safeActionRef} skipReturnFocus={skipReturnFocus} />}
      </DialogContent>
    </Dialog>
  );
}

function CartCountryDialogBody({
  state,
  safeActionRef,
  skipReturnFocus,
}: {
  state: CartCountryDialogState;
  safeActionRef: React.RefObject<HTMLElement | null>;
  skipReturnFocus: React.RefObject<boolean>;
}) {
  const t = useTranslations('storefront.cart.country');
  const { countryCode: storeCountry, lang } = useStoreCountry();
  const { data: cart } = useCart();
  const switchCountry = useSwitchCartCountry();
  const addItem = useAddCartItem();
  const [working, setWorking] = useState(false);

  // Lo que el API no dijo se completa con el carrito en caché y con la tienda visitada.
  const cartCountry = state.cartCountry ?? normalizeCountryCode(cart?.countryCode);
  const targetCountry = state.requestedCountry ?? storeCountry;
  const cartName = cartCountry ? countryDisplayName(cartCountry, lang) : null;
  const targetName = countryDisplayName(targetCountry, lang);
  const cartLocale = storeLocaleFor(lang, cartCountry);
  const setSafeAction = (node: HTMLElement | null) => {
    safeActionRef.current = node;
  };

  if (state.kind === 'checkout_country_mismatch') {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-[#2f5165]">{t('checkoutTitle')}</DialogTitle>
          <DialogDescription className="text-sm text-gray-800">
            {cartName ? t('checkoutBody', { cartCountry: cartName, storeCountry: targetName }) : t('checkoutBodyUnknown', { storeCountry: targetName })}{' '}
            {t('checkoutNoCharge')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch sm:justify-start">
          {cartLocale && cartName ? (
            <Button asChild className="h-auto min-h-11 whitespace-normal py-2">
              <Link href="/checkout" locale={cartLocale} ref={setSafeAction} onClick={closeCartCountryDialog}>
                {t('checkoutGoToStore', { country: cartName })}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal py-2 border-[#3E667D] text-[#2f5165]">
            <Link href="/carrito" onClick={closeCartCountryDialog}>
              {t('checkoutViewCart')}
            </Link>
          </Button>
        </DialogFooter>
      </>
    );
  }

  const emptyAndSwitch = async () => {
    if (working) return;
    setWorking(true);
    try {
      // Vacía y fija el país de ESTA tienda en una transacción; luego repite el alta que el API rechazó.
      await switchCountry.mutateAsync(targetCountry);
      await addItem.mutateAsync(state.pending);
      skipReturnFocus.current = true;
      closeCartCountryDialog();
      openCartDrawer(takeCartCountryDialogReturnFocus());
    } catch {
      // `useSwitchCartCountry` / `useAddCartItem` ya avisaron el motivo; el diálogo sigue abierto.
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-[#2f5165]">{t('changeTitle')}</DialogTitle>
        <DialogDescription className="text-sm text-gray-800">
          {cartName ? t('changeBody', { cartCountry: cartName, storeCountry: targetName }) : t('changeBodyUnknown', { storeCountry: targetName })}
        </DialogDescription>
      </DialogHeader>
      <span className="sr-only" role="status" aria-live="polite">
        {working ? t('working') : ''}
      </span>
      <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch sm:justify-start">
        <Button
          type="button"
          variant="destructive"
          onClick={() => void emptyAndSwitch()}
          aria-disabled={working}
          className="h-auto min-h-11 whitespace-normal py-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        >
          {t('emptyAndSwitch')}
        </Button>
        {cartLocale && cartName ? (
          <Button asChild variant="outline" className="h-auto min-h-11 whitespace-normal py-2 border-[#3E667D] text-[#2f5165]">
            <Link href="/productos" locale={cartLocale} ref={setSafeAction} onClick={closeCartCountryDialog}>
              {t('stayIn', { country: cartName })}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            ref={setSafeAction}
            onClick={closeCartCountryDialog}
            className="h-auto min-h-11 whitespace-normal py-2 border-[#3E667D] text-[#2f5165]"
          >
            {t('keepCart')}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
