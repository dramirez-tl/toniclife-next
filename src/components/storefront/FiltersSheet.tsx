'use client';

// Filtros en MÓVIL: Sheet inferior (foco atrapado por Radix) con pie fijo
// "Ver {total} productos" y "Limpiar". Los cambios se aplican en vivo a la URL;
// el pie muestra el total ya filtrado.

import { useTranslations } from 'next-intl';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { CatalogState, StorefrontFacets } from '@/types/storefront';
import { CatalogFilters } from './CatalogFilters';

interface FiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: CatalogState;
  facets: StorefrontFacets;
  currencyCode: string;
  total: number;
  activeCount: number;
  isFetching: boolean;
  onChange: (patch: Partial<CatalogState>) => void;
  onClear: () => void;
}

export function FiltersSheet({
  open,
  onOpenChange,
  state,
  facets,
  currencyCode,
  total,
  activeCount,
  isFetching,
  onChange,
  onClear,
}: FiltersSheetProps) {
  const t = useTranslations('storefront.catalog.filters');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="min-h-11 shrink-0 cursor-pointer rounded-full px-4">
          <AdjustmentsHorizontalIcon aria-hidden="true" className="size-5" />
          {t('button', { count: activeCount })}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88dvh] gap-0 rounded-t-2xl p-0">
        <SheetHeader className="border-b border-gray-200 px-4 py-4">
          <SheetTitle>{t('title')}</SheetTitle>
          <SheetDescription className="sr-only">{t('description')}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <CatalogFilters state={state} facets={facets} currencyCode={currencyCode} onChange={onChange} />
        </div>
        <SheetFooter
          className="flex-row gap-3 border-t border-gray-200 bg-white px-4 pt-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={onClear}
            disabled={activeCount === 0}
            className="min-h-11 flex-1 cursor-pointer"
          >
            {t('clear')}
          </Button>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-busy={isFetching}
            className="min-h-11 flex-[2] cursor-pointer"
          >
            {t('viewResults', { count: total })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
