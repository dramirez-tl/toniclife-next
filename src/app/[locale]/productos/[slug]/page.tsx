// Detalle de producto — SERVER COMPONENT.
// Fetch ANÓNIMO a `/storefront/products/:slug` (Data Cache 120 s, tags `catalog` y
// `product:<slug>`) con respuesta DISCRIMINADA:
//   ok                      → HTML con h1, precio, imagen, JSON-LD Product/Offer/BreadcrumbList
//   moved                   → permanentRedirect (308) al slug canónico
//   unavailable_in_country  → pantalla propia con `noindex`
//   404                     → notFound() con HTTP 404 REAL (ver not-found.tsx). Con cookie de
//                             sesión (`accessToken`) se pinta ProductDetailMembers, que consulta
//                             con el JWT: el anónimo no ve los productos solo para distribuidores
//                             (Bloque 2 "dos tiendas", 28-oct-2026); sin cookie, 404 real.
//   429 / 5xx / sin respuesta → `fetchStorefrontDetail` reintenta UNA vez (el SSR comparte
//                             la cuota del throttle del API tras la IP de Vercel); si
//                             persiste, error.tsx con "Reintentar". NUNCA un 404 falso:
//                             solo 404/400 del API llegan a notFound().
//
// Esta ruta NO tiene `loading.tsx` a propósito: con streaming Next ya habría
// enviado el 200 y ni el 404 ni el 308 serían reales.

import { cache } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CountryNotReady } from '@/components/storefront/CountryNotReady';
import { UnavailableInCountry } from '@/components/storefront/UnavailableInCountry';
import { countryMeta, parseLocale, type CountryCode, type LanguageCode } from '@/i18n/config';
import { routing } from '@/i18n/routing';
import { formatProductName } from '@/lib/storefront/content-format';
import { StorefrontUnavailableError } from '@/lib/storefront/errors';
import { buildBreadcrumbJsonLd, buildProductJsonLd, safeJsonLd } from '@/lib/storefront/json-ld';
import { buildNoIndexMetadata, buildProductMetadata } from '@/lib/storefront/metadata';
import { canonicalFor, localizedPath } from '@/lib/storefront/seo';
import { fetchStorefrontAccess } from '@/lib/storefront/access';
import { fetchStorefrontDetail } from '@/lib/storefront/server';
import { isValidSlug, productPath } from '@/lib/storefront/slug';
import { ProductDetailClient } from './ProductDetailClient';
import { ProductDetailMembers } from './ProductDetailMembers';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Una sola lectura por request para `generateMetadata` y la página.
const getDetail = cache((country: CountryCode, lang: LanguageCode, slug: string) =>
  fetchStorefrontDetail(country, lang, slug),
);

/** El slug llega en minúsculas canónicas; cualquier otra cosa se normaliza antes de validar. */
function readSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Hay sesión en el navegador (cookie `accessToken` que deja el login). El SSR
 * anónimo recibe 404 en los productos solo para distribuidores: con sesión, el
 * cliente los consulta con su JWT (`ProductDetailMembers`, noindex), como en el
 * modo `members`. Leer cookies vuelve la ruta dinámica; el Data Cache del fetch
 * anónimo (120 s) se conserva.
 */
async function hasSessionCookie(): Promise<boolean> {
  return (await cookies()).has('accessToken');
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug: rawSlug } = await params;
  if (!routing.locales.includes(locale)) return {};
  const { lang, country } = parseLocale(locale);
  const t = await getTranslations({ locale, namespace: 'storefront' });

  if (!countryMeta(country).ready) {
    const meta = countryMeta(country);
    return buildNoIndexMetadata(t('common.countryNotReady.metaTitle', { country: lang === 'en' ? meta.nameEn : meta.name }));
  }

  const slug = readSlug(rawSlug);
  if (!isValidSlug(slug)) return buildNoIndexMetadata(t('product.notFound.metaTitle'));
  // Tienda solo para distribuidores: el detalle vive detrás del login (noindex,
  // sin cotización anónima en el servidor).
  if ((await fetchStorefrontAccess()).membersOnly) return buildNoIndexMetadata('Tonic Life');
  const result = await getDetail(country, lang, slug);
  if (!result.ok) {
    const missing = result.status === 404 || result.status === 400;
    // Bloque 2: con sesión, el 404 anónimo puede ser un producto solo para distribuidores (noindex).
    if (missing && (await hasSessionCookie())) return buildNoIndexMetadata('Tonic Life');
    return buildNoIndexMetadata(missing ? t('product.notFound.metaTitle') : t('product.error.title'));
  }
  if (result.data.status === 'ok') {
    const product = result.data.product;
    return buildProductMetadata({ locale, product: { ...product, name: formatProductName(product.name) } });
  }
  if (result.data.status === 'unavailable_in_country') {
    return buildNoIndexMetadata(`${formatProductName(result.data.product.name)} | Tonic Life`);
  }
  return {}; // moved: la página redirige antes de pintar nada.
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { locale, slug: rawSlug } = await params;
  if (!routing.locales.includes(locale)) notFound();
  setRequestLocale(locale);
  const { lang, country } = parseLocale(locale);

  if (!countryMeta(country).ready) {
    return <CountryNotReady country={country} lang={lang} />;
  }

  const slug = readSlug(rawSlug);
  if (!isValidSlug(slug)) notFound();

  // Tienda solo para distribuidores: el SSR anónimo no puede cotizar (401);
  // el cliente consulta con la sesión. Sin sesión el middleware ya mandó a /login.
  if ((await fetchStorefrontAccess()).membersOnly) {
    return <ProductDetailMembers slug={slug} />;
  }

  const result = await getDetail(country, lang, slug);
  if (!result.ok) {
    // 404 (no existe, oculto, kit, sin slug, solo para distribuidores…) o 400 (slug que el
    // API rechaza) = no encontrado. Bloque 2 (28-oct-2026): con cookie de sesión el cliente
    // vuelve a consultar con su JWT (el anónimo no ve los productos `members`); sin ella, 404 real.
    if (result.status === 404 || result.status === 400) {
      if (await hasSessionCookie()) return <ProductDetailMembers slug={slug} />;
      notFound();
    }
    throw new StorefrontUnavailableError('/storefront/products/:slug', result.status);
  }

  const detail = result.data;
  if (detail.status === 'moved') {
    if (!isValidSlug(detail.canonicalSlug) || detail.canonicalSlug === slug) notFound();
    permanentRedirect(localizedPath(locale, productPath(detail.canonicalSlug)));
  }

  if (detail.status === 'unavailable_in_country') {
    return (
      <UnavailableInCountry
        product={detail.product}
        sellableCountries={detail.sellableCountries}
        country={country}
        lang={lang}
      />
    );
  }

  const product = detail.product;
  // La URL pide un slug que no es el canónico del producto (p. ej. mayúsculas): 308 al canónico.
  if (product.slug !== rawSlug) permanentRedirect(localizedPath(locale, productPath(product.slug)));

  const t = await getTranslations({ locale, namespace: 'storefront.product' });
  const name = formatProductName(product.name);
  const url = canonicalFor(locale, productPath(product.slug));
  const breadcrumbs = [
    { name: t('breadcrumbHome'), url: canonicalFor(locale, '/') },
    { name: t('breadcrumbProducts'), url: canonicalFor(locale, '/productos') },
    ...(product.category
      ? [{ name: product.category.name, url: canonicalFor(locale, '/productos', { categoria: product.category.slug, pagina: 1 }) }]
      : []),
    { name, url },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildProductJsonLd({ ...product, name }, url, product.currencyCode)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(buildBreadcrumbJsonLd(breadcrumbs)) }}
      />
      <ProductDetailClient product={product} fetchedAt={result.fetchedAt} />
    </>
  );
}
