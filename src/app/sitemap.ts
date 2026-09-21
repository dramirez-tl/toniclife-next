import type { MetadataRoute } from 'next';
import type { CountryCode } from '@/i18n/config';
import { readyCountries } from '@/lib/storefront/seo';
import { fetchStorefrontCategories, fetchStorefrontSitemap } from '@/lib/storefront/server';
import { buildSitemapEntries, type SitemapDataByCountry } from '@/lib/storefront/sitemap';

// sitemap.xml — por país/idioma listo: home, catálogo, categorías con productos
// vendibles y SOLO los productos del candado de tienda (los decide el API en
// `GET /storefront/sitemap`). Si ese endpoint aún no existe o falla, el sitemap
// sale sin productos (home + catálogo) en vez de romper: nunca se listan
// productos "por si acaso" desde `/products`, que no aplica el candado.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const countries = readyCountries();
  const loaded = await Promise.all(
    countries.map(async (country: CountryCode) => {
      const [products, categories] = await Promise.all([
        fetchStorefrontSitemap(country),
        fetchStorefrontCategories(country),
      ]);
      return [country, { products, categories }] as const;
    }),
  );

  const byCountry: SitemapDataByCountry = {};
  for (const [country, data] of loaded) byCountry[country] = data;
  return buildSitemapEntries(byCountry);
}
