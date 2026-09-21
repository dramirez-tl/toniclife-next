'use client';

// "Este paquete incluye": componentes del paquete con miniatura y cantidad
// (`Number`, nunca "2.000 x"). Enlace solo si el componente tiene slug vendible.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { formatProductName } from '@/lib/storefront/content-format';
import { productPath } from '@/lib/storefront/slug';
import type { StorefrontProductComponent } from '@/types/storefront';
import { ProductImage } from './ProductImage';

export function PackContents({ components }: { components: StorefrontProductComponent[] }) {
  const t = useTranslations('storefront.product.pack');
  if (components.length === 0) return null;

  return (
    <section aria-labelledby="pack-contents-title">
      <h2 id="pack-contents-title" className="mb-4 text-xl font-bold text-gray-900">
        {t('title')}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {components.map((component, index) => {
          const name = formatProductName(component.name);
          const quantity = Number.isInteger(component.quantity) ? component.quantity : Number(component.quantity.toFixed(2));
          return (
            <li
              key={`${component.slug ?? component.name}-${index}`}
              className="relative flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
            >
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-gray-50">
                <ProductImage src={component.imageUrl} alt="" name={name} sizes="56px" className="p-1" monogramClassName="text-sm" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  <span className="font-bold tabular-nums text-[#2f5165]">{t('quantity', { quantity })}</span>{' '}
                  {component.slug ? (
                    <Link
                      href={productPath(component.slug)}
                      className="rounded-sm underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
                    >
                      {name}
                    </Link>
                  ) : (
                    name
                  )}
                </p>
                {component.availability === 'out_of_stock' && (
                  <p className="mt-0.5 text-xs text-gray-700">{t('componentSoldOut')}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
