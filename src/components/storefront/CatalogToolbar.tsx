'use client';

// Barra de resultados: total REAL del API (anunciado con aria-live) + orden.

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATALOG_SORTS, type CatalogSort } from '@/lib/storefront/catalog-params';

interface CatalogToolbarProps {
  total: number;
  sort: CatalogSort;
  onSortChange: (sort: CatalogSort) => void;
}

export function CatalogToolbar({ total, sort, onSortChange }: CatalogToolbarProps) {
  const t = useTranslations('storefront.catalog.toolbar');
  const labelId = useId();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-gray-700" aria-live="polite" aria-atomic="true">
        {t('results', { count: total })}
      </p>
      <div className="flex items-center gap-2">
        <span id={labelId} className="text-sm text-gray-700">
          {t('sortLabel')}
        </span>
        <Select value={sort} onValueChange={(value) => onSortChange(value as CatalogSort)}>
          <SelectTrigger aria-labelledby={labelId} className="min-h-11 w-[13.5rem] cursor-pointer bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {CATALOG_SORTS.map((option) => (
              <SelectItem key={option} value={option} className="min-h-10 cursor-pointer">
                {t(`sort.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
