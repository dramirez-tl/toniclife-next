import type { PriceType } from '@/types/config';

/**
 * Resuelve el `price_type_id` que le corresponde a un cliente según su
 * `customer_type`, buscando en el catálogo de tipos de precio.
 *
 * Reglas de negocio:
 * - preferred_customer → "Precio Preferente"
 * - final_customer     → "Precio Público"
 * - distributor        → "Precio Distribuidor" (la lógica de pricing del backend
 *   igual lo limita a público si el distribuidor no tiene kit o no está activo)
 *
 * Devuelve `null` si no se encuentra un tipo de precio adecuado (en ese caso
 * el llamador no debe sobrescribir el price_type_id existente).
 */
export function findPriceTypeIdForCustomerType(
  priceTypes: PriceType[] | undefined,
  customerType: string,
): string | null {
  if (!priceTypes?.length) return null;
  const byCode = (re: RegExp) => priceTypes.find((p) => re.test(p.code))?.id ?? null;
  const byName = (re: RegExp) => priceTypes.find((p) => re.test(p.name))?.id ?? null;

  switch (customerType) {
    case 'preferred_customer':
      return byCode(/pref/i) ?? byName(/preferente/i);
    case 'final_customer':
      return byCode(/^public$/i) ?? byName(/p[uú]blico/i);
    case 'distributor':
      return byCode(/^distributor$/i) ?? byName(/distribuidor/i);
    default:
      return null;
  }
}
