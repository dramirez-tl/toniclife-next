// El producto existe pero NO se vende en el país de la URL (sin precio público
// vigente ahí). Se ofrece la tienda de los países donde sí se vende y el catálogo
// local. La página responde `noindex`. Nunca se muestra precio de otro país.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { COUNTRIES, buildLocale, type CountryCode, type LanguageCode } from '@/i18n/config';
import { formatProductName } from '@/lib/storefront/content-format';
import { productPath } from '@/lib/storefront/slug';
import { ProductImage } from './ProductImage';

interface UnavailableInCountryProps {
  product: { name: string; imageUrl: string | null; slug: string };
  sellableCountries: string[];
  country: CountryCode;
  lang: LanguageCode;
}

export function UnavailableInCountry({ product, sellableCountries, country, lang }: UnavailableInCountryProps) {
  const t = useTranslations('storefront.product.unavailable');
  const nameOf = (code: string) => {
    const meta = COUNTRIES.find((c) => c.code === code);
    return (lang === 'en' ? meta?.nameEn : meta?.name) ?? code;
  };
  // Solo países con tienda abierta: un país "Muy pronto" no es una salida útil.
  const options = COUNTRIES.filter((c) => c.ready && c.code !== country && sellableCountries.includes(c.code));
  const name = formatProductName(product.name);

  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-12 text-center sm:px-6 sm:py-16">
      <div className="relative size-40 overflow-hidden rounded-2xl bg-gray-50 sm:size-48">
        <ProductImage src={product.imageUrl} alt="" name={name} sizes="192px" className="p-3" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-gray-900 sm:text-3xl">{name}</h1>
      <p className="mt-3 text-base text-gray-700">{t('message', { country: nameOf(country) })}</p>

      {options.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold text-gray-900">{t('availableIn')}</h2>
          <ul className="mt-3 flex flex-wrap justify-center gap-3">
            {options.map((c) => (
              <li key={c.code}>
                <Link
                  href={productPath(product.slug)}
                  locale={buildLocale(lang, c.code)}
                  className="inline-flex min-h-11 items-center rounded-full border border-[#3E667D] px-5 text-sm font-semibold text-[#2f5165] hover:bg-[#C8DDF2]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
                >
                  {t('viewIn', { country: nameOf(c.code) })}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        href="/productos"
        className="mt-8 inline-flex min-h-11 items-center rounded-md bg-[#3E667D] px-6 text-sm font-semibold text-white hover:bg-[#2f5165] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
      >
        {t('browseCatalog', { country: nameOf(country) })}
      </Link>
    </section>
  );
}
