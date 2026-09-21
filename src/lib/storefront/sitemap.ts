// Builder PURO del sitemap de la tienda. La E/S (fetch al API) vive en
// `server.ts`; aquí solo se arma la lista a partir de lo que cada país devolvió.
//
// Reglas:
//  - Solo locales de países listos (CO/GT quedan fuera hasta abrir tienda).
//  - Productos = exactamente lo que devuelve `/storefront/sitemap` del país (el
//    candado de tienda vive en el API: activo, visible, producto/paquete, con slug
//    y precio público vigente en ese país).
//  - hreflang de un producto/categoría = solo países donde aparece.

import type { MetadataRoute } from 'next';
import { parseLocale, type CountryCode } from '@/i18n/config';
import { buildAlternates, canonicalFor, readyLocales } from './seo';
import { isValidSlug, productPath } from './slug';
import type { StorefrontCategory, StorefrontSitemapItem } from './types';

type Env = Record<string, string | undefined>;

export interface CountrySitemapData {
  products: readonly StorefrontSitemapItem[];
  categories: readonly Pick<StorefrontCategory, 'slug' | 'count'>[];
}

export type SitemapDataByCountry = Partial<Record<CountryCode, CountrySitemapData>>;

const CATEGORY_SLUG_RE = /^[a-z0-9-]{1,120}$/;

function parseDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildSitemapEntries(
  byCountry: SitemapDataByCountry,
  env: Env = process.env,
): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  // slug -> países donde existe (para hreflang por recurso)
  const productCountries = new Map<string, Set<string>>();
  const categoryCountries = new Map<string, Set<string>>();
  for (const [country, data] of Object.entries(byCountry)) {
    if (!data) continue;
    for (const item of data.products) {
      if (!isValidSlug(item.slug)) continue;
      if (!productCountries.has(item.slug)) productCountries.set(item.slug, new Set());
      productCountries.get(item.slug)?.add(country);
    }
    for (const category of data.categories) {
      if (category.count <= 0 || !CATEGORY_SLUG_RE.test(category.slug)) continue;
      if (!categoryCountries.has(category.slug)) categoryCountries.set(category.slug, new Set());
      categoryCountries.get(category.slug)?.add(country);
    }
  }

  for (const locale of readyLocales()) {
    const { country } = parseLocale(locale);
    const data = byCountry[country];

    entries.push({
      url: canonicalFor(locale, '/', null, env),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: { languages: buildAlternates({ path: '/' }, env) },
    });
    entries.push({
      url: canonicalFor(locale, '/productos', null, env),
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: { languages: buildAlternates({ path: '/productos' }, env) },
    });

    if (!data) continue;

    for (const category of data.categories) {
      const countries = categoryCountries.get(category.slug);
      if (!countries) continue;
      const state = { categoria: category.slug, pagina: 1 };
      entries.push({
        url: canonicalFor(locale, '/productos', state, env),
        changeFrequency: 'daily',
        priority: 0.7,
        alternates: {
          languages: buildAlternates(
            { path: '/productos', state, sellableCountries: [...countries] },
            env,
          ),
        },
      });
    }

    const seen = new Set<string>();
    for (const item of data.products) {
      const countries = productCountries.get(item.slug);
      if (!countries || seen.has(item.slug)) continue;
      seen.add(item.slug);
      const path = productPath(item.slug);
      entries.push({
        url: canonicalFor(locale, path, null, env),
        lastModified: parseDate(item.updatedAt),
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: buildAlternates({ path, sellableCountries: [...countries] }, env),
        },
        ...(item.imageUrl ? { images: [item.imageUrl] } : {}),
      });
    }
  }

  return entries;
}
