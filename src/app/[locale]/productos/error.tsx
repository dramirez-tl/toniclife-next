'use client';

// Error del catálogo (y respaldo de toda la sección /productos): ver StorefrontErrorView (mensaje claro + "Reintentar").

import { StorefrontErrorView } from '@/components/storefront/StorefrontErrorView';

export default function CatalogError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StorefrontErrorView error={error} reset={reset} scope="catalog" />;
}
