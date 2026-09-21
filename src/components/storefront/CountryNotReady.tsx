// País sin tienda abierta (CO/GT): pantalla "Muy pronto" con salida a las tiendas
// que SÍ venden. La página que la usa responde con `noindex` y NO consulta el API.

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { COUNTRIES, buildLocale, type CountryCode, type LanguageCode } from '@/i18n/config';

interface CountryNotReadyProps {
  country: CountryCode;
  lang: LanguageCode;
}

export function CountryNotReady({ country, lang }: CountryNotReadyProps) {
  const t = useTranslations('storefront.common.countryNotReady');
  const meta = COUNTRIES.find((c) => c.code === country);
  const countryName = (lang === 'en' ? meta?.nameEn : meta?.name) ?? country;
  const ready = COUNTRIES.filter((c) => c.ready);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-[#2f5165]">{t('eyebrow')}</p>
      <h1 className="mt-3 text-3xl font-bold text-gray-900 sm:text-4xl">{t('title', { country: countryName })}</h1>
      <p className="mt-4 text-base text-gray-700">{t('body', { country: countryName })}</p>
      <h2 className="mt-10 text-sm font-semibold text-gray-900">{t('openStores')}</h2>
      <ul className="mt-4 flex flex-wrap justify-center gap-3">
        {ready.map((c) => (
          <li key={c.code}>
            <Link
              href="/productos"
              locale={buildLocale(lang, c.code)}
              className="inline-flex min-h-11 items-center rounded-full border border-[#3E667D] px-5 text-sm font-semibold text-[#2f5165] hover:bg-[#C8DDF2]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
            >
              {t('shopIn', { country: lang === 'en' ? c.nameEn : c.name })}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
