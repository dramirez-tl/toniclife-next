// Catálogo de la tienda — SERVER COMPONENT.
// El HTML sale del servidor con los productos y su precio PÚBLICO del país del
// locale (fetch ANÓNIMO a `/storefront/products`, Data Cache 120 s + tags),
// metadata por país/idioma (canonical, hreflang, robots) y JSON-LD ItemList +
// BreadcrumbList. La interacción (filtros en la URL, precio por rol con sesión)
// vive en `CatalogClient`.
//
// Esta carpeta es un route group `(catalogo)`: su `loading.tsx` NO debe envolver
// a `[slug]` (con streaming el detalle ya no podría responder 404/308 reales).

import { cache, Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CountryNotReady } from '@/components/storefront/CountryNotReady';
import { countryMeta, parseLocale, type CountryCode, type LanguageCode } from '@/i18n/config';
import { routing } from '@/i18n/routing';
import {
  catalogHref,
  parseCatalogParams,
  serializeCatalogParams,
  type RawSearchParams,
} from '@/lib/storefront/catalog-params';
import { StorefrontUnavailableError } from '@/lib/storefront/errors';
import { buildBreadcrumbJsonLd, buildItemListJsonLd, safeJsonLd } from '@/lib/storefront/json-ld';
import { buildCatalogMetadata, buildNoIndexMetadata } from '@/lib/storefront/metadata';
import { canonicalFor, localizedPath } from '@/lib/storefront/seo';
import { fetchStorefrontList } from '@/lib/storefront/server';
import { absoluteUrl } from '@/lib/storefront/site';
import { CatalogClient } from './CatalogClient';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// `generateMetadata` y la página piden LA MISMA lista: `cache` la comparte dentro
// del request (el fetch lleva AbortSignal, así que React no lo deduplica solo).
// Argumentos primitivos para que la identidad del caché funcione.
const getList = cache((country: CountryCode, lang: LanguageCode, stateKey: string) =>
  fetchStorefrontList(country, lang, parseCatalogParams(new URLSearchParams(stateKey))),
);

function readState(searchParams: RawSearchParams) {
  const state = parseCatalogParams(searchParams);
  return { state, stateKey: serializeCatalogParams(state) };
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) return {};
  const { lang, country } = parseLocale(locale);

  if (!countryMeta(country).ready) {
    const t = await getTranslations({ locale, namespace: 'storefront.common.countryNotReady' });
    const meta = countryMeta(country);
    return buildNoIndexMetadata(t('metaTitle', { country: lang === 'en' ? meta.nameEn : meta.name }));
  }

  const { state, stateKey } = readState(await searchParams);
  const result = await getList(country, lang, stateKey);
  const categoryName =
    result.ok && state.categoria
      ? (result.data.facets.categories.find((c) => c.slug === state.categoria)?.name ?? null)
      : null;
  return buildCatalogMetadata({ locale, state, categoryName });
}

export default async function CatalogPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!routing.locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const { lang, country } = parseLocale(locale);

  if (!countryMeta(country).ready) {
    return <CountryNotReady country={country} lang={lang} />;
  }

  const { state, stateKey } = readState(await searchParams);
  const result = await getList(country, lang, stateKey);
  // API caído o respuesta fuera de contrato: lo atiende `error.tsx` ("Reintentar").
  if (!result.ok) throw new StorefrontUnavailableError('/storefront/products', result.status);

  const list = result.data;
  // Página fuera de rango (enlace viejo tras bajar el total): a la última página real.
  if (list.data.length === 0 && state.pagina > 1 && list.total > 0) {
    redirect(localizedPath(locale, catalogHref({ ...state, pagina: Math.min(state.pagina - 1, list.totalPages) })));
  }

  const t = await getTranslations({ locale, namespace: 'storefront.catalog' });
  const categoryName = state.categoria
    ? (list.facets.categories.find((c) => c.slug === state.categoria)?.name ?? null)
    : null;
  const breadcrumbs = [
    { name: t('breadcrumbHome'), url: canonicalFor(locale, '/') },
    { name: t('breadcrumbProducts'), url: canonicalFor(locale, '/productos') },
    ...(categoryName && state.categoria
      ? [{ name: categoryName, url: canonicalFor(locale, '/productos', { categoria: state.categoria, pagina: 1 }) }]
      : []),
  ];
  const itemList = buildItemListJsonLd(
    list.data,
    absoluteUrl(localizedPath(locale, '/')),
    (list.page - 1) * list.pageSize + 1,
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildBreadcrumbJsonLd(breadcrumbs)) }}
      />
      <Suspense fallback={null}>
        <CatalogClient initial={{ data: list, stateKey, fetchedAt: result.fetchedAt }} />
      </Suspense>
    </>
  );
}
