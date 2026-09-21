// Builders puros de `Metadata` (Next) para la tienda pública: título, descripción,
// canonical, hreflang, Open Graph y robots por locale. No leen cookies ni hacen
// fetch: reciben datos ya resueltos y un `env` inyectable.
//
// OJO con la herencia de Next: `openGraph`, `twitter` y `alternates` NO se
// fusionan campo a campo entre layout y página (el hijo REEMPLAZA el objeto).
// Por eso cada builder devuelve esos objetos completos, y el canonical/hreflang
// vive solo en builders de PÁGINA (nunca en un layout: lo heredarían carrito,
// checkout y el detalle con una canónica ajena).

import type { Metadata } from 'next';
import { countryMeta, parseLocale, type LanguageCode } from '@/i18n/config';
import { isIndexable, type CatalogState } from './catalog-params';
import { BRAND_NAME } from './json-ld';
import {
  buildAlternates,
  canonicalFor,
  isReadyLocale,
  ogLocaleFor,
  truncate,
} from './seo';
import { productPath } from './slug';
import { OG_DEFAULT_IMAGE, absoluteUrl, isIndexingAllowed, siteBaseUrl } from './site';
import type { StorefrontProductDetail } from './types';

type Env = Record<string, string | undefined>;

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

const SITE_COPY: Record<LanguageCode, { title: string; description: string; ogDescription: string; ogAlt: string }> = {
  es: {
    title: 'Tonic Life | Tu Centro de Bienestar Natural',
    description:
      'Descubre tu fórmula ideal de bienestar con productos naturales de alta calidad. Evaluación de Salud personalizada y recomendaciones únicas.',
    ogDescription: 'Bienestar Natural, Vida Plena - Descubre tu fórmula ideal de bienestar',
    ogAlt: 'Tonic Life - Tu Centro de Bienestar Natural',
  },
  en: {
    title: 'Tonic Life | Your Natural Wellness Center',
    description:
      'Find your ideal wellness formula with high-quality natural products. Personalized Health Assessment and tailored recommendations.',
    ogDescription: 'Natural Wellness, Full Life - Find your ideal wellness formula',
    ogAlt: 'Tonic Life - Your Natural Wellness Center',
  },
};

function countryName(locale: string): string {
  const { lang, country } = parseLocale(locale);
  const meta = countryMeta(country);
  return lang === 'en' ? meta.nameEn : meta.name;
}

function ogImage(url: string, alt: string) {
  return [{ url, width: 1200, height: 630, alt }];
}

/**
 * robots de una página: index solo si (a) el despliegue permite indexar,
 * (b) el país del locale está listo y (c) la página misma es indexable.
 */
function robotsFor(locale: string | null, pageIndexable: boolean, env: Env): Metadata['robots'] {
  const index = isIndexingAllowed(env) && pageIndexable && (locale === null || isReadyLocale(locale));
  // follow se conserva en páginas filtradas para que el rastreador llegue a los productos.
  return { index, follow: isIndexingAllowed(env) };
}

/** Metadata del layout RAÍZ: metadataBase sin localhost en Vercel + OG por defecto en PNG. */
export function buildRootMetadata(env: Env = process.env): Metadata {
  const copy = SITE_COPY.es;
  return {
    metadataBase: new URL(siteBaseUrl(env)),
    title: copy.title,
    description: copy.description,
    keywords:
      'suplementos naturales, bienestar, salud, tonic life, evaluación de salud, productos naturales',
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: '/images/logo/svg/logo-icon-blue-solid.svg',
    },
    robots: robotsFor(null, true, env),
    openGraph: {
      title: copy.title,
      description: copy.ogDescription,
      type: 'website',
      siteName: BRAND_NAME,
      images: ogImage(OG_DEFAULT_IMAGE, copy.ogAlt),
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.ogDescription,
      images: [OG_DEFAULT_IMAGE],
    },
  };
}

/**
 * Metadata base del layout `[locale]`: textos por idioma, og:locale y robots por
 * país listo. SIN canonical ni hreflang (ver nota de herencia arriba).
 */
export function buildLocaleMetadata(locale: string, env: Env = process.env): Metadata {
  const { lang } = parseLocale(locale);
  const copy = SITE_COPY[lang];
  return {
    title: copy.title,
    description: copy.description,
    robots: robotsFor(locale, true, env),
    openGraph: {
      title: copy.title,
      description: copy.ogDescription,
      type: 'website',
      siteName: BRAND_NAME,
      locale: ogLocaleFor(locale),
      images: ogImage(OG_DEFAULT_IMAGE, copy.ogAlt),
    },
    twitter: {
      card: 'summary_large_image',
      title: copy.title,
      description: copy.ogDescription,
      images: [OG_DEFAULT_IMAGE],
    },
  };
}

/** Home de la tienda: base por locale + canonical + hreflang de países listos. */
export function buildHomeMetadata(locale: string, env: Env = process.env): Metadata {
  const base = buildLocaleMetadata(locale, env);
  const canonical = canonicalFor(locale, '/', null, env);
  return {
    ...base,
    alternates: { canonical, languages: buildAlternates({ path: '/' }, env) },
    openGraph: { ...base.openGraph, url: canonical },
  };
}

export interface CatalogMetadataInput {
  locale: string;
  state: CatalogState;
  /** Nombre ya localizado de la categoría activa (de las facetas), si existe. */
  categoryName?: string | null;
}

export function buildCatalogMetadata(input: CatalogMetadataInput, env: Env = process.env): Metadata {
  const { locale, state } = input;
  const { lang } = parseLocale(locale);
  const country = countryName(locale);
  const categoryName = state.categoria ? (input.categoryName ?? '').trim() : '';

  const heading = categoryName
    ? lang === 'en'
      ? `${categoryName} | Tonic Life products`
      : `${categoryName} | Productos Tonic Life`
    : lang === 'en'
      ? `Tonic Life products in ${country} | ${BRAND_NAME}`
      : `Productos Tonic Life en ${country} | ${BRAND_NAME}`;
  const title = state.pagina > 1
    ? `${heading} (${lang === 'en' ? 'page' : 'página'} ${state.pagina})`
    : heading;

  const description = truncate(
    categoryName
      ? lang === 'en'
        ? `${categoryName} by Tonic Life in ${country}: prices, availability and home delivery.`
        : `${categoryName} de Tonic Life en ${country}: precios, disponibilidad y envío a domicilio.`
      : lang === 'en'
        ? `Shop Tonic Life supplements, beauty and personal care products in ${country}. Up-to-date prices and availability.`
        : `Compra suplementos, belleza y cuidado personal Tonic Life en ${country}. Precios y disponibilidad actualizados.`,
    DESCRIPTION_MAX,
  );

  // Vista filtrada (q, tipo, precio, agotados, orden) = noindex y canonical AL CATÁLOGO
  // (con su categoría): su `pagina` no es la página N del catálogo, así que no viaja.
  const canonicalState = isIndexable(state) ? state : { categoria: state.categoria, pagina: 1 };
  const canonical = canonicalFor(locale, '/productos', canonicalState, env);
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: buildAlternates({ path: '/productos', state: canonicalState }, env),
    },
    robots: robotsFor(locale, isIndexable(state), env),
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: BRAND_NAME,
      locale: ogLocaleFor(locale),
      url: canonical,
      images: ogImage(OG_DEFAULT_IMAGE, SITE_COPY[lang].ogAlt),
    },
    twitter: { card: 'summary_large_image', title, description, images: [OG_DEFAULT_IMAGE] },
  };
}

export interface ProductMetadataInput {
  locale: string;
  product: Pick<
    StorefrontProductDetail,
    'slug' | 'name' | 'description' | 'seo' | 'content' | 'images' | 'imageUrl' | 'imageAlt' | 'sellableCountries'
  >;
}

export function buildProductMetadata(input: ProductMetadataInput, env: Env = process.env): Metadata {
  const { locale, product } = input;
  const suffix = ` | ${BRAND_NAME}`;
  const title = `${truncate(product.seo.title || product.name, TITLE_MAX)}${suffix}`;
  const description = truncate(
    product.seo.description || product.content.tagline || product.description || product.name,
    DESCRIPTION_MAX,
  );
  const path = productPath(product.slug);
  const canonical = canonicalFor(locale, path, null, env);
  const primary = product.images.find((img) => img.isPrimary) ?? product.images[0];
  const imageUrl = primary?.url ?? product.imageUrl;
  const imageAlt = primary?.alt ?? product.imageAlt ?? product.name;
  const images = imageUrl
    ? [{ url: imageUrl, alt: imageAlt }]
    : ogImage(OG_DEFAULT_IMAGE, product.name);

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: buildAlternates({ path, sellableCountries: product.sellableCountries }, env),
    },
    robots: robotsFor(locale, true, env),
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: BRAND_NAME,
      locale: ogLocaleFor(locale),
      url: canonical,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl ?? OG_DEFAULT_IMAGE],
    },
  };
}

/** Páginas que nunca se indexan: "Muy pronto", no disponible en el país, carrito… */
export function buildNoIndexMetadata(title: string, env: Env = process.env): Metadata {
  return {
    title,
    robots: { index: false, follow: isIndexingAllowed(env) },
  };
}

/** URL absoluta de la imagen OG por defecto (para consumidores fuera de Metadata). */
export function ogDefaultImageUrl(env: Env = process.env): string {
  return absoluteUrl(OG_DEFAULT_IMAGE, env);
}
