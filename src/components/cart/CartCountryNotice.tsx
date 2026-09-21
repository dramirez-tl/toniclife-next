'use client';

// Aviso NO bloqueante (C2): se está en la tienda de un país con un carrito NO vacío de
// OTRO país. Sale en el `CartDrawer` y en /carrito. No impide nada: explica que el carrito
// es de la otra tienda, enlaza a ella y recuerda que para comprar aquí hay que vaciarlo.
// Con un carrito sin país (API previo a C2 o `country_id` NULL) no se pinta NADA.

import { useTranslations } from 'next-intl';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/routing';
import type { LanguageCode } from '@/i18n/config';
import { countryDisplayName, storeLocaleFor, type CartCountryMismatch } from '@/lib/storefront/cart-country';
import { cn } from '@/lib/utils';

const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';

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
  if (!mismatch) return null;
  const cartName = countryDisplayName(mismatch.cartCountry, lang);
  const storeName = countryDisplayName(mismatch.storeCountry, lang);
  const cartLocale = storeLocaleFor(lang, mismatch.cartCountry);

  return (
    <div role="status" className={cn('rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-950', className)}>
      <p className="flex items-start gap-2">
        <GlobeAltIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-semibold">{t('noticeTitle', { cartCountry: cartName })}. </span>
          {t('noticeBody', { cartCountry: cartName, storeCountry: storeName })}
        </span>
      </p>
      {cartLocale && (
        <Link
          href="/carrito"
          locale={cartLocale}
          onClick={onNavigate}
          className={`ml-6 mt-1 inline-flex min-h-11 items-center rounded-sm font-semibold text-[#2f5165] underline underline-offset-4 hover:no-underline ${FOCUS_RING}`}
        >
          {t('noticeGoToStore', { country: cartName })}
        </Link>
      )}
    </div>
  );
}
