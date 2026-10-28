'use client';

// Detalle de producto consultado CON LA SESIÓN del cliente (JWT), cuando el SSR
// anónimo no puede cotizar:
//  - tienda SOLO PARA DISTRIBUIDORES (storefront.access_mode = members): el API
//    responde 401 STF_MEMBERS_ONLY al anónimo; sin sesión el middleware manda a /login;
//  - modo público con cookie de sesión (Bloque 2 "dos tiendas", 28-oct-2026): el
//    anónimo recibe 404 en los productos `members`; con el JWT sí se ven.
// Pinta el mismo ProductDetailClient (precio por rol, puntos, carrito). Un 404 con
// access token vencido NO se da por bueno a la primera: el API trata el token vencido
// como visitante (sin 401, axios no refresca), así que `useStorefrontNotFoundRecovery`
// refresca una vez y vuelve a consultar antes de mostrar "Producto no encontrado".

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { parseLocale } from '@/i18n/config';
import { Link } from '@/i18n/routing';
import { useStorefrontNotFoundRecovery, useStorefrontProduct } from '@/hooks/useStorefront';
import { UnavailableInCountry } from '@/components/storefront/UnavailableInCountry';
import { localizedPath } from '@/lib/storefront/seo';
import { productPath } from '@/lib/storefront/slug';
import { ProductDetailClient } from './ProductDetailClient';
import ProductNotFound from './not-found';

function httpStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

export function ProductDetailMembers({ slug }: { slug: string }) {
  const t = useTranslations('storefront.product');
  const locale = useLocale();
  const router = useRouter();
  const { lang, country } = parseLocale(locale);
  const ctx = useMemo(() => ({ country, lang }), [country, lang]);
  const { data, isLoading, isError, error, errorUpdatedAt, refetch } = useStorefrontProduct(ctx, slug);
  const status = isError ? httpStatus(error) : undefined;
  // 404 con sesión: ¿token vencido (el API lo atendió como visitante) o producto que no existe para él?
  const recoveringNotFound = useStorefrontNotFoundRecovery(status === 404, `${slug}:${errorUpdatedAt}`);
  // Marca de tiempo del dato del cliente (ProductDetailClient la usa para su `initialData`).
  const [fetchedAt] = useState(() => Date.now());

  // Slug viejo o no canónico: a la URL buena (el SSR público hacía 308).
  useEffect(() => {
    if (data?.status === 'moved' && data.canonicalSlug && data.canonicalSlug !== slug) {
      router.replace(localizedPath(locale, productPath(data.canonicalSlug)));
    }
  }, [data, locale, router, slug]);

  // Mientras se decide si el 404 era por el token vencido, sigue el spinner (no un "no encontrado" fugaz).
  if (isLoading || recoveringNotFound) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center" role="status" aria-live="polite">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#3E667D]" />
      </div>
    );
  }

  if (isError) {
    if (status === 404 || status === 400) return <ProductNotFound />;
    return (
      <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('error.title')}</h1>
        <p className="mt-3 text-base text-gray-700">{t('error.body')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex min-h-11 items-center rounded-md bg-[#3E667D] px-6 text-sm font-semibold text-white hover:bg-[#2f5165]"
          >
            {t('error.retry')}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md border border-gray-300 px-6 text-sm font-medium text-gray-800 hover:bg-gray-50"
          >
            {t('error.home')}
          </Link>
        </div>
      </section>
    );
  }

  if (!data || data.status === 'moved') return null;

  if (data.status === 'unavailable_in_country') {
    return (
      <UnavailableInCountry
        product={data.product}
        sellableCountries={data.sellableCountries}
        country={country}
        lang={lang}
      />
    );
  }

  return <ProductDetailClient product={data.product} fetchedAt={fetchedAt} />;
}
