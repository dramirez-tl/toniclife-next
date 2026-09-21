'use client';

// "Te faltan $X para envío gratis", POR PAÍS y con el umbral REAL configurable
// (ver `useStoreShipping`). Sustituye los umbrales MXN quemados de `useCartIncentive`
// ("Kit Básico" $1,577 / "Kit Prosperity" $5,000, comparados contra cualquier moneda).
// Sin dato del país, sin poder GARANTIZAR que subtotal y umbral están en la misma moneda
// o para un distribuidor: no se pinta NADA (tampoco el contenedor).
//
// TODO(C2): mientras el API no mande `cart.currencyCode`, el carrito de un INVITADO se
// resuelve como MX aunque navegue /en-us: a un invitado solo se le pinta la barra en la
// tienda MX (si no, compararía pesos contra el umbral en dólares y diría "alcanzado").

import { useTranslations } from 'next-intl';
import { TruckIcon } from '@heroicons/react/24/outline';
import { useCart } from '@/hooks/useCart';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { useStoreShipping } from '@/hooks/useStoreShipping';
import { useStorefrontViewer } from '@/hooks/useStorefront';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import { resolvePortal } from '@/lib/auth-roles';
import {
  freeShippingEligible,
  freeShippingProgress,
  knownCartCurrency,
  lineSlug,
  type FreeShippingProgress,
} from '@/lib/storefront/cart-logic';
import { formatStorePrice } from '@/lib/storefront/price';
import { cn } from '@/lib/utils';

interface FreeShippingSource {
  subtotal: number;
  /** Moneda del carrito si el API la manda (C2). */
  cartCurrencyCode?: string | null;
  /** Slugs de las líneas del carrito (de ahí sale el detalle que trae el envío del país). */
  slugs: readonly string[];
}

function useFreeShipping({ subtotal, cartCurrencyCode, slugs }: FreeShippingSource) {
  const t = useTranslations('storefront.cart.freeShipping');
  const { countryCode, lang } = useStoreCountry();
  const { data } = useStoreShipping(countryCode, lang, slugs);
  const { hasCustomerSession } = useStorefrontViewer();
  const user = useAppSelector(selectUser);

  const viewer = {
    hasCustomerSession,
    // Solo lectura del rol de la sesión (sin tocar auth): portal de cliente = distribuidor.
    distributorSession: hasCustomerSession && resolvePortal(user?.roleCategory, user?.roles?.[0]) === 'distributor',
    cartCurrencyCode,
    viewerCurrencyCode: hasCustomerSession ? user?.currencyCode : null,
    countryCode,
  };
  const progress = freeShippingProgress({
    shipping: data?.shipping,
    subtotal,
    cartCurrencyCode: knownCartCurrency(viewer),
    eligible:
      !!data &&
      freeShippingEligible({
        ...viewer,
        apiEligible: data.apiEligible,
        priceTier: data.priceTier,
        shippingCurrencyCode: data.shipping.currencyCode,
      }),
  });
  if (!progress) return null;
  const message = progress.reached
    ? t('reached')
    : t('remaining', { amount: formatStorePrice(progress.remaining, progress.currencyCode, lang) ?? '' });
  return { progress, message, label: t('progressLabel'), note: t('note') };
}

function FreeShippingView({
  progress,
  message,
  label,
  note,
  className,
}: {
  progress: FreeShippingProgress;
  message: string;
  label: string;
  note: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl bg-[#C8DDF2]/30 p-3', className)}>
      <p className="flex items-start gap-2 text-sm font-medium text-[#2f5165]" aria-live="polite">
        <TruckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>{message}</span>
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={message}
        className="mt-2 h-2 overflow-hidden rounded-full bg-white"
      >
        <div
          className="h-full rounded-full bg-[#3E667D] transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-700">{note}</p>
    </div>
  );
}

/** Barra para quien YA tiene el carrito en mano (drawer y /carrito). */
export function FreeShippingBar({ className, ...source }: FreeShippingSource & { className?: string }) {
  const state = useFreeShipping(source);
  if (!state) return null;
  return <FreeShippingView {...state} className={className} />;
}

/**
 * Barra autosuficiente (lee el carrito): resultados del quiz. `className` es del
 * CONTENEDOR, que solo existe si hay barra: sin dato no deja una columna vacía.
 */
export function CartFreeShippingBar({ className, barClassName }: { className?: string; barClassName?: string }) {
  const { data: cart } = useCart();
  const items = cart?.items ?? [];
  const state = useFreeShipping({
    subtotal: Number.parseFloat(cart?.subtotal ?? '0'),
    cartCurrencyCode: cart?.currencyCode,
    slugs: items.map(lineSlug).filter((slug): slug is string => slug !== null),
  });
  if (!state || items.length === 0) return null;
  return (
    <div className={className}>
      <FreeShippingView {...state} className={barClassName} />
    </div>
  );
}
