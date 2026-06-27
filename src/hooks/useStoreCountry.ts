'use client';

// Resuelve el PAÍS de la tienda a partir del locale de la URL (/[locale]) o la
// cookie. Devuelve el countryId (UUID, del catálogo del API) para filtrar
// productos/precios, la moneda y el idioma. Mientras carga el catálogo countryId
// es undefined (las queries deben gatearse con `enabled`).

import { useParams } from 'next/navigation';
import { useActiveCountries } from '@/hooks/useConfig';
import {
  DEFAULT_LOCALE,
  localeCountry,
  localeLanguage,
  countryMeta,
  type CountryCode,
  type LanguageCode,
} from '@/i18n/config';
import { getStoredLocale } from '@/lib/store-locale';

export interface StoreCountry {
  locale: string;
  countryCode: CountryCode;
  /** UUID del país (del catálogo /config/countries/active). undefined hasta cargar. */
  countryId?: string;
  currency: string;
  lang: LanguageCode;
  ready: boolean;
}

export function useStoreCountry(): StoreCountry {
  const params = useParams();
  const localeParam =
    typeof params?.locale === 'string' ? params.locale : undefined;
  const locale = localeParam || getStoredLocale() || DEFAULT_LOCALE;

  const countryCode = localeCountry(locale);
  const lang = localeLanguage(locale);
  const meta = countryMeta(countryCode);

  const { data: countries } = useActiveCountries();
  const match = countries?.find((c) => c.code === countryCode);

  return {
    locale,
    countryCode,
    countryId: match?.id,
    currency: match?.currencyCode || meta.currency,
    lang,
    ready: meta.ready,
  };
}
