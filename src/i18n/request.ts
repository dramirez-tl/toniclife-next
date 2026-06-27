// Configuración por-request de next-intl. Carga los mensajes según el IDIOMA del
// locale (es/en); el país del locale no afecta los textos (solo datos/moneda).

import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { localeLanguage } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale)) {
    locale = routing.defaultLocale;
  }
  const lang = localeLanguage(locale);
  return {
    locale,
    messages: (await import(`../messages/${lang}.json`)).default,
  };
});
