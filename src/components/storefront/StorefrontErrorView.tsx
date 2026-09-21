'use client';

// Vista de error EXCLUSIVA de la tienda (catálogo y detalle): el API no respondió o
// respondió fuera de contrato. Mensaje claro + "Reintentar" (vuelve a pedir la
// página al servidor). Nunca se muestra el detalle técnico al visitante.

import { startTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

export interface StorefrontErrorViewProps {
  error: Error & { digest?: string };
  reset: () => void;
  scope: 'catalog' | 'product';
}

export function StorefrontErrorView({ error, reset, scope }: StorefrontErrorViewProps) {
  const t = useTranslations(scope === 'product' ? 'storefront.product.error' : 'storefront.catalog.error');
  const router = useRouter();

  useEffect(() => {
    console.error('[storefront]', error.digest ?? error.message);
  }, [error]);

  const retry = () => {
    // El fallo ocurrió en el Server Component: hay que refrescar la ruta Y
    // reiniciar el boundary dentro de la misma transición.
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <section role="alert" className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <ExclamationTriangleIcon aria-hidden="true" className="size-12 text-amber-700" />
      <h1 className="mt-5 text-2xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-3 text-base text-gray-700">{t('body')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={retry} className="min-h-11 cursor-pointer">
          <ArrowPathIcon aria-hidden="true" className="size-4" />
          {t('retry')}
        </Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md border border-gray-300 px-5 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
        >
          {t('home')}
        </Link>
      </div>
    </section>
  );
}
