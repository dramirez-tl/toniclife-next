// delivery-gates.ts — Compuertas de INTERFAZ del checkout de la tienda (lógica PURA).
//
// No tocan montos, pagos ni el cuerpo del pedido: solo deciden si una opción se
// puede elegir y si el botón de pagar debe esperar. La autoridad sigue siendo
// el API (422 FUL_NO_ROUTE); esto evita que el cliente llene todo para enterarse
// al final.

import { countryMeta, type CountryCode, type LanguageCode } from '@/i18n/config';

export type DeliveryMode = 'delivery' | 'pickup';

/** Lo único que se lee del resumen: `delivery.shippingAvailable` (opcional; un API viejo no lo manda). */
export interface DeliverySignal {
  delivery?: { shippingAvailable?: boolean } | null;
}

/**
 * true SOLO si el API dijo expresamente que ningún almacén envía a ese país.
 * Sin resumen, sin `delivery` o sin el campo = como hoy (se permite).
 */
export function isHomeDeliveryUnavailable(summary: DeliverySignal | null | undefined): boolean {
  return summary?.delivery?.shippingAvailable === false;
}

/** El envío a domicilio está elegido y no se puede: no se avanza ni se paga. Recoger en sucursal nunca se bloquea. */
export function isDeliveryBlocked(mode: DeliveryMode, summary: DeliverySignal | null | undefined): boolean {
  return mode === 'delivery' && isHomeDeliveryUnavailable(summary);
}

/**
 * El botón de pagar ESPERA mientras la lista de países activos está cargando
 * (incluye su único reintento). Si la consulta FALLÓ no espera: se paga sin
 * countryId, como hoy (el API usa el país del cliente).
 */
export function shouldWaitForStoreCountry(state: { countryId?: string; isLoading: boolean }): boolean {
  return !state.countryId && state.isLoading;
}

/** Nombre del país de la tienda en el idioma de la interfaz ("Estados Unidos" / "United States"). */
export function storeCountryName(countryCode: CountryCode, lang: LanguageCode): string {
  const meta = countryMeta(countryCode);
  return lang === 'en' ? meta.nameEn : meta.name;
}
