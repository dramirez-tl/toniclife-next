// 404 ÚTIL del detalle (HTTP 404 real: lo dispara `notFound()` en page.tsx).
// Ofrece salidas: catálogo, búsqueda y el test de salud. `noindex` lo pone Next.

import { useTranslations } from 'next-intl';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Link } from '@/i18n/routing';

export default function ProductNotFound() {
  const t = useTranslations('storefront.product.notFound');

  return (
    <section className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <MagnifyingGlassIcon aria-hidden="true" className="size-12 text-gray-600" />
      <h1 className="mt-5 text-2xl font-bold text-gray-900 sm:text-3xl">{t('title')}</h1>
      <p className="mt-3 text-base text-gray-700">{t('body')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/productos"
          className="inline-flex min-h-11 items-center rounded-md bg-[#3E667D] px-6 text-sm font-semibold text-white hover:bg-[#2f5165] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
        >
          {t('viewCatalog')}
        </Link>
        <Link
          href="/quiz"
          className="inline-flex min-h-11 items-center rounded-md border border-gray-300 px-6 text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
        >
          {t('takeQuiz')}
        </Link>
      </div>
    </section>
  );
}
