// price-zone.ts — zona de precios del viewer en la tienda pública.
//
// Una cuenta de ZONA (hoy solo Frontera MX-USA, `FN`) navega la tienda de su país
// fiscal (México) y el API le cotiza —y el carrito le cobra— la lista de SU zona.
// El API lo anuncia en `viewer.priceZone` (+ `viewer.priceZoneName` opcional) y la
// tienda lo dice en un aviso. Lib pura: sin React ni DOM.

import type { LanguageCode } from '@/i18n/config';

export interface StorefrontPriceZone {
  /** Código de la zona ('FN'). */
  code: string;
  /** Nombre que mandó el API, si lo mandó. */
  name: string | null;
}

/** Nombres de respaldo cuando el API manda el código sin nombre. */
const ZONE_FALLBACK_NAME: Record<string, Record<LanguageCode, string>> = {
  FN: { es: 'Frontera', en: 'Border' },
};

/** Zona con la que cotizó el API, o `null` (anónimo, cuenta de país o API previo). */
export function viewerPriceZone(
  viewer: { priceZone?: string | null; priceZoneName?: string | null } | null | undefined,
): StorefrontPriceZone | null {
  const code = viewer?.priceZone?.trim().toUpperCase();
  if (!code) return null;
  const name = viewer?.priceZoneName?.trim();
  return { code, name: name ? name : null };
}

/** Nombre a mostrar: el del API si viene; si no, el de respaldo del código; en último caso el código. */
export function priceZoneDisplayName(zone: StorefrontPriceZone, lang: LanguageCode): string {
  return zone.name ?? ZONE_FALLBACK_NAME[zone.code]?.[lang] ?? zone.code;
}
