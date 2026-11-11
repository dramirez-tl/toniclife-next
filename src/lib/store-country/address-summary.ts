// address-summary.ts — Qué pide la tienda en la dirección de envío de un país (lógica PURA).
//
// Solo lectura: resume los campos del formulario del checkout (`lib/checkout/shipping-address`,
// la misma fuente que usa la tienda) para que el admin vea, sin entrar a comprar, qué se
// captura en cada país, qué es obligatorio y cómo se elige el estado o departamento.

import { checkoutAddressFields, stateValueIsCode, type AddressFormKey } from '@/lib/checkout/shipping-address';

export interface AddressFieldSummary {
  key: AddressFormKey;
  required: boolean;
  maxLength: number;
  /** El valor debe cumplir un formato (hoy, el código postal). */
  hasFormat: boolean;
}

export interface AddressSummary {
  /** En el orden en que se capturan. */
  fields: AddressFieldSummary[];
  requiredCount: number;
  optionalCount: number;
  /** El estado viaja como clave de 2 letras (Estados Unidos: de ella sale el impuesto de venta). */
  stateAsCode: boolean;
}

/** Campos de una dirección NUEVA en la tienda de ese país. */
export function addressSummary(countryCode: string): AddressSummary {
  const fields = checkoutAddressFields(countryCode, 'new').map((f) => ({
    key: f.key,
    required: f.required,
    maxLength: f.maxLength,
    hasFormat: !!f.pattern,
  }));
  const requiredCount = fields.filter((f) => f.required).length;
  return {
    fields,
    requiredCount,
    optionalCount: fields.length - requiredCount,
    stateAsCode: stateValueIsCode(countryCode),
  };
}

/** Catálogo de estados / departamentos del país (`GET /states?countryId=`). */
export type StateCatalogInfo =
  | { kind: 'loading' }
  | { kind: 'error' }
  /** `count` = cuántos tiene cargados (0 = ninguno). */
  | { kind: 'list'; count: number };

export interface StateCatalogNote {
  /** false = hay algo que atender (catálogo vacío o no se pudo leer). */
  ok: boolean;
  text: string;
}

/**
 * Cómo se captura el estado / departamento: de la lista del catálogo o, si el catálogo
 * está vacío, escrito a mano (la tienda hace exactamente eso).
 */
export function stateCatalogNote(stateLabel: string, info: StateCatalogInfo, stateAsCode: boolean): StateCatalogNote {
  const label = stateLabel.trim() || 'Estado';
  if (info.kind === 'loading') return { ok: true, text: `Consultando la lista de «${label}»…` };
  if (info.kind === 'error') {
    return { ok: false, text: `No se pudo consultar la lista de «${label}».` };
  }
  if (info.count <= 0) {
    return {
      ok: false,
      text: `«${label}» no tiene lista cargada: quien compra lo escribe a mano. La lista la carga Sistemas.`,
    };
  }
  const options = info.count === 1 ? '1 opción' : `${info.count} opciones`;
  return {
    ok: true,
    text: stateAsCode
      ? `«${label}» se elige de una lista de ${options} y se guarda con su clave de 2 letras (TX), que es con la que se calcula el impuesto de venta.`
      : `«${label}» se elige de una lista de ${options}.`,
  };
}
