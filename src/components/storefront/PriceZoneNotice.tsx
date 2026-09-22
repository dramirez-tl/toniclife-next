'use client';

// Aviso discreto de la tienda cuando la cuenta cotiza con la lista de una ZONA de
// precios (Frontera MX-USA dentro de la tienda de México): lo que ve es lo que el
// carrito le cobra. Sin zona (anónimo, cuenta de país, API previo) no pinta nada.

import { useLocale, useTranslations } from 'next-intl';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { localeLanguage } from '@/i18n/config';
import { priceZoneDisplayName, type StorefrontPriceZone } from '@/lib/storefront/price-zone';
import { cn } from '@/lib/utils';

interface PriceZoneNoticeProps {
  zone: StorefrontPriceZone | null | undefined;
  className?: string;
}

export function PriceZoneNotice({ zone, className }: PriceZoneNoticeProps) {
  const t = useTranslations('storefront.common.priceZone');
  const lang = localeLanguage(useLocale());
  if (!zone) return null;

  return (
    <p
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-xl border border-[#C8DDF2] bg-[#C8DDF2]/30 px-4 py-2.5 text-sm text-[#1f3a4a]',
        className,
      )}
    >
      <InformationCircleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#2f5165]" />
      <span className="min-w-0">{t('message', { zone: priceZoneDisplayName(zone, lang) })}</span>
    </p>
  );
}
