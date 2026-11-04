// visitor-locale.ts — Locale inicial de un visitante que llega SIN prefijo en la
// URL (/, /productos, …) y SIN elección previa (cookie NEXT_LOCALE).
//
// Regla (3-nov-2026): el IDIOMA lo da el navegador (Accept-Language) y el PAÍS
// la ubicación del visitante (Vercel: cabecera x-vercel-ip-country). Antes el
// país salía de la región del idioma del navegador: "Español (Estados Unidos)"
// o cualquier inglés mandaban a la tienda de EE. UU. (sin artículos de venta al
// público) aunque el visitante estuviera en México. La cookie, cuando existe y es
// válida, siempre gana: es la elección explícita del selector o la sincronizada
// con la cuenta del distribuidor.
//
// Funciones puras (sin Next ni cookies): el middleware las alimenta con las
// cabeceras y las pruebas cubren las combinaciones.

import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  DEFAULT_LANGUAGE,
  buildLocale,
  isSupportedLocale,
  type CountryCode,
  type LanguageCode,
} from '@/i18n/config';

export interface VisitorLocaleInput {
  /** Cookie NEXT_LOCALE (elección explícita o sincronizada con la cuenta). */
  cookie?: string | null;
  /** Cabecera Accept-Language del navegador. */
  acceptLanguage?: string | null;
  /** País del visitante por IP (Vercel: x-vercel-ip-country), ISO2. */
  geoCountry?: string | null;
}

export type VisitorLocaleSource = 'cookie' | 'geo' | 'accept-language' | 'default';

export interface VisitorLocale {
  /** p. ej. 'es-mx' */
  locale: string;
  lang: LanguageCode;
  country: CountryCode;
  /** De dónde salió el PAÍS (para depurar; no cambia el comportamiento). */
  source: VisitorLocaleSource;
}

export interface AcceptLanguageTag {
  /** Subetiqueta primaria en minúsculas ('es', 'en', 'fr', …). */
  lang: string;
  /** Región en mayúsculas ('MX', 'US', …) o null. */
  region: string | null;
  q: number;
}

// Rastreadores y previsualizadores de enlaces (Googlebot, Bingbot, WhatsApp,
// Facebook, Telegram, Slack…): casi todos vienen de IP de EE. UU. y sin
// Accept-Language. A ellos NO se les adivina el país por IP (caerían en la
// tienda de EE. UU.); se quedan con la detección de siempre de next-intl.
const CRAWLER_UA_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitter|linkedin|pinterest|embedly|slack|discord|skype|preview|lighthouse|headless/i;

/** Petición que no parece de un navegador de persona: sin Accept-Language o con User-Agent de rastreador. */
export function isCrawlerLike(input: {
  acceptLanguage?: string | null;
  userAgent?: string | null;
}): boolean {
  if (!(input.acceptLanguage ?? '').trim()) return true;
  return CRAWLER_UA_RE.test(input.userAgent ?? '');
}

/** País soportado por la tienda (ISO2) o null. */
export function supportedCountry(raw: string | null | undefined): CountryCode | null {
  const code = (raw ?? '').trim().toUpperCase();
  return COUNTRIES.some((c) => c.code === code) ? (code as CountryCode) : null;
}

/**
 * Etiquetas de Accept-Language ordenadas por q descendente (empates: orden
 * original). Ignora '*', etiquetas vacías y q = 0. Nunca lanza.
 */
export function parseAcceptLanguage(header: string | null | undefined): AcceptLanguageTag[] {
  if (!header) return [];
  const tags: (AcceptLanguageTag & { index: number })[] = [];
  header.split(',').forEach((part, index) => {
    const [tagRaw, ...params] = part.trim().split(';');
    const tag = (tagRaw ?? '').trim().toLowerCase();
    if (!tag || tag === '*' || !/^[a-z]{1,8}(-[a-z0-9]{1,8})*$/.test(tag)) return;
    let q = 1;
    for (const param of params) {
      const match = /^\s*q\s*=\s*([0-9]*\.?[0-9]+)\s*$/i.exec(param);
      if (match) {
        const value = Number(match[1]);
        q = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      }
    }
    if (q <= 0) return;
    const [lang, region] = tag.split('-');
    tags.push({ lang, region: region ? region.toUpperCase() : null, q, index });
  });
  return tags
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(({ lang, region, q }) => ({ lang, region, q }));
}

/**
 * Locale para un visitante sin prefijo en la URL.
 *  1. Cookie NEXT_LOCALE válida → se respeta tal cual.
 *  2. Idioma: primera etiqueta es/en del navegador (default 'es').
 *  3. País: ubicación por IP si es un país de la tienda; si no hay ubicación
 *     (desarrollo, staging, proxies), la región del idioma elegido si es un
 *     país de la tienda; si no, México.
 */
export function resolveVisitorLocale(input: VisitorLocaleInput): VisitorLocale {
  const cookie = (input.cookie ?? '').trim().toLowerCase();
  if (cookie && isSupportedLocale(cookie)) {
    const [lang, country] = cookie.split('-');
    return {
      locale: cookie,
      lang: lang as LanguageCode,
      country: country.toUpperCase() as CountryCode,
      source: 'cookie',
    };
  }

  const preferred = parseAcceptLanguage(input.acceptLanguage).find(
    (tag) => tag.lang === 'es' || tag.lang === 'en',
  );
  const lang: LanguageCode = preferred?.lang === 'en' ? 'en' : DEFAULT_LANGUAGE;

  const geo = supportedCountry(input.geoCountry);
  if (geo) return { locale: buildLocale(lang, geo), lang, country: geo, source: 'geo' };

  const fromLanguage = supportedCountry(preferred?.region);
  if (fromLanguage) {
    return { locale: buildLocale(lang, fromLanguage), lang, country: fromLanguage, source: 'accept-language' };
  }

  return { locale: buildLocale(lang, DEFAULT_COUNTRY), lang, country: DEFAULT_COUNTRY, source: 'default' };
}
