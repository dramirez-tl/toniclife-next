import type { MetadataRoute } from 'next';
import { fetchStorefrontAccess } from '@/lib/storefront/access';
import { isIndexingAllowed, siteBaseUrl } from '@/lib/storefront/site';

// robots.txt — fail-closed: TODO bloqueado salvo que el proyecto de producción
// declare NEXT_PUBLIC_ALLOW_INDEXING=true. Staging y previews nunca se indexan.
// Tienda solo para distribuidores (storefront.access_mode = members): además
// se bloquean catálogo, productos y quiz (viven detrás del login).
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!isIndexingAllowed()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  const base = siteBaseUrl();
  const access = await fetchStorefrontAccess();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // carrito y checkout viven bajo el locale (/es-mx/carrito): patrón con comodín.
        disallow: [
          '/admin',
          '/distribuidor',
          '/api',
          '/carrito',
          '/checkout',
          '/*/carrito',
          '/*/checkout',
          ...(access.membersOnly
            ? ['/productos', '/quiz', '/*/productos', '/*/quiz']
            : []),
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
