'use client';

// Diálogo de PAÍS del carrito (contrato ecommerce 6.4 C2, decisión 4: manda el país de la
// tienda elegida; cambiar de país con el carrito no vacío pide confirmación y lo vacía).
// Se monta UNA vez en el layout de `[locale]` y lo abre `cart-country-dialog-store`:
//  · 409 `CART_COUNTRY_CHANGE` al agregar → "Vaciar y cambiar" / "Seguir en {país}".
//  · 409 `CHK_COUNTRY_MISMATCH` en el checkout → enlaces al carrito y a la tienda correcta
//    (el API no creó la orden ni cobró: es una guarda previa).
//  · El aviso del carrito (`CartCountryNotice`) con sesión → solo vaciar (sin alta pendiente).
// CON SESIÓN MANDA LA CUENTA (`countryConflictAction`): si la cuenta tiene tienda propia y no es
// la del carrito, un enlace a la tienda del carrito no sirve (altas y checkout mandan el país de
// la cuenta). La acción es "Vaciar carrito y comprar en {país de la cuenta}" vía
// `PUT /cart/country { country: <cuenta>, clearItems: true }`. Al invitado se le conserva el enlace.
// Accesibilidad: `alertdialog`; el foco entra a la acción que NO destruye nada y al cerrar
// vuelve a quien lo provocó; Escape = conservar el carrito. Contra un API sin C2 nunca se abre.

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAddCartItem, useCart, useSwitchCartCountry } from '@/hooks/useCart';
import { useAccountStoreCountry, useStoreCountry } from '@/hooks/useStoreCountry';
import { Link, useRouter } from '@/i18n/routing';
import { countryConflictAction, countryDisplayName, normalizeCountryCode, storeLocaleFor } from '@/lib/storefront/cart-country';
import {
  closeCartCountryDialog,
  getCartCountryDialog,
  getServerCartCountryDialog,
  subscribeCartCountryDialog,
  takeCartCountryDialogReturnFocus,
  type CartCountryDialogState,
} from '@/lib/storefront/cart-country-dialog-store';
import { openCartDrawer } from '@/lib/storefront/cart-drawer-store';

const OUTLINE = 'h-auto min-h-11 whitespace-normal py-2 border-[#3E667D] text-[#2f5165]';
const DESTRUCTIVE = 'h-auto min-h-11 whitespace-normal py-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-60';
const FOOTER = 'flex-col gap-2 sm:flex-col sm:items-stretch sm:justify-start';

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
  const router = useRouter();
  const { countryCode: storeCountry, lang } = useStoreCountry();
  const accountStoreCountry = useAccountStoreCountry();
  const { data: cart } = useCart();
  const switchCountry = useSwitchCartCountry();
  const addItem = useAddCartItem();
  const [working, setWorking] = useState(false);
  // Checkout con sesión: la persona venía a PAGAR, no a vaciar; por eso vaciar se confirma aparte.
  const [confirming, setConfirming] = useState(false);

  // Lo que el API no dijo se completa con el carrito en caché y con la tienda visitada.
  const cartCountry = state.cartCountry ?? normalizeCountryCode(cart?.countryCode);
  const action = countryConflictAction({ accountStoreCountry, cartCountry });
  const forAccount = action.kind === 'empty_for_account';
  // Con sesión el carrito se fija SIEMPRE en el país con tienda de la cuenta (el que manda el checkout).
  const targetCountry = action.kind === 'empty_for_account' ? action.accountCountry : (state.requestedCountry ?? storeCountry);
  const cartName = cartCountry ? countryDisplayName(cartCountry, lang) : null;
  const targetName = countryDisplayName(targetCountry, lang);
  const cartLocale = storeLocaleFor(lang, cartCountry);
  // Productos que se pierden al vaciar: lo que dijo el API o, sin dato, el carrito en caché.
  const lostCount = state.itemCount ?? (cart?.items.length || null);
  const setSafeAction = (node: HTMLElement | null) => {
    safeActionRef.current = node;
  };

  // Al pasar a la confirmación el foco va, otra vez, a la acción que NO destruye nada.
  useEffect(() => {
    if (confirming) safeActionRef.current?.focus();
  }, [confirming, safeActionRef]);

  /** `true` = el carrito quedó vacío y con el país nuevo. Si falla, el hook ya avisó y el carrito sigue intacto. */
  const emptyCart = async (): Promise<boolean> => {
    try {
      await switchCountry.mutateAsync(targetCountry);
      return true;
    } catch {
      return false;
    }
  };

  if (state.kind === 'checkout_country_mismatch') {
    const emptyForAccount = async () => {
      if (working) return;
      setWorking(true);
      try {
        if (!(await emptyCart())) return; // Nada cambió: el diálogo sigue abierto.
        toast.success(t('emptied', { country: targetName }));
        skipReturnFocus.current = true;
        closeCartCountryDialog();
        router.push('/productos');
      } finally {
        setWorking(false);
      }
    };

    if (forAccount && confirming) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-[#2f5165]">{t('confirmEmptyTitle')}</DialogTitle>
            <DialogDescription className="text-sm text-gray-800">
              {lostCount ? `${t('itemsLost', { count: lostCount })} ` : ''}
              {t('confirmEmptyBody', { country: targetName })}
            </DialogDescription>
          </DialogHeader>
          <span className="sr-only" role="status" aria-live="polite">
            {working ? t('workingEmpty') : ''}
          </span>
          <DialogFooter className={FOOTER}>
            <Button type="button" variant="destructive" onClick={() => void emptyForAccount()} aria-disabled={working} className={DESTRUCTIVE}>
              {t('confirmEmptyYes')}
            </Button>
            <Button type="button" variant="outline" ref={setSafeAction} onClick={() => setConfirming(false)} className={OUTLINE}>
              {t('confirmEmptyNo')}
            </Button>
          </DialogFooter>
        </>
      );
    }

    const checkoutBody = forAccount
      ? cartName
        ? t('checkoutBodyAccount', { cartCountry: cartName, accountCountry: targetName })
        : t('checkoutBodyAccountUnknown', { accountCountry: targetName })
      : cartName
        ? t('checkoutBody', { cartCountry: cartName, storeCountry: targetName })
        : t('checkoutBodyUnknown', { storeCountry: targetName });

    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-[#2f5165]">{t('checkoutTitle')}</DialogTitle>
          <DialogDescription className="text-sm text-gray-800">
            {checkoutBody} {t('checkoutNoCharge')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className={FOOTER}>
          {forAccount ? (
            // Con sesión manda la cuenta: el enlace a la tienda del carrito llevaría al mismo 409.
            <Button type="button" variant="destructive" onClick={() => setConfirming(true)} className={DESTRUCTIVE}>
              {t('emptyForAccount', { country: targetName })}
            </Button>
          ) : cartLocale && cartName ? (
            <Button asChild className="h-auto min-h-11 whitespace-normal py-2">
              <Link href="/checkout" locale={cartLocale} ref={setSafeAction} onClick={closeCartCountryDialog}>
                {t('checkoutGoToStore', { country: cartName })}
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className={OUTLINE}>
            <Link href="/carrito" ref={forAccount ? setSafeAction : undefined} onClick={closeCartCountryDialog}>
              {t('checkoutViewCart')}
            </Link>
          </Button>
        </DialogFooter>
      </>
    );
  }

  const pending = state.pending;

  const emptyAndSwitch = async () => {
    if (working) return;
    setWorking(true);
    try {
      // Vacía y fija el país en una transacción del API. Si falla, el carrito sigue intacto y el diálogo abierto.
      if (!(await emptyCart())) return;
      // Luego repite TODAS las altas pendientes (una del catálogo, o el paquete completo del quiz).
      // Un alta que falle (p. ej. sin precio en ese país) la explica su propio toast y no aborta las demás.
      let added = 0;
      for (const item of pending) {
        try {
          await addItem.mutateAsync(item);
          added += 1;
        } catch {
          // `useAddCartItem` ya avisó el motivo.
        }
      }
      // El carrito YA quedó vacío y con el país nuevo: el diálogo se cierra aunque un alta falle
      // (abierto seguiría diciendo "Tu carrito es de {país viejo}", que dejó de ser cierto). Si un
      // alta lo reabrió con OTRO conflicto, ese estado nuevo se respeta.
      if (getCartCountryDialog() !== state) return;
      if (pending.length === 0) toast.success(t('emptied', { country: targetName }));
      skipReturnFocus.current = added > 0;
      closeCartCountryDialog();
      if (added > 0) openCartDrawer(takeCartCountryDialogReturnFocus());
    } finally {
      setWorking(false);
    }
  };

  const changeBody = forAccount
    ? cartName
      ? t('changeBodyAccount', { cartCountry: cartName, accountCountry: targetName })
      : t('changeBodyAccountUnknown', { accountCountry: targetName })
    : cartName
      ? t('changeBody', { cartCountry: cartName, storeCountry: targetName })
      : t('changeBodyUnknown', { storeCountry: targetName });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-[#2f5165]">{t('changeTitle')}</DialogTitle>
        <DialogDescription className="text-sm text-gray-800">
          {changeBody}
          {lostCount ? ` ${t('itemsLost', { count: lostCount })}` : ''}
          {pending.length > 1 ? ` ${t('pendingMany', { count: pending.length })}` : ''}
        </DialogDescription>
      </DialogHeader>
      <span className="sr-only" role="status" aria-live="polite">
        {working ? (pending.length > 0 ? t('working', { count: pending.length }) : t('workingEmpty')) : ''}
      </span>
      <DialogFooter className={FOOTER}>
        <Button type="button" variant="destructive" onClick={() => void emptyAndSwitch()} aria-disabled={working} className={DESTRUCTIVE}>
          {forAccount ? t('emptyForAccount', { country: targetName }) : t('emptyAndSwitch')}
        </Button>
        {!forAccount && cartLocale && cartName ? (
          <Button asChild variant="outline" className={OUTLINE}>
            <Link href="/productos" locale={cartLocale} ref={setSafeAction} onClick={closeCartCountryDialog}>
              {t('stayIn', { country: cartName })}
            </Link>
          </Button>
        ) : (
          // Con sesión "seguir en la tienda del carrito" no existe: en cualquier URL manda la cuenta.
          <Button type="button" variant="outline" ref={setSafeAction} onClick={closeCartCountryDialog} className={OUTLINE}>
            {t('keepCart')}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
