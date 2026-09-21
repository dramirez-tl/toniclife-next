'use client';

// Disponibilidad REAL del API. Nunca existencias exactas: "Últimas {n}" solo
// cuando el API manda `stockLeft` (<= umbral). 'unknown' = el dato no llegó: no
// se promete existencia ni se marca Agotado (el carrito valida al agregar).

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { StorefrontAvailability } from '@/types/storefront';

interface AvailabilityBadgeProps {
  availability: StorefrontAvailability;
  stockLeft: number | null;
  className?: string;
}

const STYLES: Record<StorefrontAvailability, { wrap: string; dot: string }> = {
  in_stock: { wrap: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-600' },
  low_stock: { wrap: 'bg-amber-50 text-amber-900', dot: 'bg-amber-600' },
  out_of_stock: { wrap: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
  unknown: { wrap: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
};

export function AvailabilityBadge({ availability, stockLeft, className }: AvailabilityBadgeProps) {
  const t = useTranslations('storefront.common.availability');
  const style = STYLES[availability];
  const label =
    availability === 'low_stock'
      ? stockLeft !== null
        ? t('lowStock', { count: stockLeft })
        : t('lowStockGeneric')
      : availability === 'in_stock'
        ? t('inStock')
        : availability === 'out_of_stock'
          ? t('outOfStock')
          : t('unknown');

  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-medium',
        style.wrap,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-2 rounded-full', style.dot)} />
      {label}
    </span>
  );
}
