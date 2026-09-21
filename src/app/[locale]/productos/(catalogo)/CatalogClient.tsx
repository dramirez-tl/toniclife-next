'use client';

// Catálogo interactivo. El ESTADO ES LA URL (q, categoria, tipo, min, max,
// agotados, orden, pagina): compartir el enlace reproduce la vista. Arranca con
// los datos del SSR (`initial`), y al cambiar un filtro conserva la cuadrícula
// anterior atenuada (`placeholderData`) en vez de parpadear.
//
// La URL se actualiza con la History API nativa (Next la sincroniza con
// `useSearchParams`): `router.replace` re-renderizaría la página en el servidor
// y dispararía `loading.tsx` en cada filtro.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowPathIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { parseLocale } from '@/i18n/config';
import { useStorefrontProducts, useStorefrontViewer, type InitialStorefrontList } from '@/hooks/useStorefront';
import {
  DEFAULT_CATALOG_STATE,
  activeFilterCount,
  catalogHref,
  parseCatalogParams,
  serializeCatalogParams,
  type CatalogState,
} from '@/lib/storefront/catalog-params';
import { buildCatalogMetadata } from '@/lib/storefront/metadata';
import { localizedPath } from '@/lib/storefront/seo';
import { cn } from '@/lib/utils';
import { ActiveFilterChips } from '@/components/storefront/ActiveFilterChips';
import { Breadcrumbs, type BreadcrumbEntry } from '@/components/storefront/Breadcrumbs';
import { CatalogFilters } from '@/components/storefront/CatalogFilters';
import { CatalogToolbar } from '@/components/storefront/CatalogToolbar';
import { FiltersSheet } from '@/components/storefront/FiltersSheet';
import { Pagination } from '@/components/storefront/Pagination';
import { ProductCard, ProductCardSkeleton } from '@/components/storefront/ProductCard';
import { SearchBox } from '@/components/storefront/SearchBox';

interface CatalogClientProps {
  initial: InitialStorefrontList;
}

export function CatalogClient({ initial }: CatalogClientProps) {
  const t = useTranslations('storefront.catalog');
  const locale = useLocale();
  const { lang, country } = parseLocale(locale);
  const ctx = useMemo(() => ({ country, lang }), [country, lang]);

  const searchParams = useSearchParams();
  const stateKey = serializeCatalogParams(parseCatalogParams(searchParams));
  // Identidad estable: el objeto solo cambia cuando cambia la URL canónica del estado.
  const state = useMemo(() => parseCatalogParams(new URLSearchParams(stateKey)), [stateKey]);

  const { data, isFetching, isError, isPlaceholderData, refetch } = useStorefrontProducts(ctx, state, initial);
  const [sheetOpen, setSheetOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (next: CatalogState, mode: 'push' | 'replace') => {
      const href = localizedPath(locale, catalogHref(next));
      if (mode === 'push') window.history.pushState(null, '', href);
      else window.history.replaceState(null, '', href);
    },
    [locale],
  );

  /** Cambiar un filtro regresa SIEMPRE a la página 1. */
  const patchState = useCallback(
    (patch: Partial<CatalogState>) => navigate({ ...state, ...patch, pagina: 1 }, 'replace'),
    [navigate, state],
  );

  const clearFilters = useCallback(
    () => navigate({ ...DEFAULT_CATALOG_STATE, orden: state.orden }, 'replace'),
    [navigate, state.orden],
  );

  const goToPage = useCallback(
    (page: number) => {
      navigate({ ...state, pagina: page }, 'push');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      resultsRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    },
    [navigate, state],
  );

  const facets = data?.facets ?? initial.data.facets;
  const currencyCode = data?.currencyCode ?? initial.data.currencyCode;
  const categoryName = state.categoria
    ? (facets.categories.find((c) => c.slug === state.categoria)?.name ?? null)
    : null;

  // El <title> lo puso el servidor para la URL de entrada; al filtrar en cliente se mantiene coherente.
  useEffect(() => {
    const title = buildCatalogMetadata({ locale, state, categoryName }).title;
    if (typeof title === 'string') document.title = title;
  }, [locale, state, categoryName]);

  const products = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  // Puntos SOLO para distribuidor CON sesión y cuando el API lo autoriza (`viewer.showPoints`).
  const { hasSession } = useStorefrontViewer();
  const showPoints = hasSession && (data?.viewer.showPoints ?? false);
  const filtersActive = activeFilterCount(state) + (state.q ? 1 : 0);
  const loadingFirst = !data && isFetching;
  const stale = isFetching && isPlaceholderData;

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: t('breadcrumbHome'), href: '/' },
    { label: t('breadcrumbProducts'), href: categoryName ? '/productos' : undefined },
    ...(categoryName ? [{ label: categoryName }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <Breadcrumbs items={breadcrumbs} ariaLabel={t('breadcrumbLabel')} className="pt-4" />

      <header className="pb-4 pt-3">
        <h1 className="text-2xl font-bold text-[#2f5165] sm:text-3xl">{categoryName ?? t('title')}</h1>
        {data && data.viewer.tier !== 'public' && (
          <p className="mt-2 inline-flex rounded-full bg-[#C8DDF2]/40 px-3 py-1 text-sm font-medium text-[#1f3a4a]">
            {data.viewer.tier === 'distributor' ? t('viewerDistributor') : t('viewerPreferred')}
          </p>
        )}
      </header>

      {/* Barra pegajosa: buscador + filtros (móvil). Debajo del header fijo del sitio. */}
      <div
        className="sticky z-30 -mx-4 flex items-center gap-2 border-b border-gray-200 bg-white/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 7rem)' }}
      >
        <SearchBox
          ctx={ctx}
          value={state.q}
          onSearch={(q) => patchState({ q })}
          onSelectCategory={(slug) => patchState({ categoria: slug, q: '' })}
          className="min-w-0 flex-1 lg:max-w-xl"
        />
        <div className="lg:hidden">
          <FiltersSheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            state={state}
            facets={facets}
            currencyCode={currencyCode}
            total={total}
            activeCount={activeFilterCount(state)}
            isFetching={isFetching}
            onChange={patchState}
            onClear={clearFilters}
          />
        </div>
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block" aria-label={t('filters.title')}>
          <div className="sticky top-36 max-h-[calc(100dvh-10rem)] overflow-y-auto pb-4 pr-2">
            <h2 className="mb-5 text-base font-semibold text-gray-900">{t('filters.title')}</h2>
            <CatalogFilters state={state} facets={facets} currencyCode={currencyCode} onChange={patchState} />
          </div>
        </aside>

        <div ref={resultsRef} className="scroll-mt-44 lg:scroll-mt-36">
          <div className="flex flex-col gap-3">
            <CatalogToolbar total={total} sort={state.orden} onSortChange={(orden) => patchState({ orden })} />
            <ActiveFilterChips
              state={state}
              facets={facets}
              currencyCode={currencyCode}
              lang={lang}
              onChange={patchState}
              onClear={clearFilters}
            />
          </div>

          {isError && !data ? (
            <div role="alert" className="mt-10 flex flex-col items-center rounded-2xl border border-gray-200 px-6 py-14 text-center">
              <ExclamationTriangleIcon aria-hidden="true" className="size-10 text-amber-700" />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">{t('error.title')}</h2>
              <p className="mt-2 max-w-md text-sm text-gray-700">{t('error.body')}</p>
              <Button type="button" onClick={() => void refetch()} className="mt-6 min-h-11 cursor-pointer">
                <ArrowPathIcon aria-hidden="true" className="size-4" />
                {t('error.retry')}
              </Button>
            </div>
          ) : loadingFirst ? (
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label={t('loading')}>
              {Array.from({ length: 12 }, (_, index) => (
                <li key={index}>
                  <ProductCardSkeleton />
                </li>
              ))}
            </ul>
          ) : products.length === 0 ? (
            <EmptyState
              hasFilters={filtersActive > 0}
              onClear={clearFilters}
              categories={facets.categories.filter((c) => c.count > 0 && c.slug !== state.categoria).slice(0, 6)}
              onSelectCategory={(slug) => navigate({ ...DEFAULT_CATALOG_STATE, categoria: slug }, 'replace')}
              locale={locale}
            />
          ) : (
            <>
              <ul
                className={cn(
                  'mt-6 grid grid-cols-2 gap-3 transition-opacity sm:gap-5 md:grid-cols-3 xl:grid-cols-4',
                  stale && 'opacity-60',
                )}
                aria-busy={isFetching}
              >
                {products.map((product, index) => (
                  <li key={product.id} className="min-w-0">
                    <ProductCard
                      product={product}
                      currencyCode={currencyCode}
                      lang={lang}
                      showPoints={showPoints}
                      priority={index < 4}
                      listName="catalog"
                    />
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Pagination state={state} totalPages={totalPages} onNavigate={goToPage} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  hasFilters: boolean;
  onClear: () => void;
  categories: { slug: string; name: string; count: number }[];
  onSelectCategory: (slug: string) => void;
  locale: string;
}

/** Vacío ÚTIL: limpiar filtros, categorías con productos y el test de salud. */
function EmptyState({ hasFilters, onClear, categories, onSelectCategory, locale }: EmptyStateProps) {
  const t = useTranslations('storefront.catalog.empty');
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-gray-200 px-6 py-14 text-center">
      <MagnifyingGlassIcon aria-hidden="true" className="size-10 text-gray-600" />
      <h2 className="mt-4 text-lg font-semibold text-gray-900">{hasFilters ? t('titleFiltered') : t('title')}</h2>
      <p className="mt-2 max-w-md text-sm text-gray-700">{hasFilters ? t('bodyFiltered') : t('body')}</p>
      {hasFilters && (
        <Button type="button" onClick={onClear} className="mt-6 min-h-11 cursor-pointer">
          {t('clear')}
        </Button>
      )}
      {categories.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-900">{t('suggested')}</h3>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <li key={category.slug}>
                <a
                  href={localizedPath(locale, catalogHref({ categoria: category.slug }))}
                  onClick={(event) => {
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    onSelectCategory(category.slug);
                  }}
                  className="inline-flex min-h-11 items-center rounded-full border border-gray-300 px-4 text-sm text-gray-800 hover:border-[#3E667D] hover:text-[#2f5165] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
                >
                  {category.name} <span className="ml-1.5 text-xs text-gray-600">({category.count})</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-8 text-sm text-gray-700">
        {t('quizPrompt')}{' '}
        <Link
          href="/quiz"
          className="font-semibold text-[#2f5165] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
        >
          {t('quizLink')}
        </Link>
      </p>
    </div>
  );
}
