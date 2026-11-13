'use client';

// Tarjeta ÚNICA de producto (catálogo, relacionados). `article` con enlace
// estirado SOLO sobre imagen + título + precio; el botón "Agregar" es HERMANO del
// enlace (nunca un <button> dentro de un <a>). Con varias tallas o colores el botón no
// agrega: lleva al producto a elegir (lib/storefront/product-card).
//
// `seasonal`: el producto está HOY en una promoción de temporada (Buen Fin…). Lleva la insignia
// con la mecánica ("3x2") y, debajo del nombre, cuál es. Si la promoción solo vale en punto de
// venta, la insignia cambia de color y el texto dice "Solo en sucursales y Call Center": el
// carrito en línea no la aplica.

import { useTranslations } from 'next-intl';
import { track } from '@vercel/analytics';
import { BuildingStorefrontIcon, CheckIcon, ShoppingCartIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatProductName } from '@/lib/storefront/content-format';
import { cardAction, cardBadges, cardFamily, type CardBadge } from '@/lib/storefront/product-card';
import { productPath } from '@/lib/storefront/slug';
import type { LanguageCode } from '@/i18n/config';
import type { SeasonalProductBadge } from '@/lib/seasonal-promotions';
import type { StorefrontProductCard } from '@/types/storefront';
import { PriceBlock } from './PriceBlock';
import { ProductImage } from './ProductImage';
import { useAddToCart } from './useAddToCart';

export const CARD_IMAGE_SIZES = '(min-width:1280px) 25vw, (min-width:768px) 33vw, 50vw';

const BADGE_STYLES: Record<CardBadge, string> = {
  outOfStock: 'bg-gray-800 text-white',
  lowStock: 'bg-amber-100 text-amber-900',
  madeToOrder: 'bg-sky-100 text-sky-900',
  new: 'bg-[#3E667D] text-white',
  featured: 'bg-emerald-100 text-emerald-900',
  pack: 'bg-[#C8DDF2] text-[#1f3a4a]',
};

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
  /** Promoción de temporada en la que está hoy el producto (null/ausente = ninguna). */
  seasonal?: SeasonalProductBadge | null;
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
  seasonal = null,
}: ProductCardProps) {
  const t = useTranslations('storefront.catalog.card');
  const { add, isPending, justAdded, announcement } = useAddToCart();
  const Heading = headingLevel;
  const name = formatProductName(product.name);
  const soldOut = product.availability === 'out_of_stock';
  // Con insignia de temporada queda lugar para UNA más (la de mayor prioridad: Agotado, Últimas…).
  const badges = seasonal ? cardBadges(product).slice(0, 1) : cardBadges(product);
  // Tarjeta de familia (mig 178): habla por todas las variantes que pasan los filtros.
  const family = cardFamily(product);
  // Con tallas o colores que elegir, el botón lleva al producto (no agrega la primera talla).
  const action = cardAction(product);
  const fromPrice = family && family.fromPrice < product.price ? family.fromPrice : null;

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
          {(badges.length > 0 || seasonal) && (
            <ul className="absolute left-2 top-2 flex flex-col items-start gap-1" aria-label={t('badgesLabel')}>
              {seasonal && (
                <li
                  data-testid="card-seasonal-badge"
                  title={seasonal.name}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-5 shadow-sm',
                    seasonal.storeOnly ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'bg-rose-600 text-white',
                  )}
                >
                  {seasonal.storeOnly ? (
                    <BuildingStorefrontIcon aria-hidden="true" className="size-3.5" />
                  ) : (
                    <SparklesIcon aria-hidden="true" className="size-3.5" />
                  )}
                  {seasonal.label}
                </li>
              )}
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
          {seasonal && (
            <p
              data-testid="card-seasonal-note"
              className={cn(
                'text-xs font-semibold leading-snug',
                seasonal.storeOnly ? 'text-amber-800' : 'text-rose-700',
              )}
            >
              <span className="sr-only">{t('seasonal.label')}: </span>
              {seasonal.storeOnly ? (
                // La insignia ya dice la mecánica (6x5); aquí, lo que importa en la tienda: no vale en línea.
                <>
                  <span className="sr-only">{seasonal.name}. </span>
                  {t('seasonal.storeOnly')}
                </>
              ) : (
                <span className="line-clamp-2">{seasonal.name}</span>
              )}
            </p>
          )}
          {family && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
              {family.genders.length > 0 && <span>{family.genders.map((g) => t(`gender.${g}`)).join(' · ')}</span>}
              {family.colors.length > 0 && (
                <span className="flex items-center gap-1" title={family.colors.map((c) => c.name).join(', ')}>
                  <span className="sr-only">{t('colors', { count: family.colors.length })}</span>
                  {family.colors.slice(0, 6).map((c) => (
                    <span
                      key={c.name}
                      aria-hidden="true"
                      className="block size-3 rounded-full border border-black/10"
                      style={{ backgroundColor: c.hex ?? '#e5e7eb' }}
                    />
                  ))}
                </span>
              )}
              {family.sizes.length > 0 && <span>{t('sizes', { count: family.sizes.length })}</span>}
            </p>
          )}
          <PriceBlock
            className="mt-auto pt-2"
            price={fromPrice ?? product.price}
            pricePrefix={fromPrice !== null ? t('from') : undefined}
            publicPrice={fromPrice !== null ? null : product.publicPrice}
            savings={fromPrice !== null ? null : product.savings}
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
        {action !== 'add' && !soldOut ? (
          <Button asChild className="min-h-11 w-full cursor-pointer">
            <Link
              href={productPath(product.slug)}
              onClick={() => track('select_item', { code: product.code, list: listName })}
              aria-label={t(action === 'choose_size' ? 'chooseSizeLabel' : 'chooseOptionsLabel', { name })}
            >
              {t(action === 'choose_size' ? 'chooseSize' : 'chooseOptions')}
            </Link>
          </Button>
        ) : (
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
        )}
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
