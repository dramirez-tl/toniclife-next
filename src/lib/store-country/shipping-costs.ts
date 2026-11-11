// shipping-costs.ts — Costos de envío y envío gratis por país (lógica PURA).
//
// El formulario vive en dos pantallas (Configuración › Envíos y Tienda en línea por
// país) y guarda lo mismo: `PATCH /config/shipping-settings?country=`. Aquí está lo
// que no depende de la pantalla: los valores del formulario, la frase "Así queda",
// el cuerpo del guardado y DE DÓNDE salen los montos que hoy cobra un país:
//
//   - propios: alguien los capturó para ese país;
//   - heredados: una zona sin tienda propia usa los de su país (Frontera → México),
//     campo por campo, mientras no tenga los suyos;
//   - de fábrica: nadie los ha capturado. México y Estados Unidos tienen montos
//     iniciales en su moneda; Colombia y Guatemala caen en los de México EN SU PROPIA
//     MONEDA (150 pesos colombianos de envío), y eso hay que corregirlo antes de abrir.

import type { ShippingSettings } from '@/services/config.service';
import { storeCountryOfCode } from './countries';

export interface ShippingFormValues {
  freeShippingThreshold: number;
  standardShippingCost: number;
  kitShippingCost: number;
  /** Envío gratis por monto: encendido por país… */
  freeShippingEnabled: boolean;
  /** …y, aparte, para distribuidores. */
  freeShippingForDistributors: boolean;
}

/** Lo que se ve mientras no llegan los ajustes del país (los montos históricos de México). */
export const DEFAULT_SHIPPING_FORM: ShippingFormValues = {
  freeShippingThreshold: 1500,
  standardShippingCost: 150,
  kitShippingCost: 150,
  freeShippingEnabled: true,
  freeShippingForDistributors: false,
};

/**
 * Ajustes de envío del API → campos del formulario. Un API anterior a los interruptores
 * del envío gratis no los manda: valen lo de siempre (gratis al llegar al mínimo para
 * clientes; los distribuidores siempre lo pagan).
 */
export function shippingFormValues(s: ShippingSettings): ShippingFormValues {
  return {
    freeShippingThreshold: s.freeThreshold,
    standardShippingCost: s.standardCost,
    kitShippingCost: s.kitCost,
    freeShippingEnabled: s.freeShippingEnabled ?? true,
    freeShippingForDistributors: s.freeShippingForDistributors ?? false,
  };
}

/** Qué pasa con el envío estándar a domicilio según los dos interruptores, dicho en llano. */
export function freeShippingEffect(
  enabled: boolean,
  forDistributors: boolean,
  threshold: number,
  amount: string,
): string {
  if (!enabled) {
    return 'Todas las compras pagan envío estándar, sin importar el monto.';
  }
  if (!(threshold > 0)) {
    return forDistributors
      ? 'El envío estándar es gratis en todas las compras, porque el monto mínimo está en cero.'
      : 'El envío estándar es gratis en todas las compras de clientes que no son distribuidores, porque el monto mínimo está en cero. Los distribuidores lo pagan siempre.';
  }
  return forDistributors
    ? `Nadie paga envío estándar en compras de ${amount} o más: ni clientes ni distribuidores.`
    : `Los clientes que no son distribuidores no pagan envío estándar en compras de ${amount} o más. Los distribuidores lo pagan siempre.`;
}

/**
 * Los interruptores del envío gratis solo viajan si el servidor ya los conoce (los manda
 * en la lectura): un API anterior rechaza las claves que no admite y no se guardarían ni
 * los costos. Mientras carga se da por hecho que sí.
 */
export function shippingFlagsSupported(settings: ShippingSettings | null | undefined): boolean {
  return !settings || typeof settings.freeShippingEnabled === 'boolean';
}

/**
 * Cuerpo del guardado: los tres montos y, si el servidor los admite, los dos interruptores.
 * El costo del envío exprés ya no viaja (la tienda dejó de ofrecerlo el 11-nov-2026): lo
 * que el país tuviera guardado se queda como está.
 */
export function buildShippingPayload(values: ShippingFormValues, flagsSupported: boolean): Partial<ShippingSettings> {
  return {
    standardCost: values.standardShippingCost,
    freeThreshold: values.freeShippingThreshold,
    kitCost: values.kitShippingCost,
    ...(flagsSupported
      ? {
          freeShippingEnabled: values.freeShippingEnabled,
          freeShippingForDistributors: values.freeShippingForDistributors,
        }
      : {}),
  };
}

/** ¿El formulario difiere de lo guardado? Sin ajustes cargados no hay con qué comparar: false. */
export function isShippingFormDirty(values: ShippingFormValues, saved: ShippingSettings | null | undefined): boolean {
  if (!saved) return false;
  const base = shippingFormValues(saved);
  const amounts: (keyof ShippingFormValues)[] = [
    'freeShippingThreshold',
    'standardShippingCost',
    'kitShippingCost',
  ];
  if (amounts.some((key) => values[key] !== base[key])) return true;
  if (!shippingFlagsSupported(saved)) return false;
  return (
    values.freeShippingEnabled !== base.freeShippingEnabled ||
    values.freeShippingForDistributors !== base.freeShippingForDistributors
  );
}

// ===== de dónde salen los montos =====

/** `shipping.source` de `GET /fulfillment/diagnostics`. */
export type ShippingDiagnosticsSource = 'settings' | 'defaults_country' | 'defaults_mx';

export type ShippingCostsOrigin =
  /** Montos capturados para ese país. */
  | { kind: 'own' }
  /** Zona que usa los de su país mientras no tenga los suyos (Frontera → MX). */
  | { kind: 'inherited'; from: string }
  /** Montos de fábrica. `mexicoAmounts` = son los de México en la moneda de OTRO país. */
  | { kind: 'defaults'; mexicoAmounts: boolean }
  /** No se pudo saber (API anterior y sin diagnóstico). */
  | { kind: 'unknown' };

/** ¿Los montos son exactamente los de fábrica de México? (así se ve un país que cayó en ellos). */
function hasMexicoFactoryAmounts(settings: Partial<ShippingSettings> | null): boolean {
  return (
    !!settings &&
    settings.standardCost === DEFAULT_SHIPPING_FORM.standardShippingCost &&
    settings.freeThreshold === DEFAULT_SHIPPING_FORM.freeShippingThreshold &&
    settings.kitCost === DEFAULT_SHIPPING_FORM.kitShippingCost
  );
}

/**
 * De dónde salen los costos de envío de un país o zona.
 *  - `settings` = lo que dice `GET /config/shipping-settings` (`hasOwnSettings`,
 *    `inheritedFrom`); ambos faltan en un API anterior o si no se pudo leer.
 *  - `diagnosticsSource` = lo que dice el diagnóstico de rutas, que además distingue
 *    los montos de fábrica propios (MX, US) de los de México en otra moneda (CO, GT).
 * Manda `settings`; el diagnóstico completa lo que `settings` no dice. Sin diagnóstico,
 * un país sin montos propios que trae justo los números de México se toma por lo que es.
 */
export function shippingCostsOrigin(input: {
  countryCode: string;
  settings?: Partial<ShippingSettings> | null;
  diagnosticsSource?: ShippingDiagnosticsSource | null;
}): ShippingCostsOrigin {
  const code = input.countryCode.trim().toUpperCase();
  const settings = input.settings ?? null;
  const own = settings?.hasOwnSettings;
  const source = input.diagnosticsSource ?? null;
  const parent = storeCountryOfCode(code);
  const zoneParent = parent && parent !== code ? parent : null;

  if (own === true || (own === undefined && source === 'settings')) return { kind: 'own' };
  if (own === undefined && source === null) return { kind: 'unknown' };

  // De aquí en adelante: no tiene montos propios.
  const from = (settings?.inheritedFrom ?? '').trim().toUpperCase();
  if (from) return { kind: 'inherited', from };
  if (source === 'defaults_country') return { kind: 'defaults', mexicoAmounts: false };
  if (source === 'defaults_mx') {
    return zoneParent ? { kind: 'inherited', from: zoneParent } : { kind: 'defaults', mexicoAmounts: code !== 'MX' };
  }
  return { kind: 'defaults', mexicoAmounts: code !== 'MX' && hasMexicoFactoryAmounts(settings) };
}

/**
 * Lo que se dice de una zona (Frontera) junto a los costos de su país: usa los mismos
 * salvo que tenga los suyos, y qué pasa hoy si se sabe.
 */
export function zoneShippingNote(zoneName: string, countryName: string, origin: ShippingCostsOrigin): string {
  if (origin.kind === 'own') {
    return `${zoneName} tiene sus propios costos de envío, distintos de estos. Se cambian en Configuración › Envíos, eligiendo ${zoneName}.`;
  }
  const rule = `${zoneName} usa estos mismos costos y las mismas reglas de envío gratis, salvo que tenga los suyos.`;
  return origin.kind === 'inherited' ? `${rule} Hoy no los tiene: cobra lo mismo que ${countryName}.` : rule;
}
