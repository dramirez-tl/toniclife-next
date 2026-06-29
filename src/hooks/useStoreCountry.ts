'use client';

// Resuelve el PAÍS de la tienda a partir del locale de la URL (/[locale]) o la
// cookie. Devuelve el countryId (UUID, del catálogo del API) para filtrar
// productos/precios, la moneda y el idioma. Mientras carga el catálogo countryId
// es undefined (las queries deben gatearse con `enabled`).

import { useParams } from 'next/navigation';
import { useActiveCountries } from '@/hooks/useConfig';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectUser } from '@/store/slices/authSlice';
import {
  COUNTRIES,
  DEFAULT_LOCALE,
  localeCountry,
  localeLanguage,
  countryMeta,
  type CountryCode,
  type LanguageCode,
} from '@/i18n/config';
import { getStoredLocale } from '@/lib/store-locale';

/**
 * País de la CUENTA del usuario logueado, si su país ya tiene tienda lista (ready).
 * Para un distribuidor el país de la tienda lo fija su cuenta (no lo elige): solo
 * cambia el idioma. Si el país de la cuenta aún no tiene tienda (CO/GT) o no hay
 * sesión, devuelve undefined y se usa el locale/cookie como antes.
 */
export function readyAccountCountry(code?: string | null): CountryCode | undefined {
  if (!code) return undefined;
  const up = code.toUpperCase();
  return COUNTRIES.find((c) => c.code === up && c.ready)?.code;
}

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
  const localeRaw = localeParam || getStoredLocale() || DEFAULT_LOCALE;

  const lang = localeLanguage(localeRaw);

  // Si hay sesión y el país de la cuenta tiene tienda lista, ese país MANDA sobre
  // el locale (URL/cookie): el distribuidor solo cambia idioma, no país.
  const user = useAppSelector(selectUser);
  const isAuth = useAppSelector(selectIsAuthenticated);
  const accountCountry = isAuth
    ? readyAccountCountry(user?.countryCode)
    : undefined;

  const countryCode = accountCountry ?? localeCountry(localeRaw);
  // El locale efectivo refleja el país de la cuenta (idioma del locale + país cuenta).
  const locale = `${lang}-${countryCode.toLowerCase()}`;
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
