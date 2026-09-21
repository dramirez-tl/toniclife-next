'use client';

// Error del detalle de producto: ver StorefrontErrorView (mensaje claro + "Reintentar").

import { StorefrontErrorView } from '@/components/storefront/StorefrontErrorView';

export default function ProductError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StorefrontErrorView error={error} reset={reset} scope="product" />;
}
