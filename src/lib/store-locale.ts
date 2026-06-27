// Persistencia de la selección país+idioma en cookie (cliente).
// Se usa el nombre NEXT_LOCALE para integrarse con next-intl cuando se active el
// ruteo /[locale]. Lectura/escritura tolerante a SSR.

import { DEFAULT_LOCALE, isSupportedLocale } from '@/i18n/config';

const LOCALE_COOKIE = 'NEXT_LOCALE';
const ONE_YEAR = 60 * 60 * 24 * 365;

export function getStoredLocale(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.slice(LOCALE_COOKIE.length + 1);
  return value && isSupportedLocale(value) ? value : null;
}

export function setStoredLocale(locale: string): void {
  if (typeof document === 'undefined') return;
  const safe = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
  document.cookie = `${LOCALE_COOKIE}=${safe}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}
