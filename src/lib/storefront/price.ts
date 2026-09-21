// Precio de la tienda pública: parseo defensivo y formato por país.
// REGLA (contrato ecommerce, decisión 2): un producto sin precio vigente en el
// país NO tiene precio. Jamás se cae a puntos (`pointsValue`) ni a otro país.

import { COUNTRIES, type CountryCode, type LanguageCode } from '@/i18n/config';

/**
 * Convierte el precio que manda el API (string numérica, number o ausente) en
 * un número vendible. Devuelve `null` cuando no hay precio, no es numérico o es
 * <= 0: la UI muestra "No disponible" y deshabilita "Agregar".
 */
export function parseApiPrice(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Moneda ISO 4217 del país de la tienda (MX→MXN, US→USD, …). */
export function currencyForCountry(country: CountryCode): string {
  return COUNTRIES.find((c) => c.code === country)?.currency ?? 'MXN';
}

const INTL_LOCALE: Record<LanguageCode, string> = { es: 'es-MX', en: 'en-US' };

/**
 * Formatea un precio con su código de moneda explícito ("$1,121.00 MXN"), para
 * que un visitante de US nunca confunda pesos con dólares. `null` si no hay
 * precio (el llamador pinta "No disponible").
 */
export function formatStorePrice(
  amount: number | null | undefined,
  currencyCode: string,
  lang: LanguageCode = 'es',
): string | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  const code = (currencyCode || 'MXN').toUpperCase();
  try {
    const formatted = new Intl.NumberFormat(INTL_LOCALE[lang] ?? 'es-MX', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).format(amount);
    return `${formatted} ${code}`;
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}
