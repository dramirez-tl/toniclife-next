// Catálogo de la tienda — SERVER COMPONENT.
// El HTML sale del servidor con los productos y su precio PÚBLICO del país del
// locale (fetch ANÓNIMO a `/storefront/products`, Data Cache 120 s + tags),
// metadata por país/idioma (canonical, hreflang, robots) y JSON-LD ItemList +
// BreadcrumbList. La interacción (filtros en la URL, precio por rol con sesión)
// vive en `CatalogClient`.
//
// DEGRADACIÓN (nunca `error.tsx` por el listado):
//  - Búsquedas (`q`): no se piden en servidor (noindex; gastarían la cuota del
//    throttle del API que comparte toda la IP de Vercel). Las resuelve el cliente.
//  - 429/5xx del API: `fetchStorefrontList` reintenta una vez; si persiste se pinta
//    la estructura y el cliente consulta desde la IP del visitante (`useQuery`),
//    que ya tiene su propio estado de error con "Reintentar".
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
  // Sin datos de servidor (búsqueda, 429/5xx persistente o respuesta fuera de contrato): consulta el cliente.
  const list = result.ok ? result.data : null;

  // Página fuera de rango (enlace viejo tras bajar el total): a la última página real.
  if (list && list.data.length === 0 && state.pagina > 1 && list.total > 0) {
    redirect(localizedPath(locale, catalogHref({ ...state, pagina: Math.min(state.pagina - 1, list.totalPages) })));
  }

  const t = await getTranslations({ locale, namespace: 'storefront.catalog' });
  const categoryName =
    list && state.categoria
      ? (list.facets.categories.find((c) => c.slug === state.categoria)?.name ?? null)
      : null;
  const breadcrumbs = [
    { name: t('breadcrumbHome'), url: canonicalFor(locale, '/') },
    { name: t('breadcrumbProducts'), url: canonicalFor(locale, '/productos') },
    ...(categoryName && state.categoria
      ? [{ name: categoryName, url: canonicalFor(locale, '/productos', { categoria: state.categoria, pagina: 1 }) }]
      : []),
  ];
  const itemList =
    list && list.data.length > 0
      ? buildItemListJsonLd(list.data, absoluteUrl(localizedPath(locale, '/')), (list.page - 1) * list.pageSize + 1)
      : null;

  return (
    <>
      {itemList && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildBreadcrumbJsonLd(breadcrumbs)) }}
      />
      <Suspense fallback={null}>
        <CatalogClient initial={result.ok ? { data: result.data, stateKey, fetchedAt: result.fetchedAt } : undefined} />
      </Suspense>
    </>
  );
}
