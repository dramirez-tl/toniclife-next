// Ruteo i18n de next-intl para la tienda pública.
// localePrefix: 'always' → el locale siempre va en la URL (/es-mx/…, /en-us/…).
// La cookie NEXT_LOCALE (la escribe el selector) define el locale por defecto.

import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { LOCALES, DEFAULT_LOCALE } from './config';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  localeCookie: { name: 'NEXT_LOCALE' },
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
