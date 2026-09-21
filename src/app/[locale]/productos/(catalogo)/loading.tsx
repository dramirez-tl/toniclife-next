// Esqueleto del catálogo al llegar por navegación de cliente. Misma rejilla y
// mismas cajas `aspect-square` que las tarjetas reales: sin saltos de layout (CLS).
// Al filtrar NO se muestra (los filtros no navegan: ver CatalogClient).

import { ProductCardSkeleton } from '@/components/storefront/ProductCard';

export default function CatalogLoading() {
  return (
    <div aria-busy="true">
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="pt-4">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
          <div className="mt-4 h-8 w-56 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
          <div className="mt-5 h-11 w-full max-w-xl animate-pulse rounded-full bg-gray-100 motion-reduce:animate-none" />
        </div>
        <div className="mt-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
          <div className="hidden lg:block">
            <div className="h-96 animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }, (_, index) => (
              <li key={index}>
                <ProductCardSkeleton />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
