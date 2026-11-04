// visitor-locale.test.ts — país por ubicación, idioma por navegador, cookie manda.

import { describe, expect, it } from 'vitest';
import { localeFromPathname } from '@/i18n/config';
import { isCrawlerLike, parseAcceptLanguage, resolveVisitorLocale, supportedCountry } from './visitor-locale';

describe('parseAcceptLanguage', () => {
  it('ordena por q y conserva el orden en empates', () => {
    expect(parseAcceptLanguage('es-MX,es;q=0.9,en;q=0.8')).toEqual([
      { lang: 'es', region: 'MX', q: 1 },
      { lang: 'es', region: null, q: 0.9 },
      { lang: 'en', region: null, q: 0.8 },
    ]);
    expect(parseAcceptLanguage('en;q=0.5, fr, es-419')).toEqual([
      { lang: 'fr', region: null, q: 1 },
      { lang: 'es', region: '419', q: 1 },
      { lang: 'en', region: null, q: 0.5 },
    ]);
  });

  it('ignora comodín, basura y q = 0; nunca lanza', () => {
    expect(parseAcceptLanguage('*')).toEqual([]);
    expect(parseAcceptLanguage('')).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage('en;q=0, es')).toEqual([{ lang: 'es', region: null, q: 1 }]);
    expect(parseAcceptLanguage(';;;,,,<script>')).toEqual([]);
  });
});

describe('supportedCountry', () => {
  it('solo países de la tienda, sin importar mayúsculas ni espacios', () => {
    expect(supportedCountry(' mx ')).toBe('MX');
    expect(supportedCountry('US')).toBe('US');
    expect(supportedCountry('CO')).toBe('CO');
    expect(supportedCountry('FR')).toBeNull();
    expect(supportedCountry(null)).toBeNull();
    expect(supportedCountry('')).toBeNull();
  });
});

describe('resolveVisitorLocale', () => {
  it('la cookie válida manda sobre ubicación e idioma', () => {
    expect(resolveVisitorLocale({ cookie: 'es-mx', acceptLanguage: 'en-US', geoCountry: 'US' })).toEqual({
      locale: 'es-mx',
      lang: 'es',
      country: 'MX',
      source: 'cookie',
    });
    expect(resolveVisitorLocale({ cookie: 'EN-US', geoCountry: 'MX' }).locale).toBe('en-us');
  });

  it('cookie inválida o vieja (solo idioma) se ignora', () => {
    expect(resolveVisitorLocale({ cookie: 'es', geoCountry: 'MX' })).toMatchObject({ locale: 'es-mx', source: 'geo' });
    expect(resolveVisitorLocale({ cookie: 'xx-yy', geoCountry: 'US', acceptLanguage: 'en' }).locale).toBe('en-us');
  });

  it('el país lo da la ubicación: navegador en inglés o en español de EE. UU. desde México → tienda de México', () => {
    expect(resolveVisitorLocale({ acceptLanguage: 'en-US,en;q=0.9', geoCountry: 'MX' })).toEqual({
      locale: 'en-mx',
      lang: 'en',
      country: 'MX',
      source: 'geo',
    });
    expect(resolveVisitorLocale({ acceptLanguage: 'es-US,es;q=0.9', geoCountry: 'MX' }).locale).toBe('es-mx');
    expect(resolveVisitorLocale({ acceptLanguage: 'es-MX,es;q=0.9', geoCountry: 'US' }).locale).toBe('es-us');
    expect(resolveVisitorLocale({ acceptLanguage: 'en', geoCountry: 'us' }).locale).toBe('en-us');
  });

  it('países sin tienda abierta conservan su locale (pantalla "Muy pronto"); otros países → México', () => {
    expect(resolveVisitorLocale({ acceptLanguage: 'es-CO', geoCountry: 'CO' }).locale).toBe('es-co');
    expect(resolveVisitorLocale({ acceptLanguage: 'es', geoCountry: 'GT' }).locale).toBe('es-gt');
    expect(resolveVisitorLocale({ acceptLanguage: 'es-ES', geoCountry: 'ES' })).toMatchObject({
      locale: 'es-mx',
      source: 'default',
    });
    expect(resolveVisitorLocale({ acceptLanguage: 'fr-FR', geoCountry: 'FR' }).locale).toBe('es-mx');
  });

  it('sin ubicación (desarrollo, staging) cae a la región del idioma y luego a México', () => {
    expect(resolveVisitorLocale({ acceptLanguage: 'es-US,es;q=0.9' })).toMatchObject({
      locale: 'es-us',
      source: 'accept-language',
    });
    expect(resolveVisitorLocale({ acceptLanguage: 'en-GB,en;q=0.9' })).toMatchObject({ locale: 'en-mx', source: 'default' });
    expect(resolveVisitorLocale({ acceptLanguage: 'es-419,es;q=0.9' }).locale).toBe('es-mx');
    expect(resolveVisitorLocale({})).toEqual({ locale: 'es-mx', lang: 'es', country: 'MX', source: 'default' });
  });

  it('el idioma es la primera etiqueta es/en; otros idiomas no cuentan', () => {
    expect(resolveVisitorLocale({ acceptLanguage: 'fr-FR,en;q=0.8,es;q=0.7', geoCountry: 'MX' }).lang).toBe('en');
    expect(resolveVisitorLocale({ acceptLanguage: 'de-DE', geoCountry: 'US' })).toMatchObject({ locale: 'es-us' });
  });
});

describe('isCrawlerLike', () => {
  it('rastreadores, previsualizadores y peticiones sin Accept-Language no reciben país por IP', () => {
    const chrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    expect(isCrawlerLike({ acceptLanguage: null, userAgent: chrome })).toBe(true);
    expect(isCrawlerLike({ acceptLanguage: '   ', userAgent: chrome })).toBe(true);
    expect(
      isCrawlerLike({
        acceptLanguage: 'es-MX',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      }),
    ).toBe(true);
    expect(isCrawlerLike({ acceptLanguage: 'en', userAgent: 'facebookexternalhit/1.1' })).toBe(true);
    expect(isCrawlerLike({ acceptLanguage: 'en', userAgent: 'WhatsApp/2.23.20.0' })).toBe(true);
    expect(isCrawlerLike({ acceptLanguage: 'en-US', userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0)' })).toBe(true);
  });

  it('un navegador de persona con idioma sí recibe país por IP', () => {
    const chrome =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    expect(isCrawlerLike({ acceptLanguage: 'es-US,es;q=0.9', userAgent: chrome })).toBe(false);
    expect(
      isCrawlerLike({
        acceptLanguage: 'es-MX',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      }),
    ).toBe(false);
    expect(isCrawlerLike({ acceptLanguage: 'es', userAgent: null })).toBe(false);
  });
});

describe('localeFromPathname', () => {
  it('extrae el locale del prefijo de la URL y nada más', () => {
    expect(localeFromPathname('/es-mx/productos')).toBe('es-mx');
    expect(localeFromPathname('/en-us')).toBe('en-us');
    expect(localeFromPathname('/en-us/')).toBe('en-us');
    expect(localeFromPathname('/productos')).toBeNull();
    expect(localeFromPathname('/es-mxico/productos')).toBeNull();
    expect(localeFromPathname('/xx-yy/productos')).toBeNull();
    expect(localeFromPathname(null)).toBeNull();
    expect(localeFromPathname('')).toBeNull();
  });
});
