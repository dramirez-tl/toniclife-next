'use client';

// CTA fijo en MÓVIL: aparece cuando los botones del bloque de compra salen de
// pantalla (IntersectionObserver en el contenedor). Respeta el safe-area inferior.
// Oculto = `inert` (fuera del tabulador y del lector).

import { useTranslations } from 'next-intl';
import { CheckIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatStorePrice } from '@/lib/storefront/price';
import type { LanguageCode } from '@/i18n/config';
import type { StorefrontProductDetail } from '@/types/storefront';
import { ProductImage } from './ProductImage';

interface StickyBuyBarProps {
  visible: boolean;
  product: StorefrontProductDetail;
  name: string;
  lang: LanguageCode;
  quantity: number;
  onAdd: () => void;
  isPending: boolean;
  justAdded: boolean;
}

export function StickyBuyBar({ visible, product, name, lang, quantity, onAdd, isPending, justAdded }: StickyBuyBarProps) {
  const t = useTranslations('storefront.product');
  const soldOut = product.availability === 'out_of_stock';
  const price = formatStorePrice(product.price, product.currencyCode, lang);

  return (
    <div
      inert={!visible}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-transform duration-200 motion-reduce:transition-none lg:hidden',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3">
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-gray-50">
          <ProductImage src={product.imageUrl ?? product.images[0]?.url} alt="" name={name} sizes="48px" className="p-1" monogramClassName="text-sm" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-sm font-medium text-gray-900">{name}</p>
          <p className="text-sm font-bold text-[#2f5165]">{price ?? t('priceUnavailable')}</p>
        </div>
        <Button
          type="button"
          variant={justAdded ? 'success' : 'default'}
          onClick={onAdd}
          disabled={soldOut || isPending}
          aria-label={soldOut ? t('soldOut') : t('addQuantityLabel', { count: quantity, name })}
          className="min-h-11 shrink-0 cursor-pointer px-5"
        >
          {justAdded ? <CheckIcon aria-hidden="true" className="size-4" /> : <ShoppingCartIcon aria-hidden="true" className="size-4" />}
          {soldOut ? t('soldOut') : isPending ? t('adding') : justAdded ? t('added') : t('addShort')}
        </Button>
      </div>
    </div>
  );
}
