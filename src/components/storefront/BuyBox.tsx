'use client';

// Bloque de compra del detalle: h1, clave, precio/puntos por rol, disponibilidad
// REAL, cantidad con tope, "Agregar al carrito", "Comprar ahora" (que SÍ agrega y
// después va al checkout), envío real del país y compartir.

import { forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { CheckIcon, ShoppingCartIcon, TruckIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { catalogHref } from '@/lib/storefront/catalog-params';
import { formatStorePrice } from '@/lib/storefront/price';
import type { LanguageCode } from '@/i18n/config';
import type { StorefrontProductDetail } from '@/types/storefront';
import { AvailabilityBadge } from './AvailabilityBadge';
import { PriceBlock } from './PriceBlock';
import { QuantityStepper } from './QuantityStepper';
import { ShareButton } from './ShareButton';

interface BuyBoxProps {
  product: StorefrontProductDetail;
  /** Nombre en formato título (el mismo del <title> y las migas). */
  name: string;
  lang: LanguageCode;
  showPoints: boolean;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onAdd: () => void;
  onBuyNow: () => void;
  isPending: boolean;
  justAdded: boolean;
  announcement: string;
}

/** El `ref` apunta a los CTA: cuando salen de pantalla aparece la barra fija en móvil. */
export const BuyBox = forwardRef<HTMLDivElement, BuyBoxProps>(function BuyBox(
  { product, name, lang, showPoints, quantity, onQuantityChange, onAdd, onBuyNow, isPending, justAdded, announcement },
  ctaRef,
) {
  const t = useTranslations('storefront.product');
  const soldOut = product.availability === 'out_of_stock';
  const { shipping } = product;
  const freeFrom = formatStorePrice(shipping.freeThreshold, shipping.currencyCode, lang);
  const flatCost = formatStorePrice(shipping.flatCost, shipping.currencyCode, lang);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {product.category && (
          <Link
            href={catalogHref({ categoria: product.category.slug })}
            className="w-fit rounded-sm text-xs font-semibold uppercase tracking-wide text-[#2f5165] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
          >
            {product.category.name}
          </Link>
        )}
        <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl lg:text-4xl">{name}</h1>
        {product.content.tagline && <p className="text-base text-gray-700 sm:text-lg">{product.content.tagline}</p>}
        <p className="text-sm text-gray-700">
          {t('code', { code: product.code })}
          {product.content.presentation && <span> · {product.content.presentation}</span>}
        </p>
      </div>

      <PriceBlock
        size="detail"
        price={product.price}
        publicPrice={product.publicPrice}
        savings={product.savings}
        points={product.points}
        priceTier={product.priceTier}
        taxIncluded={product.taxIncluded}
        currencyCode={product.currencyCode}
        lang={lang}
        showPoints={showPoints}
      />

      <AvailabilityBadge availability={product.availability} stockLeft={product.stockLeft} />

      {!soldOut && (
        <QuantityStepper value={quantity} max={product.maxQuantity} onChange={onQuantityChange} disabled={isPending} />
      )}

      <div ref={ctaRef} className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          size="xl"
          variant={justAdded ? 'success' : 'default'}
          onClick={onAdd}
          disabled={soldOut || isPending}
          className="min-h-12 flex-1 cursor-pointer"
        >
          {justAdded ? <CheckIcon aria-hidden="true" className="size-5" /> : <ShoppingCartIcon aria-hidden="true" className="size-5" />}
          {soldOut ? t('soldOut') : isPending ? t('adding') : justAdded ? t('added') : t('addToCart')}
        </Button>
        {!soldOut && (
          <Button
            type="button"
            size="xl"
            variant="outline"
            onClick={onBuyNow}
            disabled={isPending}
            className="min-h-12 flex-1 cursor-pointer border-[#3E667D] text-[#2f5165]"
          >
            {t('buyNow')}
          </Button>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>

      {(freeFrom || flatCost) && (
        <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-800">
          <TruckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#2f5165]" />
          <div className="flex flex-col gap-0.5">
            {freeFrom && <span className="font-medium">{t('shipping.freeFrom', { amount: freeFrom })}</span>}
            {flatCost && <span>{t('shipping.flat', { amount: flatCost })}</span>}
          </div>
        </div>
      )}

      <div className="-ml-3">
        <ShareButton slug={product.slug} name={name} />
      </div>
    </div>
  );
});
