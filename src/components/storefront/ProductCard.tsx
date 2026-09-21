'use client';

// Tarjeta ÚNICA de producto (catálogo, relacionados). `article` con enlace
// estirado SOLO sobre imagen + título + precio; el botón "Agregar" es HERMANO del
// enlace (nunca un <button> dentro de un <a>).

import { useTranslations } from 'next-intl';
import { track } from '@vercel/analytics';
import { CheckIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatProductName } from '@/lib/storefront/content-format';
import { productPath } from '@/lib/storefront/slug';
import type { LanguageCode } from '@/i18n/config';
import type { StorefrontProductCard } from '@/types/storefront';
import { PriceBlock } from './PriceBlock';
import { ProductImage } from './ProductImage';
import { useAddToCart } from './useAddToCart';

export const CARD_IMAGE_SIZES = '(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw';

type BadgeKind = 'outOfStock' | 'lowStock' | 'new' | 'featured' | 'pack';

const BADGE_STYLES: Record<BadgeKind, string> = {
  outOfStock: 'bg-gray-800 text-white',
  lowStock: 'bg-amber-100 text-amber-900',
  new: 'bg-[#3E667D] text-white',
  featured: 'bg-emerald-100 text-emerald-900',
  pack: 'bg-[#C8DDF2] text-[#1f3a4a]',
};

/** Badges REALES, máximo 2, por prioridad: Agotado > Últimas n > Nuevo > Destacado > Paquete. */
function badgesFor(product: StorefrontProductCard): BadgeKind[] {
  const badges: BadgeKind[] = [];
  if (product.availability === 'out_of_stock') badges.push('outOfStock');
  if (product.availability === 'low_stock' && product.stockLeft !== null) badges.push('lowStock');
  if (product.isNew) badges.push('new');
  if (product.isFeatured) badges.push('featured');
  if (product.type === 'pack') badges.push('pack');
  return badges.slice(0, 2);
}

interface ProductCardProps {
  product: StorefrontProductCard;
  currencyCode: string;
  lang: LanguageCode;
  showPoints: boolean;
  /** Las 4 primeras tarjetas del catálogo (candidatas a LCP). */
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
  /** Origen para la analítica `select_item`. */
  listName: string;
  sizes?: string;
  className?: string;
}

export function ProductCard({
  product,
  currencyCode,
  lang,
  showPoints,
  priority = false,
  headingLevel = 'h2',
  listName,
  sizes = CARD_IMAGE_SIZES,
  className,
}: ProductCardProps) {
  const t = useTranslations('storefront.catalog.card');
  const { add, isPending, justAdded, announcement } = useAddToCart();
  const Heading = headingLevel;
  const name = formatProductName(product.name);
  const soldOut = product.availability === 'out_of_stock';
  const badges = badgesFor(product);

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow focus-within:shadow-md hover:shadow-md',
        className,
      )}
    >
      <div className="relative flex flex-1 flex-col">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-white">
          <ProductImage
            src={product.imageUrl}
            alt=""
            name={name}
            sizes={sizes}
            priority={priority}
            className={cn(
              'p-3 transition-transform duration-300 motion-safe:group-hover:scale-105',
              soldOut && 'opacity-60',
            )}
          />
          {badges.length > 0 && (
            <ul className="absolute left-2 top-2 flex flex-col items-start gap-1" aria-label={t('badgesLabel')}>
              {badges.map((badge) => (
                <li
                  key={badge}
                  className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5', BADGE_STYLES[badge])}
                >
                  {badge === 'lowStock' ? t('badge.lowStock', { count: product.stockLeft ?? 0 }) : t(`badge.${badge}`)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          {product.category && (
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-600">
              {product.category.name}
            </span>
          )}
          <Heading className="text-sm font-semibold leading-snug text-[#2f5165] sm:text-base">
            <Link
              href={productPath(product.slug)}
              onClick={() => track('select_item', { code: product.code, list: listName })}
              className="line-clamp-2 rounded-sm outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-[#3E667D] focus-visible:after:ring-offset-2"
            >
              {name}
            </Link>
          </Heading>
          <PriceBlock
            className="mt-auto pt-2"
            price={product.price}
            publicPrice={product.publicPrice}
            savings={product.savings}
            points={product.points}
            priceTier={product.priceTier}
            taxIncluded={product.taxIncluded}
            currencyCode={currencyCode}
            lang={lang}
            showPoints={showPoints}
          />
        </div>
      </div>

      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <Button
          type="button"
          variant={justAdded ? 'success' : 'default'}
          disabled={soldOut || isPending}
          onClick={() => void add({ id: product.id, code: product.code, name, price: product.price }, 1)}
          aria-label={soldOut ? t('soldOutLabel', { name }) : t('addLabel', { name })}
          className="min-h-11 w-full cursor-pointer"
        >
          {justAdded ? (
            <CheckIcon aria-hidden="true" className="size-4" />
          ) : (
            <ShoppingCartIcon aria-hidden="true" className="size-4" />
          )}
          {soldOut ? t('soldOut') : isPending ? t('adding') : justAdded ? t('added') : t('add')}
        </Button>
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
      </div>
    </article>
  );
}

/** Esqueleto con la MISMA caja que la tarjeta (aspect-square) para no mover el layout. */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white" aria-hidden="true">
      <div className="aspect-square animate-pulse bg-gray-100 motion-reduce:animate-none" />
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-gray-100 motion-reduce:animate-none" />
        <div className="mt-2 h-11 w-full animate-pulse rounded-md bg-gray-100 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
