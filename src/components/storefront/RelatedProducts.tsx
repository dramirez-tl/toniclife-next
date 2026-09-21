'use client';

// "También te puede interesar": query DIFERIDA (se pide al acercarse al viewport,
// no compite con el LCP), misma `ProductCard`, carrusel horizontal en móvil y
// rejilla en escritorio. Sin resultados, la sección no existe.

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStorefrontRelated } from '@/hooks/useStorefront';
import type { LanguageCode } from '@/i18n/config';
import type { StorefrontContext } from '@/types/storefront';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

interface RelatedProductsProps {
  ctx: StorefrontContext;
  slug: string;
  currencyCode: string;
  lang: LanguageCode;
  showPoints: boolean;
}

const RELATED_SIZES = '(min-width:1024px) 25vw, (min-width:640px) 45vw, 70vw';

export function RelatedProducts({ ctx, slug, currencyCode, lang, showPoints }: RelatedProductsProps) {
  const t = useTranslations('storefront.product.related');
  const sentinel = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || near) return;
    if (typeof IntersectionObserver === 'undefined') {
      const timer = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);

  const { data, isLoading, isError } = useStorefrontRelated(ctx, slug, near);
  const products = data ?? [];

  if (near && !isLoading && (isError || products.length === 0)) return null;

  return (
    <section aria-labelledby="related-title" className="min-h-[1px]">
      <div ref={sentinel} />
      {near && (
        <>
          <h2 id="related-title" className="mb-5 text-xl font-bold text-gray-900 sm:text-2xl">
            {t('title')}
          </h2>
          <ul
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:gap-5 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0"
            aria-busy={isLoading}
          >
            {isLoading
              ? Array.from({ length: 4 }, (_, index) => (
                  <li key={index} className="w-[70%] shrink-0 snap-start sm:w-[45%] lg:w-auto">
                    <ProductCardSkeleton />
                  </li>
                ))
              : products.slice(0, 8).map((product) => (
                  <li key={product.id} className="w-[70%] shrink-0 snap-start sm:w-[45%] lg:w-auto">
                    <ProductCard
                      product={product}
                      currencyCode={currencyCode}
                      lang={lang}
                      showPoints={showPoints}
                      headingLevel="h3"
                      listName="related"
                      sizes={RELATED_SIZES}
                    />
                  </li>
                ))}
          </ul>
        </>
      )}
    </section>
  );
}
