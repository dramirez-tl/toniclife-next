'use client';

// "Te faltan $X para envío gratis", POR PAÍS y con el umbral REAL configurable
// (ver `useStoreShipping`). Sustituye los umbrales MXN quemados de `useCartIncentive`.
// Sin dato del país, con moneda distinta o para un distribuidor: no se pinta nada.

import { useTranslations } from 'next-intl';
import { TruckIcon } from '@heroicons/react/24/outline';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { useStoreShipping } from '@/hooks/useStoreShipping';
import { freeShippingProgress } from '@/lib/storefront/cart-logic';
import { formatStorePrice } from '@/lib/storefront/price';
import { cn } from '@/lib/utils';

interface FreeShippingBarProps {
  subtotal: number;
  /** Moneda del carrito si el API la manda (C2). */
  cartCurrencyCode?: string | null;
  /** Slugs de las líneas del carrito (de ahí sale el detalle que trae el envío del país). */
  slugs: readonly string[];
  className?: string;
}

export function FreeShippingBar({ subtotal, cartCurrencyCode, slugs, className }: FreeShippingBarProps) {
  const t = useTranslations('storefront.cart.freeShipping');
  const { countryCode, lang } = useStoreCountry();
  const { data } = useStoreShipping(countryCode, lang, slugs);

  const progress = freeShippingProgress({
    shipping: data?.shipping,
    subtotal,
    cartCurrencyCode,
    eligible: data?.eligible ?? false,
  });
  if (!progress) return null;

  const message = progress.reached
    ? t('reached')
    : t('remaining', { amount: formatStorePrice(progress.remaining, progress.currencyCode, lang) ?? '' });

  return (
    <div className={cn('rounded-xl bg-[#C8DDF2]/30 p-3', className)}>
      <p className="flex items-start gap-2 text-sm font-medium text-[#2f5165]" aria-live="polite">
        <TruckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{message}</span>
      </p>
      <div
        role="progressbar"
        aria-label={t('progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={message}
        className="mt-2 h-2 overflow-hidden rounded-full bg-white"
      >
        <div
          className="h-full rounded-full bg-[#3E667D] transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-700">{t('note')}</p>
    </div>
  );
}
