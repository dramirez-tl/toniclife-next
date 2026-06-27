// Formateo de moneda consciente de país/idioma para la tienda multipaís.
// El backend devuelve el precio y su currency_code según el país; aquí solo
// formateamos el símbolo/separadores/decimales correctos (Intl maneja, p.ej.,
// que COP no use decimales y MXN/USD usen 2).

import type { LanguageCode } from '@/i18n/config';

const INTL_LOCALE: Record<LanguageCode, string> = {
  es: 'es-MX',
  en: 'en-US',
};

/**
 * Formatea un monto en la moneda dada.
 * @param amount   número (o string numérica) a formatear
 * @param currency ISO 4217 (MXN, USD, COP, GTQ, …)
 * @param lang     idioma de UI ('es' | 'en') para los separadores
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string,
  lang: LanguageCode = 'es',
): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount ?? 0;
  const safe = Number.isFinite(value as number) ? (value as number) : 0;
  try {
    return new Intl.NumberFormat(INTL_LOCALE[lang] ?? 'es-MX', {
      style: 'currency',
      currency: (currency || 'MXN').toUpperCase(),
    }).format(safe);
  } catch {
    // currency_code inválido: fallback simple sin romper la UI.
    return `${safe.toFixed(2)} ${(currency || '').toUpperCase()}`.trim();
  }
}
