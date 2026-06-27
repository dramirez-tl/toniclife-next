// Configuración de la tienda multipaís + idioma.
// locale = `${idioma}-${país}` en minúsculas, p.ej. 'es-mx', 'en-us'.
// El idioma controla la UI (ES/EN); el país controla almacén, stock, precios y moneda.

export type LanguageCode = 'es' | 'en';
export type CountryCode = 'MX' | 'US' | 'CO' | 'GT';

export interface CountryMeta {
  code: CountryCode;
  /** Nombre en español / inglés (para el selector según el idioma). */
  name: string;
  nameEn: string;
  flag: string; // emoji bandera
  currency: string; // ISO 4217 (MXN/USD/COP/GTQ)
  /** false = aparece en el selector como "próximamente" (sin precios cargados aún). */
  ready: boolean;
}

export interface LanguageMeta {
  code: LanguageCode;
  label: string; // cómo se nombra el idioma a sí mismo
}

// Orden de despliegue en el selector.
export const COUNTRIES: CountryMeta[] = [
  { code: 'MX', name: 'México', nameEn: 'Mexico', flag: '🇲🇽', currency: 'MXN', ready: true },
  { code: 'US', name: 'Estados Unidos', nameEn: 'United States', flag: '🇺🇸', currency: 'USD', ready: true },
  { code: 'CO', name: 'Colombia', nameEn: 'Colombia', flag: '🇨🇴', currency: 'COP', ready: false },
  { code: 'GT', name: 'Guatemala', nameEn: 'Guatemala', flag: '🇬🇹', currency: 'GTQ', ready: false },
];

export const LANGUAGES: LanguageMeta[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'es';
export const DEFAULT_COUNTRY: CountryCode = 'MX';

/** Construye el locale 'idioma-pais' (país en minúsculas). */
export function buildLocale(lang: LanguageCode, country: CountryCode): string {
  return `${lang}-${country.toLowerCase()}`;
}

export const DEFAULT_LOCALE = buildLocale(DEFAULT_LANGUAGE, DEFAULT_COUNTRY); // 'es-mx'

/** Todos los locales soportados (idioma × país) = 8. */
export const LOCALES: string[] = COUNTRIES.flatMap((c) =>
  LANGUAGES.map((l) => buildLocale(l.code, c.code)),
);

export function parseLocale(locale: string): {
  lang: LanguageCode;
  country: CountryCode;
} {
  const [langRaw, countryRaw] = (locale || '').split('-');
  const lang = (langRaw === 'en' ? 'en' : 'es') as LanguageCode;
  const country = (countryRaw
    ? (countryRaw.toUpperCase() as CountryCode)
    : DEFAULT_COUNTRY);
  const valid = COUNTRIES.some((c) => c.code === country) ? country : DEFAULT_COUNTRY;
  return { lang, country: valid };
}

export function localeLanguage(locale: string): LanguageCode {
  return parseLocale(locale).lang;
}

export function localeCountry(locale: string): CountryCode {
  return parseLocale(locale).country;
}

export function countryMeta(code: CountryCode): CountryMeta {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

export function isSupportedLocale(locale: string): boolean {
  return LOCALES.includes(locale);
}
