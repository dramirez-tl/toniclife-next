'use client';

// Aviso NO bloqueante (C2): se está en la tienda de un país con un carrito NO vacío de
// OTRO país. Sale en el `CartDrawer` y en /carrito. No impide nada: explica que el carrito
// es de la otra tienda y cuál es la salida REAL:
//  · invitado (o cuenta sin tienda propia: manda el locale) → enlace a la tienda del carrito;
//  · sesión con tienda propia de la cuenta → ese enlace no sirve (en cualquier URL mandan el
//    país de la cuenta las altas y el checkout): se ofrece "Vaciar carrito y comprar en {país
//    de la cuenta}", que abre el diálogo de país (la confirmación) sin alta pendiente.
// Con un carrito sin país (API previo a C2 o `country_id` NULL) no se pinta NADA.

import { useTranslations } from 'next-intl';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useAccountStoreCountry } from '@/hooks/useStoreCountry';
import { Link } from '@/i18n/routing';
import type { LanguageCode } from '@/i18n/config';
import { countryConflictAction, countryDisplayName, storeLocaleFor, type CartCountryMismatch } from '@/lib/storefront/cart-country';
import { openCartCountryChange } from '@/lib/storefront/cart-country-dialog-store';
import { cn } from '@/lib/utils';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';
const ACTION = `ml-6 mt-1 inline-flex min-h-11 items-center rounded-sm text-left font-semibold text-[#2f5165] underline underline-offset-4 hover:no-underline ${FOCUS_RING}`;

export function CartCountryNotice({
  mismatch,
  lang,
  onNavigate,
  className,
}: {
  mismatch: CartCountryMismatch | null;
  lang: LanguageCode;
  /** El drawer se cierra al navegar. */
  onNavigate?: () => void;
  className?: string;
}) {
  const t = useTranslations('storefront.cart.country');
  const accountStoreCountry = useAccountStoreCountry();
  if (!mismatch) return null;
  const cartName = countryDisplayName(mismatch.cartCountry, lang);
  const storeName = countryDisplayName(mismatch.storeCountry, lang);
  const cartLocale = storeLocaleFor(lang, mismatch.cartCountry);
  const action = countryConflictAction({ accountStoreCountry, cartCountry: mismatch.cartCountry });

  return (
    <div role="status" className={cn('rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-950', className)}>
      <p className="flex items-start gap-2">
        <GlobeAltIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-semibold">{t('noticeTitle', { cartCountry: cartName })}. </span>
          {action.kind === 'empty_for_account'
            ? t('noticeBodyAccount', { accountCountry: countryDisplayName(action.accountCountry, lang) })
            : t('noticeBody', { cartCountry: cartName, storeCountry: storeName })}
        </span>
      </p>
      {action.kind === 'empty_for_account' ? (
        <button
          type="button"
          // El diálogo ES la confirmación: dice cuántos productos se quitan y permite conservar el carrito.
          onClick={() => openCartCountryChange({ cartCountry: mismatch.cartCountry, requestedCountry: action.accountCountry }, [])}
          className={ACTION}
        >
          {t('emptyForAccount', { country: countryDisplayName(action.accountCountry, lang) })}
        </button>
      ) : (
        cartLocale && (
          <Link href="/carrito" locale={cartLocale} onClick={onNavigate} className={ACTION}>
            {t('noticeGoToStore', { country: cartName })}
          </Link>
        )
      )}
    </div>
  );
}
