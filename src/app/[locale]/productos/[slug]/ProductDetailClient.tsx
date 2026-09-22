'use client';

// Detalle interactivo. Arranca con el producto del SSR (precio PÚBLICO, anónimo);
// con sesión la misma query se repite con el Bearer y cambia a precio/puntos por
// rol sin salto (`placeholderData`). Carrito: SOLO se consumen los hooks
// existentes (`useAddCartItem` vía `useAddToCart`). "Agregar" abre el CartDrawer;
// "Comprar ahora" agrega y lleva al CHECKOUT (o al carrito si el piloto tiene el
// pago en línea apagado: mismo interruptor que ya gobierna la página de checkout, o
// si el carrito trae líneas que bloquean el pago: ahí se explica cuáles y por qué).

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { track } from '@vercel/analytics';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/i18n/routing';
import { parseLocale } from '@/i18n/config';
import { usePilotPublicState } from '@/hooks/usePilot';
import { useStorefrontProduct, useStorefrontViewer } from '@/hooks/useStorefront';
import { cartKeys } from '@/hooks/useCart';
import { buyNowDestination } from '@/lib/storefront/cart-logic';
import type { Cart } from '@/types/cart';
import { catalogHref } from '@/lib/storefront/catalog-params';
import { formatProductName } from '@/lib/storefront/content-format';
import { viewerPriceZone } from '@/lib/storefront/price-zone';
import { Breadcrumbs, type BreadcrumbEntry } from '@/components/storefront/Breadcrumbs';
import { BuyBox } from '@/components/storefront/BuyBox';
import { PackContents } from '@/components/storefront/PackContents';
import { PriceZoneNotice } from '@/components/storefront/PriceZoneNotice';
import { ProductContentSections } from '@/components/storefront/ProductContentSections';
import { ProductGallery } from '@/components/storefront/ProductGallery';
import { RelatedProducts } from '@/components/storefront/RelatedProducts';
import { SessionExpiredNotice } from '@/components/storefront/SessionExpiredNotice';
import { StickyBuyBar } from '@/components/storefront/StickyBuyBar';
import { useAddToCart } from '@/components/storefront/useAddToCart';
import type { StorefrontProductDetail } from '@/types/storefront';

interface ProductDetailClientProps {
  /** Producto del SSR (anónimo). */
  product: StorefrontProductDetail;
  fetchedAt: number;
}

export function ProductDetailClient({ product: initialProduct, fetchedAt }: ProductDetailClientProps) {
  const t = useTranslations('storefront.product');
  const tCart = useTranslations('storefront.cart.buyNow');
  const locale = useLocale();
  const router = useRouter();
  const { lang, country } = parseLocale(locale);
  const ctx = useMemo(() => ({ country, lang }), [country, lang]);

  const { data } = useStorefrontProduct(ctx, initialProduct.slug, {
    data: { status: 'ok', product: initialProduct },
    fetchedAt,
  });
  // Si con sesión el API respondiera otra cosa que 'ok', se conserva lo del servidor.
  const product = data?.status === 'ok' ? data.product : initialProduct;
  // Puntos SOLO para distribuidor/preferente CON sesión (el SSR anónimo nunca los trae).
  const { hasSession } = useStorefrontViewer();
  const queryClient = useQueryClient();
  const showPoints = hasSession && product.priceTier !== 'public' && product.points !== null;
  // Cuenta de ZONA (Frontera): el `viewer` viaja junto al producto solo con el API que lo manda.
  const priceZone = hasSession && data?.status === 'ok' ? viewerPriceZone(data.viewer) : null;
  const name = formatProductName(product.name);

  const [rawQuantity, setQuantity] = useState(1);
  const quantity = Math.min(Math.max(1, rawQuantity), Math.max(1, product.maxQuantity));
  const { add, isPending, justAdded, announcement } = useAddToCart();
  const addable = { id: product.id, code: product.code, name, price: product.price };

  // Piloto (fail-closed): sin respuesta del API el pago en línea se considera apagado.
  const { data: pilotState } = usePilotPublicState();
  const checkoutEnabled = pilotState?.checkoutEnabled ?? false;

  const onAdd = () => void add(addable, quantity);
  /**
   * "Comprar ahora" SÍ agrega: primero la línea, después el checkout. Si la línea ya
   * estaba en su máximo ('unchanged') igual se continúa: el producto está en el carrito.
   */
  const onBuyNow = async () => {
    const outcome = await add(addable, quantity, { silent: true });
    if (outcome === 'failed') return;
    // Carrito YA actualizado (la mutación dejó la respuesta del API en la caché).
    const items = queryClient.getQueryData<Cart>(cartKeys.cart())?.items ?? [];
    const destination = buyNowDestination({ checkoutEnabled, items });
    // Con líneas agotadas o por encima del tope /carrito ya explica cuáles: sin toast.
    if (destination.reason === 'checkout_off') toast.info(tCart('checkoutSoon'));
    router.push(destination.href);
  };

  // Barra fija en móvil: visible cuando los CTA del bloque de compra ya no se ven.
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaHidden, setCtaHidden] = useState(false);
  useEffect(() => {
    const node = ctaRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setCtaHidden(!entry.isIntersecting), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    track('view_item', { code: initialProduct.code, country });
  }, [initialProduct.code, country]);

  const breadcrumbs: BreadcrumbEntry[] = [
    { label: t('breadcrumbHome'), href: '/' },
    { label: t('breadcrumbProducts'), href: '/productos' },
    ...(product.category
      ? [{ label: product.category.name, href: catalogHref({ categoria: product.category.slug }) }]
      : []),
    { label: name },
  ];

  return (
    <div className="mx-auto max-w-7xl pb-24 lg:px-8 lg:pb-16">
      <Breadcrumbs items={breadcrumbs} ariaLabel={t('breadcrumbLabel')} className="px-4 py-4 sm:px-6 lg:px-0" />

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} name={name} className="lg:sticky lg:top-36 lg:self-start" />
        <div className="px-4 sm:px-6 lg:px-0">
          <PriceZoneNotice zone={priceZone} className="mb-4" />
          <SessionExpiredNotice className="mb-4" />
          <BuyBox
            ref={ctaRef}
            product={product}
            name={name}
            lang={lang}
            showPoints={showPoints}
            quantity={quantity}
            onQuantityChange={setQuantity}
            onAdd={onAdd}
            onBuyNow={() => void onBuyNow()}
            isPending={isPending}
            justAdded={justAdded}
            announcement={announcement}
          />
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-12 px-4 sm:px-6 lg:px-0">
        {product.type === 'pack' && <PackContents components={product.components} />}
        <ProductContentSections product={product} />
        <RelatedProducts
          ctx={ctx}
          slug={product.slug}
          currencyCode={product.currencyCode}
          lang={lang}
          showPoints={showPoints}
        />
      </div>

      <StickyBuyBar
        visible={ctaHidden}
        product={product}
        name={name}
        lang={lang}
        quantity={quantity}
        onAdd={onAdd}
        isPending={isPending}
        justAdded={justAdded}
      />
    </div>
  );
}
