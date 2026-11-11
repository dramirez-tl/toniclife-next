// shipping-method.ts — Envío a domicilio del checkout de la tienda (lógica PURA, 11-nov-2026).
//
// La tienda ofrece UN solo envío a domicilio: el estándar. El exprés se dejó de ofrecer
// (el pedido no guardaba el método y Almacén no podía distinguirlo de uno estándar) y
// recoger en sucursal se elige aparte. Como no hay nada que escoger, la pantalla informa
// el envío estándar con lo que se va a cobrar y en cuántos días llega.

import { ShippingMethod, type CheckoutSummary } from '@/types/cart';

export interface StandardShippingInfo {
  /**
   * Lo que se va a cobrar de envío; `null` mientras no llega el resumen (o si su monto no
   * se puede leer): la pantalla no inventa un costo.
   */
  cost: number | null;
  /** Días hábiles estimados de entrega; 0 = el API no lo dijo (no se muestra). */
  days: number;
}

function amount(value: unknown): number | null {
  const text = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Costo y días del envío estándar.
 *  - Con el envío estándar elegido (lo normal: es el único envío a domicilio) el costo es
 *    el `shippingAmount` del resumen, que es lo que se cobra: ya trae el envío gratis por
 *    monto y el cupón de envío gratis.
 *  - Si lo cotizado es otra cosa (recoger en sucursal), se usa el costo de la opción
 *    estándar de la lista del API.
 */
export function standardShippingInfo(
  summary: Pick<CheckoutSummary, 'shippingAmount' | 'shippingOptions'> | null | undefined,
  selectedMethod: ShippingMethod,
): StandardShippingInfo {
  if (!summary) return { cost: null, days: 0 };
  const option = Array.isArray(summary.shippingOptions)
    ? summary.shippingOptions.find((o) => o?.method === ShippingMethod.STANDARD)
    : undefined;
  const days = Number(option?.estimatedDays);
  return {
    cost: selectedMethod === ShippingMethod.STANDARD ? amount(summary.shippingAmount) : amount(option?.cost),
    days: Number.isFinite(days) && days > 0 ? Math.round(days) : 0,
  };
}
