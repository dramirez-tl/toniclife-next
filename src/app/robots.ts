import type { MetadataRoute } from 'next';
import { isIndexingAllowed, siteBaseUrl } from '@/lib/storefront/site';

// robots.txt — fail-closed: TODO bloqueado salvo que el proyecto de producción
// declare NEXT_PUBLIC_ALLOW_INDEXING=true. Staging y previews nunca se indexan.
export default function robots(): MetadataRoute.Robots {
  if (!isIndexingAllowed()) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }
  const base = siteBaseUrl();
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
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
