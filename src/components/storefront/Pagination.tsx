'use client';

// Paginación NUMERADA con enlaces reales (<a href>): un rastreador o un clic con
// Ctrl/Cmd abren la página; el clic normal lo intercepta el catálogo para
// paginar sin recargar. `aria-current="page"` en la página vigente.

import type { MouseEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { catalogHref, pageWindow } from '@/lib/storefront/catalog-params';
import { localizedPath } from '@/lib/storefront/seo';
import { cn } from '@/lib/utils';
import type { CatalogState } from '@/types/storefront';

interface PaginationProps {
  state: CatalogState;
  totalPages: number;
  onNavigate: (page: number) => void;
}

const ITEM =
  'inline-flex size-11 items-center justify-center rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';

export function Pagination({ state, totalPages, onNavigate }: PaginationProps) {
  const t = useTranslations('storefront.catalog.pagination');
  const locale = useLocale();
  if (totalPages <= 1) return null;

  const current = Math.min(state.pagina, totalPages);
  const hrefFor = (page: number) => localizedPath(locale, catalogHref({ ...state, pagina: page }));
  const handle = (page: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    onNavigate(page);
  };

  return (
    <nav aria-label={t('label')} className="flex justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-1">
        <li>
          {current > 1 ? (
            <a href={hrefFor(current - 1)} onClick={handle(current - 1)} rel="prev" aria-label={t('previous')} className={cn(ITEM, 'text-[#2f5165] hover:bg-gray-100')}>
              <ChevronLeftIcon aria-hidden="true" className="size-5" />
            </a>
          ) : (
            <span aria-hidden="true" className={cn(ITEM, 'text-gray-300')}>
              <ChevronLeftIcon className="size-5" />
            </span>
          )}
        </li>
        {pageWindow(current, totalPages).map((page, index) =>
          page === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="px-1 text-gray-600">
              …
            </li>
          ) : (
            <li key={page}>
              <a
                href={hrefFor(page)}
                onClick={handle(page)}
                aria-label={t('page', { page })}
                aria-current={page === current ? 'page' : undefined}
                className={cn(
                  ITEM,
                  page === current ? 'bg-[#3E667D] text-white' : 'text-[#2f5165] hover:bg-gray-100',
                )}
              >
                {page}
              </a>
            </li>
          ),
        )}
        <li>
          {current < totalPages ? (
            <a href={hrefFor(current + 1)} onClick={handle(current + 1)} rel="next" aria-label={t('next')} className={cn(ITEM, 'text-[#2f5165] hover:bg-gray-100')}>
              <ChevronRightIcon aria-hidden="true" className="size-5" />
            </a>
          ) : (
            <span aria-hidden="true" className={cn(ITEM, 'text-gray-300')}>
              <ChevronRightIcon className="size-5" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
