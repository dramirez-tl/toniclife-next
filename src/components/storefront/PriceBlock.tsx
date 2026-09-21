'use client';

// Precio por ROL. Público: "$1,121.00 MXN · IVA incluido" (US: "+ tax al pagar").
// Distribuidor/preferente: "Tu precio", público tachado, ahorro y puntos.
// Los puntos SOLO se pintan si el API dijo `showPoints` (viewer distribuidor con
// sesión). Sin precio => "No disponible": jamás se usa otro campo como precio.

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { formatStorePrice } from '@/lib/storefront/price';
import type { LanguageCode } from '@/i18n/config';
import type { StorefrontPriceTier } from '@/types/storefront';

interface PriceBlockProps {
  price: number | null;
  publicPrice: number | null;
  savings: number | null;
  points: number | null;
  priceTier: StorefrontPriceTier;
  taxIncluded: boolean;
  currencyCode: string;
  lang: LanguageCode;
  showPoints: boolean;
  size?: 'card' | 'detail';
  className?: string;
}

export function PriceBlock({
  price,
  publicPrice,
  savings,
  points,
  priceTier,
  taxIncluded,
  currencyCode,
  lang,
  showPoints,
  size = 'card',
  className,
}: PriceBlockProps) {
  const t = useTranslations('storefront.common.price');
  const formatted = formatStorePrice(price, currencyCode, lang);
  const isDetail = size === 'detail';

  if (!formatted) {
    return (
      <p className={cn('font-medium text-gray-700', isDetail ? 'text-lg' : 'text-sm', className)}>
        {t('unavailable')}
      </p>
    );
  }

  const isRolePrice = priceTier !== 'public';
  const formattedPublic = isRolePrice ? formatStorePrice(publicPrice, currencyCode, lang) : null;
  const formattedSavings = isRolePrice ? formatStorePrice(savings, currencyCode, lang) : null;
  const pointsToShow = showPoints && isRolePrice && points !== null && points > 0 ? points : null;
  const numberLocale = lang === 'en' ? 'en-US' : 'es-MX';

  return (
    <div className={cn('flex flex-col', isDetail ? 'gap-1.5' : 'gap-0.5', className)}>
      {isRolePrice && (
        <span className={cn('font-semibold uppercase tracking-wide text-[#2f5165]', isDetail ? 'text-xs' : 'text-[11px]')}>
          {priceTier === 'distributor' ? t('yourPriceDistributor') : t('yourPricePreferred')}
        </span>
      )}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn('font-bold text-[#2f5165]', isDetail ? 'text-3xl sm:text-4xl' : 'text-base sm:text-lg')}>
          {formatted}
        </span>
        {formattedPublic && (
          <span className={cn('text-gray-600', isDetail ? 'text-base' : 'text-xs')}>
            <span className="sr-only">{t('publicPriceLabel')} </span>
            <s>{formattedPublic}</s>
          </span>
        )}
      </div>
      <span className={cn('text-gray-600', isDetail ? 'text-sm' : 'text-xs')}>
        {taxIncluded ? t('taxIncluded') : t('taxAtCheckout')}
      </span>
      {(formattedSavings || pointsToShow !== null) && (
        <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', isDetail ? 'mt-1 text-sm' : 'text-xs')}>
          {formattedSavings && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
              {t('savings', { amount: formattedSavings })}
            </span>
          )}
          {pointsToShow !== null && (
            <span className="rounded-full bg-[#C8DDF2]/50 px-2 py-0.5 font-semibold text-[#2f5165]">
              {t('points', { points: new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 2 }).format(pointsToShow) })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
